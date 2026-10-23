import { expect, it } from 'vitest'
import { guessMealTypes, mealTypesOf } from './mealTypes'

it('guesses meal types from calories and name', () => {
  expect(guessMealTypes({ name: 'Koktajl z arbuza', kcal: 197 })).toEqual(['snack'])
  expect(guessMealTypes({ name: 'Kanapki z serem', kcal: 410 })).toEqual(['breakfast', 'dinner'])
  expect(guessMealTypes({ name: 'Butter chicken', kcal: 506 })).toEqual(['lunch'])
  expect(guessMealTypes({ name: 'Zupa pomidorowa z kurczakiem', kcal: 522 })).toEqual(['lunch', 'dinner'])
  expect(guessMealTypes({ name: 'Rosół', kcal: 512 })).toEqual(['lunch', 'dinner'])
})

it('prefers types set by hand', () => {
  expect(mealTypesOf({ name: 'Rosół', kcal: 512, mealTypes: ['lunch'] })).toEqual(['lunch'])
})
