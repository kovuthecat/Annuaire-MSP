import { useEffect, useState } from 'react'

/**
 * Abonnement réactif à une media query. L'app est en **styles inline** (objets CSSProperties) : les
 * `@media` CSS n'y sont pas exprimables, donc les bascules responsive passent par ce hook (bornes
 * lues en JS via `matchMedia`, ré-évaluées au redimensionnement / rotation).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  )

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** Seuil mobile unique de l'app (≤ 640 px = téléphone en portrait). */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 640px)')
}
