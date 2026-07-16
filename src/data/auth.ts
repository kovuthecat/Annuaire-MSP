import type { AuthError, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

/**
 * Couche d'accès Auth (email + mot de passe, session persistée — cf. DECISIONS.md §Auth).
 * L'écran de connexion complet (formulaire, "mot de passe oublié") est câblé en S7 : ce fichier
 * n'expose que les primitives.
 */

/** Session courante (`null` si non connecté) — ne lève jamais, résout `null` en cas d'absence. */
export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw new Error(error.message)
  return data.session
}

/** Id du membre courant (`auth.uid()`), ou `null` si aucune session. */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getSession()
  return session?.user.id ?? null
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return { error }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}

/** Changement de mot de passe par l'utilisateur connecté (comptes provisionnés par un référent). */
export async function updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  return { error }
}

/**
 * Abonnement aux changements de session (connexion/déconnexion/rafraîchissement token).
 * Retourne une fonction de désabonnement (à appeler dans le cleanup d'un `useEffect`).
 */
export function onAuthStateChange(callback: (session: Session | null) => void): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })
  return () => subscription.unsubscribe()
}
