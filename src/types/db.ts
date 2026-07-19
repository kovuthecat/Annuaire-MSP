/**
 * Types du domaine — miroir de `supabase/schema.sql` (source de vérité). Toute divergence
 * schéma/type se tranche en faveur du schéma (cf. plans/P1/S2.md T4 §Si bloqué).
 */

// ---------------------------------------------------------------------------
// Enums (unions de chaînes = valeurs des contraintes CHECK du schéma)
// ---------------------------------------------------------------------------

export type ContactType = 'praticien' | 'structure' | 'labo' | 'autre'
export type PrendNouveaux = 'oui' | 'non' | 'liste_attente' | 'inconnu'
export type SecteurConv = '1' | '2' | 'centre' | 'non_conv'
export type Statut = 'actif' | 'a_verifier' | 'ne_prend_plus'
/** Catégorie d'annuaire (facette de filtre) — dérivée de type/sous_type/tags à l'import. */
export type Categorie =
  | 'Praticien'
  | 'Structure de soins'
  | "Ligne d'avis"
  | 'Transport sanitaire'
  | 'Ressource'
/** Motif de « grisage » d'une fiche (non exploitable en l'état). `null` = fiche normale. */
export type GriseReason = 'parti' | 'incomplet'
export type CommentType = 'reco' | 'alerte' | 'spec' | 'info'
export type Role = 'membre' | 'referent'
/** Retour d'un membre sur la V1 (table `feedback`). */
export type FeedbackCategory = 'probleme' | 'donnee' | 'suggestion'
export type FeedbackStatus = 'nouveau' | 'en_cours' | 'resolu'
/** Provenance d'une fiche enrichie (migration T-005) — d'où viennent les coordonnées. */
export type SourceType = 'doctolib' | 'annuaire_sante' | 'site_officiel' | 'carnet_membre' | 'autre'

/** Ordre d'affichage canonique des types de commentaire (cf. src/components/CommentIcons.tsx). */
export const COMMENT_TYPES: readonly CommentType[] = ['reco', 'alerte', 'spec', 'info']

// ---------------------------------------------------------------------------
// Tables (miroir 1:1 des colonnes du schéma)
// ---------------------------------------------------------------------------

/** public.contacts */
export interface Contact {
  id: string
  type: ContactType
  sous_type: string | null
  civilite: string | null
  nom: string
  prenom: string | null
  profession: string | null
  orientation: string | null
  etablissement: string | null
  adresse: string | null
  arrondissement: string | null
  secteur_conv: SecteurConv | null

  // Coordonnées PATIENT (imprimables)
  tel_secretariat: string | null
  doctolib: string | null
  site_web: string | null
  /** Mail public de prise de RDV (rdv@…) — communicable au patient, ≠ email_avis (canal pro). */
  email_rdv: string | null

  // Coordonnées PRO (confidentielles — jamais imprimées)
  ligne_directe: string | null
  bip: string | null
  portable: string | null
  fax: string | null
  email_avis: string | null
  mssante: string | null
  consignes_pro: string | null

  // Adressage / accès
  prend_nouveaux: PrendNouveaux
  delai: string | null
  vad: boolean
  ame_cmu: boolean
  pmr: boolean
  langues: string | null
  tele_expertise: string | null
  tarif: string | null

  // Méta
  tags: string[]
  statut: Statut
  /** Facette de filtre (Praticien / Structure de soins / Ligne d'avis / Transport / Ressource). */
  categorie: Categorie | null
  /** Fiche grisée (non exploitable) : `parti` (départ/cessation) ou `incomplet`. `null` = normale. */
  grise_reason: GriseReason | null
  /** Texte d'alerte affiché au survol d'une fiche grisée (ex. « déménagé à Bordeaux »). */
  grise_alerte: string | null
  rpps: string | null
  created_by: string | null
  created_at: string
  updated_by: string | null
  updated_at: string

  // Provenance (migration T-005 — future fonction « vérifier la fiche »)
  source_url: string | null
  source_type: SourceType | null
  source_checked_at: string | null

  // Géo (plan P3 — S1 schéma, S2 usage) : position dérivée de `adresse`, jamais saisie
  // directement (géocodage BAN à la saisie ou backfill hors ligne, cf. plans/P3/index.md).
  latitude: number | null
  longitude: number | null
  /** Score de confiance BAN (0..1) — `null` avant tout géocodage. */
  geocode_score: number | null
  geocoded_at: string | null
}

/** public.comments */
export interface Comment {
  id: string
  contact_id: string
  author_id: string
  type: CommentType
  texte: string
  created_at: string
}

/** public.members */
export interface Member {
  id: string
  email: string | null
  nom: string | null
  prenom: string | null
  profession: string | null
  role: Role
  created_at: string
}

/** public.list_entries — adoption d'une fiche par un membre ("ma liste"). */
export interface ListEntry {
  member_id: string
  contact_id: string
  added_at: string
}

/**
 * public.feedback — retour d'un membre sur la V1 (« Signaler un souci »).
 * `screenshot` (data URL, volumineux) n'est jamais chargé dans la liste : la vue référent le
 * récupère à la demande via `loadFeedbackScreenshot` (cf. src/data/feedback.ts).
 */
export interface Feedback {
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
  screenshot: string | null
  has_screenshot: boolean
  created_at: string
}

// ---------------------------------------------------------------------------
// Vue composée — construite par `loadDirectory()` (src/data/directory.ts)
// ---------------------------------------------------------------------------

/**
 * `Contact` enrichi pour l'affichage : commentaires groupés par type + compteurs, statut
 * d'adoption, et noms d'auteurs résolus (les tables brutes ne stockent que des `member_id`).
 *
 * - `comments` / `counts` : tous les commentaires du contact, groupés par `CommentType`
 *   (tableau vide / compteur 0 si aucun commentaire de ce type — cf. CommentIcons qui n'affiche
 *   une icône que si `counts[type] > 0`).
 * - `starred` : présence de ce contact dans `list_entries` pour le membre courant ("adopté").
 * - `isMine` : `created_by === uid` OU `starred` (cf. DECISIONS.md §propriété/adoption).
 * - `authorNames` : table de résolution `member_id -> nom affiché`, pour tout id d'auteur
 *   rencontré sur ce contact (auteurs des commentaires, `created_by`). Les écrans font
 *   `authorNames[comment.author_id]` plutôt que de dupliquer le nom dans chaque commentaire.
 * - `updatedByName` : nom affiché de `updated_by` (résolu séparément car utilisé directement
 *   dans l'en-tête de fiche "modifié par X" — `null` si `updated_by` est `null` ou inconnu).
 */
export interface ContactWithMeta extends Contact {
  comments: Record<CommentType, Comment[]>
  counts: Record<CommentType, number>
  starred: boolean
  isMine: boolean
  authorNames: Record<string, string>
  updatedByName: string | null
}
