// Plan dates are local calendar days stored as "YYYY-MM-DD" strings, which also sort correctly.

const pad = (n: number) => String(n).padStart(2, '0')

export const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso: string, days: number): string {
  const d = fromISODate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

/** Monday of the week containing the date. */
export function startOfWeek(iso: string): string {
  const day = fromISODate(iso).getDay() // 0 = Sunday
  return addDays(iso, -((day + 6) % 7))
}

export const weekDays = (monday: string) => Array.from({ length: 7 }, (_, i) => addDays(monday, i))

const WEEKDAYS = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So']

/** "Pn" */
export const weekdayShort = (iso: string) => WEEKDAYS[fromISODate(iso).getDay()]

/** "27.10" */
export function dayMonth(iso: string): string {
  const d = fromISODate(iso)
  return `${d.getDate()}.${pad(d.getMonth() + 1)}`
}
