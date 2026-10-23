import { useObservable } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { CLOUD_URL, db } from '../data/db'
import { inviteToHousehold, shareHousehold, useHousehold } from '../data/household'

type Status = { kind: 'ok' | 'error'; text: string } | null

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Invite the other person to one plan shared by two accounts; logged-in users only. */
export function HouseholdSection() {
  const user = useObservable(db.cloud.currentUser)
  const household = useHousehold()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>(null)
  const [busy, setBusy] = useState(false)
  if (!CLOUD_URL || !user?.isLoggedIn || household === undefined) return null

  const others = household?.members.filter((m) => m.userId !== user.userId && m.email !== user.email) ?? []
  const canInvite = !household || others.every((m) => m.rejected)

  async function invite(e: FormEvent) {
    e.preventDefault()
    const address = email.trim().toLowerCase()
    if (!EMAIL.test(address)) return setStatus({ kind: 'error', text: 'Podaj poprawny adres e-mail.' })
    if (address === user!.email?.toLowerCase()) return setStatus({ kind: 'error', text: 'To twój adres. Podaj adres drugiej osoby.' })
    setBusy(true)
    try {
      if (household) await inviteToHousehold(household.realm.realmId, address)
      else await shareHousehold(address)
      setEmail('')
      setStatus({ kind: 'ok', text: `Zaproszenie wysłane. Niech ${address} zaloguje się w apce i dołączy.` })
    } catch (err) {
      console.error(err)
      setStatus({ kind: 'error', text: 'Nie udało się wysłać zaproszenia.' })
    } finally {
      setBusy(false)
    }
  }

  const memberStatus = (m: (typeof others)[number]) =>
    m.rejected ? 'odrzucono zaproszenie' : m.accepted || !m.invite ? 'w planie' : 'zaproszenie czeka na akceptację'

  return (
    <section className="mt-3 rounded-2xl bg-white p-4 dark:bg-stone-800">
      <h2 className="font-semibold">Wspólny plan</h2>
      {household ? (
        <ul className="mt-2 space-y-1 text-sm">
          <li>
            {user.email} <span className="text-stone-500">· ty</span>
          </li>
          {others.map((m) => (
            <li key={m.id}>
              {m.name ?? m.email} <span className="text-stone-500">· {memberStatus(m)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-sm">
          Zaproś drugą osobę, żeby mieć wspólne przepisy, plan i listę zakupów, każde na swoim koncie. Twoje obecne
          dane staną się wspólne.
        </p>
      )}
      {canInvite && (
        <form onSubmit={invite} className="mt-3 flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail drugiej osoby"
            aria-label="E-mail drugiej osoby"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-base outline-none focus:border-emerald-600 dark:border-stone-600 dark:bg-stone-900"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-emerald-700 px-4 py-2 font-medium text-white active:bg-emerald-800 disabled:opacity-50"
          >
            Zaproś
          </button>
        </form>
      )}
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
