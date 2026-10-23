import Dexie from 'dexie'
import { BACKUP_VERSION, restoreBackup, type Backup } from './backup'

const LEGACY_DB = 'makromenu'

/**
 * Moves data from the database used before cloud sync ("makromenu", with ids like "rosol" and
 * auto-increment meal ids) into the synced one, once, then deletes the old database.
 */
export async function migrateLegacyDatabase(): Promise<void> {
  if (!(await Dexie.exists(LEGACY_DB))) return
  const legacy = new Dexie(LEGACY_DB)
  try {
    await legacy.open()
    const read = (name: string) => (legacy.tables.some((t) => t.name === name) ? legacy.table(name).toArray() : [])
    const [recipes, profiles, mealPlan, checks] = await Promise.all([
      read('recipes'),
      read('profiles'),
      read('mealPlan'),
      read('shoppingChecks'),
    ])
    if (recipes.length + mealPlan.length + profiles.length > 0) {
      const backup: Backup = {
        app: 'makromenu',
        version: BACKUP_VERSION,
        exportedAt: '',
        recipes: recipes.filter((r) => !r.sample),
        profiles,
        mealPlan,
        shoppingChecks: checks.map((c) => c.name),
      }
      await restoreBackup(backup)
    }
  } finally {
    legacy.close()
  }
  await Dexie.delete(LEGACY_DB)
}
