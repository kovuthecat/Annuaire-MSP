import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'

/**
 * État client transitoire de la sélection d'impression (cf. plans/P1/S3.md T6 §Décision clé et
 * ARCHITECTURE.md §Découpage) : coché sur l'annuaire (case à cocher par ligne), lu par l'indicateur
 * de la barre du haut (« N sélectionné(s) → Imprimer », cf. `Layout.tsx`), et consommé plus tard par
 * l'écran impression (S6). Rien n'est persisté — un rafraîchissement de page vide la sélection.
 */
interface SelectionContextValue {
  selectedIds: Set<string>
  toggle: (id: string) => void
  remove: (id: string) => void
  clear: () => void
  count: number
}

const SelectionContext = createContext<SelectionContextValue | null>(null)

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const remove = useCallback((id: string) => {
    setSelectedIds((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const clear = useCallback(() => setSelectedIds(new Set()), [])

  const value = useMemo<SelectionContextValue>(
    () => ({ selectedIds, toggle, remove, clear, count: selectedIds.size }),
    [selectedIds, toggle, remove, clear],
  )

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>
}

export function useSelection(): SelectionContextValue {
  const ctx = useContext(SelectionContext)
  if (!ctx) throw new Error('useSelection doit être appelé sous <SelectionProvider>.')
  return ctx
}
