import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { onAuthStateChange, getSession } from './auth'
import {
  adoptContact,
  addComment,
  createContact,
  deleteComment,
  deleteContact,
  loadDirectory,
  unadoptContact,
  updateContact,
} from './directory'
import type { NewContactInput, ContactUpdateInput } from './directory'
import type { Comment, CommentType, Contact, ContactWithMeta, Member } from '../types/db'

/**
 * Contexte "annuaire" : charge le dataset une fois (après résolution de la session), l'expose
 * aux écrans avec les mutations, et recharge après chaque écriture. Pas de React Query — état
 * React simple, conformément à DECISIONS.md §Recherche (garder les dépendances minimales).
 */
interface DirectoryContextValue {
  contacts: ContactWithMeta[]
  members: Member[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  createContact: (input: NewContactInput) => Promise<Contact>
  updateContact: (id: string, patch: ContactUpdateInput) => Promise<Contact>
  deleteContact: (id: string) => Promise<void>
  addComment: (contactId: string, type: CommentType, texte: string) => Promise<Comment>
  deleteComment: (commentId: string) => Promise<void>
  adoptContact: (contactId: string) => Promise<void>
  unadoptContact: (contactId: string) => Promise<void>
}

const DirectoryContext = createContext<DirectoryContextValue | null>(null)

export function DirectoryProvider({ children }: { children: ReactNode }) {
  const [contacts, setContacts] = useState<ContactWithMeta[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Id du membre pour lequel le dataset actuel a été chargé — sert à ignorer les évènements
  // d'auth qui ne changent pas d'utilisateur (ex. rafraîchissement de token).
  const loadedForUid = useRef<string | null | undefined>(undefined)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await loadDirectory()
      setContacts(data.contacts)
      setMembers(data.members)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement de l'annuaire.")
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
      if (nextUid === loadedForUid.current) return // ex. TOKEN_REFRESHED : même utilisateur
      loadedForUid.current = nextUid
      void reload()
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [reload])

  const value = useMemo<DirectoryContextValue>(
    () => ({
      contacts,
      members,
      loading,
      error,
      reload,
      createContact: async (input) => {
        const contact = await createContact(input)
        await reload()
        return contact
      },
      updateContact: async (id, patch) => {
        const contact = await updateContact(id, patch)
        await reload()
        return contact
      },
      deleteContact: async (id) => {
        await deleteContact(id)
        await reload()
      },
      addComment: async (contactId, type, texte) => {
        const comment = await addComment(contactId, type, texte)
        await reload()
        return comment
      },
      deleteComment: async (commentId) => {
        await deleteComment(commentId)
        await reload()
      },
      adoptContact: async (contactId) => {
        await adoptContact(contactId)
        await reload()
      },
      unadoptContact: async (contactId) => {
        await unadoptContact(contactId)
        await reload()
      },
    }),
    [contacts, members, loading, error, reload],
  )

  return <DirectoryContext.Provider value={value}>{children}</DirectoryContext.Provider>
}

export function useDirectory(): DirectoryContextValue {
  const ctx = useContext(DirectoryContext)
  if (!ctx) throw new Error('useDirectory doit être appelé sous <DirectoryProvider>.')
  return ctx
}
