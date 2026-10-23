import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import type { Ingredient } from '../engine/types'
import { formatIngredientAmount } from '../ui/format'

interface Props {
  id: string
  onBack: () => void
}

function groupIngredients(ingredients: Ingredient[]) {
  const groups: { name?: string; items: Ingredient[] }[] = []
  for (const ing of ingredients) {
    const last = groups[groups.length - 1]
    if (last && last.name === ing.group) last.items.push(ing)
    else groups.push({ name: ing.group, items: [ing] })
  }
  return groups
}

export function RecipeDetail({ id, onBack }: Props) {
  const recipe = useLiveQuery(() => db.recipes.get(id), [id])

  return (
    <div>
      <button onClick={onBack} className="-ml-1 py-1 text-emerald-700 dark:text-emerald-400">
        ‹ Przepisy
      </button>
      {recipe && (
        <article>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">{recipe.name}</h1>
          <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
            {[
              ['kcal', recipe.kcal],
              ['białko', recipe.protein],
              ['węgl.', recipe.carbs],
              ['tłuszcz', recipe.fat],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-white py-2 dark:bg-stone-800">
                <dd className="text-lg font-semibold">{value}</dd>
                <dt className="text-xs text-stone-500">{label}</dt>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-sm text-stone-500">
            {recipe.servings > 1
              ? `Wartości na 1 porcję, składniki na cały przepis (${recipe.servings} porcje).`
              : 'Wartości na 1 porcję.'}
            {recipe.timeMin && ` Czas: ${recipe.timeMin} min.`}
          </p>

          <h2 className="mt-6 text-lg font-semibold">Składniki</h2>
          {groupIngredients(recipe.ingredients).map((group, gi) => (
            <section key={gi} className="mt-2">
              {group.name && <h3 className="mt-3 text-sm font-semibold text-stone-500 uppercase">{group.name}</h3>}
              <ul className="divide-y divide-stone-200 dark:divide-stone-800">
                {group.items.map((ing, i) => (
                  <li key={i} className="flex justify-between gap-4 py-2">
                    <span>{ing.name}</span>
                    <span className="shrink-0 text-right text-stone-500">{formatIngredientAmount(ing)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <h2 className="mt-6 text-lg font-semibold">Przygotowanie</h2>
          <ol className="mt-2 space-y-3">
            {recipe.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-5 shrink-0 font-semibold text-emerald-700 dark:text-emerald-400">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </article>
      )}
    </div>
  )
}
