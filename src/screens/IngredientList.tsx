import type { Ingredient } from '../engine/types'
import { formatIngredientAmount } from '../ui/format'

function groupIngredients(ingredients: Ingredient[]) {
  const groups: { name?: string; items: Ingredient[] }[] = []
  for (const ing of ingredients) {
    const last = groups[groups.length - 1]
    if (last && last.name === ing.group) last.items.push(ing)
    else groups.push({ name: ing.group, items: [ing] })
  }
  return groups
}

/** Ingredients with amounts, split into the recipe's sub-sections (Sos, Do podania…). */
export function IngredientList({ ingredients }: { ingredients: Ingredient[] }) {
  return groupIngredients(ingredients).map((group, gi) => (
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
  ))
}
