import { supabase } from '../lib/supabase'
import { getCurrentUserId } from './auth'
import { COMMENT_TYPES } from '../types/db'
import type {
  Comment,
  CommentType,
  Contact,
  ContactWithMeta,
  ListEntry,
  Member,
} from '../types/db'

/**
 * Couche d'accès "annuaire" : un chargement unique (`loadDirectory`) qui compose des
 * `ContactWithMeta[]`, + les mutations Supabase. Recherche/filtrage restent en mémoire côté
 * client (src/data/search.ts) — cf. DECISIONS.md §Recherche.
 */

export interface DirectoryData {
  contacts: ContactWithMeta[]
  members: Member[]
}

function emptyCommentGroups(): Record<CommentType, Comment[]> {
  return { reco: [], alerte: [], spec: [], info: [] }
}

function emptyCommentCounts(): Record<CommentType, number> {
  return { reco: 0, alerte: 0, spec: 0, info: 0 }
}

/** Nom affiché d'un membre : "Prénom Nom", à défaut l'email, à défaut un texte de repli. */
export function memberDisplayName(member: Member | undefined | null): string {
  if (!member) return 'Membre inconnu'
  const full = [member.prenom, member.nom].filter(Boolean).join(' ').trim()
  return full || member.email || 'Membre inconnu'
}

// Le client Supabase (PostgREST) plafonne une requête à ~1000 lignes. Au-delà (1226 contacts,
// 1567 commentaires…), la fin du jeu de données manquerait silencieusement. On pagine donc par
// tranches de 1000 tant qu'une page est pleine. `build()` doit recréer la requête à chaque appel
// (une requête n'est consommable qu'une fois).
const PAGE_SIZE = 1000

async function fetchAll<T>(build: () => any): Promise<T[]> {
  const all: T[] = []
  let from = 0
  for (;;) {
    const { data, error } = await build().range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(error.message)
    const rows = (data ?? []) as unknown as T[]
    all.push(...rows)
    if (rows.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return all
}

/**
 * Charge tout le jeu de données (contacts, commentaires, "ma liste" du membre courant, membres)
 * et compose les `ContactWithMeta`. Sans session, la RLS renvoie des tableaux vides pour chaque
 * requête (pas une erreur) : la fonction résout alors `{ contacts: [], members: [] }`.
 * Les tables volumineuses (contacts, commentaires, liste) sont paginées (cf. `fetchAll`).
 */
export async function loadDirectory(): Promise<DirectoryData> {
  const uid = await getCurrentUserId()

  const [contacts, comments, listEntries, membersRes] = await Promise.all([
    fetchAll<Contact>(() => supabase.from('contacts').select('*')),
    fetchAll<Comment>(() => supabase.from('comments').select('*')),
    uid
      ? fetchAll<ListEntry>(() => supabase.from('list_entries').select('*').eq('member_id', uid))
      : Promise.resolve([] as ListEntry[]),
    supabase.from('members').select('*'),
  ])

  if (membersRes.error) throw new Error(membersRes.error.message)
  const members = (membersRes.data ?? []) as unknown as Member[]

  const membersById = new Map(members.map((member) => [member.id, member]))
  const starredIds = new Set(listEntries.map((entry) => entry.contact_id))

  const commentsByContact = new Map<string, Comment[]>()
  for (const comment of comments) {
    const list = commentsByContact.get(comment.contact_id)
    if (list) list.push(comment)
    else commentsByContact.set(comment.contact_id, [comment])
  }

  const contactsWithMeta: ContactWithMeta[] = contacts.map((contact) => {
    const contactComments = commentsByContact.get(contact.id) ?? []
    const grouped = emptyCommentGroups()
    const counts = emptyCommentCounts()
    const authorNames: Record<string, string> = {}

    for (const comment of contactComments) {
      grouped[comment.type].push(comment)
      counts[comment.type] += 1
      authorNames[comment.author_id] ??= memberDisplayName(membersById.get(comment.author_id))
    }
    if (contact.created_by) {
      authorNames[contact.created_by] ??= memberDisplayName(membersById.get(contact.created_by))
    }

    const starred = starredIds.has(contact.id)
    const isMine = contact.created_by === uid || starred

    return {
      ...contact,
      comments: grouped,
      counts,
      starred,
      isMine,
      authorNames,
      updatedByName: contact.updated_by
        ? memberDisplayName(membersById.get(contact.updated_by))
        : null,
    }
  })

  return { contacts: contactsWithMeta, members }
}

// ---------------------------------------------------------------------------
// Mutations — écriture Supabase ; `created_by`/`updated_by`/`updated_at` posés par la base
// (valeurs par défaut / trigger `set_updated`, cf. schema.sql).
// ---------------------------------------------------------------------------

/** Colonnes saisissables à la création/édition (méta exclue : gérée par la base). */
type ContactWritable = Omit<
  Contact,
  'id' | 'created_by' | 'created_at' | 'updated_by' | 'updated_at'
>

export type NewContactInput = Partial<ContactWritable> & Pick<ContactWritable, 'nom'>
export type ContactUpdateInput = Partial<ContactWritable>

export async function createContact(input: NewContactInput): Promise<Contact> {
  const { data, error } = await supabase.from('contacts').insert(input).select().single()
  if (error) throw new Error(error.message)
  return data as unknown as Contact
}

export async function updateContact(id: string, patch: ContactUpdateInput): Promise<Contact> {
  const { data, error } = await supabase
    .from('contacts')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as unknown as Contact
}

export async function deleteContact(id: string): Promise<void> {
  const { error } = await supabase.from('contacts').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function addComment(
  contactId: string,
  type: CommentType,
  texte: string,
): Promise<Comment> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error('Connexion requise pour ajouter un commentaire.')
  const { data, error } = await supabase
    .from('comments')
    .insert({ contact_id: contactId, author_id: uid, type, texte })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as unknown as Comment
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('comments').delete().eq('id', commentId)
  if (error) throw new Error(error.message)
}

/** Adopte une fiche ("ajouter à ma liste") — cf. DECISIONS.md §propriété/adoption. */
export async function adoptContact(contactId: string): Promise<void> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error('Connexion requise pour ajouter à sa liste.')
  const { error } = await supabase
    .from('list_entries')
    .insert({ member_id: uid, contact_id: contactId })
  if (error) throw new Error(error.message)
}

export async function unadoptContact(contactId: string): Promise<void> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error('Connexion requise pour retirer de sa liste.')
  const { error } = await supabase
    .from('list_entries')
    .delete()
    .eq('member_id', uid)
    .eq('contact_id', contactId)
  if (error) throw new Error(error.message)
}

/** Réexporté pour usage direct (ex. initialiser un formulaire d'édition, S5). */
export { COMMENT_TYPES }
