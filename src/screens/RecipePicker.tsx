import { useMemo, useState } from 'react'
import { mealTypesOf } from '../engine/mealTypes'
import { recipeFit } from '../engine/plan'
import type { MealType } from '../engine/profile'
import type { Recipe } from '../engine/types'
import { formatNumber, searchKey } from '../ui/format'
import { useRecipeImageUrls } from '../data/hooks'
import { Chip } from './Chip'
import { RecipePhoto } from './RecipePhoto'

interface Props {
  title: string
  mealType: MealType
  recipes: Recipe[]
  /** Calorie target of this meal for each person eating it. */
  targets: number[]
  names: string[]
  onPick: (recipeId: string) => void
  onClose: () => void
}

/** Full-screen recipe chooser, best-fitting portions first. */
export function RecipePicker({ title, mealType, recipes, targets, names, onPick, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [onlyMatching, setOnlyMatching] = useState(true)
  const photos = useRecipeImageUrls()

  const ranked = useMemo(() => {
    const q = searchKey(query.trim())
    return recipes
      .filter((r) => !onlyMatching || mealTypesOf(r).includes(mealType))
      .filter((r) => !q || searchKey(r.name).includes(q) || r.ingredients.some((i) => searchKey(i.name).includes(q)))
      .map((recipe) => ({ recipe, fit: recipeFit(recipe, targets) }))
      .sort((a, b) => a.fit.distance - b.fit.distance)
  }, [recipes, targets, query, onlyMatching, mealType])

  return (
    <div className="fixed inset-0 z-20 overflow-y-auto bg-stone-50 dark:bg-stone-900">
      <div className="mx-auto max-w-md px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          <button onClick={onClose} className="py-1 text-emerald-700 dark:text-emerald-400">
            Anuluj
          </button>
        </div>
        <p className="mt-1 text-sm text-stone-500">
          Cel: {names.map((n, i) => `${n} ${targets[i]} kcal`).join(' · ')}
        </p>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Szukaj po nazwie lub składniku"
          autoFocus
          className="mt-4 w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-base outline-none focus:border-emerald-600 dark:border-stone-700 dark:bg-stone-800"
        />
        <div className="mt-3 flex gap-1.5">
          <Chip pressed={onlyMatching} onClick={() => setOnlyMatching(true)}>
            Pasujące
          </Chip>
          <Chip pressed={!onlyMatching} onClick={() => setOnlyMatching(false)}>
            Wszystkie
          </Chip>
        </div>
        <ul className="mt-3 divide-y divide-stone-200 dark:divide-stone-800">
          {ranked.map(({ recipe, fit }) => (
            <li key={recipe.id}>
              <button onClick={() => onPick(recipe.id)} className="flex w-full items-center gap-3 py-3 text-left">
                {photos.size > 0 && <RecipePhoto url={photos.get(recipe.id)} size={56} />}
                <span>
                  <span className="block font-medium">{recipe.name}</span>
                  <span className="mt-0.5 block text-sm text-stone-500">
                    {recipe.kcal} kcal ·{' '}
                    <span className={fit.inRange ? '' : 'text-amber-700 dark:text-amber-400'}>
                      porcje {fit.factors.map((f) => `×${formatNumber(Math.round(f * 10) / 10)}`).join(' / ')}
                      {!fit.inRange && ' · słabo pasuje'}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
