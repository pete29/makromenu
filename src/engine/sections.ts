// Store sections guessed from the product name, in the order you walk through a typical shop.
// A stop-gap until the ingredient database (Phase 2) stores the section per product.

import { normalizeText } from './text'

export const SECTIONS = [
  'Warzywa i owoce',
  'Mięso i ryby',
  'Nabiał i jajka',
  'Pieczywo',
  'Makarony, ryż, mąki',
  'Słoiki, puszki, sosy',
  'Oleje, orzechy, słodkie',
  'Przyprawy',
  'Inne',
] as const

export type Section = (typeof SECTIONS)[number]

// First match wins, so the more specific rules go first ("pomidory suszone w oleju" is not a spice).
const RULES: [RegExp, Section][] = [
  [/konserw|z puszki|passata|koncentrat|w zalewie|w oleju|w sosie|^sos |ketchup|musztard|majonez|chrzan|cwikla|pesto|\bpasta\b|bulion|kapary|oliwki|mleczko kokos|hummus|kiszon|malosolny|^ocet/, 'Słoiki, puszki, sosy'],
  [/mieso|^udo|watrob|schab|poledwica|wolowin|boczek|szynka|parowki|losos|dorsz|pstrag|makrela|krewetk/, 'Mięso i ryby'],
  [/suszon|mielon|granulowan|^sol$|^pieprz|^kumin|^kurkuma|garam|galka|^majeranek|ziele angielskie|lisc laurowy|przyprawa|ziola|papryka (slodka|ostra|wedzona)|platki chilli/, 'Przyprawy'],
  [/^olej|^oliwa|orzech|sezam|wiorki|^miod|syrop|erytrol|ksylitol|kakao/, 'Oleje, orzechy, słodkie'],
  [/^ser|^serek|jogurt|skyr|kefir|^mleko|smietan|^maslo|^jajk|twarozek|parmezan|tofu/, 'Nabiał i jajka'],
  [/chleb|^bulka (?!tarta)|tortilla|ciasto do nalesnikow/, 'Pieczywo'],
  [/makaron|^ryz|komosa|^maka|platki|skrobia|bulka tarta|kasza/, 'Makarony, ryż, mąki'],
  [/ananas|arbuz|awokado|banan|bazylia|rzodkiew|botwina|^bob|brokul|burak|cebula|cukinia|cytryn|czosnek|fasola|groszek|grzyby|imbir|jablko|kalafior|kalarepa|kapusta|karczoch|kielki|koper|kurki|limonk|mango|marakuja|marchew|melon|mieta|salat|morele|natka|ogorek|papryk|papryczk|pieczarki|pietruszka|pomidor|^por$|porzeczki|roszponka|rukola|seler|szczypiorek|szparagi|szpinak|truskawki|ziemniak|^sok /, 'Warzywa i owoce'],
]

export function sectionOf(name: string): Section {
  const n = normalizeText(name)
  return RULES.find(([re]) => re.test(n))?.[1] ?? 'Inne'
}
