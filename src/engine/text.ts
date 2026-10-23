/** Lower case without diacritics, for matching and search: "Łosoś" → "losos". */
export const normalizeText = (s: string) =>
  s.toLocaleLowerCase('pl').normalize('NFD').replace(/\p{M}/gu, '').replace(/ł/g, 'l')
