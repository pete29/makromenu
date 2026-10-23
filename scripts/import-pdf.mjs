// Parsuje tekst wyciągnięty z PDF-a z przepisami (pdftotext -layout) do JSON-a.
// Użycie: node scripts/import-pdf.mjs <przepisy.txt> <wyjście.json>

import { readFileSync, writeFileSync } from 'node:fs'

const [, , inPath, outPath] = process.argv
if (!inPath || !outPath) {
  console.error('Użycie: node scripts/import-pdf.mjs <przepisy.txt> <wyjście.json>')
  process.exit(1)
}

const lines = readFileSync(inPath, 'utf8')
  .replace(/\f/g, '\n')
  .split(/\r?\n/)
  .map((l) => l.replace(/^brak zdjęcia/, '            '))

const num = (s) => Number(String(s).replace(',', '.'))
const indentOf = (l) => l.match(/^ */)[0].length
const META_RE =
  /^\s*(\d+) kcal\s+B (\d+(?:[.,]\d+)?) g\s+W (\d+(?:[.,]\d+)?) g\s+T (\d+(?:[.,]\d+)?) g(?:.*?łącznie (\d+) min)?(?:.*?porcje: (\d+))?/
const SECTION_RE = /^\s*POSIŁEK \d|^\s*POZOSTAŁE PRZEPISY/
const isGroupHeader = (s) =>
  (/^[A-ZŻŹĆŁŚÓĘĄŃ ]{3,}$/.test(s.trim()) || /^do podania$/i.test(s.trim())) &&
  !/SKŁADNIKI|PRZYGOTOWANIE/.test(s)

const metaIdx = lines.flatMap((l, i) => (META_RE.test(l) ? [i] : []))

function readTitle(k) {
  const indent = indentOf(lines[k])
  const title = []
  let i = k - 1
  while (i >= 0 && lines[i].trim() === '') i--
  // Tytuł bywa wcięty inaczej niż linia z kcal, ale wszystkie jego linie mają to samo wcięcie.
  const titleIndent = i >= 0 ? indentOf(lines[i]) : 0
  while (
    i >= 0 &&
    lines[i].trim() !== '' &&
    titleIndent <= indent &&
    indentOf(lines[i]) === titleIndent &&
    !SECTION_RE.test(lines[i])
  ) {
    title.unshift(lines[i].trim())
    i--
  }
  return { title: title.join(' '), firstLine: i + 1 }
}

// Dzieli linię dwukolumnową na lewą (składniki) i prawą (przygotowanie) część.
// Na przełamaniach stron kolumny się rozjeżdżają, stąd dodatkowe reguły dla kroków.
function splitColumns(line, rightCol, leftIndent) {
  if (line.trim() === '') return ['', '']
  const indent = indentOf(line)
  const text = line.trim()
  const looksLikeStep = /^\d{1,2}\.\s/.test(text) || (/\.$/.test(text) && !/[–(]/.test(text))
  if (indent >= rightCol - 4 || indent > leftIndent + 6 || looksLikeStep) return ['', text]
  const rest = line.slice(indent)
  const m = rest.match(/ {2,}/)
  if (!m) return [rest.trim(), '']
  return [rest.slice(0, m.index).trim(), rest.slice(m.index).trim()]
}

// "Ryż basmati – 50 g" albo "Cebula – 0.5 sztuki (40 g)" / "Cebula – 0,5 x sztuka (40 g)"
const ING_RE =
  /(?<name>[^–|]+?)\s+–\s+(?:(?<g1>\d+(?:[.,]\d+)?)\s*(?:g|ml)(?![\p{L}(])|(?<amt>\d+(?:[.,]\d+)?)\s+(?:x\s+)?(?<unit>[^()|–]+?)\s*\((?<g2>\d+(?:[.,]\d+)?)\s*(?:g|ml)\))/guy

function parseIngredients(text, warnings, title) {
  const out = []
  let group = null
  for (const chunk of text.split('|')) {
    const c = chunk.trim()
    if (!c) continue
    if (c.startsWith('SEC:')) {
      group = c.slice(4).replace(/\s+/g, ' ').trim()
      if (/^(?:\S{1,2} )+\S{1,2}$/.test(group)) group = group.replace(/ /g, '') // "S A Ł AT K A"
      group = group.charAt(0).toUpperCase() + group.slice(1).toLowerCase()
      continue
    }
    ING_RE.lastIndex = 0
    let pos = 0
    let m
    while ((m = ING_RE.exec(c))) {
      const g = m.groups
      out.push({
        name: g.name.trim(),
        grams: num(g.g1 ?? g.g2),
        ...(g.amt ? { amount: num(g.amt), unit: g.unit.trim() } : {}),
        ...(group ? { group } : {}),
      })
      pos = ING_RE.lastIndex
      while (c[pos] === ' ') pos++
      ING_RE.lastIndex = pos
    }
    if (pos < c.length) warnings.push(`${title}: nie sparsowano składników: "${c.slice(pos)}"`)
  }
  return out
}

function parseSteps(text) {
  return text
    .split(/(?:^|\s)(?=\d{1,2}\.\s)/)
    .map((s) => s.trim().replace(/^\d{1,2}\.\s*/, ''))
    .filter(Boolean)
}

const recipes = []
const warnings = []
for (let r = 0; r < metaIdx.length; r++) {
  const k = metaIdx[r]
  const { title } = readTitle(k)
  const end = r + 1 < metaIdx.length ? readTitle(metaIdx[r + 1]).firstLine : lines.length
  const m = lines[k].match(META_RE)

  const headerIdx = lines.slice(k, end).findIndex((l) => /SKŁADNIKI\s+PRZYGOTOWANIE/.test(l))
  if (headerIdx < 0) {
    warnings.push(`${title}: brak nagłówka SKŁADNIKI`)
    continue
  }
  const hIdx = k + headerIdx
  const rightCol = lines[hIdx].indexOf('PRZYGOTOWANIE')

  const firstIngredient = lines.slice(hIdx + 1, end).find((l) => l.trim() !== '')
  const leftIndent = firstIngredient ? indentOf(firstIngredient) : 0

  const left = []
  const right = []
  for (let i = hIdx + 1; i < end; i++) {
    if (SECTION_RE.test(lines[i]) || /^\s*\d+x w planie\s*$/.test(lines[i])) continue
    const [l, rt] = splitColumns(lines[i], rightCol, leftIndent)
    if (l) left.push(isGroupHeader(l) ? `|SEC:${l}|` : l)
    if (rt) right.push(rt)
  }

  const ingredientText = left.join(' ').replace(/\s+/g, ' ')
  recipes.push({
    id: title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/ł/g, 'l')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
    name: title,
    kcal: num(m[1]),
    protein: num(m[2]),
    carbs: num(m[3]),
    fat: num(m[4]),
    ...(m[5] ? { timeMin: num(m[5]) } : {}),
    servings: m[6] ? num(m[6]) : 1,
    ingredients: parseIngredients(ingredientText, warnings, title),
    steps: parseSteps(right.join(' ').replace(/\s+/g, ' ')),
  })
}

writeFileSync(outPath, JSON.stringify(recipes, null, 2) + '\n')
console.log(`Przepisów: ${recipes.length}`)
for (const w of warnings) console.warn('UWAGA:', w)
