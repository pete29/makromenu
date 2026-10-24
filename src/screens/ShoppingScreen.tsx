import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db, type ShoppingCheck } from '../data/db'
import { useMeals, useProfiles, useRecipeMap } from '../data/hooks'
import { shoppingList } from '../engine/plan'
import { SECTIONS, sectionOf } from '../engine/sections'
import { addDays, dayMonth, startOfWeek, toISODate, weekdayShort } from '../ui/dates'
import { formatIngredientAmount } from '../ui/format'

const inputClass =
  'rounded-lg border border-stone-300 bg-white px-3 py-2 text-base outline-none focus:border-emerald-600 dark:border-stone-700 dark:bg-stone-800'

export function ShoppingScreen() {
  const today = toISODate(new Date())
  const sunday = addDays(startOfWeek(today), 6)
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(sunday)

  const meals = useMeals(from, to)
  const recipes = useRecipeMap()
  const profiles = useProfiles()
  const stored = useLiveQuery(async () => new Set((await db.shoppingChecks.toArray()).map((c) => c.name)), [])
  // Ticks show at once; the database catches up a moment later and then replaces them.
  const [pending, setPending] = useState(new Map<string, boolean>())
  useEffect(() => setPending(new Map()), [stored])
  if (!meals || !recipes || !profiles || !stored) return null

  const checks = new Set([...stored, ...pending.keys()].filter((name) => pending.get(name) ?? stored.has(name)))

  const planned = meals.filter((m) => recipes.has(m.recipeId))
  const items = shoppingList(recipes, profiles, planned)
  const sections = SECTIONS.map((section) => ({
    section,
    // Ticked-off items sink to the bottom of their section.
    items: items
      .filter((i) => sectionOf(i.name) === section)
      .sort((a, b) => Number(checks.has(a.name)) - Number(checks.has(b.name))),
  })).filter((s) => s.items.length > 0)
  const checkedCount = items.filter((i) => checks.has(i.name)).length

  // Two devices can tick the same item offline, so unticking removes every check of that name.
  function toggle(name: string) {
    const checked = !checks.has(name)
    setPending(new Map(pending).set(name, checked))
    if (checked) db.shoppingChecks.add({ name } as ShoppingCheck)
    else db.shoppingChecks.where('name').equals(name).delete()
  }
  const setRange = (start: string, end: string) => {
    setFrom(start)
    setTo(end)
  }
  const presets = [
    { label: 'Do niedzieli', from: today, to: sunday },
    { label: 'Następny tydzień', from: addDays(sunday, 1), to: addDays(sunday, 7) },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Zakupy</h1>

      <div className="mt-4 flex gap-2">
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() => setRange(p.from, p.to)}
            aria-pressed={from === p.from && to === p.to}
            className="rounded-full bg-stone-200 px-3 py-1.5 text-sm font-medium aria-pressed:bg-emerald-700 aria-pressed:text-white dark:bg-stone-800"
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <input
          type="date"
          value={from}
          onChange={(e) => e.target.value && setRange(e.target.value, e.target.value > to ? e.target.value : to)}
          aria-label="Od"
          className={inputClass}
        />
        –
        <input
          type="date"
          value={to}
          min={from}
          onChange={(e) => e.target.value && setTo(e.target.value)}
          aria-label="Do"
          className={inputClass}
        />
      </div>
      <p className="mt-2 text-sm text-stone-500">
        {weekdayShort(from)} {dayMonth(from)} – {weekdayShort(to)} {dayMonth(to)} · posiłków: {planned.length}
        {items.length > 0 && ` · odhaczone ${checkedCount} z ${items.length}`}
      </p>

      {items.length === 0 ? (
        <p className="mt-6 text-stone-500">W tym zakresie nie ma zaplanowanych posiłków.</p>
      ) : (
        <>
          {sections.map(({ section, items }) => (
            <section key={section} className="mt-5">
              <h2 className="text-sm font-semibold text-stone-500 uppercase">{section}</h2>
              <ul className="mt-1 divide-y divide-stone-200 dark:divide-stone-800">
                {items.map((item) => {
                  const checked = checks.has(item.name)
                  return (
                    <li key={item.name}>
                      <label className="flex cursor-pointer items-center gap-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(item.name)}
                          className="size-5 shrink-0 accent-emerald-700"
                        />
                        <span className={`flex-1 ${checked ? 'text-stone-400 line-through' : ''}`}>{item.name}</span>
                        <span className={`shrink-0 text-right text-sm ${checked ? 'text-stone-400' : 'text-stone-500'}`}>
                          {formatIngredientAmount(item)}
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
          {checkedCount > 0 && (
            <button
              onClick={() => db.shoppingChecks.clear()}
              className="mt-6 text-sm text-red-700 dark:text-red-400"
            >
              Odznacz wszystko
            </button>
          )}
        </>
      )}
    </div>
  )
}
