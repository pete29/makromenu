export function Steps({ steps }: { steps: string[] }) {
  return (
    <>
      <h2 className="mt-6 text-lg font-semibold">Przygotowanie</h2>
      <ol className="mt-2 space-y-3">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="w-5 shrink-0 font-semibold text-emerald-700 dark:text-emerald-400">{i + 1}.</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </>
  )
}
