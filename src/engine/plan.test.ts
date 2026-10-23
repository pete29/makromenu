import { describe, expect, it } from 'vitest'
import { mealTargets, portionDay, recipeFit, shoppingList, type PlannedMeal } from './plan'
import { DEFAULT_MEALS, type Profile } from './profile'
import type { Recipe } from './types'

const recipe = (id: string, kcal: number, ingredients: Recipe['ingredients']): Recipe => ({
  id,
  name: id,
  kcal,
  protein: kcal / 20,
  carbs: kcal / 10,
  fat: kcal / 40,
  servings: 1,
  ingredients,
  steps: [],
})

const recipes = new Map(
  [
    recipe('owsianka', 450, [
      { name: 'Płatki owsiane', grams: 60 },
      { name: 'Banan', grams: 120, amount: 1, unit: 'sztuka' },
    ]),
    recipe('kurczak', 500, [
      { name: 'Mięso z piersi kurczaka', grams: 150 },
      { name: 'Woda', grams: 100 },
      { name: 'Banan', grams: 60 },
    ]),
    recipe('jogurt', 150, [{ name: 'Jogurt naturalny 2%', grams: 150, amount: 1, unit: 'opakowanie' }]),
  ].map((r) => [r.id, r]),
)

const ola: Profile = { id: 'ola', name: 'Ola', dailyKcal: 1500, meals: DEFAULT_MEALS }
const piotr: Profile = { id: 'piotr', name: 'Piotr', dailyKcal: 2100, meals: DEFAULT_MEALS }
const profiles = [ola, piotr]

const meal = (date: string, type: PlannedMeal['type'], recipeId: string, profileIds = ['ola', 'piotr']) => ({
  date,
  type,
  recipeId,
  profileIds,
})

describe('mealTargets', () => {
  it('uses the profile’s full day, so targets stay put while the day is filled in', () => {
    // breakfast 30%, lunch 35% of the day, even though nothing else is planned yet
    expect(mealTargets(profiles, [meal('d1', 'breakfast', 'owsianka')])).toEqual([[450, 630]])
    expect(mealTargets(profiles, [meal('d1', 'breakfast', 'owsianka'), meal('d1', 'lunch', 'kurczak')])).toEqual([
      [450, 630],
      [525, 735],
    ])
  })

  it('makes other meals smaller when one person gets an extra snack', () => {
    const day = [
      meal('d1', 'breakfast', 'owsianka'),
      meal('d1', 'snack', 'jogurt'),
      meal('d1', 'snack', 'jogurt', ['piotr']),
    ]
    // Piotr's day is 30 + 35 + 10 + 10 + 25 = 110 parts instead of 100
    expect(mealTargets(profiles, day)).toEqual([[450, 573], [150, 191], [191]])
  })
})

describe('recipeFit', () => {
  it('ranks by the portion furthest from one serving', () => {
    const owsianka = recipes.get('owsianka')!
    expect(recipeFit(owsianka, [450, 675])).toMatchObject({ factors: [1, 1.5], inRange: true })
    expect(recipeFit(owsianka, [450, 900]).inRange).toBe(false)
    // ×2 and ×0.5 are equally far from 1
    expect(recipeFit(owsianka, [900]).distance).toBeCloseTo(recipeFit(owsianka, [225]).distance)
  })
})

describe('portionDay', () => {
  it('adds up each person’s plates to their daily calories once the day is complete', () => {
    const day = [
      meal('d1', 'breakfast', 'owsianka'),
      meal('d1', 'lunch', 'kurczak'),
      meal('d1', 'snack', 'jogurt'),
      meal('d1', 'snack', 'jogurt', ['piotr']),
      meal('d1', 'dinner', 'kurczak'),
    ]
    const { totals } = portionDay(recipes, profiles, day)
    expect(totals.ola.kcal).toBe(1500)
    // 573 + 668 + 191 + 191 + 477, rounded per meal
    expect(totals.piotr.kcal).toBe(2100)
  })
})

describe('shoppingList', () => {
  it('merges ingredients across days, sums matching units and skips water', () => {
    const plan = [
      meal('d1', 'breakfast', 'owsianka', ['ola']),
      meal('d2', 'breakfast', 'owsianka', ['ola']),
      meal('d2', 'lunch', 'kurczak', ['ola']),
    ]
    expect(shoppingList(recipes, profiles, plan)).toEqual([
      // breakfasts: 450 kcal → 1× → 1 banana each; lunch: 525 kcal → 1.05× → 63 g of banana without a unit
      { name: 'Banan', grams: 120 + 120 + 65 },
      { name: 'Mięso z piersi kurczaka', grams: 160 },
      { name: 'Płatki owsiane', grams: 60 + 60 },
    ])
  })

  it('shows kitchen measures as grams only, rounded to whole grams', () => {
    const syrup = recipe('syrop', 450, [
      { name: 'Miód', grams: 7.5, amount: 0.5, unit: 'łyżki' },
      { name: 'Lód, kostki', grams: 60, amount: 2, unit: 'sztuki' },
    ])
    const list = shoppingList(new Map([['syrop', syrup]]), profiles, [meal('d1', 'breakfast', 'syrop', ['ola'])])
    // 7.5 g × 1 → 7.5 g → 8 g, no "0.5 łyżki"; ice isn't bought
    expect(list).toEqual([{ name: 'Miód', grams: 8 }])
  })

  it('keeps the household measure when all uses share a unit', () => {
    const plan = [meal('d1', 'snack', 'jogurt', ['ola']), meal('d1', 'snack', 'jogurt', ['ola'])]
    // Two snacks: 1500 × 10 / 110 = 136 kcal each → 0.91× → rounded to 1 pack each
    expect(shoppingList(recipes, profiles, plan)).toEqual([
      { name: 'Jogurt naturalny 2%', grams: 300, amount: 2, unit: 'opakowanie' },
    ])
  })
})
