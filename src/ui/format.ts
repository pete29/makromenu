import type { Ingredient } from '../engine/types'
import { normalizeText } from '../engine/text'
import { formatUnit } from '../engine/units'

const numberFormat = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 })

/** 0.5 → "0,5" */
export const formatNumber = (n: number) => numberFormat.format(n)

/** "45 g", from a kilogram up "1,25 kg" */
export const formatGrams = (g: number) => (g >= 1000 ? `${formatNumber(g / 1000)} kg` : `${formatNumber(g)} g`)

/** "2 sztuki (140 g)" or "50 g" */
export function formatIngredientAmount(ing: Pick<Ingredient, 'grams' | 'amount' | 'unit'>): string {
  const grams = formatGrams(ing.grams)
  if (ing.amount === undefined || ing.unit === undefined) return grams
  return `${formatNumber(ing.amount)} ${formatUnit(ing.amount, ing.unit)} (${grams})`
}

/** Case- and diacritics-insensitive text for search. */
export const searchKey = normalizeText
