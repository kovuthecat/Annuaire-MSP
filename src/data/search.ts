import { COMMENT_TYPES } from '../types/db'
import type { Categorie, ContactWithMeta, SecteurConv } from '../types/db'

/**
 * Recherche/filtres **côté client** (fonctions pures, testables) — cf. DECISIONS.md §Recherche :
 * le dataset entier (fiches + commentaires) est chargé une fois par `loadDirectory()`, tout le
 * filtrage se fait ensuite en mémoire.
 *
 * La recherche texte est **multi-termes en ET** et **tolérante aux fautes** (cf. DECISIONS.md
 * 2026-07-18) : la requête est découpée en mots, chaque mot doit apparaître quelque part dans la
 * fiche (nom, profession, adresse, arrondissement, tags, texte des commentaires…), peu importe
 * l'ordre ou le champ. Un mot assez long qui ne matche pas exactement est réessayé avec une
 * tolérance d'édition (distance de Levenshtein) pour absorber les fautes de frappe.
 *
 * L'index par contact est **segmenté et pondéré** par champ (nom > profession > méta/tags >
 * localisation > commentaires) : `relevanceScore()` s'en sert pour classer les résultats du tri
 * « Pertinence » (cf. sort.ts, DECISIONS.md 2026-07-18).
 */

/**
 * Filtres de l'annuaire — réduits aux 3 axes à forte valeur d'adressage (cf. DECISIONS.md
 * 2026-07-18 §Filtres) : secteur 1, pédiatrie, avis. Le reste (arrondissement, profession, tags…)
 * passe par la recherche texte, plus rapide à taper (« cardio 75020 ») qu'à chercher dans un menu.
 */
export interface ContactFilters {
  /** "Mes contacts" (bascule Annuaire) : créés par moi OU adoptés — cf. `contact.isMine`. */
  mineOnly?: boolean
  /** Secteur conventionnel (chip « Secteur 1 »). */
  secteurConv?: SecteurConv
  /** Relève de la pédiatrie (chip « Pédiatrie ») — cf. `isPediatrie`. */
  pediatrie?: boolean
  /** Propose un avis / une télé-expertise (chip « Avis ») — cf. `isAvis`. */
  avis?: boolean
  /** Fiche grisée « à compléter » (chip « À compléter », audit pré-partage #9) — cf.
   * `contact.grise_reason`. Sert à orienter l'enrichissement collaboratif plutôt qu'à les cacher :
   * ce sont les fiches les plus utiles à corriger, pas à masquer par défaut. */
  incomplet?: boolean
  /** Catégorie d'annuaire (facette « Catégorie », cf. 2026-07-19) — égalité stricte. */
  categorie?: Categorie
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

/**
 * Normalisation **caractère par caractère** (minuscules + diacritiques retirés, **sans** `trim` ni
 * suppression d'espaces) — pour aligner index normalisé et texte d'origine dans le surlignage
 * (cf. features/annuaire/highlight.ts). Une marque combinante isolée donne `''` (aucune position).
 */
export function normalizeChar(ch: string): string {
  return ch.normalize('NFD').replace(DIACRITICS_PATTERN, '').toLowerCase()
}

// Séparateur de mots : tout ce qui n'est pas lettre ASCII (après `normalize`, les accents ont
// disparu) ou chiffre. Découpe "kiné 20e / diabète" -> ["kine", "20e", "diabete"].
const TOKEN_SEPARATOR = new RegExp('[^a-z0-9]+')

/** Découpe un texte déjà normalisé en mots non vides. */
function tokenize(normalized: string): string[] {
  return normalized.split(TOKEN_SEPARATOR).filter(Boolean)
}

/** Mots de recherche d'une requête utilisateur (normalisés, dédoublonnés d'espaces). */
export function queryTerms(query: string): string[] {
  return tokenize(normalize(query))
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

// ---------------------------------------------------------------------------
// Index de recherche par contact (segmenté, pondéré, mémoïsé)
// ---------------------------------------------------------------------------

/**
 * Poids par champ = importance d'une correspondance à cet endroit dans le classement « Pertinence ».
 * Un nom qui matche compte bien plus qu'un mot enfoui dans un commentaire.
 */
const FIELD_WEIGHTS = {
  name: 100,
  profession: 60,
  meta: 40,
  location: 25,
  comment: 15,
} as const

interface Segment {
  weight: number
  /** Texte normalisé du champ (espaces internes conservés) — pour le test de sous-chaîne. */
  text: string
  /** Mots uniques normalisés — pour le test mot-exact/préfixe/flou. */
  words: string[]
}

interface SearchIndex {
  segments: Segment[]
}

// Clé = l'objet contact lui-même : `loadDirectory()` recrée les objets à chaque rechargement, donc
// un contact modifié obtient une nouvelle entrée et l'ancienne est ramassée par le GC.
const indexCache = new WeakMap<ContactWithMeta, SearchIndex>()

/** Construit un segment pondéré à partir de champs bruts (les vides sont ignorés). */
function makeSegment(weight: number, fields: Array<string | null | undefined>): Segment {
  const text = normalize(fields.filter((f): f is string => Boolean(f)).join(' '))
  return { weight, text, words: [...new Set(tokenize(text))] }
}

function buildIndex(contact: ContactWithMeta): SearchIndex {
  const commentTexts: string[] = []
  for (const type of COMMENT_TYPES) {
    for (const comment of contact.comments[type]) commentTexts.push(comment.texte)
  }
  return {
    segments: [
      makeSegment(FIELD_WEIGHTS.name, [contact.nom, contact.prenom]),
      makeSegment(FIELD_WEIGHTS.profession, [contact.profession, contact.orientation]),
      makeSegment(FIELD_WEIGHTS.meta, [
        contact.civilite,
        contact.etablissement,
        contact.sous_type,
        ...contact.tags,
      ]),
      makeSegment(FIELD_WEIGHTS.location, [contact.adresse, contact.arrondissement]),
      makeSegment(FIELD_WEIGHTS.comment, commentTexts),
    ],
  }
}

/** Index de recherche d'un contact, construit une fois puis réutilisé (cf. `indexCache`). */
function searchIndex(contact: ContactWithMeta): SearchIndex {
  const cached = indexCache.get(contact)
  if (cached) return cached
  const built = buildIndex(contact)
  indexCache.set(contact, built)
  return built
}

// ---------------------------------------------------------------------------
// Correspondance d'un terme dans un segment (qualité graduée)
// ---------------------------------------------------------------------------

// Facteurs de qualité, du meilleur au moins bon.
const FACTOR_EXACT = 1.5 // le mot du champ est exactement le terme
const FACTOR_PREFIX = 1.2 // un mot du champ commence par le terme
const FACTOR_INFIX = 1.0 // le terme est une sous-chaîne (au milieu d'un mot)
const FACTOR_FUZZY = 0.6 // repêché à quelques fautes près (Levenshtein)

/**
 * Tolérance d'édition autorisée pour un terme, selon sa longueur. Les termes courts (< 4) ne sont
 * jamais approximés : trop de faux positifs ("dr", "rue", "kine" vs "line"…).
 */
function maxEditDistanceFor(term: string): number {
  if (term.length < 4) return 0
  if (term.length < 7) return 1
  return 2
}

/** Meilleur facteur de qualité (0 = pas de correspondance) d'un terme dans un segment. */
function matchFactor(term: string, segment: Segment): number {
  let prefix = false
  for (const word of segment.words) {
    if (word === term) return FACTOR_EXACT // insurpassable : on sort
    if (!prefix && word.startsWith(term)) prefix = true
  }
  if (prefix) return FACTOR_PREFIX
  if (segment.text.includes(term)) return FACTOR_INFIX
  const maxDist = maxEditDistanceFor(term)
  if (maxDist > 0) {
    for (const word of segment.words) {
      if (Math.abs(word.length - term.length) > maxDist) continue // écart de longueur rédhibitoire
      if (levenshteinDistance(word, term) <= maxDist) return FACTOR_FUZZY
    }
  }
  return 0
}

/** Meilleur score pondéré d'un terme sur toute la fiche (0 s'il n'apparaît nulle part). */
function termScore(term: string, index: SearchIndex): number {
  let best = 0
  for (const segment of index.segments) {
    const factor = matchFactor(term, segment)
    if (factor > 0) best = Math.max(best, segment.weight * factor)
  }
  return best
}

/**
 * Une fiche relève-t-elle de la **pédiatrie** ? — « pédiatr* » **ou** « enfant(s) » (accents/casse
 * ignorés) dans la profession, l'orientation, le sous-type, les tags **ou le texte des commentaires**
 * (cf. DECISIONS.md 2026-07-18 : beaucoup de motifs de consultation disent « enfants, adolescents »
 * ou « prend aussi les enfants » sans écrire « pédiatrie »). Volontairement large : couvre pédiatres,
 * spécialistes à orientation pédiatrique et consultations ouvertes aux enfants. NB : « enfant »
 * n'attrape pas « enfance » (la protection de l'enfance reste donc hors périmètre).
 */
export function isPediatrie(contact: ContactWithMeta): boolean {
  const fields: Array<string | null | undefined> = [
    contact.profession,
    contact.orientation,
    contact.sous_type,
    ...contact.tags,
  ]
  for (const type of COMMENT_TYPES) {
    for (const comment of contact.comments[type]) fields.push(comment.texte)
  }
  const text = normalize(fields.filter((field): field is string => Boolean(field)).join(' '))
  return text.includes('pediatr') || text.includes('enfant')
}

/**
 * Une fiche propose-t-elle un **avis / une télé-expertise** ? — tag « avis », ou un canal pro d'avis
 * renseigné : télé-expertise, email d'avis, ou **ligne directe** (souvent la ligne d'avis d'un
 * service hospitalier, AP-HP en tête — cf. DECISIONS.md 2026-07-18). Ces champs sont confidentiels
 * (jamais imprimés côté patient) ; on n'exploite ici que leur **présence** pour filtrer.
 */
export function isAvis(contact: ContactWithMeta): boolean {
  if (contact.tags.some((tag) => normalize(tag) === 'avis')) return true
  return Boolean(contact.tele_expertise || contact.email_avis || contact.ligne_directe)
}

function matchesFilters(contact: ContactWithMeta, filters: ContactFilters): boolean {
  if (filters.mineOnly && !contact.isMine) return false
  if (filters.secteurConv && contact.secteur_conv !== filters.secteurConv) return false
  if (filters.pediatrie && !isPediatrie(contact)) return false
  if (filters.avis && !isAvis(contact)) return false
  if (filters.incomplet && contact.grise_reason !== 'incomplet') return false
  if (filters.categorie && contact.categorie !== filters.categorie) return false
  return true
}

/**
 * Filtre + recherche `contacts` en mémoire. `query` est découpée en mots : **chaque** mot doit se
 * retrouver (sous-chaîne, ou approximation tolérante aux fautes) dans nom/prénom/profession/
 * structure/adresse/arrondissement/tags **ou le texte des commentaires** (cf. DECISIONS.md). Les
 * mots se combinent en **ET** (ordre indifférent) ; `filters` s'applique aussi en ET.
 *
 * Ex. « kiné 20e » retient les kinés du 20e ; « dupont diabète » un Dupont commenté « diabète ».
 */
export function filterContacts(
  contacts: ContactWithMeta[],
  query: string,
  filters: ContactFilters = {},
): ContactWithMeta[] {
  const terms = queryTerms(query)
  return contacts.filter((contact) => {
    if (!matchesFilters(contact, filters)) return false
    if (terms.length === 0) return true
    const index = searchIndex(contact)
    return terms.every((term) => termScore(term, index) > 0)
  })
}

/**
 * Score de pertinence d'un contact pour une requête (somme des meilleurs scores pondérés de chaque
 * terme). Plus élevé = plus pertinent. `0` si la requête est vide. Sert au tri « Pertinence » — un
 * match sur le nom pèse plus qu'un match dans un commentaire (cf. `FIELD_WEIGHTS`).
 */
export function relevanceScore(contact: ContactWithMeta, query: string): number {
  const terms = queryTerms(query)
  if (terms.length === 0) return 0
  const index = searchIndex(contact)
  let total = 0
  for (const term of terms) total += termScore(term, index)
  return total
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
