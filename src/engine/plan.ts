import type { MealType, Profile } from './profile'
import { MAX_FACTOR, MIN_FACTOR, portionMeal, type MealPortions } from './scaling'
import type { Macros, Recipe } from './types'
import { baseUnit } from './units'

export interface PlannedMeal {
  /** ISO date, e.g. "2026-10-26". */
  date: string
  type: MealType
  recipeId: string
  /** Who eats it; an extra snack can be planned for just one person. */
  profileIds: string[]
}

export interface PortionedMeal extends MealPortions {
  meal: PlannedMeal
  recipe: Recipe
}

export interface DaySummary {
  meals: PortionedMeal[]
  /** Totals per profile id. */
  totals: Record<string, Macros>
}

export interface ShoppingItem {
  name: string
  grams: number
  /** Summed household measure, only when every use had the same unit. */
  amount?: number
  unit?: string
}

/** Not bought in a shop. */
const NOT_SHOPPED = new Set(['Woda'])

const weightOf = (profile: Profile, type: MealType) =>
  profile.meals.find((m) => m.type === type)?.share ?? 0

/**
 * Calorie target of each planned meal for each person eating it. Targets are relative to the
 * person's full day from their profile (breakfast 30%, lunch 35%…), so they don't change while the
 * day is being filled in. Planning more meals of a type than the profile has (an extra snack) adds
 * that meal's weight to the day and makes the other meals smaller. Once every meal is planned,
 * the day adds up to the daily target.
 */
export function mealTargets(profiles: Profile[], dayMeals: PlannedMeal[]): number[][] {
  return dayMeals.map((meal) =>
    meal.profileIds.map((id) => {
      const profile = profiles.find((p) => p.id === id)
      if (!profile) throw new Error(`Unknown profile: ${id}`)
      const eaten = dayMeals.filter((m) => m.profileIds.includes(id))
      const types = new Set([...profile.meals.map((m) => m.type), ...eaten.map((m) => m.type)])
      let total = 0
      for (const type of types) {
        const inProfile = profile.meals.some((m) => m.type === type) ? 1 : 0
        const planned = eaten.filter((m) => m.type === type).length
        total += weightOf(profile, type) * Math.max(inProfile, planned)
      }
      return total > 0 ? Math.round((profile.dailyKcal * weightOf(profile, meal.type)) / total) : 0
    }),
  )
}

export interface RecipeFit {
  factors: number[]
  inRange: boolean
  /** 0 = every portion is exactly one serving; ×2 and ×0.5 count as equally far. */
  distance: number
}

/** How well a recipe fits the calorie targets of one meal; lower distance fits better. */
export function recipeFit(recipe: Recipe, targetsKcal: number[]): RecipeFit {
  const factors = targetsKcal.map((t) => t / recipe.kcal)
  return {
    factors,
    inRange: factors.every((f) => f >= MIN_FACTOR && f <= MAX_FACTOR),
    distance: Math.max(...factors.map((f) => Math.abs(Math.log(f)))),
  }
}

/** Portions for all meals of one day plus kcal and macros per person. */
export function portionDay(recipes: Map<string, Recipe>, profiles: Profile[], dayMeals: PlannedMeal[]): DaySummary {
  const targets = mealTargets(profiles, dayMeals)
  const totals: Record<string, Macros> = {}
  for (const p of profiles) totals[p.id] = { kcal: 0, protein: 0, carbs: 0, fat: 0 }

  const meals = dayMeals.map((meal, i) => {
    const recipe = recipes.get(meal.recipeId)
    if (!recipe) throw new Error(`Unknown recipe: ${meal.recipeId}`)
    const portions = portionMeal(recipe, targets[i])
    portions.plates.forEach((plate, j) => {
      const t = totals[meal.profileIds[j]]
      t.kcal += plate.kcal
      t.protein += plate.protein
      t.carbs += plate.carbs
      t.fat += plate.fat
    })
    return { meal, recipe, ...portions }
  })
  return { meals, totals }
}

/** Everything to buy for the given meals (any number of days), merged by ingredient name. */
export function shoppingList(recipes: Map<string, Recipe>, profiles: Profile[], meals: PlannedMeal[]): ShoppingItem[] {
  const byDate = new Map<string, PlannedMeal[]>()
  for (const m of meals) byDate.set(m.date, [...(byDate.get(m.date) ?? []), m])
  const items = new Map<string, ShoppingItem & { mixedUnits?: boolean }>()

  for (const dayMeals of byDate.values()) {
    for (const { cook } of portionDay(recipes, profiles, dayMeals).meals) {
      for (const ing of cook) {
        if (NOT_SHOPPED.has(ing.name)) continue
        const unit = ing.unit && baseUnit(ing.unit)
        const item = items.get(ing.name)
        if (!item) {
          items.set(ing.name, { name: ing.name, grams: ing.grams, amount: ing.amount, unit })
          continue
        }
        item.grams += ing.grams
        if (!item.mixedUnits && unit && unit === item.unit && item.amount !== undefined) {
          item.amount += ing.amount!
        } else {
          item.mixedUnits = true
        }
      }
    }
  }

  return [...items.values()]
    .map(({ mixedUnits, amount, unit, ...item }) => ({
      ...item,
      grams: Math.round(item.grams * 100) / 100,
      ...(!mixedUnits && amount !== undefined ? { amount, unit } : {}),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pl'))
}
