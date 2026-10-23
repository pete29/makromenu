import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type ChangeEvent } from 'react'
import { db, saveImportedRecipes } from '../data/db'
import { ImportError, parseRecipesJson } from '../data/importRecipes'
import { ProfileCard } from './ProfileCard'

type Status = { kind: 'ok' | 'error'; text: string } | null

export function SettingsScreen() {
  const [status, setStatus] = useState<Status>(null)
  const recipes = useLiveQuery(() => db.recipes.toArray(), [])
  const profiles = useLiveQuery(() => db.profiles.toArray(), [])
  const sampleCount = recipes?.filter((r) => r.sample).length ?? 0

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const imported = parseRecipesJson(await file.text())
      await saveImportedRecipes(imported)
      setStatus({ kind: 'ok', text: `Zaimportowano ${imported.length} przepisów.` })
    } catch (err) {
      const text = err instanceof ImportError ? err.message : 'Nie udało się zapisać przepisów.'
      setStatus({ kind: 'error', text })
      if (!(err instanceof ImportError)) console.error(err)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Ustawienia</h1>

      <h2 className="mt-6 mb-2 text-lg font-semibold">Osoby</h2>
      <div className="space-y-3">
        {profiles?.map((p) => (
          <ProfileCard key={p.id} profile={p} />
        ))}
      </div>

      <h2 className="mt-8 mb-2 text-lg font-semibold">Dane</h2>
      <section className="rounded-2xl bg-white p-4 dark:bg-stone-800">
        <h2 className="font-semibold">Przepisy</h2>
        {recipes && (
          <p className="mt-1 text-sm text-stone-500">
            W apce: {recipes.length}
            {sampleCount > 0 && ` (w tym ${sampleCount} przykładowe)`}
          </p>
        )}
        <p className="mt-3 text-sm">
          Wybierz plik <code>recipes.json</code>. Przykładowe przepisy zostaną usunięte, a przepisy o tym samym id
          zaktualizowane. Plan posiłków zostaje bez zmian.
        </p>
        <label className="mt-4 inline-block cursor-pointer rounded-xl bg-emerald-700 px-4 py-2.5 font-medium text-white active:bg-emerald-800">
          Importuj przepisy
          <input type="file" accept=".json,application/json" onChange={onFile} className="sr-only" />
        </label>
        {status && (
          <p
            role="status"
            className={`mt-3 text-sm ${status.kind === 'ok' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}
          >
            {status.text}
          </p>
        )}
      </section>
    </div>
  )
}
