import { describe, expect, it } from 'vitest'
import { addDays, dayMonth, startOfWeek, weekDays, weekdayShort } from './dates'

describe('dates', () => {
  it('finds Monday of the week, also from Sunday', () => {
    expect(startOfWeek('2026-10-29')).toBe('2026-10-26') // Thursday
    expect(startOfWeek('2026-10-26')).toBe('2026-10-26') // Monday
    expect(startOfWeek('2026-11-01')).toBe('2026-10-26') // Sunday
  })

  it('adds days across months and the DST change', () => {
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26') // clocks go back on 25 Oct
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
  })

  it('lists and labels the week', () => {
    const days = weekDays('2026-10-26')
    expect(days).toHaveLength(7)
    expect(days.map(weekdayShort)).toEqual(['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'])
    expect(dayMonth(days[6])).toBe('1.11')
  })
})
