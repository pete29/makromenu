import { describe, expect, it, vi } from 'vitest'

// db.ts opens IndexedDB, which the test environment doesn't have; parsing doesn't need it.
vi.mock('./db', () => ({ db: {} }))

const { parseBackup } = await import('./backup')

const backup = {
  app: 'makromenu',
  version: 1,
  exportedAt: '2026-10-23T20:00:00.000Z',
  recipes: [
    {
      id: 'omlet',
      name: 'Omlet',
      kcal: 400,
      protein: 30,
      carbs: 4,
      fat: 28,
      servings: 1,
      ingredients: [{ name: 'Jajko', grams: 112 }],
      steps: [],
      mealTypes: ['breakfast'],
    },
  ],
  profiles: [{ id: 'a', name: 'Ola', dailyKcal: 1500, meals: [{ type: 'breakfast', share: 1 }] }],
  mealPlan: [{ date: '2026-10-26', type: 'breakfast', recipeId: 'omlet', profileIds: ['a'] }],
  shoppingChecks: ['Jajko'],
}

const parse = (data: unknown) => () => parseBackup(JSON.stringify(data))

describe('parseBackup', () => {
  it('reads a backup back', () => {
    expect(parseBackup(JSON.stringify(backup))).toEqual(backup)
  })

  it('rejects files that are not a usable backup', () => {
    expect(parse({ ...backup, app: 'inna' })).toThrow('To nie jest kopia zapasowa Makromenu')
    expect(parse({ ...backup, version: 2 })).toThrow('Nieobsługiwana wersja')
    expect(parse({ ...backup, profiles: [] })).toThrow('Kopia nie zawiera osób')
    expect(parse({ ...backup, mealPlan: [{ ...backup.mealPlan[0], profileIds: ['nikt'] }] })).toThrow('niepoprawny posiłek')
    expect(parse(backup.recipes)).toThrow('To nie jest kopia zapasowa Makromenu')
  })
})
