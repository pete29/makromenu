import type { ReactNode } from 'react'

interface Props {
  pressed: boolean
  onClick: () => void
  children: ReactNode
}

/** Toggle pill used for filters and meal types. */
export function Chip({ pressed, onClick, children }: Props) {
  return (
    <button
      onClick={onClick}
      aria-pressed={pressed}
      className="rounded-full bg-stone-200 px-3 py-1.5 text-sm font-medium text-stone-700 aria-pressed:bg-emerald-700 aria-pressed:text-white dark:bg-stone-800 dark:text-stone-300"
    >
      {children}
    </button>
  )
}
