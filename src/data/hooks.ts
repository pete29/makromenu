import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import type { Profile } from '../engine/profile'
import { db, type StoredMeal, type StoredRecipe } from './db'
import { defaultProfiles, SAMPLE_RECIPES } from './defaults'
import { useHouseholdRealmId } from './household'

/** Stored recipes, or the bundled samples while there are none. */
export function useRecipes(): StoredRecipe[] | undefined {
  const stored = useLiveQuery(() => db.recipes.toArray(), [])
  return stored && (stored.length > 0 ? stored : SAMPLE_RECIPES)
}

export function useRecipeMap(): Map<string, StoredRecipe> | undefined {
  const recipes = useRecipes()
  return useMemo(() => recipes && new Map(recipes.map((r) => [r.id, r])), [recipes])
}

/** Both people (of the shared plan, if there is one), with defaults for a profile never edited. */
export function useProfiles(): Profile[] | undefined {
  const stored = useLiveQuery(() => db.profiles.toArray(), [])
  const realmId = useHouseholdRealmId()
  return useMemo(
    () =>
      stored && realmId !== undefined
        ? defaultProfiles(realmId).map((d) => stored.find((p) => p.id === d.id) ?? d)
        : undefined,
    [stored, realmId],
  )
}

/**
 * Planned meals between two dates (inclusive), only those of the current plan. Meals of another
 * plan can be synced too, e.g. ones left in the private realm after joining the shared plan, or
 * shared ones arriving before the realm membership that tells us we are in it. Their eaters aren't
 * among the profiles, and the plan's calculations can't portion a meal for an unknown person.
 */
export function useMeals(from: string, to: string): StoredMeal[] | undefined {
  const meals = useLiveQuery(() => db.mealPlan.where('date').between(from, to, true, true).toArray(), [from, to])
  const profiles = useProfiles()
  return useMemo(() => {
    if (!meals || !profiles) return undefined
    const ids = new Set(profiles.map((p) => p.id))
    return meals.filter((m) => m.profileIds.every((id) => ids.has(id)))
  }, [meals, profiles])
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
