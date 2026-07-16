import type { Contact } from '../../types/db'

/**
 * Vue "patient" d'un contact pour la feuille d'impression (cf. plans/P1/S6.md T9 §Décision clé 3 —
 * étanchéité patient/pro ABSOLUE). Accès **nommés uniquement** aux champs autorisés — jamais
 * d'itération sur `Contact` (qui contient aussi les champs pro `ligne_directe`, `bip`, `portable`,
 * `fax`, `email_avis`, `mssante`, `consignes_pro`, volontairement jamais lus ici).
 */
export interface PatientContactView {
  id: string
  /** "Dr Claire Martin" (civilité + prénom + nom) ou juste `nom` pour une structure. */
  displayName: string
  /** `profession` complétée par `orientation` si présent ("Médecin généraliste · spé endométriose"). */
  displayProfession: string
  /** Concaténation par « · » des seuls bouts présents : adresse, téléphone, modalité de RDV. */
  detailLine: string
}

/** Doctolib (lien) sinon email de RDV public sinon site web — jamais une coordonnée pro. */
function rdvModalite(contact: Contact): string | null {
  if (contact.doctolib) return `Doctolib : ${contact.doctolib}`
  if (contact.email_rdv) return `RDV : ${contact.email_rdv}`
  if (contact.site_web) return `Site : ${contact.site_web}`
  return null
}

function isNonEmpty(value: string | null | undefined): value is string {
  return Boolean(value && value.trim())
}

export function toPatientView(contact: Contact): PatientContactView {
  const nameParts = [contact.civilite, contact.prenom, contact.nom].filter(isNonEmpty)
  const displayName = nameParts.length > 0 ? nameParts.join(' ') : contact.nom

  const displayProfession = [contact.profession, contact.orientation].filter(isNonEmpty).join(' · ')

  const detailLine = [contact.adresse, contact.tel_secretariat, rdvModalite(contact)]
    .filter(isNonEmpty)
    .join(' · ')

  return { id: contact.id, displayName, displayProfession, detailLine }
}
