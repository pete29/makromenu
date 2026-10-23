import Dexie, { type EntityTable } from 'dexie'
import type { PlannedMeal } from '../engine/plan'
import { DEFAULT_DAILY_KCAL, DEFAULT_MEALS, type Profile } from '../engine/profile'
import type { Recipe } from '../engine/types'
import samples from './samples.json'

export interface StoredRecipe extends Recipe {
  /** Bundled demo recipe, removed when the user imports their own. */
  sample?: boolean
}

export interface StoredMeal extends PlannedMeal {
  id: number
}

/** A ticked-off item on the shopping list, by product name. */
export interface ShoppingCheck {
  name: string
}

export const db = new Dexie('makromenu') as Dexie & {
  recipes: EntityTable<StoredRecipe, 'id'>
  profiles: EntityTable<Profile, 'id'>
  mealPlan: EntityTable<StoredMeal, 'id'>
  shoppingChecks: EntityTable<ShoppingCheck, 'name'>
}

db.version(1).stores({
  recipes: 'id, name',
  profiles: 'id',
  mealPlan: '++id, date',
})
db.version(2).stores({
  shoppingChecks: 'name',
})

/** Replaces the bundled samples with imported recipes; recipes with the same id are updated. */
export async function saveImportedRecipes(recipes: Recipe[]): Promise<void> {
  await db.transaction('rw', db.recipes, async () => {
    await db.recipes.filter((r) => r.sample === true).delete()
    await db.recipes.bulkPut(recipes)
  })
}

// Runs once, when the database is created on this device.
db.on('populate', async (tx) => {
  await tx.table('recipes').bulkAdd(samples.map((r) => ({ ...r, sample: true })))
  await tx.table('profiles').bulkAdd([
    { id: 'a', name: 'Osoba 1', dailyKcal: DEFAULT_DAILY_KCAL, meals: DEFAULT_MEALS },
    { id: 'b', name: 'Osoba 2', dailyKcal: DEFAULT_DAILY_KCAL, meals: DEFAULT_MEALS },
  ])
})
