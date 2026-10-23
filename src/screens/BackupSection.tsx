import { useState, type ChangeEvent } from 'react'
import { createBackup, parseBackup, restoreBackup } from '../data/backup'
import { ImportError } from '../data/importRecipes'
import { toISODate } from '../ui/dates'

type Status = { kind: 'ok' | 'error'; text: string } | null

export function BackupSection() {
  const [status, setStatus] = useState<Status>(null)

  async function save() {
    const backup = await createBackup()
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `makromenu-kopia-${toISODate(new Date())}.json`
    a.click()
    URL.revokeObjectURL(url)
    setStatus({ kind: 'ok', text: `Zapisano kopię: ${backup.recipes.length} przepisów, ${backup.mealPlan.length} posiłków w planie.` })
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const backup = parseBackup(await file.text())
      const when = backup.exportedAt ? ` z ${new Date(backup.exportedAt).toLocaleString('pl-PL')}` : ''
      if (!confirm(`Zastąpić wszystkie dane w apce kopią${when}? Obecnych danych nie da się przywrócić.`)) return
      await restoreBackup(backup)
      // Every screen starts over with the restored data, including half-typed form fields.
      alert(`Przywrócono kopię: ${backup.recipes.length} przepisów, ${backup.mealPlan.length} posiłków.`)
      location.reload()
    } catch (err) {
      const text = err instanceof ImportError ? err.message : 'Nie udało się przywrócić kopii.'
      setStatus({ kind: 'error', text })
      if (!(err instanceof ImportError)) console.error(err)
    }
  }

  return (
    <section className="mt-3 rounded-2xl bg-white p-4 dark:bg-stone-800">
      <h2 className="font-semibold">Kopia zapasowa</h2>
      <p className="mt-1 text-sm">
        Dane są zapisane tylko na tym urządzeniu. Kopia to plik z przepisami, osobami, planem i listą zakupów, np. do
        przeniesienia na nowy telefon.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={save}
          className="rounded-xl bg-emerald-700 px-4 py-2.5 font-medium text-white active:bg-emerald-800"
        >
          Zapisz kopię
        </button>
        <label className="cursor-pointer rounded-xl bg-stone-200 px-4 py-2.5 font-medium dark:bg-stone-700">
          Przywróć z kopii
          <input type="file" accept=".json,application/json" onChange={onFile} className="sr-only" />
        </label>
      </div>
      {status && (
        <p
          role="status"
          className={`mt-3 text-sm ${status.kind === 'ok' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}
        >
          {status.text}
        </p>
      )}
    </section>
  )
}
