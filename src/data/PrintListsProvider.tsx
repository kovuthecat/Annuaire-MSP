import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { onAuthStateChange, getSession } from './auth'
import {
  createPrintList,
  deletePrintList,
  favoritePrintList,
  loadPrintLists,
  renamePrintList,
  setPrintListItems,
  unfavoritePrintList,
} from './printLists'
import type { PrintListWithMeta } from '../types/db'

/**
 * Contexte "listes d'impression" — même forme que `DirectoryProvider` (charge une fois après
 * résolution de la session, recharge après chaque écriture, sans lien avec le dataset contacts).
 */
interface PrintListsContextValue {
  lists: PrintListWithMeta[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  createPrintList: (name: string, contactIds: string[]) => Promise<string>
  renamePrintList: (id: string, name: string) => Promise<void>
  deletePrintList: (id: string) => Promise<void>
  setPrintListItems: (id: string, contactIds: string[]) => Promise<void>
  favoritePrintList: (id: string) => Promise<void>
  unfavoritePrintList: (id: string) => Promise<void>
}

const PrintListsContext = createContext<PrintListsContextValue | null>(null)

export function PrintListsProvider({ children }: { children: ReactNode }) {
  const [lists, setLists] = useState<PrintListWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loadedForUid = useRef<string | null | undefined>(undefined)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setLists(await loadPrintLists())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement des listes.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const session = await getSession().catch(() => null)
      if (cancelled) return
      loadedForUid.current = session?.user.id ?? null
      await reload()
    })()

    const unsubscribe = onAuthStateChange((session) => {
      const nextUid = session?.user.id ?? null
      if (nextUid === loadedForUid.current) return
      loadedForUid.current = nextUid
      void reload()
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [reload])

  const value = useMemo<PrintListsContextValue>(
    () => ({
      lists,
      loading,
      error,
      reload,
      createPrintList: async (name, contactIds) => {
        const id = await createPrintList(name, contactIds)
        await reload()
        return id
      },
      renamePrintList: async (id, name) => {
        await renamePrintList(id, name)
        await reload()
      },
      deletePrintList: async (id) => {
        await deletePrintList(id)
        await reload()
      },
      setPrintListItems: async (id, contactIds) => {
        await setPrintListItems(id, contactIds)
        await reload()
      },
      favoritePrintList: async (id) => {
        await favoritePrintList(id)
        await reload()
      },
      unfavoritePrintList: async (id) => {
        await unfavoritePrintList(id)
        await reload()
      },
    }),
    [lists, loading, error, reload],
  )

  return <PrintListsContext.Provider value={value}>{children}</PrintListsContext.Provider>
}

export function usePrintLists(): PrintListsContextValue {
  const ctx = useContext(PrintListsContext)
  if (!ctx) throw new Error('usePrintLists doit être appelé sous <PrintListsProvider>.')
  return ctx
}
