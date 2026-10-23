import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import { IngredientList } from './IngredientList'
import { Steps } from './Steps'

interface Props {
  id: string
  onBack: () => void
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
          <IngredientList ingredients={recipe.ingredients} />
          <Steps steps={recipe.steps} />
        </article>
      )}
    </div>
  )
}
