import { expect, it } from 'vitest'
import { DEFAULT_DAILY_KCAL, DEFAULT_MEALS, mealTargetKcal } from './profile'

it('splits daily calories across meals by share', () => {
  const profile = { id: 'a', name: 'A', dailyKcal: DEFAULT_DAILY_KCAL, meals: DEFAULT_MEALS }
  expect(DEFAULT_MEALS.map((_, i) => mealTargetKcal(profile, i))).toEqual([450, 525, 150, 375])
})
