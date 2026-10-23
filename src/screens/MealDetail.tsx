import { useState } from 'react'
import type { PortionedMeal } from '../engine/plan'
import { plateIngredients } from '../engine/scaling'
import { IngredientList } from './IngredientList'
import { Steps } from './Steps'

interface Props {
  portions: PortionedMeal
  /** Names of the people eating, in the order of portions.plates. */
  names: string[]
  title: string
  onBack: () => void
}

/** "To cook" for the whole pot, or one person's plate. */
export function MealDetail({ portions, names, title, onBack }: Props) {
  // -1 = to cook, otherwise index of the plate
  const [view, setView] = useState(-1)
  const { recipe, cook, plates } = portions
  const plate = view >= 0 ? plates[view] : undefined
  const totalKcal = plates.reduce((a, p) => a + p.kcal, 0)

  const tabs = [{ label: 'Do ugotowania', index: -1 }, ...names.map((label, index) => ({ label, index }))]

  return (
    <div>
      <button onClick={onBack} className="-ml-1 py-1 text-emerald-700 dark:text-emerald-400">
        ‹ Plan
      </button>
      <p className="mt-2 text-sm text-stone-500">{title}</p>
      <h1 className="text-2xl font-bold tracking-tight">{recipe.name}</h1>

      <div role="tablist" className="mt-4 flex rounded-xl bg-stone-200 p-1 dark:bg-stone-800">
        {tabs.map((t) => (
          <button
            key={t.index}
            role="tab"
            aria-selected={view === t.index}
            onClick={() => setView(t.index)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-medium ${
              view === t.index ? 'bg-white shadow-sm dark:bg-stone-700' : 'text-stone-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {plate ? (
        <>
          <div className="mt-4 rounded-2xl bg-white p-4 dark:bg-stone-800">
            <div className="text-3xl font-bold">{Math.round(plate.share * 100)}%</div>
            <div className="text-sm text-stone-500">gotowego dania</div>
            <div className="mt-3 tabular-nums">
              <span className="font-semibold">{plate.kcal} kcal</span>
              <span className="text-stone-500">
                {' '}
                · B {plate.protein} · W {plate.carbs} · T {plate.fat}
              </span>
            </div>
          </div>
          <p className="mt-4 text-sm text-stone-500">
            Najprościej zważyć gotowe danie i nałożyć {Math.round(plate.share * 100)}%. Jeśli danie składa się na
            talerzu, porcja to:
          </p>
          <IngredientList ingredients={plateIngredients(cook, plate.share)} />
        </>
      ) : (
        <>
          <p className="mt-4 text-sm text-stone-500">
            Dla: {names.join(' + ')} · razem {totalKcal} kcal
          </p>
          <IngredientList ingredients={cook} />
          <Steps steps={recipe.steps} />
          <p className="mt-4 text-sm text-stone-500">
            Kroki są z oryginalnego przepisu ({recipe.servings > 1 ? `${recipe.servings} porcje` : '1 porcja'}), ilości
            powyżej są już przeliczone.
          </p>
        </>
      )}
    </div>
  )
}
