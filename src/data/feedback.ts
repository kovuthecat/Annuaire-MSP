import { supabase } from '../lib/supabase'
import { getCurrentUserId } from './auth'
import type { FeedbackCategory, FeedbackStatus } from '../types/db'

/**
 * Couche d'accès « retours » (table feedback — cf. supabase/schema.sql §6). Deux usages :
 *   - tout membre dépose un retour signé (`submitFeedback`, appelé par le bouton flottant) ;
 *   - le référent relit / traite les retours (`loadFeedback`, `updateFeedbackStatus`,
 *     `deleteFeedback`, écran /retours). La RLS `feedback_select`/`_update`/`_delete` réserve la
 *     lecture et la gestion au référent ; l'insertion est ouverte à tout membre.
 *
 * `screenshot` (data URL volumineuse) n'est jamais chargé dans la liste : `loadFeedback` sélectionne
 * des colonnes explicites, et `loadFeedbackScreenshot` récupère l'image à la demande au détail.
 */

/** Contexte de page capturé + saisie du membre, envoyés à l'insertion. */
export interface FeedbackInput {
  category: FeedbackCategory
  message: string
  url: string
  page_label: string
  /** Fiche concernée si le retour part d'une page /contact/:id, sinon null. */
  contact_id: string | null
  viewport: string
  user_agent: string
  /** Capture d'écran (data URL JPEG) ou null si la génération a échoué / a été décochée. */
  screenshot: string | null
}

/** Ligne de retour telle qu'affichée dans la vue référent — sans la capture (chargée à la demande). */
export interface FeedbackListItem {
  id: string
  author_id: string | null
  category: FeedbackCategory
  message: string
  status: FeedbackStatus
  url: string | null
  page_label: string | null
  contact_id: string | null
  viewport: string | null
  user_agent: string | null
  has_screenshot: boolean
  created_at: string
  /** Auteur résolu par jointure (null pour un compte supprimé). */
  author: { prenom: string | null; nom: string | null; email: string | null } | null
}

const LIST_COLUMNS =
  'id,author_id,category,message,status,url,page_label,contact_id,viewport,user_agent,' +
  'has_screenshot,created_at,author:members(prenom,nom,email)'

/** Dépose un retour signé (author_id = membre courant, imposé par la RLS d'insertion). */
export async function submitFeedback(input: FeedbackInput): Promise<void> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error('Connexion requise pour envoyer un retour.')
  const { error } = await supabase
    .from('feedback')
    .insert({ ...input, author_id: uid, has_screenshot: input.screenshot !== null })
  if (error) throw new Error(error.message)
}

/** Liste des retours, plus récents d'abord (référent uniquement — RLS). Sans les captures. */
export async function loadFeedback(): Promise<FeedbackListItem[]> {
  const { data, error } = await supabase
    .from('feedback')
    .select(LIST_COLUMNS)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as FeedbackListItem[]
}

/** Capture d'écran d'un retour, chargée à la demande (colonne volumineuse). */
export async function loadFeedbackScreenshot(id: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('feedback')
    .select('screenshot')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data?.screenshot as string | null | undefined) ?? null
}

export async function updateFeedbackStatus(id: string, status: FeedbackStatus): Promise<void> {
  const { error } = await supabase.from('feedback').update({ status }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteFeedback(id: string): Promise<void> {
  const { error } = await supabase.from('feedback').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
