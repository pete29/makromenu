import { useState } from 'react'
import { db } from '../data/db'
import { mealTargetKcal, type Profile } from '../engine/profile'
import { MEAL_LABELS } from '../ui/labels'

const inputClass =
  'rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-base outline-none focus:border-emerald-600 dark:border-stone-600 dark:bg-stone-900'

const toPercent = (share: number) => String(Math.round(share * 100))

/** Edits one profile; every valid change is saved right away. */
export function ProfileCard({ profile }: { profile: Profile }) {
  // Drafts keep what the user typed, even when it's temporarily empty or invalid.
  const [name, setName] = useState(profile.name)
  const [kcal, setKcal] = useState(String(profile.dailyKcal))
  const [percents, setPercents] = useState(profile.meals.map((m) => toPercent(m.share)))

  // A default profile isn't stored until its first edit, so this reads the stored one (or the
  // default) inside the transaction: quick edits of different fields then can't overwrite each other.
  const save = (change: (current: Profile) => Partial<Profile>) =>
    db.transaction('rw', db.profiles, async () => {
      const current = (await db.profiles.get(profile.id)) ?? profile
      await db.profiles.put({ ...current, ...change(current) })
    })

  const validKcal = (value: string) => {
    const n = Number(value)
    return value !== '' && Number.isInteger(n) && n >= 800 && n <= 5000
  }

  function onKcal(value: string) {
    setKcal(value)
    if (validKcal(value)) save(() => ({ dailyKcal: Number(value) }))
  }

  function onPercent(index: number, value: string) {
    const next = percents.map((p, i) => (i === index ? value : p))
    setPercents(next)
    const n = Number(value)
    if (value !== '' && Number.isFinite(n) && n >= 0 && n <= 100) {
      save((current) => ({ meals: current.meals.map((m, i) => (i === index ? { ...m, share: n / 100 } : m)) }))
    }
  }

  const sum = profile.meals.reduce((a, m) => a + Math.round(m.share * 100), 0)
  const kcalInvalid = !validKcal(kcal)

  return (
    <section className="rounded-2xl bg-white p-4 dark:bg-stone-800">
      <label className="block">
        <span className="text-sm text-stone-500">Imię</span>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (e.target.value.trim()) save(() => ({ name: e.target.value.trim() }))
          }}
          className={`mt-1 w-full font-semibold ${inputClass}`}
        />
      </label>

      <label className="mt-3 block">
        <span className="text-sm text-stone-500">Dzienny cel</span>
        <span className="mt-1 flex items-center gap-2">
          <input
            value={kcal}
            onChange={(e) => onKcal(e.target.value)}
            inputMode="numeric"
            className={`w-28 ${inputClass}`}
          />
          kcal
        </span>
        {kcalInvalid && <span className="mt-1 block text-sm text-red-700 dark:text-red-400">Podaj od 800 do 5000 kcal.</span>}
      </label>

      <table className="mt-4 w-full text-left">
        <thead className="text-sm text-stone-500">
          <tr>
            <th className="pb-1 font-normal">Posiłek</th>
            <th className="pb-1 font-normal">Udział</th>
            <th className="pb-1 text-right font-normal">kcal</th>
          </tr>
        </thead>
        <tbody>
          {profile.meals.map((meal, i) => (
            <tr key={meal.type}>
              <td className="py-1">{MEAL_LABELS[meal.type]}</td>
              <td className="py-1">
                <span className="flex items-center gap-1">
                  <input
                    value={percents[i]}
                    onChange={(e) => onPercent(i, e.target.value)}
                    inputMode="numeric"
                    aria-label={`${MEAL_LABELS[meal.type]}, procent dnia`}
                    className={`w-16 ${inputClass}`}
                  />
                  %
                </span>
              </td>
              <td className="py-1 text-right tabular-nums">{meal.share > 0 ? mealTargetKcal(profile, i) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {sum !== 100 && sum > 0 && (
        <p className="mt-2 text-sm text-stone-500">Suma to {sum}%, więc kcal są przeliczane proporcjonalnie.</p>
      )}
      {sum === 0 && <p className="mt-2 text-sm text-red-700 dark:text-red-400">Co najmniej jeden posiłek musi mieć udział.</p>}
    </section>
  )
}
