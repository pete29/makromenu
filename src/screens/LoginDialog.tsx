import { useObservable } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import type { DXCAlert, DXCUserInteraction } from 'dexie-cloud-addon'
import { db } from '../data/db'

// Dexie Cloud asks for input through db.cloud.userInteraction (customLoginGui); its texts are
// English, so the dialog uses its own Polish ones.
const TITLES: Record<DXCUserInteraction['type'], string> = {
  email: 'Logowanie',
  otp: 'Wpisz kod z maila',
  'message-alert': 'Logowanie',
  'logout-confirmation': 'Wylogować się?',
  generic: 'Logowanie',
}

const ALERTS: Partial<Record<DXCAlert['messageCode'], string>> = {
  OTP_SENT: 'Wysłaliśmy kod na podany adres. Sprawdź też folder spam.',
  INVALID_OTP: 'Nieprawidłowy kod. Spróbuj jeszcze raz.',
  INVALID_EMAIL: 'Nieprawidłowy adres e-mail.',
  USER_NOT_REGISTERED: 'Ten adres nie ma dostępu do apki.',
  USER_NOT_ACCEPTED: 'Ten adres nie ma dostępu do apki.',
  USER_DEACTIVATED: 'To konto zostało wyłączone.',
  LICENSE_LIMIT_REACHED: 'Osiągnięto limit kont w chmurze.',
  NO_SEATS_AVAILABLE: 'Osiągnięto limit kont w chmurze.',
  LOGOUT_CONFIRMATION: 'Część zmian nie została jeszcze wysłana do chmury i zniknie z tego urządzenia.',
}

const FIELD_LABELS: Record<string, string> = { email: 'E-mail', otp: 'Kod' }
const SUBMIT: Record<DXCUserInteraction['type'], string> = {
  email: 'Wyślij kod',
  otp: 'Zaloguj',
  'message-alert': 'OK',
  'logout-confirmation': 'Wyloguj mimo to',
  generic: 'Dalej',
}

/** Modal for every step of logging in and out, shown while Dexie Cloud waits for the user. */
export function LoginDialog() {
  const interaction = useObservable(db.cloud.userInteraction)
  if (!interaction) return null
  // Remount per step so the inputs start empty.
  return <Dialog key={interaction.type + interaction.alerts.map((a) => a.messageCode).join()} interaction={interaction} />
}

function Dialog({ interaction }: { interaction: DXCUserInteraction }) {
  const fieldNames = Object.keys(interaction.fields)
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fieldNames.map((n) => [n, ''])))

  function submit(e: FormEvent) {
    e.preventDefault()
    interaction.onSubmit(Object.fromEntries(fieldNames.map((n) => [n, values[n].trim()])))
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-stone-800"
      >
        <h2 id="login-title" className="text-lg font-semibold">
          {TITLES[interaction.type]}
        </h2>
        {interaction.type === 'email' && (
          <p className="mt-1 text-sm text-stone-500">Wyślemy na niego 6-cyfrowy kod. Bez hasła.</p>
        )}
        {interaction.alerts.map((a, i) => (
          <p
            key={i}
            className={`mt-2 text-sm ${a.type === 'error' ? 'text-red-700 dark:text-red-400' : 'text-stone-600 dark:text-stone-300'}`}
          >
            {ALERTS[a.messageCode] ?? a.message}
          </p>
        ))}
        {fieldNames.map((name, i) => {
          const field = interaction.fields[name]
          const isOtp = name === 'otp'
          return (
            <label key={name} className="mt-4 block">
              <span className="text-sm text-stone-500">{FIELD_LABELS[name] ?? field.label ?? name}</span>
              <input
                value={values[name]}
                onChange={(e) => setValues({ ...values, [name]: e.target.value })}
                type={name === 'email' ? 'email' : field.type === 'password' ? 'password' : 'text'}
                inputMode={isOtp ? 'numeric' : undefined}
                autoComplete={isOtp ? 'one-time-code' : name === 'email' ? 'email' : undefined}
                autoFocus={i === 0}
                required
                className="mt-1 w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-base outline-none focus:border-emerald-600 dark:border-stone-600 dark:bg-stone-900"
              />
            </label>
          )
        })}
        <div className="mt-5 flex justify-end gap-2">
          {interaction.cancelLabel && (
            <button type="button" onClick={interaction.onCancel} className="rounded-xl px-4 py-2.5 font-medium text-stone-600 dark:text-stone-300">
              Anuluj
            </button>
          )}
          <button type="submit" className="rounded-xl bg-emerald-700 px-4 py-2.5 font-medium text-white active:bg-emerald-800">
            {SUBMIT[interaction.type]}
          </button>
        </div>
      </form>
    </div>
  )
}
