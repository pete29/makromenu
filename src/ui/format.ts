import type { Ingredient } from '../engine/types'
import { formatUnit } from '../engine/units'

const numberFormat = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 })

/** 0.5 → "0,5" */
export const formatNumber = (n: number) => numberFormat.format(n)

/** "2 sztuki (140 g)" or "50 g" */
export function formatIngredientAmount(ing: Ingredient): string {
  const grams = `${formatNumber(ing.grams)} g`
  if (ing.amount === undefined || ing.unit === undefined) return grams
  return `${formatNumber(ing.amount)} ${formatUnit(ing.amount, ing.unit)} (${grams})`
}

/** Case- and diacritics-insensitive text for search: "Łosoś" → "losos". */
export const searchKey = (s: string) =>
  s.toLocaleLowerCase('pl').normalize('NFD').replace(/\p{M}/gu, '').replace(/ł/g, 'l')
