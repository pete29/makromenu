// Polish household units as they appear in the recipes, reduced to a base form so amounts can be
// scaled and then printed with the right inflection again.

interface UnitForms {
  /** 1 sztuka */
  one: string
  /** 2–4 sztuki (but not 12–14) */
  few: string
  /** 5+ sztuk */
  many: string
  /** 0.5 / 1.5 sztuki */
  fraction: string
  /** Rounding step when scaling, in units. */
  step: number
}

const UNITS: Record<string, UnitForms> = {
  sztuka: { one: 'sztuka', few: 'sztuki', many: 'sztuk', fraction: 'sztuki', step: 0.5 },
  łyżeczka: { one: 'łyżeczka', few: 'łyżeczki', many: 'łyżeczek', fraction: 'łyżeczki', step: 0.5 },
  łyżka: { one: 'łyżka', few: 'łyżki', many: 'łyżek', fraction: 'łyżki', step: 0.5 },
  kromka: { one: 'kromka', few: 'kromki', many: 'kromek', fraction: 'kromki', step: 0.5 },
  plaster: { one: 'plaster', few: 'plastry', many: 'plastrów', fraction: 'plastra', step: 0.5 },
  ząbek: { one: 'ząbek', few: 'ząbki', many: 'ząbków', fraction: 'ząbka', step: 0.5 },
  szklanka: { one: 'szklanka', few: 'szklanki', many: 'szklanek', fraction: 'szklanki', step: 0.25 },
  szczypta: { one: 'szczypta', few: 'szczypty', many: 'szczypt', fraction: 'szczypty', step: 1 },
  opakowanie: { one: 'opakowanie', few: 'opakowania', many: 'opakowań', fraction: 'opakowania', step: 0.5 },
  garść: { one: 'garść', few: 'garści', many: 'garści', fraction: 'garści', step: 0.5 },
  łodyga: { one: 'łodyga', few: 'łodygi', many: 'łodyg', fraction: 'łodygi', step: 0.5 },
  filiżanka: { one: 'filiżanka', few: 'filiżanki', many: 'filiżanek', fraction: 'filiżanki', step: 0.5 },
}

const BASE_BY_FORM = new Map<string, string>()
for (const [base, f] of Object.entries(UNITS)) {
  for (const form of [f.one, f.few, f.many, f.fraction]) BASE_BY_FORM.set(form, base)
}
// The PDF also uses "0.5 ząbku".
BASE_BY_FORM.set('ząbku', 'ząbek')

/** "sztuki" → "sztuka"; unknown units are returned unchanged. */
export function baseUnit(unit: string): string {
  return BASE_BY_FORM.get(unit.trim()) ?? unit.trim()
}

export function unitStep(unit: string): number {
  return UNITS[baseUnit(unit)]?.step ?? 0.5
}

/** Inflects the unit for the amount: 1 sztuka, 2 sztuki, 5 sztuk, 1.5 sztuki. */
export function formatUnit(amount: number, unit: string): string {
  const f = UNITS[baseUnit(unit)]
  if (!f) return unit
  if (!Number.isInteger(amount)) return f.fraction
  if (amount === 1) return f.one
  const mod10 = amount % 10
  const mod100 = amount % 100
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return f.few
  return f.many
}
