import { describe, expect, it } from 'vitest'
import { sortContacts } from './sort'
import type { Comment, CommentType, ContactWithMeta } from '../../types/db'

// Fabrique minimale (mêmes conventions que src/data/search.test.ts) — seuls les champs pertinents
// pour le tri sont surchargés.

let idSeq = 0

function emptyComments(): Record<CommentType, Comment[]> {
  return { reco: [], alerte: [], spec: [], info: [] }
}

function emptyCounts(): Record<CommentType, number> {
  return { reco: 0, alerte: 0, spec: 0, info: 0 }
}

function makeContact(partial: Partial<ContactWithMeta> = {}): ContactWithMeta {
  idSeq += 1
  const base: ContactWithMeta = {
    id: `c${idSeq}`,
    type: 'praticien',
    sous_type: null,
    civilite: null,
    nom: 'Nom',
    prenom: null,
    profession: null,
    orientation: null,
    etablissement: null,
    adresse: null,
    arrondissement: null,
    secteur_conv: null,
    tel_secretariat: null,
    doctolib: null,
    site_web: null,
    email_rdv: null,
    ligne_directe: null,
    bip: null,
    portable: null,
    fax: null,
    email_avis: null,
    mssante: null,
    consignes_pro: null,
    prend_nouveaux: 'inconnu',
    delai: null,
    vad: false,
    ame_cmu: false,
    pmr: false,
    langues: null,
    tele_expertise: null,
    tarif: null,
    tags: [],
    statut: 'actif',
    categorie: null,
    grise_reason: null,
    grise_alerte: null,
    rpps: null,
    created_by: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_by: null,
    updated_at: '2026-01-01T00:00:00Z',
    source_url: null,
    source_type: null,
    source_checked_at: null,
    latitude: null,
    longitude: null,
    geocode_score: null,
    geocoded_at: null,
    comments: emptyComments(),
    counts: emptyCounts(),
    starred: false,
    isMine: false,
    authorNames: {},
    updatedByName: null,
  }
  return { ...base, ...partial }
}

const NO_REF = { lat: 0, lng: 0 }

describe('sortContacts — tri "pertinence"', () => {
  it('à score de pertinence égal, une fiche avec recommandation passe devant', () => {
    const sansReco = makeContact({ nom: 'Alpha', profession: 'kine' })
    const avecReco = makeContact({
      nom: 'Zoe',
      profession: 'kine',
      comments: { ...emptyComments(), reco: [{ id: 'r1', contact_id: 'x', author_id: 'm1', type: 'reco', texte: 'Top', created_at: '2026-01-01T00:00:00Z' } as Comment] },
      counts: { ...emptyCounts(), reco: 1 },
    })

    const result = sortContacts([sansReco, avecReco], 'pertinence', NO_REF, 'kine')

    expect(result.map((c) => c.nom)).toEqual(['Zoe', 'Alpha'])
  })

  it('un meilleur score de pertinence prime toujours sur la présence d’une recommandation', () => {
    const meilleurMatchSansReco = makeContact({ nom: 'Beta', profession: 'diabete', tags: ['diabete'] })
    const moinsBonMatchAvecReco = makeContact({
      nom: 'Yves',
      profession: null,
      comments: { ...emptyComments(), reco: [{ id: 'r2', contact_id: 'x', author_id: 'm1', type: 'reco', texte: 'diabete au détour d’un commentaire', created_at: '2026-01-01T00:00:00Z' } as Comment] },
      counts: { ...emptyCounts(), reco: 1 },
    })

    const result = sortContacts([moinsBonMatchAvecReco, meilleurMatchSansReco], 'pertinence', NO_REF, 'diabete')

    expect(result[0].nom).toBe('Beta')
  })
})
