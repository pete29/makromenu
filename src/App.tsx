import { useState } from 'react'
import { RecipeDetail } from './screens/RecipeDetail'
import { RecipesScreen } from './screens/RecipesScreen'
import { SettingsScreen } from './screens/SettingsScreen'

type Tab = 'plan' | 'recipes' | 'shopping' | 'settings'

const TABS: { id: Tab; label: string }[] = [
  { id: 'plan', label: 'Plan' },
  { id: 'recipes', label: 'Przepisy' },
  { id: 'shopping', label: 'Zakupy' },
  { id: 'settings', label: 'Ustawienia' },
]

function ComingSoon({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-stone-500">Wkrótce.</p>
    </div>
  )
}

function App() {
  const [tab, setTab] = useState<Tab>('recipes')
  const [recipeId, setRecipeId] = useState<string | null>(null)

  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900 dark:bg-stone-900 dark:text-stone-100">
      <main className="mx-auto max-w-md px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-28">
        {tab === 'plan' && <ComingSoon title="Plan" />}
        {tab === 'recipes' &&
          (recipeId ? (
            <RecipeDetail id={recipeId} onBack={() => setRecipeId(null)} />
          ) : (
            <RecipesScreen onOpen={setRecipeId} />
          ))}
        {tab === 'shopping' && <ComingSoon title="Zakupy" />}
        {tab === 'settings' && <SettingsScreen />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 border-t border-stone-200 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-stone-800 dark:bg-stone-900/90">
        <ul className="mx-auto flex max-w-md">
          {TABS.map((t) => (
            <li key={t.id} className="flex-1">
              <button
                onClick={() => {
                  if (t.id === tab) setRecipeId(null)
                  setTab(t.id)
                }}
                aria-current={t.id === tab ? 'page' : undefined}
                className={`w-full py-3 text-sm font-medium ${
                  t.id === tab ? 'text-emerald-700 dark:text-emerald-400' : 'text-stone-500'
                }`}
              >
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

export default App
