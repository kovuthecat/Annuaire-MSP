import type {
  Contact,
  ContactType,
  PrendNouveaux,
  SecteurConv,
} from '../../types/db'
import type { NewContactInput, ContactUpdateInput } from '../../data/directory'

/**
 * État local du formulaire d'édition — un champ par colonne saisissable du schéma (hors
 * provenance/meta, cf. plans/P1/S5.md T8). Toutes les valeurs texte sont des chaînes contrôlées
 * (jamais `null`) ; la conversion `'' -> null` se fait à la construction du payload
 * (`buildContactPayload`), cf. règle « champs vides → null, pas '' ».
 *
 * Volontairement absents (hors périmètre S5 / maquette écran édition) : `civilite`, `prenom`,
 * `orientation`, `statut`, et la provenance (`source_url`/`source_type`/`source_checked_at`,
 * réservée à la migration T-005).
 */
export interface FormState {
  type: ContactType
  nom: string
  profession: string
  /** "Un moyen de contact" — carte Essentiel, création uniquement (S5 §Décision clé). */
  moyenDeContact: string
  sousType: string
  etablissement: string
  adresse: string
  arrondissement: string
  prendNouveaux: PrendNouveaux
  vad: boolean
  ameCmu: boolean
  pmr: boolean
  secteurConv: SecteurConv | ''
  delai: string
  tarif: string
  langues: string
  teleExpertise: string
  telSecretariat: string
  emailRdv: string
  doctolib: string
  siteWeb: string
  ligneDirecte: string
  bip: string
  portable: string
  fax: string
  emailAvis: string
  mssante: string
  consignesPro: string
  tags: string[]
  rpps: string
}

/** État initial en création — `type: 'praticien'` par défaut, comme la maquette (`editType` initial). */
export function emptyForm(): FormState {
  return {
    type: 'praticien',
    nom: '',
    profession: '',
    moyenDeContact: '',
    sousType: '',
    etablissement: '',
    adresse: '',
    arrondissement: '',
    prendNouveaux: 'inconnu',
    vad: false,
    ameCmu: false,
    pmr: false,
    secteurConv: '',
    delai: '',
    tarif: '',
    langues: '',
    teleExpertise: '',
    telSecretariat: '',
    emailRdv: '',
    doctolib: '',
    siteWeb: '',
    ligneDirecte: '',
    bip: '',
    portable: '',
    fax: '',
    emailAvis: '',
    mssante: '',
    consignesPro: '',
    tags: [],
    rpps: '',
  }
}

/** Édition : préremplit le formulaire depuis la fiche existante (`?? ''` pour les colonnes nullables). */
export function formFromContact(contact: Contact): FormState {
  return {
    type: contact.type,
    nom: contact.nom,
    profession: contact.profession ?? '',
    moyenDeContact: '', // pas de champ en édition (cf. S5 §Décision clé)
    sousType: contact.sous_type ?? '',
    etablissement: contact.etablissement ?? '',
    adresse: contact.adresse ?? '',
    arrondissement: contact.arrondissement ?? '',
    prendNouveaux: contact.prend_nouveaux,
    vad: contact.vad,
    ameCmu: contact.ame_cmu,
    pmr: contact.pmr,
    secteurConv: contact.secteur_conv ?? '',
    delai: contact.delai ?? '',
    tarif: contact.tarif ?? '',
    langues: contact.langues ?? '',
    teleExpertise: contact.tele_expertise ?? '',
    telSecretariat: contact.tel_secretariat ?? '',
    emailRdv: contact.email_rdv ?? '',
    doctolib: contact.doctolib ?? '',
    siteWeb: contact.site_web ?? '',
    ligneDirecte: contact.ligne_directe ?? '',
    bip: contact.bip ?? '',
    portable: contact.portable ?? '',
    fax: contact.fax ?? '',
    emailAvis: contact.email_avis ?? '',
    mssante: contact.mssante ?? '',
    consignesPro: contact.consignes_pro ?? '',
    tags: contact.tags,
    rpps: contact.rpps ?? '',
  }
}

// ---------------------------------------------------------------------------
// Préremplissage depuis une source externe (Doctolib) — contrat figé ici, consommé par P4/S2.
// Cf. plans/P4/index.md §Le contrat `prefill` + §Décisions (liste blanche, sécurité, provenance).
// ---------------------------------------------------------------------------

/**
 * Clés autorisées par le contrat `prefill` (patient / identité / lieu uniquement — jamais un champ
 * pro). `source_url` est la méta de provenance (URL Doctolib d'origine). `latitude`/`longitude`/
 * `geocode_score` sont prévus pour la synergie P3 : acceptés ici pour figer le contrat côté lecture,
 * mais **non transportés** vers le payload de création aujourd'hui — ni `FormState` ni
 * `ContactPayload` n'ont de colonnes dédiées (le schéma ne les a pas encore). Dégradation gracieuse
 * voulue par le plan (P4/index.md §Synergie P3) : à rebrancher le jour où ces colonnes existent,
 * sans casser ce contrat.
 */
export interface Prefill {
  nom?: string
  prenom?: string
  civilite?: string
  profession?: string
  etablissement?: string
  adresse?: string
  arrondissement?: string
  doctolib?: string
  site_web?: string
  tel_secretariat?: string
  email_rdv?: string
  secteur_conv?: SecteurConv
  langues?: string
  source_url?: string
  latitude?: number
  longitude?: number
  geocode_score?: number
}

/** Bornes de longueur par champ texte (assainissement — cf. T1 §Décision clé). Valeur par défaut
 * (200) appliquée si un champ texte futur n'est pas listé explicitement. */
const PREFILL_MAX_LENGTHS: Record<string, number> = {
  nom: 200,
  prenom: 100,
  civilite: 20,
  profession: 200,
  etablissement: 200,
  adresse: 300,
  arrondissement: 20,
  doctolib: 500,
  site_web: 500,
  tel_secretariat: 40,
  email_rdv: 200,
  langues: 200,
  source_url: 500,
}

const SECTEUR_CONV_VALUES: readonly SecteurConv[] = ['1', '2', 'centre', 'non_conv']

/** base64url (RFC 4648 §5, sans padding) -> texte UTF-8. Lève si la chaîne n'est pas décodable. */
function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder('utf-8').decode(bytes)
}

/**
 * Décode et assainit un `prefill` reçu en `?prefill=<base64url>` (entrée non fiable — cf. T1
 * §Décision clé). Renvoie `null` si le payload est irrécupérable (base64 corrompu, JSON invalide,
 * pas un objet) : c'est le seul cas d'échec — sinon on renvoie toujours un `Prefill` (potentiellement
 * vide), les clés inconnues ou invalides étant **ignorées silencieusement** plutôt que de faire
 * échouer tout le décodage.
 */
export function parsePrefill(raw: string): Prefill | null {
  let data: unknown
  try {
    const json = base64UrlDecode(raw)
    data = JSON.parse(json)
  } catch {
    return null
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null
  const source = data as Record<string, unknown>

  /** `String()` + `trim` + borne de longueur ; `undefined` si vide/absent (liste blanche : seules
   * les clés passées explicitement par les appels ci-dessous sont lues). */
  const text = (key: keyof typeof PREFILL_MAX_LENGTHS): string | undefined => {
    const value = source[key]
    if (value === null || value === undefined) return undefined
    const trimmed = String(value).trim()
    if (!trimmed) return undefined
    return trimmed.slice(0, PREFILL_MAX_LENGTHS[key] ?? 200)
  }

  const result: Prefill = {
    nom: text('nom'),
    prenom: text('prenom'),
    civilite: text('civilite'),
    profession: text('profession'),
    etablissement: text('etablissement'),
    adresse: text('adresse'),
    arrondissement: text('arrondissement'),
    doctolib: text('doctolib'),
    site_web: text('site_web'),
    tel_secretariat: text('tel_secretariat'),
    email_rdv: text('email_rdv'),
    langues: text('langues'),
    source_url: text('source_url'),
  }

  const secteur = source.secteur_conv
  if (typeof secteur === 'string' && SECTEUR_CONV_VALUES.includes(secteur as SecteurConv)) {
    result.secteur_conv = secteur as SecteurConv
  }
  // sinon (valeur hors `1|2|centre|non_conv`) : ignoré silencieusement, cf. T1 §Décision clé.

  for (const key of ['latitude', 'longitude', 'geocode_score'] as const) {
    const value = source[key]
    if (typeof value === 'number' && Number.isFinite(value)) result[key] = value
  }

  return result
}

/**
 * Formulaire de création prérempli depuis un `Prefill` déjà assaini par `parsePrefill` — n'écrit
 * **que** les champs présents et valides (T1 §Étapes 1). `type` reste `'praticien'` (valeur par
 * défaut d'`emptyForm()` : le contrat `prefill` ne porte pas de clé `type`). `moyenDeContact` reste
 * vide : les vraies coordonnées patient sont posées directement (`telSecretariat`/`emailRdv`/
 * `doctolib`/`siteWeb`), pas via ce champ de saisie manuelle. `civilite`/`prenom` n'ont pas de champ
 * dédié dans `FormState` (absent depuis S5, cf. en-tête du fichier) : composés dans le champ `nom`
 * unique, comme l'affichage Doctolib (« Dr Jean Dupont »).
 */
export function formFromPrefill(p: Prefill): FormState {
  const base = emptyForm()
  const nomParts = [p.civilite, p.prenom, p.nom].filter(
    (v): v is string => typeof v === 'string' && v.trim() !== '',
  )
  const nom = nomParts.join(' ').trim()

  return {
    ...base,
    nom: nom || base.nom,
    profession: p.profession ?? base.profession,
    etablissement: p.etablissement ?? base.etablissement,
    adresse: p.adresse ?? base.adresse,
    arrondissement: p.arrondissement ?? base.arrondissement,
    doctolib: p.doctolib ?? base.doctolib,
    siteWeb: p.site_web ?? base.siteWeb,
    telSecretariat: p.tel_secretariat ?? base.telSecretariat,
    emailRdv: p.email_rdv ?? base.emailRdv,
    secteurConv: p.secteur_conv ?? base.secteurConv,
    langues: p.langues ?? base.langues,
  }
}

/** `'' -> null` (règle S5 : champs vides envoyés `null`, jamais `''`). */
function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/** Payload complet (toutes les colonnes saisissables sauf provenance/méta) — assignable à
 * `NewContactInput` (création) et `ContactUpdateInput` (édition), cf. src/data/directory.ts. */
export interface ContactPayload {
  type: ContactType
  nom: string
  profession: string | null
  sous_type: string | null
  etablissement: string | null
  adresse: string | null
  arrondissement: string | null
  secteur_conv: SecteurConv | null
  tel_secretariat: string | null
  doctolib: string | null
  site_web: string | null
  email_rdv: string | null
  ligne_directe: string | null
  bip: string | null
  portable: string | null
  fax: string | null
  email_avis: string | null
  mssante: string | null
  consignes_pro: string | null
  prend_nouveaux: PrendNouveaux
  delai: string | null
  vad: boolean
  ame_cmu: boolean
  pmr: boolean
  langues: string | null
  tele_expertise: string | null
  tarif: string | null
  tags: string[]
  rpps: string | null
}

/**
 * Construit le payload Supabase à partir du formulaire. `mode==='create'` applique le routage du
 * champ "Un moyen de contact" (S5 §Décision clé) : contient `@` → `email_rdv`, sinon
 * `tel_secretariat` — sans écraser une valeur déjà saisie explicitement dans les blocs Coordonnées.
 */
export function buildContactPayload(form: FormState, mode: 'create' | 'edit'): ContactPayload {
  let emailRdv = emptyToNull(form.emailRdv)
  let telSecretariat = emptyToNull(form.telSecretariat)

  if (mode === 'create') {
    const moyen = form.moyenDeContact.trim()
    if (moyen) {
      if (moyen.includes('@')) emailRdv ??= moyen
      else telSecretariat ??= moyen
    }
  }

  return {
    type: form.type,
    nom: form.nom.trim(),
    profession: emptyToNull(form.profession),
    sous_type: emptyToNull(form.sousType),
    etablissement: emptyToNull(form.etablissement),
    adresse: emptyToNull(form.adresse),
    arrondissement: emptyToNull(form.arrondissement),
    secteur_conv: form.secteurConv === '' ? null : form.secteurConv,
    tel_secretariat: telSecretariat,
    doctolib: emptyToNull(form.doctolib),
    site_web: emptyToNull(form.siteWeb),
    email_rdv: emailRdv,
    ligne_directe: emptyToNull(form.ligneDirecte),
    bip: emptyToNull(form.bip),
    portable: emptyToNull(form.portable),
    fax: emptyToNull(form.fax),
    email_avis: emptyToNull(form.emailAvis),
    mssante: emptyToNull(form.mssante),
    consignes_pro: emptyToNull(form.consignesPro),
    prend_nouveaux: form.prendNouveaux,
    delai: emptyToNull(form.delai),
    vad: form.vad,
    ame_cmu: form.ameCmu,
    pmr: form.pmr,
    langues: emptyToNull(form.langues),
    tele_expertise: emptyToNull(form.teleExpertise),
    tarif: emptyToNull(form.tarif),
    tags: form.tags,
    rpps: emptyToNull(form.rpps),
  }
}

// Vérification de compatibilité structurelle avec les types de src/data/directory.ts (ne s'exécute
// pas, juste pour que le build échoue si les deux dérivent) — cf. buildContactPayload ci-dessus.
export function assertPayloadTypes(payload: ContactPayload): {
  forCreate: NewContactInput
  forUpdate: ContactUpdateInput
} {
  return { forCreate: payload, forUpdate: payload }
}

/** Validation "Essentiel" (S5 §Décision clé) — retourne un message d'erreur, ou `null` si ok. */
export function validateForm(form: FormState, mode: 'create' | 'edit'): string | null {
  if (!form.type) return 'Choisissez un type de contact.'
  if (!form.nom.trim()) return 'Le nom est obligatoire.'
  if (!form.profession.trim()) return 'La profession / spécialité est obligatoire.'
  if (mode === 'create' && !form.moyenDeContact.trim()) {
    return 'Indiquez au moins un moyen de contact (téléphone ou email).'
  }
  return null
}
