import { expect, it } from 'vitest'
import { sectionOf } from './sections'

it('guesses the store section from the product name', () => {
  expect(
    Object.fromEntries(
      [
        'Mięso mielone z indyka', // not a spice despite "mielone"
        'Cynamon mielony',
        'Pomidory suszone w oleju (odsączone)', // a jar, not a spice
        'Pomidor',
        'Bułka tarta bezglutenowa',
        'Bułka owsiana',
        'Ser typu Feta',
        'Oliwa z oliwek',
        'Lód, kostki',
      ].map((n) => [n, sectionOf(n)]),
    ),
  ).toEqual({
    'Mięso mielone z indyka': 'Mięso i ryby',
    'Cynamon mielony': 'Przyprawy',
    'Pomidory suszone w oleju (odsączone)': 'Słoiki, puszki, sosy',
    Pomidor: 'Warzywa i owoce',
    'Bułka tarta bezglutenowa': 'Makarony, ryż, mąki',
    'Bułka owsiana': 'Pieczywo',
    'Ser typu Feta': 'Nabiał i jajka',
    'Oliwa z oliwek': 'Oleje, orzechy, słodkie',
    'Lód, kostki': 'Inne',
  })
})
