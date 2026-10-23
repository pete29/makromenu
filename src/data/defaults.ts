import { DEFAULT_DAILY_KCAL, DEFAULT_MEALS, type Profile } from '../engine/profile'
import type { Recipe } from '../engine/types'
import type { StoredRecipe } from './db'
import samples from './samples.json'

/** Shown until the user imports their own recipes. */
export const SAMPLE_RECIPES: StoredRecipe[] = (samples as Recipe[]).map((r) => ({ ...r, sample: true }))

/** The two people of the plan. Profiles and meals refer to them by an id built from the slot. */
export const PROFILE_SLOTS = ['a', 'b'] as const

/**
 * Profile ids must be unique across accounts: private ones ("#a") are per user by definition,
 * shared ones are tied to the shared realm ("<realmId>:a").
 */
export const profileId = (slot: string, realmId?: string | null) => (realmId ? `${realmId}:${slot}` : `#${slot}`)

/** "#a", "<realmId>:a" and the pre-sync "a" are all person "a". */
export const slotOf = (id: string) => id.split(/[#:]/).pop()!

/** Used until a profile is edited, so nothing is stored for people nobody has set up. */
export const defaultProfiles = (realmId?: string | null): Profile[] =>
  PROFILE_SLOTS.map((slot, i) => ({
    id: profileId(slot, realmId),
    name: `Osoba ${i + 1}`,
    dailyKcal: DEFAULT_DAILY_KCAL,
    meals: DEFAULT_MEALS,
  }))
