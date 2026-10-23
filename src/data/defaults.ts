import { DEFAULT_DAILY_KCAL, DEFAULT_MEALS, type Profile } from '../engine/profile'
import type { Recipe } from '../engine/types'
import type { StoredRecipe } from './db'
import samples from './samples.json'

/** Shown until the user imports their own recipes. */
export const SAMPLE_RECIPES: StoredRecipe[] = (samples as Recipe[]).map((r) => ({ ...r, sample: true }))

/** Used until a profile is edited; private ids ("#…") are per user, so they never clash between accounts. */
export const DEFAULT_PROFILES: Profile[] = [
  { id: '#a', name: 'Osoba 1', dailyKcal: DEFAULT_DAILY_KCAL, meals: DEFAULT_MEALS },
  { id: '#b', name: 'Osoba 2', dailyKcal: DEFAULT_DAILY_KCAL, meals: DEFAULT_MEALS },
]
