import { MEAL_TYPES } from '../engine/profile'
import type { Ingredient, Recipe } from '../engine/types'

// Messages are shown in the app, hence Polish.
export class ImportError extends Error {}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''

function parseIngredient(v: unknown, where: string): Ingredient {
  const i = v as Record<string, unknown>
  if (!i || !isStr(i.name) || !isNum(i.grams)) throw new ImportError(`${where}: składnik bez nazwy lub gramatury`)
  return {
    name: i.name,
    grams: i.grams,
    ...(isNum(i.amount) && isStr(i.unit) ? { amount: i.amount, unit: i.unit } : {}),
    ...(isStr(i.group) ? { group: i.group } : {}),
  }
}

function parseRecipe(v: unknown, index: number): Recipe {
  const r = v as Record<string, unknown>
  const where = `Przepis ${index + 1}${r && isStr(r.name) ? ` („${r.name}”)` : ''}`
  if (!r || !isStr(r.id) || !isStr(r.name)) throw new ImportError(`${where}: brak id lub nazwy`)
  for (const key of ['kcal', 'protein', 'carbs', 'fat'] as const) {
    if (!isNum(r[key]) || r[key] < 0) throw new ImportError(`${where}: niepoprawne pole ${key}`)
  }
  if (r.kcal === 0) throw new ImportError(`${where}: kcal nie może wynosić 0`)
  if (!Array.isArray(r.ingredients) || r.ingredients.length === 0) throw new ImportError(`${where}: brak składników`)
  // Unknown types are dropped; with none left the app guesses them.
  const mealTypes = Array.isArray(r.mealTypes) ? MEAL_TYPES.filter((t) => (r.mealTypes as unknown[]).includes(t)) : []
  return {
    id: r.id,
    name: r.name,
    kcal: r.kcal as number,
    protein: r.protein as number,
    carbs: r.carbs as number,
    fat: r.fat as number,
    servings: isNum(r.servings) && r.servings > 0 ? r.servings : 1,
    ...(isNum(r.timeMin) ? { timeMin: r.timeMin } : {}),
    ingredients: r.ingredients.map((i) => parseIngredient(i, where)),
    steps: Array.isArray(r.steps) ? r.steps.filter(isStr) : [],
    ...(mealTypes.length > 0 ? { mealTypes } : {}),
    ...(isStr(r.slug) ? { slug: r.slug } : {}),
  }
}

/** Validates a recipes JSON file (output of scripts/import-pdf.mjs). */
export function parseRecipesJson(text: string): Recipe[] {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new ImportError('To nie jest poprawny plik JSON')
  }
  if (!Array.isArray(data) || data.length === 0) throw new ImportError('Plik nie zawiera listy przepisów')
  const recipes = data.map(parseRecipe)
  const ids = new Set(recipes.map((r) => r.id))
  if (ids.size !== recipes.length) throw new ImportError('Plik zawiera przepisy o powtórzonym id')
  return recipes
}
