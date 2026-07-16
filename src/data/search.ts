import { COMMENT_TYPES } from '../types/db'
import type { ContactType, ContactWithMeta, PrendNouveaux, SecteurConv } from '../types/db'

/**
 * Recherche/filtres **côté client** (fonctions pures, testables) — cf. DECISIONS.md §Recherche :
 * le dataset entier (fiches + commentaires) est chargé une fois par `loadDirectory()`, tout le
 * filtrage se fait ensuite en mémoire.
 */

export interface ContactFilters {
  /** "Mes contacts" (bascule Annuaire) : créés par moi OU adoptés — cf. `contact.isMine`. */
  mineOnly?: boolean
  type?: ContactType
  profession?: string
  arrondissement?: string
  prendNouveaux?: PrendNouveaux
  vad?: boolean
  ameCmu?: boolean
  secteurConv?: SecteurConv
  /** Tags requis (ET logique) — comparaison tolérante via `normalize`. */
  tags?: string[]
}

// Plage Unicode U+0300–U+036F (diacritiques combinants), retirée après normalisation NFD.
// Construit via `new RegExp(string)` plutôt qu'un littéral `/…/` pour éviter tout caractère
// combinant brut (invisible) dans le source.
const DIACRITICS_PATTERN = new RegExp('[\\u0300-\\u036f]', 'g')

/** Comparaison tolérante : minuscules + diacritiques retirés + espaces superflus. */
export function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(DIACRITICS_PATTERN, '')
    .toLowerCase()
    .trim()
}

/** Texte concaténé d'un contact utilisé pour la recherche plein texte côté client. */
function searchHaystack(contact: ContactWithMeta): string {
  const fields: Array<string | null | undefined> = [
    contact.nom,
    contact.prenom,
    contact.civilite,
    contact.profession,
    contact.orientation,
    contact.etablissement,
    contact.adresse,
    contact.arrondissement,
    contact.sous_type,
    ...contact.tags,
  ]
  for (const type of COMMENT_TYPES) {
    for (const comment of contact.comments[type]) {
      fields.push(comment.texte)
    }
  }
  return normalize(fields.filter((field): field is string => Boolean(field)).join(' '))
}

function matchesFilters(contact: ContactWithMeta, filters: ContactFilters): boolean {
  if (filters.mineOnly && !contact.isMine) return false
  if (filters.type && contact.type !== filters.type) return false
  if (filters.profession && normalize(contact.profession ?? '') !== normalize(filters.profession)) {
    return false
  }
  if (filters.arrondissement && contact.arrondissement !== filters.arrondissement) return false
  if (filters.prendNouveaux && contact.prend_nouveaux !== filters.prendNouveaux) return false
  if (filters.vad && !contact.vad) return false
  if (filters.ameCmu && !contact.ame_cmu) return false
  if (filters.secteurConv && contact.secteur_conv !== filters.secteurConv) return false
  if (filters.tags && filters.tags.length > 0) {
    const contactTags = new Set(contact.tags.map(normalize))
    if (!filters.tags.every((tag) => contactTags.has(normalize(tag)))) return false
  }
  return true
}

/**
 * Filtre + recherche `contacts` en mémoire. `query` porte sur nom/prénom/profession/structure/
 * adresse/arrondissement/tags **et le texte des commentaires** (cf. DECISIONS.md), tolérant aux
 * accents et à la casse. `filters` s'applique en ET logique avec la recherche texte.
 */
export function filterContacts(
  contacts: ContactWithMeta[],
  query: string,
  filters: ContactFilters = {},
): ContactWithMeta[] {
  const normalizedQuery = normalize(query)
  return contacts.filter((contact) => {
    if (!matchesFilters(contact, filters)) return false
    if (!normalizedQuery) return true
    return searchHaystack(contact).includes(normalizedQuery)
  })
}

/** Distance de Levenshtein (nombre minimal d'éditions caractère à caractère). */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  let previousRow = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const currentRow = [i]
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      currentRow.push(
        Math.min(
          currentRow[j - 1] + 1, // insertion
          previousRow[j] + 1, // suppression
          previousRow[j - 1] + cost, // substitution
        ),
      )
    }
    previousRow = currentRow
  }
  return previousRow[n]
}

/** Score de similarité entre 0 (rien en commun) et 1 (identique). */
function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - levenshteinDistance(a, b) / maxLen
}

const DUPLICATE_SCORE_THRESHOLD = 0.72

/**
 * Détection de doublon (S5, formulaire d'ajout) : contacts dont le nom ressemble à `nom`
 * (comparé à `nom`, `"prénom nom"` et `"nom prénom"`), tolérant accents/casse/fautes légères.
 * Résultat trié par similarité décroissante, limité à `limit`.
 */
export function findSimilarContacts(
  nom: string,
  contacts: ContactWithMeta[],
  limit = 5,
): ContactWithMeta[] {
  const target = normalize(nom)
  if (!target) return []

  return contacts
    .map((contact) => {
      const candidates = [
        contact.nom,
        contact.prenom ? `${contact.prenom} ${contact.nom}` : null,
        contact.prenom ? `${contact.nom} ${contact.prenom}` : null,
      ]
        .filter((candidate): candidate is string => Boolean(candidate))
        .map(normalize)

      const score = candidates.reduce((best, candidate) => {
        if (candidate === target) return 1
        if (candidate.includes(target) || target.includes(candidate)) return Math.max(best, 0.9)
        return Math.max(best, similarity(candidate, target))
      }, 0)

      return { contact, score }
    })
    .filter((entry) => entry.score >= DUPLICATE_SCORE_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.contact)
}
