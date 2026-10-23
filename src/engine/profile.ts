export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner'

/** Meal types in the order of the day. */
export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner']

export interface MealSlot {
  type: MealType
  /** Relative part of the daily calories; shares don't have to add up to 1. */
  share: number
}

export interface Profile {
  id: string
  name: string
  dailyKcal: number
  meals: MealSlot[]
}

export const DEFAULT_DAILY_KCAL = 1500

export const DEFAULT_MEALS: MealSlot[] = [
  { type: 'breakfast', share: 0.3 },
  { type: 'lunch', share: 0.35 },
  { type: 'snack', share: 0.1 },
  { type: 'dinner', share: 0.25 },
]

/** Calorie target for the profile's meal at the given position in the day. */
export function mealTargetKcal(profile: Profile, mealIndex: number): number {
  const total = profile.meals.reduce((a, m) => a + m.share, 0)
  return Math.round((profile.dailyKcal * profile.meals[mealIndex].share) / total)
}
