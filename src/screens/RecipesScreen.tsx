import { useMemo, useState } from 'react'
import { useRecipes } from '../data/hooks'
import { mealTypesOf } from '../engine/mealTypes'
import type { MealType } from '../engine/profile'
import { searchKey } from '../ui/format'
import { MEAL_LABELS, MEAL_TYPES } from '../ui/labels'
import { Chip } from './Chip'

interface Props {
  onOpen: (id: string) => void
}

export function RecipesScreen({ onOpen }: Props) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState<MealType | null>(null)
  const recipes = useRecipes()

  const visible = useMemo(() => {
    const q = searchKey(query.trim())
    return (recipes ?? [])
      .filter((r) => !type || mealTypesOf(r).includes(type))
      .filter((r) => !q || searchKey(r.name).includes(q) || r.ingredients.some((i) => searchKey(i.name).includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name, 'pl'))
  }, [recipes, query, type])

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Przepisy</h1>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Szukaj po nazwie lub składniku"
        className="mt-4 w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-base outline-none focus:border-emerald-600 dark:border-stone-700 dark:bg-stone-800"
      />
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Chip pressed={type === null} onClick={() => setType(null)}>
          Wszystkie
        </Chip>
        {MEAL_TYPES.map((t) => (
          <Chip key={t} pressed={type === t} onClick={() => setType(t)}>
            {MEAL_LABELS[t]}
          </Chip>
        ))}
      </div>
      {recipes && (
        <p className="mt-3 text-sm text-stone-500">
          {visible.length} z {recipes.length}
          {recipes.some((r) => r.sample) && ' · przykładowe przepisy, własne zaimportujesz w Ustawieniach'}
        </p>
      )}
      <ul className="mt-3 divide-y divide-stone-200 dark:divide-stone-800">
        {visible.map((r) => (
          <li key={r.id}>
            <button onClick={() => onOpen(r.id)} className="w-full py-3 text-left">
              <span className="block font-medium">{r.name}</span>
              <span className="mt-0.5 block text-sm text-stone-500">
                {r.kcal} kcal · B {r.protein} · W {r.carbs} · T {r.fat}
                {r.timeMin && ` · ${r.timeMin} min`}
                {r.servings > 1 && ` · ${r.servings} porcje`}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
