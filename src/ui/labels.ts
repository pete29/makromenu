import type { MealType } from '../engine/profile'

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Śniadanie',
  lunch: 'Obiad',
  snack: 'Przekąska',
  dinner: 'Kolacja',
}

/** Meal types in the order of the day. */
export const MEAL_TYPES = Object.keys(MEAL_LABELS) as MealType[]
