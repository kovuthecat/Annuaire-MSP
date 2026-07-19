import { useEffect, useState } from 'react'

/**
 * `useState` dont la valeur est **hydratée depuis `sessionStorage` au montage** et **réécrite à
 * chaque changement**. Sert à garder l'état de recherche et la sélection d'impression quand on
 * ouvre une fiche puis revient (l'annuaire est démonté/remonté par le routeur, un `useState` nu
 * repartirait à zéro) — et à travers un rechargement d'onglet. Portée = onglet (sessionStorage),
 * effacé à la fermeture, jamais partagé entre onglets : c'est un état de travail transitoire, pas
 * une préférence durable.
 *
 * Tout accès au stockage est protégé (mode privé / quota / stockage désactivé) : en cas d'échec on
 * retombe silencieusement sur un `useState` classique.
 */
export function useSessionState<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const storageKey = `annuaire:${key}`

  const [value, setValue] = useState<T>(() => {
    try {
      const raw = sessionStorage.getItem(storageKey)
      return raw !== null ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(value))
    } catch {
      /* stockage indisponible — on garde l'état en mémoire, tant pis pour la persistance */
    }
  }, [storageKey, value])

  return [value, setValue]
}
