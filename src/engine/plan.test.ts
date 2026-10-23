import { describe, expect, it } from 'vitest'
import { mealTargets, portionDay, shoppingList, type PlannedMeal } from './plan'
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
  it('splits each person’s day across the meals they eat', () => {
    const day = [meal('d1', 'breakfast', 'owsianka'), meal('d1', 'lunch', 'kurczak')]
    // breakfast : lunch = 30 : 35
    expect(mealTargets(profiles, day)).toEqual([
      [692, 969],
      [808, 1131],
    ])
  })

  it('makes other meals smaller when one person gets an extra snack', () => {
    const day = [meal('d1', 'breakfast', 'owsianka'), meal('d1', 'snack', 'jogurt', ['piotr'])]
    // Ola: breakfast only. Piotr: breakfast : snack = 30 : 10
    expect(mealTargets(profiles, day)).toEqual([[1500, 1575], [525]])
  })
})

describe('portionDay', () => {
  it('adds up each person’s plates to their daily calories', () => {
    const day = [meal('d1', 'breakfast', 'owsianka'), meal('d1', 'lunch', 'kurczak')]
    const { totals } = portionDay(recipes, profiles, day)
    expect(totals.ola.kcal).toBe(1500)
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
      // d1: 1500 kcal breakfast → 3.33× → 3.5 bananas; d2: 692 kcal → 1.54× → 1.5 + 60 g × 1.62 without a unit
      { name: 'Banan', grams: 420 + 180 + 95 },
      { name: 'Mięso z piersi kurczaka', grams: 240 },
      { name: 'Płatki owsiane', grams: 200 + 90 },
    ])
  })

  it('keeps the household measure when all uses share a unit', () => {
    const plan = [meal('d1', 'snack', 'jogurt', ['ola']), meal('d1', 'snack', 'jogurt', ['ola'])]
    // Two snacks share Ola's whole day: 750 kcal each → 5× → 5 packs each
    expect(shoppingList(recipes, profiles, plan)).toEqual([
      { name: 'Jogurt naturalny 2%', grams: 1500, amount: 10, unit: 'opakowanie' },
    ])
  })
})
