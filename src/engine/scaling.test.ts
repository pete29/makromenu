import { describe, expect, it } from 'vitest'
import { plateIngredients, portionMeal, roundAmount, roundGrams } from './scaling'
import type { Recipe } from './types'

const omelette: Recipe = {
  id: 'omlet',
  name: 'Omlet z szynką',
  kcal: 400,
  protein: 30,
  carbs: 4,
  fat: 28,
  servings: 1,
  ingredients: [
    { name: 'Jajko kurze całe', grams: 112, amount: 2, unit: 'sztuki' },
    { name: 'Szynka z indyka', grams: 30 },
    { name: 'Masło extra', grams: 5, amount: 1, unit: 'łyżeczka' },
    { name: 'Sól', grams: 0.25, amount: 1, unit: 'szczypta' },
    { name: 'Szczypiorek siekany', grams: 5 },
  ],
  steps: [],
}

const soup: Recipe = {
  id: 'zupa',
  name: 'Zupa marchewkowa',
  kcal: 300,
  protein: 8,
  carbs: 40,
  fat: 12,
  servings: 2,
  ingredients: [
    { name: 'Marchew', grams: 200 },
    { name: 'Cebula', grams: 80, amount: 1, unit: 'sztuka' },
  ],
  steps: [],
}

describe('portionMeal', () => {
  it('cooks one pot for the sum of both portions', () => {
    const { cook } = portionMeal(omelette, [400, 600])
    expect(cook).toEqual([
      { name: 'Jajko kurze całe', grams: 280, amount: 5, unit: 'sztuki', scaled: true },
      { name: 'Szynka z indyka', grams: 75, scaled: true },
      { name: 'Masło extra', grams: 12.5, amount: 2.5, unit: 'łyżeczka', scaled: true },
      { name: 'Sól', grams: 0.25, amount: 1, unit: 'szczypta', scaled: false },
      { name: 'Szczypiorek siekany', grams: 15, scaled: true },
    ])
  })

  it('splits the pot by calorie target', () => {
    const { plates } = portionMeal(omelette, [400, 600])
    expect(plates.map((p) => p.share)).toEqual([0.4, 0.6])
    expect(plates[1]).toMatchObject({ kcal: 600, protein: 45, carbs: 6, fat: 42, factor: 1.5 })
  })

  it('flags portions that are scaled too far', () => {
    const { plates } = portionMeal(omelette, [200, 400, 700])
    expect(plates.map((p) => p.inRange)).toEqual([false, true, false])
  })

  it('treats ingredients of multi-serving recipes as the whole pot', () => {
    const { cook, plates } = portionMeal(soup, [300])
    expect(cook).toEqual([
      { name: 'Marchew', grams: 100, scaled: true },
      { name: 'Cebula', grams: 40, amount: 0.5, unit: 'sztuka', scaled: true },
    ])
    expect(plates[0]).toMatchObject({ kcal: 300, factor: 1, share: 1 })
  })
})

describe('plateIngredients', () => {
  it('gives each person their share of the pot, without pinches', () => {
    const { cook, plates } = portionMeal(omelette, [400, 600])
    expect(plateIngredients(cook, plates[0].share)).toEqual([
      { name: 'Jajko kurze całe', grams: 112, amount: 2, unit: 'sztuki' },
      { name: 'Szynka z indyka', grams: 30 },
      { name: 'Masło extra', grams: 5, amount: 1, unit: 'łyżeczka' },
      { name: 'Szczypiorek siekany', grams: 6 },
    ])
  })
})

describe('rounding', () => {
  it('rounds grams more coarsely as they grow', () => {
    expect([0.3, 3.4, 47, 183].map(roundGrams)).toEqual([1, 3, 45, 180])
  })

  it('never rounds a unit amount down to zero', () => {
    expect(roundAmount(0.1, 0.5)).toBe(0.25)
    expect(roundAmount(1.2, 0.5)).toBe(1)
    expect(roundAmount(1.3, 0.5)).toBe(1.5)
  })
})
