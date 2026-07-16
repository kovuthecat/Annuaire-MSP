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
