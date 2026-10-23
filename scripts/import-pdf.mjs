// Parses text extracted from the recipe PDF into JSON.
// Text: pdftotext -enc UTF-8 -layout Przepisy.pdf przepisy.txt
//   (without -enc UTF-8 Polish letters and "–" dashes are lost on Windows)
// Usage: node scripts/import-pdf.mjs <recipes.txt> <output.json>

import { readFileSync, writeFileSync } from 'node:fs'

const [, , inPath, outPath] = process.argv
if (!inPath || !outPath) {
  console.error('Usage: node scripts/import-pdf.mjs <recipes.txt> <output.json>')
  process.exit(1)
}

const lines = readFileSync(inPath, 'utf8')
  .replace(/\f/g, '\n')
  .split(/\r?\n/)
  .map((l) => l.replace(/^brak zdjęcia/, '            '))

// "Rosół   B 34 g  W 51 g  T 21 g …" with "512 kcal" below: rearrange into the layout of the other
// recipes, i.e. the title followed by a line with kcal and macros.
for (let i = 0; i < lines.length; i++) {
  const kcal = lines[i].match(/^\s*(\d+) kcal\s*$/)
  if (!kcal) continue
  let p = i - 1
  while (p >= 0 && lines[p].trim() === '') p--
  const head = p >= 0 && lines[p].match(/^(\s*)(.+?)\s{2,}(B \d.*)$/)
  if (!head) continue
  lines[p] = head[1] + head[2]
  lines[i] = `${head[1]}${kcal[1]} kcal  ${head[3]}`
}

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
  // The title may be indented differently from the kcal line, but all of its lines share one indent.
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

// Splits a two-column line into the left (ingredients) and right (preparation) part.
// Columns drift apart at page breaks, hence the extra rules for steps.
function splitColumns(line, rightCol, leftIndent) {
  if (line.trim() === '') return ['', '']
  const indent = indentOf(line)
  if (indent >= rightCol - 4 || indent > leftIndent + 6) return ['', line.trim()]
  const rest = line.slice(indent)
  const m = rest.match(/ {2,}/)
  const left = m ? rest.slice(0, m.index).trim() : rest.trim()
  const right = m ? rest.slice(m.index).trim() : ''
  // Judge the left part only: in "175 g      pieprzem według uznania." the period belongs to the step.
  const looksLikeStep = /^\d{1,2}\.\s/.test(left) || (/\.$/.test(left) && !/[–(]/.test(left))
  if (looksLikeStep) return ['', rest.trim()]
  return [left, right]
}

// "Ryż basmati – 50 g" or "Cebula – 0.5 sztuki (40 g)" / "Cebula – 0,5 x sztuka (40 g)"
const ING_RE =
  /(?<name>[^–|]+?)\s+–\s+(?:(?<g1>\d+(?:[.,]\d+)?)\s*(?:g|ml)(?![\p{L}(])|(?<amt>\d+(?:[.,]\d+)?)\s+(?:x\s+)?(?<unit>[^()|–]+?)\s*\((?<g2>\d+(?:[.,]\d+)?)\s*(?:g|ml)\))/guy

// Different names for the same product in the PDF. Only products with the same nutritional values
// are merged, so e.g. regular and light mayonnaise stay separate.
const ALIASES = {
  'Bób świeży': 'Bób świeży lub mrożony',
  'Śmietanka 12%': 'Śmietana 12%',
}

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
      const name = g.name.trim()
      out.push({
        name: ALIASES[name] ?? name,
        grams: num(g.g1 ?? g.g2),
        ...(g.amt ? { amount: num(g.amt), unit: g.unit.trim() } : {}),
        ...(group ? { group } : {}),
      })
      pos = ING_RE.lastIndex
      while (c[pos] === ' ') pos++
      ING_RE.lastIndex = pos
    }
    if (pos < c.length) warnings.push(`${title}: unparsed ingredients: "${c.slice(pos)}"`)
  }
  return out
}

// The PDF sometimes has an ingredient embedded in the middle of a step ("…zimną wodę Koper posiekany – 2 łyżeczki (8 g) Sól…").
// The name is a capital letter plus at most two words, so the preceding sentence isn't captured.
const STRAY_ING_RE =
  /\s*\p{Lu}\p{Ll}*(?: [\p{Ll}\d%]+){0,2} – \d+(?:[.,]\d+)? (?:x )?[^()–.]+? \(\d+(?:[.,]\d+)? (?:g|ml)\)/gu

function extractStrayIngredients(text, warnings, title) {
  const found = text.match(STRAY_ING_RE) ?? []
  for (const f of found) warnings.push(`${title}: moved from steps to ingredients: "${f.trim()}"`)
  return { stray: found.join(' '), rest: text.replace(STRAY_ING_RE, '') }
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
    warnings.push(`${title}: missing SKŁADNIKI header`)
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

  const { stray, rest: stepText } = extractStrayIngredients(right.join(' ').replace(/\s+/g, ' '), warnings, title)
  // "Woda – 1 łyżka (15 g) Do" / "podania": group header split across two lines.
  const ingredientText = `${left.join(' ')} ${stray}`
    .replace(/\s+/g, ' ')
    .replace(/(?<=\)|\d g) Do podania /g, ' |SEC:DO PODANIA| ')
    .trim()
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
    steps: parseSteps(stepText),
  })
}

writeFileSync(outPath, JSON.stringify(recipes, null, 2) + '\n')
console.log(`Recipes: ${recipes.length}`)
for (const w of warnings) console.warn('WARNING:', w)
