import { db } from '../data/db'
import { useRecipeMap } from '../data/hooks'
import { mealTypesOf } from '../engine/mealTypes'
import type { MealType } from '../engine/profile'
import { MEAL_LABELS, MEAL_TYPES } from '../ui/labels'
import { Chip } from './Chip'
import { IngredientList } from './IngredientList'
import { Steps } from './Steps'

interface Props {
  id: string
  onBack: () => void
}

export function RecipeDetail({ id, onBack }: Props) {
  const recipe = useRecipeMap()?.get(id)

  function toggleType(type: MealType) {
    // Samples are built into the app, not stored, so there is nothing to save the change to.
    if (!recipe || recipe.sample) return
    const current = mealTypesOf(recipe)
    const next = current.includes(type) ? current.filter((t) => t !== type) : [...current, type]
    if (next.length === 0) return // a recipe has to fit somewhere
    db.recipes.update(id, { mealTypes: MEAL_TYPES.filter((t) => next.includes(t)) })
  }

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

          <h2 className="mt-6 text-lg font-semibold">Pasuje na</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {MEAL_TYPES.map((type) => (
              <Chip key={type} pressed={mealTypesOf(recipe).includes(type)} onClick={() => toggleType(type)}>
                {MEAL_LABELS[type]}
              </Chip>
            ))}
          </div>
          <p className="mt-2 text-sm text-stone-500">
            {recipe.sample ? (
              'Przykładowego przepisu nie da się zmienić. Zaimportuj własne przepisy w Ustawieniach.'
            ) : recipe.mealTypes ? (
              <>
                Ustawione ręcznie.{' '}
                <button
                  onClick={() => db.recipes.update(id, { mealTypes: undefined })}
                  className="text-emerald-700 dark:text-emerald-400"
                >
                  Przywróć automatyczne
                </button>
              </>
            ) : (
              'Dobrane automatycznie po kaloriach i nazwie. Kliknij, żeby poprawić.'
            )}
          </p>

          <h2 className="mt-6 text-lg font-semibold">Składniki</h2>
          <IngredientList ingredients={recipe.ingredients} />
          <Steps steps={recipe.steps} />
        </article>
      )}
    </div>
  )
}
