import type { MealType } from './profile'
import { normalizeText } from './text'
import type { Recipe } from './types'

export const SNACK_MAX_KCAL = 250
export const LIGHT_MAX_KCAL = 440

/** Hearty dishes that also make a dinner, not just a lunch. */
const ALSO_DINNER = /zupa|rosol|kapusniak|botwinka|salatka|kebab|quesadilla|tortilla|pizza|burger|nalesnik/

/**
 * Meal types guessed from calories and name: light dishes are breakfast or dinner, hearty ones
 * lunch. Matches typical targets of 450 / 525 / 150 / 375 kcal and is corrected by hand in the app.
 */
export function guessMealTypes(recipe: Pick<Recipe, 'name' | 'kcal'>): MealType[] {
  if (recipe.kcal < SNACK_MAX_KCAL) return ['snack']
  if (recipe.kcal < LIGHT_MAX_KCAL) return ['breakfast', 'dinner']
  return ALSO_DINNER.test(normalizeText(recipe.name)) ? ['lunch', 'dinner'] : ['lunch']
}

/** Types set by hand, or guessed when there are none. */
export const mealTypesOf = (recipe: Pick<Recipe, 'name' | 'kcal' | 'mealTypes'>): MealType[] =>
  recipe.mealTypes ?? guessMealTypes(recipe)
