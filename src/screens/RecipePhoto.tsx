interface Props {
  url?: string
  /** Width and height in pixels. */
  size: number
  className?: string
}

/** Square recipe photo; a neutral tile keeps lists aligned for recipes without one. */
export function RecipePhoto({ url, size, className = '' }: Props) {
  const style = { width: size, height: size }
  if (!url) return <div style={style} aria-hidden className={`shrink-0 rounded-xl bg-stone-200 dark:bg-stone-800 ${className}`} />
  // The PDF photos are cut-outs on white, so they sit on a white tile in dark mode too.
  return <img src={url} alt="" style={style} className={`shrink-0 rounded-xl bg-white object-cover ${className}`} />
}
