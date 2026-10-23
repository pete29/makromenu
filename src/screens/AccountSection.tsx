import { useObservable } from 'dexie-react-hooks'
import type { SyncState } from 'dexie-cloud-addon'
import { CLOUD_URL, db } from '../data/db'

function syncLabel(state: SyncState | undefined): { text: string; error?: boolean } {
  if (!state) return { text: '' }
  if (state.license === 'expired' || state.license === 'deactivated') return { text: 'Konto w chmurze jest nieaktywne.', error: true }
  switch (state.phase) {
    case 'in-sync':
      return { text: 'Wszystko zapisane w chmurze.' }
    case 'pushing':
    case 'pulling':
    case 'initial':
    case 'not-in-sync':
      return { text: 'Synchronizowanie…' }
    case 'offline':
      return { text: 'Brak internetu. Zmiany wyślą się, gdy wróci połączenie.' }
    case 'error':
      return { text: 'Błąd synchronizacji. Apka spróbuje ponownie.', error: true }
  }
}

/** Log in to keep the data in the cloud and on several devices; only shown when the build has a cloud URL. */
export function AccountSection() {
  const user = useObservable(db.cloud.currentUser)
  const syncState = useObservable(db.cloud.syncState)
  if (!CLOUD_URL || !user) return null

  const status = syncLabel(syncState)

  return (
    <section className="rounded-2xl bg-white p-4 dark:bg-stone-800">
      <h2 className="font-semibold">Konto</h2>
      {user.isLoggedIn ? (
        <>
          <p className="mt-1 text-sm">
            Zalogowano jako <span className="font-medium">{user.email ?? user.userId}</span>
          </p>
          <p className={`mt-1 text-sm ${status.error ? 'text-red-700 dark:text-red-400' : 'text-stone-500'}`}>{status.text}</p>
          <p className="mt-3 text-sm text-stone-500">
            Po zalogowaniu na tym samym koncie na innym urządzeniu zobaczysz tam te same przepisy, osoby i plan.
          </p>
          <button
            onClick={() => db.cloud.logout().catch(() => {})}
            className="mt-4 rounded-xl bg-stone-200 px-4 py-2.5 font-medium dark:bg-stone-700"
          >
            Wyloguj
          </button>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm">
            Bez konta dane są tylko na tym urządzeniu. Po zalogowaniu trafią do chmury i będą dostępne na każdym
            urządzeniu, na którym się zalogujesz. To, co już jest w apce, zostanie przeniesione na konto.
          </p>
          <button
            // login() rejects when the user cancels the dialog, which needs no message.
            onClick={() => db.cloud.login().catch(() => {})}
            className="mt-4 rounded-xl bg-emerald-700 px-4 py-2.5 font-medium text-white active:bg-emerald-800"
          >
            Zaloguj się
          </button>
        </>
      )}
    </section>
  )
}
