import { expect, test, type Page } from '@playwright/test'
import { fileURLToPath } from 'node:url'

// Every test gets a fresh browser context, so a fresh database with the bundled sample recipes:
// Owsianka (475 kcal), Kurczak z ryżem (465), Zupa krem z dyni (330, 2 servings), Skyr (225).

const nav = (page: Page, name: 'Plan' | 'Przepisy' | 'Zakupy' | 'Ustawienia') =>
  page.getByRole('navigation').getByRole('button', { name, exact: true }).click()

async function setPeople(page: Page) {
  await nav(page, 'Ustawienia')
  await page.getByLabel('Imię').nth(0).fill('Ola')
  await page.getByLabel('Imię').nth(1).fill('Piotr')
  await page.getByLabel('Dzienny cel').nth(1).fill('2100')
  await page.getByLabel('Imię').nth(0).click()
  await nav(page, 'Plan')
}

async function planMeal(page: Page, meal: string, recipe: string) {
  await page.locator('section', { has: page.getByRole('heading', { name: meal }) }).getByRole('button', { name: '+ Dodaj' }).click()
  await page.getByRole('button', { name: 'Wszystkie' }).click()
  await page.getByRole('searchbox').fill(recipe)
  await page.locator('.fixed li button').first().click()
}

async function planDay(page: Page) {
  await planMeal(page, 'Śniadanie', 'owsianka')
  await planMeal(page, 'Obiad', 'kurczak')
  await planMeal(page, 'Przekąska', 'skyr')
  await planMeal(page, 'Kolacja', 'zupa')
}

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Plan' })).toBeVisible()
})

test('a full day adds up to each person’s calorie target', async ({ page }) => {
  await setPeople(page)
  await planDay(page)
  await expect(page.getByText('1500 / 1500 kcal')).toBeVisible()
  await expect(page.getByText('2100 / 2100 kcal')).toBeVisible()
  // breakfast is 30% of the day
  await expect(page.getByRole('button', { name: 'Piotr · 630 kcal' })).toBeVisible()
})

test('one pot to cook, split into plates that add up to it', async ({ page }) => {
  await setPeople(page)
  await planMeal(page, 'Obiad', 'kurczak')
  await page.getByRole('button', { name: /^Kurczak z ryżem/ }).click()

  // 525 + 735 kcal from a 465 kcal recipe: 2.71 servings, 150 g of chicken each
  const row = (name: string) => page.locator('li', { hasText: name })
  await expect(row('Mięso z piersi kurczaka')).toContainText('410 g')
  await expect(row('Sól')).toContainText('1 szczypta')

  await page.getByRole('tab', { name: 'Ola' }).click()
  await expect(page.getByText('42%', { exact: true })).toBeVisible()
  await expect(row('Mięso z piersi kurczaka')).toContainText('170 g')
  await page.getByRole('tab', { name: 'Piotr' }).click()
  await expect(page.getByText('58%', { exact: true })).toBeVisible()
  await expect(row('Mięso z piersi kurczaka')).toContainText('240 g')
  await expect(row('Sól')).toHaveCount(0) // pinches season the pot, not a plate
})

test('shopping list is grouped by section and remembers checked items', async ({ page }) => {
  await planDay(page)
  await nav(page, 'Zakupy')
  await expect(page.getByRole('heading', { name: 'Warzywa i owoce' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Mięso i ryby' })).toBeVisible()
  await page.getByLabel(/^Banan/).check()
  await page.reload()
  await nav(page, 'Zakupy')
  await expect(page.getByLabel(/^Banan/)).toBeChecked()
})

test('auto-fill plans every meal of the coming days', async ({ page }) => {
  await page.getByRole('button', { name: 'Uzupełnij tydzień' }).click()
  await expect(page.getByRole('status')).toHaveText(/Dodano posiłków: \d+\./)
  for (const meal of ['Śniadanie', 'Obiad', 'Przekąska', 'Kolacja']) {
    const section = page.locator('section', { has: page.getByRole('heading', { name: meal }) })
    await expect(section.getByRole('button', { name: '+ Dodaj' })).toHaveCount(0)
  }
})

test('imported recipes replace the samples', async ({ page }) => {
  await nav(page, 'Ustawienia')
  await page.locator('input[type=file]').first().setInputFiles(fileURLToPath(new URL('./fixtures/sample-import.json', import.meta.url)))
  await expect(page.getByText('Zaimportowano 2 przepisów.')).toBeVisible()
  await nav(page, 'Przepisy')
  await expect(page.getByText('2 z 2')).toBeVisible()
  await page.getByRole('searchbox').fill('jajko') // search by ingredient
  await expect(page.getByRole('button', { name: /^Jajecznica ze szczypiorkiem/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Makaron z pesto/ })).toHaveCount(0)
})

test('works offline once loaded', async ({ page, context }) => {
  // An installed service worker serves the app only once it controls the page.
  await page.evaluate(() => navigator.serviceWorker.ready)
  if (!(await page.evaluate(() => !!navigator.serviceWorker.controller))) await page.reload()
  await page.waitForFunction(() => !!navigator.serviceWorker.controller)
  await planMeal(page, 'Obiad', 'kurczak')
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('button', { name: /^Kurczak z ryżem/ })).toBeVisible()
})
