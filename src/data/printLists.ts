import { supabase } from '../lib/supabase'
import { getCurrentUserId } from './auth'
import { fetchAll, memberDisplayName } from './directory'
import type { Member, PrintList, PrintListFavorite, PrintListItem, PrintListWithMeta } from '../types/db'

/**
 * Couche d'accès "listes d'impression" — miroir de `src/data/directory.ts` (même forme :
 * un chargement composé `loadPrintLists` + des mutations Supabase). Distinct de `list_entries`
 * ("ma liste" = adoption d'une fiche) : ici un membre nomme et ordonne un ensemble de contacts
 * pour l'impression répétée, visible de tous, favorisable par n'importe quel membre
 * (cf. schema.sql §7).
 */

/**
 * Charge toutes les listes (nom, contenu ordonné, favoris du membre courant, propriétaire résolu).
 * Sans session, la RLS renvoie des tableaux vides pour chaque requête (pas une erreur).
 * Triées favoris d'abord, puis par dernière modification décroissante.
 */
export async function loadPrintLists(): Promise<PrintListWithMeta[]> {
  const uid = await getCurrentUserId()

  const [lists, items, favorites, membersRes] = await Promise.all([
    fetchAll<PrintList>(() => supabase.from('print_lists').select('*')),
    fetchAll<PrintListItem>(() => supabase.from('print_list_items').select('*')),
    uid
      ? fetchAll<PrintListFavorite>(() =>
          supabase.from('print_list_favorites').select('*').eq('member_id', uid),
        )
      : Promise.resolve([] as PrintListFavorite[]),
    supabase.from('members').select('*'),
  ])

  if (membersRes.error) throw new Error(membersRes.error.message)
  const members = (membersRes.data ?? []) as unknown as Member[]
  const membersById = new Map(members.map((member) => [member.id, member]))

  const itemsByList = new Map<string, PrintListItem[]>()
  for (const item of items) {
    const list = itemsByList.get(item.list_id)
    if (list) list.push(item)
    else itemsByList.set(item.list_id, [item])
  }

  const favoritedIds = new Set(favorites.map((f) => f.list_id))

  const withMeta = lists.map((list): PrintListWithMeta => {
    const listItems = (itemsByList.get(list.id) ?? []).slice().sort((a, b) => a.position - b.position)
    return {
      id: list.id,
      name: list.name,
      ownerId: list.owner_id,
      ownerName: memberDisplayName(membersById.get(list.owner_id)),
      createdAt: list.created_at,
      updatedAt: list.updated_at,
      contactIds: listItems.map((i) => i.contact_id),
      favorited: favoritedIds.has(list.id),
      isMine: list.owner_id === uid,
    }
  })

  return withMeta.sort((a, b) => {
    if (a.favorited !== b.favorited) return a.favorited ? -1 : 1
    return b.updatedAt.localeCompare(a.updatedAt)
  })
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Crée une liste nommée avec son contenu initial (ordre = ordre du tableau fourni). */
export async function createPrintList(name: string, contactIds: string[]): Promise<string> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error('Connexion requise pour créer une liste.')

  const { data, error } = await supabase
    .from('print_lists')
    .insert({ name, owner_id: uid })
    .select()
    .single()
  if (error) throw new Error(error.message)
  const list = data as unknown as PrintList

  if (contactIds.length > 0) {
    const rows = contactIds.map((contact_id, position) => ({ list_id: list.id, contact_id, position }))
    const { error: itemsError } = await supabase.from('print_list_items').insert(rows)
    if (itemsError) throw new Error(itemsError.message)
  }

  return list.id
}

export async function renamePrintList(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('print_lists').update({ name }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deletePrintList(id: string): Promise<void> {
  const { error } = await supabase.from('print_lists').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** Remplace tout le contenu d'une liste (ajout/retrait/réordonnancement) — réservé au propriétaire (RLS). */
export async function setPrintListItems(id: string, contactIds: string[]): Promise<void> {
  const { error: delError } = await supabase.from('print_list_items').delete().eq('list_id', id)
  if (delError) throw new Error(delError.message)
  if (contactIds.length === 0) return
  const rows = contactIds.map((contact_id, position) => ({ list_id: id, contact_id, position }))
  const { error } = await supabase.from('print_list_items').insert(rows)
  if (error) throw new Error(error.message)
}

export async function favoritePrintList(listId: string): Promise<void> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error('Connexion requise pour ajouter aux favoris.')
  const { error } = await supabase
    .from('print_list_favorites')
    .insert({ member_id: uid, list_id: listId })
  if (error) throw new Error(error.message)
}

export async function unfavoritePrintList(listId: string): Promise<void> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error('Connexion requise pour retirer des favoris.')
  const { error } = await supabase
    .from('print_list_favorites')
    .delete()
    .eq('member_id', uid)
    .eq('list_id', listId)
  if (error) throw new Error(error.message)
}
