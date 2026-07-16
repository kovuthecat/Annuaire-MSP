import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { AuthError, Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import {
  getSession,
  onAuthStateChange,
  signInWithPassword,
  signOut as signOutRequest,
} from '../../data/auth'
import type { Member } from '../../types/db'

/**
 * Contexte auth (cf. plans/P1/S7.md T10) : session Supabase + ligne `members` du membre courant
 * (nom/rôle affichés dans le Layout et l'écran Membres). S'appuie exclusivement sur les primitives
 * déjà écrites dans `src/data/auth.ts` — aucune n'est réimplémentée ici, la session reste gérée par
 * le client Supabase (`persistSession`/`autoRefreshToken`, cf. src/lib/supabase.ts).
 */
interface AuthContextValue {
  session: Session | null
  userId: string | null
  member: Member | null
  /** Résolution initiale de la session ET de la ligne `members` en cours. */
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  /** Recharge la ligne `members` du membre courant (après édition du profil, T11). */
  refreshMember: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchMember(uid: string): Promise<Member | null> {
  const { data, error } = await supabase.from('members').select('*').eq('id', uid).maybeSingle()
  if (error) throw new Error(error.message)
  return (data as unknown as Member) ?? null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [member, setMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)
  // Id du membre pour lequel `member` a été chargé — évite de recharger la ligne `members` sur
  // un évènement d'auth qui ne change pas d'utilisateur (ex. TOKEN_REFRESHED).
  const loadedForUid = useRef<string | null | undefined>(undefined)

  const loadMemberFor = useCallback(async (uid: string | null) => {
    if (!uid) {
      setMember(null)
      return
    }
    try {
      setMember(await fetchMember(uid))
    } catch {
      setMember(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const initialSession = await getSession().catch(() => null)
      if (cancelled) return
      setSession(initialSession)
      const uid = initialSession?.user.id ?? null
      loadedForUid.current = uid
      await loadMemberFor(uid)
      if (!cancelled) setLoading(false)
    })()

    const unsubscribe = onAuthStateChange((nextSession) => {
      setSession(nextSession)
      const nextUid = nextSession?.user.id ?? null
      if (nextUid === loadedForUid.current) return
      loadedForUid.current = nextUid
      void loadMemberFor(nextUid)
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [loadMemberFor])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      userId: session?.user.id ?? null,
      member,
      loading,
      signIn: signInWithPassword,
      signOut: signOutRequest,
      refreshMember: () => loadMemberFor(session?.user.id ?? null),
    }),
    [session, member, loading, loadMemberFor],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être appelé sous <AuthProvider>.')
  return ctx
}
