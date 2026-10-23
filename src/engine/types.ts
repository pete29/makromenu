import type { MealType } from './profile'

export interface Macros {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface Ingredient {
  name: string
  /** Weight for the whole recipe (all servings). */
  grams: number
  /** Household measure, e.g. 2 "sztuki" for 140 g. */
  amount?: number
  unit?: string
  /** Sub-section of the ingredient list, e.g. "Sos". */
  group?: string
}

/** Recipe as produced by scripts/import-pdf.mjs. Macros are per serving. */
export interface Recipe extends Macros {
  id: string
  name: string
  timeMin?: number
  servings: number
  ingredients: Ingredient[]
  steps: string[]
  /** Meals the recipe fits, set by hand; guessed when absent (see mealTypes.ts). */
  mealTypes?: MealType[]
}
