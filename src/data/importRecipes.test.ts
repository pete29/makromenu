import { describe, expect, it } from 'vitest'
import { parseRecipesJson } from './importRecipes'
import samples from './samples.json'

const valid = {
  id: 'omlet',
  name: 'Omlet',
  kcal: 400,
  protein: 30,
  carbs: 4,
  fat: 28,
  servings: 1,
  ingredients: [{ name: 'Jajko', grams: 112, amount: 2, unit: 'sztuki' }],
  steps: ['Smażymy.'],
}

const parse = (data: unknown) => () => parseRecipesJson(JSON.stringify(data))

describe('parseRecipesJson', () => {
  it('accepts the bundled samples', () => {
    expect(parseRecipesJson(JSON.stringify(samples))).toHaveLength(samples.length)
  })

  it('drops unknown fields and fills defaults', () => {
    const input: Record<string, unknown> = { ...valid, servings: undefined, extra: 1 }
    expect(parseRecipesJson(JSON.stringify([input]))).toEqual([{ ...valid, servings: 1 }])
  })

  it('keeps known meal types only', () => {
    const [r] = parseRecipesJson(JSON.stringify([{ ...valid, mealTypes: ['dinner', 'brunch', 'breakfast'] }]))
    expect(r.mealTypes).toEqual(['breakfast', 'dinner'])
  })

  it('rejects broken files with a readable message', () => {
    expect(() => parseRecipesJson('{oops')).toThrow('To nie jest poprawny plik JSON')
    expect(parse({ recipes: [] })).toThrow('Plik nie zawiera listy przepisów')
    expect(parse([{ ...valid, kcal: 'dużo' }])).toThrow('Przepis 1 („Omlet”): niepoprawne pole kcal')
    expect(parse([{ ...valid, ingredients: [] }])).toThrow('brak składników')
    expect(parse([{ ...valid, ingredients: [{ name: 'Jajko' }] }])).toThrow('składnik bez nazwy lub gramatury')
    expect(parse([valid, valid])).toThrow('powtórzonym id')
  })
})
