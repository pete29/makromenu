import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import type { Profile } from '../engine/profile'
import { db, type StoredRecipe } from './db'
import { DEFAULT_PROFILES, SAMPLE_RECIPES } from './defaults'

/** Stored recipes, or the bundled samples while there are none. */
export function useRecipes(): StoredRecipe[] | undefined {
  const stored = useLiveQuery(() => db.recipes.toArray(), [])
  return stored && (stored.length > 0 ? stored : SAMPLE_RECIPES)
}

export function useRecipeMap(): Map<string, StoredRecipe> | undefined {
  const recipes = useRecipes()
  return useMemo(() => recipes && new Map(recipes.map((r) => [r.id, r])), [recipes])
}

/** Both people, with defaults for a profile that was never edited. */
export function useProfiles(): Profile[] | undefined {
  const stored = useLiveQuery(() => db.profiles.toArray(), [])
  return useMemo(() => stored && DEFAULT_PROFILES.map((d) => stored.find((p) => p.id === d.id) ?? d), [stored])
}
