import { describe, expect, it } from 'vitest'
import { autofillDays } from './autofill'
import type { PlannedMeal } from './plan'
import { DEFAULT_MEALS, type Profile } from './profile'
import type { Recipe } from './types'

const recipe = (id: string, kcal: number, mealTypes: Recipe['mealTypes']): Recipe => ({
  id,
  name: id,
  kcal,
  protein: 0,
  carbs: 0,
  fat: 0,
  servings: 1,
  ingredients: [{ name: 'X', grams: 100 }],
  steps: [],
  mealTypes,
})

const recipes = [
  recipe('kanapki', 450, ['breakfast', 'dinner']),
  recipe('owsianka', 440, ['breakfast']),
  recipe('obiad-a', 525, ['lunch']),
  recipe('obiad-b', 520, ['lunch']),
  recipe('obiad-za-duzy', 1200, ['lunch']),
  recipe('koktajl', 150, ['snack']),
  recipe('salatka', 375, ['dinner']),
]

const ola: Profile = { id: 'ola', name: 'Ola', dailyKcal: 1500, meals: DEFAULT_MEALS }
const piotr: Profile = { id: 'piotr', name: 'Piotr', dailyKcal: 1500, meals: DEFAULT_MEALS }
const noSnacks: Profile = { ...piotr, meals: DEFAULT_MEALS.map((m) => (m.type === 'snack' ? { ...m, share: 0 } : m)) }

const noRandom = () => 0
const pick = (meals: PlannedMeal[], date: string, type: string) =>
  meals.find((m) => m.date === date && m.type === type)?.recipeId

describe('autofillDays', () => {
  it('fills every meal with a recipe of that type and the best calorie fit', () => {
    const added = autofillDays(recipes, [ola, piotr], ['2026-10-26'], [], noRandom)
    expect(added.map((m) => [m.type, m.recipeId])).toEqual([
      ['breakfast', 'kanapki'], // 450 kcal = exactly the 450 kcal target
      ['lunch', 'obiad-a'],
      ['snack', 'koktajl'],
      ['dinner', 'salatka'],
    ])
    expect(added.every((m) => m.profileIds.length === 2)).toBe(true)
  })

  it('keeps planned meals and fills only the gaps', () => {
    const existing = [{ date: '2026-10-26', type: 'lunch' as const, recipeId: 'obiad-b', profileIds: ['ola', 'piotr'] }]
    const added = autofillDays(recipes, [ola, piotr], ['2026-10-26'], existing, noRandom)
    expect(added.map((m) => m.type)).toEqual(['breakfast', 'snack', 'dinner'])
  })

  it('avoids the same recipe on neighbouring days when there is an alternative', () => {
    const added = autofillDays(recipes, [ola, piotr], ['2026-10-26', '2026-10-27', '2026-10-28'], [], noRandom)
    expect(['2026-10-26', '2026-10-27', '2026-10-28'].map((d) => pick(added, d, 'lunch'))).toEqual([
      'obiad-a',
      'obiad-b',
      'obiad-a',
    ])
    // the 1200 kcal lunch would be a 0.4× portion, so it's never picked
    expect(added.some((m) => m.recipeId === 'obiad-za-duzy')).toBe(false)
  })

  it('leaves people out of meals they don’t eat', () => {
    const added = autofillDays(recipes, [ola, noSnacks], ['2026-10-26'], [], noRandom)
    expect(added.find((m) => m.type === 'snack')?.profileIds).toEqual(['ola'])
  })
})
