import type { Profile } from '../engine/profile'
import type { Recipe } from '../engine/types'
import { db, type ShoppingCheck, type StoredMeal, type StoredRecipe } from './db'
import { DEFAULT_PROFILES, SAMPLE_RECIPES } from './defaults'
import { ImportError, parseRecipesJson } from './importRecipes'

export const BACKUP_VERSION = 1

export interface Backup {
  app: 'makromenu'
  version: number
  exportedAt: string
  recipes: Recipe[]
  profiles: Profile[]
  mealPlan: Omit<StoredMeal, 'id'>[]
  shoppingChecks: string[]
}

export async function createBackup(): Promise<Backup> {
  const [recipes, profiles, mealPlan, checks] = await Promise.all([
    db.recipes.toArray(),
    db.profiles.toArray(),
    db.mealPlan.toArray(),
    db.shoppingChecks.toArray(),
  ])
  return {
    app: 'makromenu',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    recipes,
    // Profiles nobody edited aren't stored, but a backup always has both people.
    profiles: DEFAULT_PROFILES.map((d) => profiles.find((p) => p.id === d.id) ?? d),
    // Ids are local to this database; restoring assigns new ones.
    mealPlan: mealPlan.map((m) => ({ date: m.date, type: m.type, recipeId: m.recipeId, profileIds: m.profileIds })),
    shoppingChecks: checks.map((c) => c.name),
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

/** Validates a backup file. Messages are shown in the app, hence Polish. */
export function parseBackup(text: string): Backup {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new ImportError('To nie jest poprawny plik JSON')
  }
  if (!isObj(data) || data.app !== 'makromenu') throw new ImportError('To nie jest kopia zapasowa Makromenu')
  if (data.version !== BACKUP_VERSION) throw new ImportError('Nieobsługiwana wersja kopii zapasowej')

  // A backup made while only the samples were in use has no recipes of its own.
  const recipes = Array.isArray(data.recipes) && data.recipes.length === 0 ? [] : parseRecipesJson(JSON.stringify(data.recipes))

  if (!Array.isArray(data.profiles) || data.profiles.length === 0) throw new ImportError('Kopia nie zawiera osób')
  const profiles = data.profiles.map((p): Profile => {
    if (!isObj(p) || typeof p.id !== 'string' || typeof p.name !== 'string' || typeof p.dailyKcal !== 'number' || !Array.isArray(p.meals)) {
      throw new ImportError('Kopia zawiera niepoprawne dane osoby')
    }
    return { id: p.id, name: p.name, dailyKcal: p.dailyKcal, meals: p.meals as Profile['meals'] }
  })
  const profileIds = new Set(profiles.map((p) => p.id))

  const mealPlan = (Array.isArray(data.mealPlan) ? data.mealPlan : []).map((m): Omit<StoredMeal, 'id'> => {
    if (
      !isObj(m) ||
      typeof m.date !== 'string' ||
      typeof m.type !== 'string' ||
      typeof m.recipeId !== 'string' ||
      !Array.isArray(m.profileIds) ||
      !m.profileIds.every((id) => profileIds.has(id as string))
    ) {
      throw new ImportError('Kopia zawiera niepoprawny posiłek w planie')
    }
    return { date: m.date, type: m.type as StoredMeal['type'], recipeId: m.recipeId, profileIds: m.profileIds as string[] }
  })

  const shoppingChecks = Array.isArray(data.shoppingChecks)
    ? data.shoppingChecks.filter((n): n is string => typeof n === 'string')
    : []

  return {
    app: 'makromenu',
    version: BACKUP_VERSION,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    recipes,
    profiles,
    mealPlan,
    shoppingChecks,
  }
}

const SAMPLE_IDS = new Set(SAMPLE_RECIPES.map((r) => r.id))

/** Profiles use per-user private ids; backups from before cloud sync have plain ones ("a"). */
const privateId = (id: string) => (id.startsWith('#') ? id : `#${id}`)

/**
 * Replaces all data (on the device and, when logged in, in the account) with the backup. Ids are
 * generated anew, so backups from before cloud sync (recipe ids like "rosol") work too.
 */
export async function restoreBackup(backup: Backup): Promise<void> {
  await db.transaction('rw', [db.recipes, db.profiles, db.mealPlan, db.shoppingChecks], async () => {
    await Promise.all([db.recipes.clear(), db.profiles.clear(), db.mealPlan.clear(), db.shoppingChecks.clear()])

    // Samples are built into the app, so older backups that stored them don't bring them back.
    const recipes = backup.recipes.filter((r) => !SAMPLE_IDS.has(r.id))
    const rows = recipes.map((r) => {
      const row: Partial<StoredRecipe> = { ...r, slug: r.slug ?? r.id }
      delete row.id
      return row as StoredRecipe
    })
    const newIds = await db.recipes.bulkAdd(rows, { allKeys: true })
    const recipeId = new Map(recipes.map((r, i) => [r.id, newIds[i]]))

    await db.profiles.bulkPut(backup.profiles.map((p) => ({ ...p, id: privateId(p.id) })))
    await db.mealPlan.bulkAdd(
      backup.mealPlan.map((m) => ({
        date: m.date,
        type: m.type,
        // Meals planned with a sample keep its id, samples have the same ids everywhere.
        recipeId: recipeId.get(m.recipeId) ?? m.recipeId,
        profileIds: m.profileIds.map(privateId),
      })) as StoredMeal[],
    )
    await db.shoppingChecks.bulkAdd(backup.shoppingChecks.map((name) => ({ name })) as ShoppingCheck[])
  })
}
