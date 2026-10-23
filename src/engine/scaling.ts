import type { Ingredient, Macros, Recipe } from './types'
import { baseUnit, unitStep } from './units'

/** Outside this range a portion stops making sense (half a burger, a double pot of soup). */
export const MIN_FACTOR = 0.6
export const MAX_FACTOR = 1.6

export interface ScaledIngredient extends Ingredient {
  /** False for ingredients that stay as in the recipe, e.g. a pinch of salt. */
  scaled: boolean
}

export interface Plate extends Macros {
  targetKcal: number
  /** Portion size relative to one serving of the recipe. */
  factor: number
  /** Part of the cooked pot that goes on this plate, 0–1. */
  share: number
  inRange: boolean
}

export interface MealPortions {
  /** What to measure out and cook for everyone together. */
  cook: ScaledIngredient[]
  plates: Plate[]
}

const isFixed = (ing: Ingredient) => ing.unit !== undefined && baseUnit(ing.unit) === 'szczypta'

/** Grams are rounded more coarsely the bigger they get: 3 g, 45 g, 180 g. */
export function roundGrams(g: number): number {
  const step = g < 10 ? 1 : g < 100 ? 5 : 10
  return Math.max(1, Math.round(g / step) * step)
}

/** Rounds to the unit's step, but never down to zero: 0.2 onion becomes 0.25, not nothing. */
export function roundAmount(amount: number, step: number): number {
  const r = Math.round(amount / step) * step
  return r > 0 ? r : Math.max(step / 2, Math.round(amount / (step / 2)) * (step / 2))
}

function scaleIngredient(ing: Ingredient, multiplier: number, servings: number): ScaledIngredient {
  if (isFixed(ing)) return { ...ing, scaled: false }
  // Recipe quantities are for all servings, the multiplier is in servings.
  const ratio = multiplier / servings
  if (ing.amount !== undefined && ing.unit !== undefined) {
    const unitGrams = ing.grams / ing.amount
    const amount = roundAmount(ing.amount * ratio, unitStep(ing.unit))
    return { ...ing, amount, grams: Math.round(unitGrams * amount * 100) / 100, scaled: true }
  }
  return { ...ing, grams: roundGrams(ing.grams * ratio), scaled: true }
}

/**
 * Everyone's part of the cooked ingredients, for dishes assembled per plate (sandwiches, salads).
 * Plates are rounded one by one and the last gets what's left, so together they use up the pot.
 * Pinches are left out: they season the whole pot.
 */
export function splitIntoPlates(cook: ScaledIngredient[], shares: number[]): Ingredient[][] {
  const plates: Ingredient[][] = shares.map(() => [])
  for (const ing of cook.filter((i) => i.scaled)) {
    const base = { name: ing.name, ...(ing.group ? { group: ing.group } : {}) }
    const counted = ing.amount !== undefined && ing.unit !== undefined
    // Pieces/spoons when the ingredient has a household unit, grams otherwise.
    const total = counted ? ing.amount! : ing.grams
    let left = total
    shares.forEach((share, i) => {
      const last = i === shares.length - 1
      const raw = last ? left : counted ? roundAmount(total * share, unitStep(ing.unit!)) : roundGrams(total * share)
      const part = Math.max(0, Math.min(left, Math.round(raw * 100) / 100))
      left -= part
      if (part === 0) return
      plates[i].push(
        counted
          ? { ...base, amount: part, unit: ing.unit, grams: Math.round((ing.grams / ing.amount!) * part * 100) / 100 }
          : { ...base, grams: part },
      )
    })
  }
  return plates
}

const scaleMacros =(m: Macros, f: number): Macros => ({
  kcal: Math.round(m.kcal * f),
  protein: Math.round(m.protein * f),
  carbs: Math.round(m.carbs * f),
  fat: Math.round(m.fat * f),
})

/**
 * Portions of one recipe for several people eating the same meal, each with their own calorie
 * target for it. Calories scale linearly with ingredient weights, so a person's factor is simply
 * target ÷ kcal per serving. The pot is cooked for the sum of factors and split by share.
 */
export function portionMeal(recipe: Recipe, targetsKcal: number[]): MealPortions {
  const factors = targetsKcal.map((t) => t / recipe.kcal)
  const total = factors.reduce((a, f) => a + f, 0)
  return {
    cook: recipe.ingredients.map((ing) => scaleIngredient(ing, total, recipe.servings)),
    plates: factors.map((factor, i) => ({
      ...scaleMacros(recipe, factor),
      targetKcal: targetsKcal[i],
      factor,
      share: factor / total,
      inRange: factor >= MIN_FACTOR && factor <= MAX_FACTOR,
    })),
  }
}
