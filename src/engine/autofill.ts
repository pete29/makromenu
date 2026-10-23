import { mealTypesOf } from './mealTypes'
import { mealTargets, recipeFit, type PlannedMeal } from './plan'
import { MEAL_TYPES, type MealType, type Profile } from './profile'
import type { Recipe } from './types'

// Score weights: lower total wins. A poor calorie fit or a repeat costs about as much as a portion
// twice the recipe size (distance ln 2 ≈ 0.7).
const OUT_OF_RANGE = 1
const PER_REPEAT = 0.6
const SAME_OR_NEXT_DAY = 1
const RANDOMNESS = 0.15

const dayIndex = (iso: string) => Math.round(Date.parse(`${iso}T12:00:00Z`) / 86_400_000)

/** People who have this meal in their day. */
const eatersOf = (profiles: Profile[], type: MealType) =>
  profiles.filter((p) => p.meals.some((m) => m.type === type && m.share > 0)).map((p) => p.id)

/**
 * Plans every empty meal of the given days. Each slot gets the recipe of the right type with the
 * best score: portion close to one serving for everyone, few repeats in the period and none on
 * neighbouring days, plus a little randomness so refills differ. Existing meals are kept.
 */
export function autofillDays(
  recipes: Recipe[],
  profiles: Profile[],
  days: string[],
  existing: PlannedMeal[],
  random: () => number = Math.random,
): PlannedMeal[] {
  const planned = [...existing]
  const added: PlannedMeal[] = []

  for (const date of days) {
    for (const type of MEAL_TYPES) {
      const dayMeals = planned.filter((m) => m.date === date)
      if (dayMeals.some((m) => m.type === type)) continue
      const profileIds = eatersOf(profiles, type)
      if (profileIds.length === 0) continue
      const candidates = recipes.filter((r) => mealTypesOf(r).includes(type))
      if (candidates.length === 0) continue

      // Targets depend on the slot, not on the recipe.
      const slot = { date, type, recipeId: '', profileIds }
      const targets = mealTargets(profiles, [...dayMeals, slot])[dayMeals.length]

      let best: { recipe: Recipe; score: number } | undefined
      for (const recipe of candidates) {
        const uses = planned.filter((m) => m.recipeId === recipe.id)
        const fit = recipeFit(recipe, targets)
        const score =
          fit.distance +
          (fit.inRange ? 0 : OUT_OF_RANGE) +
          uses.length * PER_REPEAT +
          (uses.some((m) => Math.abs(dayIndex(m.date) - dayIndex(date)) <= 1) ? SAME_OR_NEXT_DAY : 0) +
          random() * RANDOMNESS
        if (!best || score < best.score) best = { recipe, score }
      }

      const meal = { ...slot, recipeId: best!.recipe.id }
      planned.push(meal)
      added.push(meal)
    }
  }
  return added
}
