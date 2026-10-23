import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db, type StoredMeal } from '../data/db'
import { mealTargets, portionDay, type PortionedMeal } from '../engine/plan'
import type { MealType, Profile } from '../engine/profile'
import type { Macros, Recipe } from '../engine/types'
import { addDays, dayMonth, startOfWeek, toISODate, weekDays, weekdayShort } from '../ui/dates'
import { MEAL_LABELS } from '../ui/labels'
import { MealDetail } from './MealDetail'
import { RecipePicker } from './RecipePicker'

const MEAL_ORDER = Object.keys(MEAL_LABELS) as MealType[]

interface PickerState {
  type: MealType
  /** Meal being changed; absent when adding a new one. */
  meal?: StoredMeal
}

const byMealOrder = (a: StoredMeal, b: StoredMeal) =>
  MEAL_ORDER.indexOf(a.type) - MEAL_ORDER.indexOf(b.type) || a.id - b.id

export function PlanScreen() {
  const today = toISODate(new Date())
  const [day, setDay] = useState(today)
  const [picker, setPicker] = useState<PickerState | null>(null)
  const [openMealId, setOpenMealId] = useState<number | null>(null)

  const days = weekDays(startOfWeek(day))
  const weekMeals = useLiveQuery(
    () => db.mealPlan.where('date').between(days[0], days[6], true, true).toArray(),
    [days[0]],
  )
  const recipes = useLiveQuery(async () => new Map((await db.recipes.toArray()).map((r) => [r.id, r])), [])
  const profiles = useLiveQuery(() => db.profiles.toArray(), [])
  if (!weekMeals || !recipes || !profiles) return null

  const dayMeals = weekMeals.filter((m) => m.date === day).sort(byMealOrder)
  // A meal can outlive its recipe, e.g. a sample recipe removed by an import.
  const planned = dayMeals.filter((m) => recipes.has(m.recipeId))
  const summary = portionDay(recipes, profiles, planned)
  const portionsById = new Map(planned.map((m, i) => [m.id, summary.meals[i]]))
  const nameOf = (id: string) => profiles.find((p) => p.id === id)?.name ?? '?'
  // A new meal is for everyone who has that meal in their day (e.g. not for someone with 0% snacks).
  const defaultEaters = (type: MealType) => {
    const eating = profiles.filter((p) => p.meals.some((m) => m.type === type && m.share > 0))
    return (eating.length > 0 ? eating : profiles).map((p) => p.id)
  }

  async function pick(recipeId: string) {
    if (!picker) return
    if (picker.meal) await db.mealPlan.update(picker.meal.id, { recipeId })
    else await db.mealPlan.add({ date: day, type: picker.type, recipeId, profileIds: defaultEaters(picker.type) } as StoredMeal)
    setPicker(null)
  }

  async function toggleEater(meal: StoredMeal, profileId: string) {
    const eats = meal.profileIds.includes(profileId)
    if (eats && meal.profileIds.length === 1) return // somebody has to eat it
    const profileIds = eats
      ? meal.profileIds.filter((id) => id !== profileId)
      : profiles!.map((p) => p.id).filter((id) => id === profileId || meal.profileIds.includes(id))
    await db.mealPlan.update(meal.id, { profileIds })
  }

  const openPortions = openMealId !== null ? portionsById.get(openMealId) : undefined
  if (openPortions) {
    const { meal } = openPortions
    return (
      <MealDetail
        portions={openPortions}
        names={meal.profileIds.map(nameOf)}
        title={`${MEAL_LABELS[meal.type]} · ${weekdayShort(meal.date)} ${dayMonth(meal.date)}`}
        onBack={() => setOpenMealId(null)}
      />
    )
  }

  if (picker) {
    // Targets don't depend on the recipe, so compute them once for a placeholder meal in this slot.
    const eaters = picker.meal?.profileIds ?? defaultEaters(picker.type)
    const others = planned.filter((m) => m.id !== picker.meal?.id)
    const candidate = { date: day, type: picker.type, recipeId: '', profileIds: eaters }
    const targets = mealTargets(profiles, [...others, candidate])[others.length]
    return (
      <RecipePicker
        title={`${MEAL_LABELS[picker.type]} · ${weekdayShort(day)} ${dayMonth(day)}`}
        recipes={[...recipes.values()]}
        targets={targets}
        names={eaters.map(nameOf)}
        onPick={pick}
        onClose={() => setPicker(null)}
      />
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Plan</h1>
        <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
          <button onClick={() => setDay(addDays(day, -7))} aria-label="Poprzedni tydzień" className="px-3 py-1 text-xl">
            ‹
          </button>
          <button onClick={() => setDay(today)} className="px-2 py-1 text-sm font-medium">
            {dayMonth(days[0])}–{dayMonth(days[6])}
          </button>
          <button onClick={() => setDay(addDays(day, 7))} aria-label="Następny tydzień" className="px-3 py-1 text-xl">
            ›
          </button>
        </div>
      </div>

      <ol className="mt-4 grid grid-cols-7 gap-1">
        {days.map((d) => {
          const selected = d === day
          const hasMeals = weekMeals.some((m) => m.date === d)
          return (
            <li key={d}>
              <button
                onClick={() => setDay(d)}
                aria-current={selected ? 'date' : undefined}
                className={`flex w-full flex-col items-center rounded-xl py-2 ${
                  selected ? 'bg-emerald-700 text-white' : d === today ? 'bg-emerald-100 dark:bg-emerald-950' : ''
                }`}
              >
                <span className="text-xs">{weekdayShort(d)}</span>
                <span className="font-semibold">{dayMonth(d).split('.')[0]}</span>
                <span className={`mt-1 size-1.5 rounded-full ${hasMeals ? (selected ? 'bg-white' : 'bg-emerald-600') : ''}`} />
              </button>
            </li>
          )
        })}
      </ol>

      <DayTotals profiles={profiles} totals={summary.totals} empty={planned.length === 0} />

      {MEAL_ORDER.map((type) => {
        const ofType = dayMeals.filter((m) => m.type === type)
        return (
          <section key={type} className="mt-5">
            <h2 className="text-sm font-semibold text-stone-500 uppercase">{MEAL_LABELS[type]}</h2>
            {ofType.map((meal) => (
              <MealCard
                key={meal.id}
                meal={meal}
                recipe={recipes.get(meal.recipeId)}
                portions={portionsById.get(meal.id)}
                profiles={profiles}
                onOpen={() => setOpenMealId(meal.id)}
                onChange={() => setPicker({ type, meal })}
                onRemove={() => db.mealPlan.delete(meal.id)}
                onToggleEater={(id) => toggleEater(meal, id)}
              />
            ))}
            {ofType.length === 0 ? (
              <button
                onClick={() => setPicker({ type })}
                className="mt-2 w-full rounded-xl border border-dashed border-stone-300 py-2.5 text-stone-500 dark:border-stone-700"
              >
                + Dodaj
              </button>
            ) : (
              // An extra snack for one person is how a large calorie gap is handled.
              type === 'snack' && (
                <button onClick={() => setPicker({ type })} className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">
                  + dodatkowa przekąska
                </button>
              )
            )}
          </section>
        )
      })}
    </div>
  )
}

interface DayTotalsProps {
  profiles: Profile[]
  totals: Record<string, Macros>
  empty: boolean
}

function DayTotals({ profiles, totals, empty }: DayTotalsProps) {
  if (empty) return <p className="mt-4 text-sm text-stone-500">Nic jeszcze nie zaplanowano na ten dzień.</p>
  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      {profiles.map((p) => {
        const t = totals[p.id]
        return (
          <div key={p.id} className="rounded-xl bg-white px-3 py-2 dark:bg-stone-800">
            <div className="text-sm text-stone-500">{p.name}</div>
            <div className="font-semibold tabular-nums">
              {t.kcal} <span className="font-normal text-stone-500">/ {p.dailyKcal} kcal</span>
            </div>
            <div className="text-xs text-stone-500 tabular-nums">
              B {t.protein} · W {t.carbs} · T {t.fat}
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface MealCardProps {
  meal: StoredMeal
  recipe?: Recipe
  portions?: PortionedMeal
  profiles: Profile[]
  onOpen: () => void
  onChange: () => void
  onRemove: () => void
  onToggleEater: (profileId: string) => void
}

function MealCard({ meal, recipe, portions, profiles, onOpen, onChange, onRemove, onToggleEater }: MealCardProps) {
  return (
    <div className="mt-2 rounded-xl bg-white p-3 dark:bg-stone-800">
      {recipe ? (
        <button onClick={onOpen} className="flex w-full items-start justify-between gap-2 text-left font-medium">
          {recipe.name}
          <span className="text-stone-400" aria-hidden>
            ›
          </span>
        </button>
      ) : (
        <div className="font-medium">Przepis usunięty</div>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {profiles.map((p) => {
          const index = meal.profileIds.indexOf(p.id)
          const plate = index >= 0 ? portions?.plates[index] : undefined
          return (
            <button
              key={p.id}
              onClick={() => onToggleEater(p.id)}
              aria-pressed={index >= 0}
              className={`rounded-full px-3 py-1 text-sm ${
                plate
                  ? plate.inRange
                    ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                    : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
                  : 'bg-stone-100 text-stone-400 line-through dark:bg-stone-900'
              }`}
            >
              {p.name}
              {plate && ` · ${plate.kcal} kcal`}
            </button>
          )
        })}
      </div>
      {portions?.plates.some((p) => !p.inRange) && (
        <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
          Porcja mocno odbiega od przepisu, rozważ inny przepis albo przekąskę.
        </p>
      )}
      <div className="mt-2 flex gap-4 text-sm text-emerald-700 dark:text-emerald-400">
        {recipe && <button onClick={onChange}>Zmień</button>}
        <button onClick={onRemove} className="text-red-700 dark:text-red-400">
          Usuń
        </button>
      </div>
    </div>
  )
}
