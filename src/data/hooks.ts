import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
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

/**
 * Object URLs for recipe photos by recipe id. Created in an effect and revoked in its cleanup, so
 * StrictMode's double mount in development doesn't leave the page with revoked URLs.
 */
function useImageUrls(query: () => Promise<{ recipeId: string; blob: Blob }[]>, deps: unknown[]) {
  const images = useLiveQuery(query, deps)
  const [urls, setUrls] = useState<Map<string, string>>(new Map())
  useEffect(() => {
    if (!images) return
    const created = new Map(images.map((i) => [i.recipeId, URL.createObjectURL(i.blob)]))
    setUrls(created)
    return () => created.forEach((url) => URL.revokeObjectURL(url))
  }, [images])
  return urls
}

/** Photos of all recipes, for lists. */
export const useRecipeImageUrls = () => useImageUrls(() => db.recipeImages.toArray(), [])

/** Photo of one recipe, if it has one. */
export const useRecipeImageUrl = (recipeId: string): string | undefined =>
  useImageUrls(() => db.recipeImages.where('recipeId').equals(recipeId).toArray(), [recipeId]).get(recipeId)
