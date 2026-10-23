import { useObservable } from 'dexie-react-hooks'
import { useState } from 'react'
import { db } from '../data/db'
import { acceptInvite } from '../data/household'

/** Shown to an invited person until they join or reject the shared plan. */
export function InviteBanner() {
  const invites = useObservable(db.cloud.invites)
  const [busy, setBusy] = useState(false)
  const invite = invites?.find((i) => !i.accepted && !i.rejected)
  if (!invite) return null

  const from = invite.invitedBy?.name || invite.invitedBy?.email || 'Ktoś'

  async function join() {
    setBusy(true)
    try {
      await acceptInvite(invite!, () =>
        confirm(
          'Dotychczasowe przepisy, plan i osoby z twojego konta zostaną usunięte i zastąpione wspólnym planem. Dołączyć?',
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div role="alert" className="mb-4 rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950">
      <p>
        <span className="font-semibold">{from}</span> zaprasza cię do wspólnego planu posiłków.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={join}
          disabled={busy}
          className="rounded-xl bg-emerald-700 px-4 py-2 font-medium text-white active:bg-emerald-800 disabled:opacity-50"
        >
          Dołącz
        </button>
        <button onClick={() => invite.reject()} disabled={busy} className="rounded-xl px-4 py-2 font-medium text-stone-600 dark:text-stone-300">
          Odrzuć
        </button>
      </div>
    </div>
  )
}
