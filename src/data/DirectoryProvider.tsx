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
  // Horodatage du dernier chargement réussi — sert à throttler le rafraîchissement au focus.
  const lastLoadedAt = useRef(0)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await loadDirectory()
      setContacts(data.contacts)
      setMembers(data.members)
      lastLoadedAt.current = Date.now()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement de l'annuaire.")
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Rafraîchissement SILENCIEUX (sans `setLoading`, donc sans flash) : remplace les données en place
   * si le fetch réussit, garde l'existant sinon. Utilisé au retour de focus sur l'onglet — l'annuaire
   * étant partagé, un membre doit voir les ajouts des autres sans recharger la page (cf. le cas
   * « fiche créée ailleurs, invisible ici »).
   */
  const refreshSilently = useCallback(async () => {
    try {
      const data = await loadDirectory()
      setContacts(data.contacts)
      setMembers(data.members)
      setError(null)
      lastLoadedAt.current = Date.now()
    } catch {
      // Échec silencieux : on conserve les données déjà affichées.
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

  // Rafraîchissement au retour de focus sur l'onglet (throttlé) : couvre le cas d'un annuaire
  // partagé où un membre a ajouté/modifié une fiche depuis un autre appareil/navigateur. Pas de
  // temps réel (Supabase Realtime) pour l'instant — le focus suffit à la plupart des usages.
  useEffect(() => {
    const STALE_MS = 20_000
    const onFocusOrVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (loadedForUid.current === undefined) return // chargement initial pas encore fait
      if (Date.now() - lastLoadedAt.current < STALE_MS) return
      void refreshSilently()
    }
    document.addEventListener('visibilitychange', onFocusOrVisible)
    window.addEventListener('focus', onFocusOrVisible)
    return () => {
      document.removeEventListener('visibilitychange', onFocusOrVisible)
      window.removeEventListener('focus', onFocusOrVisible)
    }
  }, [refreshSilently])

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
