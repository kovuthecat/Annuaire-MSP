import { describe, expect, it } from 'vitest'
import {
  filterContacts,
  findSimilarContacts,
  isAvis,
  isPediatrie,
  normalize,
  relevanceScore,
} from './search'
import { COMMENT_TYPES } from '../types/db'
import type { Comment, CommentType, ContactWithMeta } from '../types/db'

// ---------------------------------------------------------------------------
// Fabrique de fiches — remplit les ~40 champs requis de ContactWithMeta avec des
// valeurs neutres ; on ne surcharge que ce qui compte pour chaque test.
// ---------------------------------------------------------------------------

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

/** Construit une fiche avec des commentaires typés à partir de paires (type, texte). */
function withComments(
  partial: Partial<ContactWithMeta>,
  entries: Array<{ type: CommentType; texte: string }>,
): ContactWithMeta {
  const comments = emptyComments()
  const counts = emptyCounts()
  entries.forEach((entry, i) => {
    comments[entry.type].push({
      id: `cm${i}`,
      contact_id: 'x',
      author_id: 'a',
      type: entry.type,
      texte: entry.texte,
      created_at: '2026-01-01T00:00:00Z',
    })
    counts[entry.type] += 1
  })
  return makeContact({ ...partial, comments, counts })
}

const names = (contacts: ContactWithMeta[]) => contacts.map((c) => c.nom)

describe('normalize', () => {
  it('retire accents, casse et espaces superflus', () => {
    expect(normalize('  Bélvèze  ')).toBe('belveze')
    expect(normalize('KINÉ')).toBe('kine')
  })
})

describe('filterContacts — recherche texte', () => {
  const kine = makeContact({ nom: 'Durand', profession: 'Kinésithérapeute', arrondissement: '20e' })
  const cardio = makeContact({ nom: 'Martin', profession: 'Cardiologue', arrondissement: '11e' })
  const kine11 = makeContact({ nom: 'Petit', profession: 'Kinésithérapeute', arrondissement: '11e' })
  const all = [kine, cardio, kine11]

  it('requête vide renvoie tout', () => {
    expect(filterContacts(all, '')).toHaveLength(3)
    expect(filterContacts(all, '   ')).toHaveLength(3)
  })

  it('est insensible aux accents et à la casse', () => {
    expect(names(filterContacts(all, 'kinesitherapeute'))).toEqual(['Durand', 'Petit'])
    expect(names(filterContacts(all, 'CARDIO'))).toEqual(['Martin'])
  })

  it('fait un match préfixe/infixe (sous-chaîne)', () => {
    expect(names(filterContacts(all, 'cardio'))).toEqual(['Martin'])
  })

  it('combine plusieurs mots en ET, tous champs confondus', () => {
    // profession + arrondissement dans un seul champ de recherche
    expect(names(filterContacts(all, 'kine 20e'))).toEqual(['Durand'])
    expect(names(filterContacts(all, 'kine 11e'))).toEqual(['Petit'])
  })

  it('est indifférent à l’ordre des mots', () => {
    expect(names(filterContacts(all, '20e kine'))).toEqual(['Durand'])
  })

  it('exclut la fiche si un seul mot manque', () => {
    expect(filterContacts(all, 'kine 75e')).toHaveLength(0)
  })

  it('cherche dans le texte des commentaires', () => {
    const c = withComments({ nom: 'Legrand', profession: 'Généraliste' }, [
      { type: 'reco', texte: 'Excellente prise en charge du diabète' },
    ])
    expect(names(filterContacts([c], 'diabete'))).toEqual(['Legrand'])
    // combine commentaire + champ fiche
    expect(names(filterContacts([c], 'generaliste diabete'))).toEqual(['Legrand'])
  })

  it('cherche dans les tags', () => {
    const c = makeContact({ nom: 'Roux', tags: ['tiers payant', 'urgences'] })
    expect(names(filterContacts([c], 'urgences'))).toEqual(['Roux'])
  })
})

describe('filterContacts — tolérance aux fautes de frappe', () => {
  const contacts = [
    makeContact({ nom: 'Durand', profession: 'Kinésithérapeute' }),
    makeContact({ nom: 'Martin', profession: 'Cardiologue' }),
  ]

  it('repêche un mot long malgré une lettre en trop/en moins', () => {
    // "kinesiterapeute" : 'h' manquant (1 édition) vs "kinesitherapeute"
    expect(names(filterContacts(contacts, 'kinesiterapeute'))).toEqual(['Durand'])
    // "cardiologu" -> déjà couvert par sous-chaîne ; vraie faute : "cardilogue"
    expect(names(filterContacts(contacts, 'cardilogue'))).toEqual(['Martin'])
  })

  it('ne rapproche pas les termes trop courts (< 4 lettres)', () => {
    // "line" (faute pour "kine") ne doit PAS matcher : trop court, trop risqué
    expect(filterContacts(contacts, 'line')).toHaveLength(0)
  })
})

describe('isPediatrie', () => {
  it('reconnaît la pédiatrie via profession, orientation, sous-type ou tag (accents ignorés)', () => {
    expect(isPediatrie(makeContact({ profession: 'Pédiatre' }))).toBe(true)
    expect(isPediatrie(makeContact({ profession: 'Dermatologue', tags: ['pédiatrie'] }))).toBe(true)
    expect(isPediatrie(makeContact({ orientation: 'cardiopédiatrie' }))).toBe(true)
    expect(isPediatrie(makeContact({ sous_type: 'urgences pédiatriques' }))).toBe(true)
  })

  it('reconnaît le motif « enfant(s) » dans les champs', () => {
    expect(isPediatrie(makeContact({ profession: 'Psychologue', tags: ['enfants'] }))).toBe(true)
    expect(isPediatrie(makeContact({ orientation: 'Enfants, adolescents' }))).toBe(true)
  })

  it('reconnaît « enfant » ou « pédiatrique » dans un commentaire', () => {
    expect(
      isPediatrie(withComments({ profession: 'Kinésithérapeute' }, [
        { type: 'reco', texte: 'Très investi, prend aussi les enfants.' },
      ])),
    ).toBe(true)
    expect(
      isPediatrie(withComments({ profession: 'Ostéopathe' }, [
        { type: 'spec', texte: 'Ostéopathie pédiatrique et femme enceinte.' },
      ])),
    ).toBe(true)
  })

  it('exclut les fiches sans dimension pédiatrique', () => {
    expect(isPediatrie(makeContact({ profession: 'Cardiologue' }))).toBe(false)
  })

  it('n’attrape pas « enfance » (protection de l’enfance) seule', () => {
    expect(isPediatrie(makeContact({ profession: 'Psychologue', tags: ["protection de l'enfance"] }))).toBe(
      false,
    )
  })
})

describe('isAvis', () => {
  it('reconnaît le tag « avis » (accents/casse ignorés)', () => {
    expect(isAvis(makeContact({ tags: ['Avis'] }))).toBe(true)
  })

  it('reconnaît un canal pro d’avis : télé-expertise, email d’avis ou ligne directe', () => {
    expect(isAvis(makeContact({ tele_expertise: 'Lun-Ven, avis rapide' }))).toBe(true)
    expect(isAvis(makeContact({ email_avis: 'avis@hopital.fr' }))).toBe(true)
    expect(isAvis(makeContact({ ligne_directe: '01 23 45 67 89' }))).toBe(true)
  })

  it('exclut une fiche sans tag ni canal d’avis', () => {
    expect(isAvis(makeContact({ tel_secretariat: '01 00 00 00 00' }))).toBe(false)
  })
})

describe('filterContacts — filtres (chips) combinés avec la recherche', () => {
  it('applique le filtre pédiatrie et le texte en ET', () => {
    const contacts = [
      makeContact({ nom: 'Durand', profession: 'Pédiatre' }),
      makeContact({ nom: 'Petit', profession: 'Pédiatre' }),
      makeContact({ nom: 'Durand', profession: 'Cardiologue' }),
    ]
    expect(names(filterContacts(contacts, 'durand', { pediatrie: true }))).toEqual(['Durand'])
  })

  it('applique le filtre avis', () => {
    const contacts = [
      makeContact({ nom: 'A', tags: ['avis'] }),
      makeContact({ nom: 'B', ligne_directe: '01 02 03 04 05' }),
      makeContact({ nom: 'C' }),
    ]
    expect(names(filterContacts(contacts, '', { avis: true }))).toEqual(['A', 'B'])
  })

  it('applique le filtre secteur 1', () => {
    const contacts = [
      makeContact({ nom: 'A', secteur_conv: '1' }),
      makeContact({ nom: 'B', secteur_conv: '2' }),
    ]
    expect(names(filterContacts(contacts, '', { secteurConv: '1' }))).toEqual(['A'])
  })
})

describe('findSimilarContacts — détection de doublon à la saisie', () => {
  const contacts = [
    makeContact({ nom: 'Belvèze', prenom: 'Claire' }),
    makeContact({ nom: 'Martin', prenom: 'Jean' }),
    makeContact({ nom: 'Durand' }),
  ]

  it('trouve un nom identique (accents/casse ignorés)', () => {
    expect(names(findSimilarContacts('belveze', contacts))).toContain('Belvèze')
  })

  it('tolère une faute de frappe légère', () => {
    // "Belvese" (z->s) doit remonter Belvèze
    expect(names(findSimilarContacts('Belvese', contacts))).toContain('Belvèze')
  })

  it('matche la forme "prénom nom"', () => {
    expect(names(findSimilarContacts('Jean Martin', contacts))).toContain('Martin')
  })

  it('ignore un nom sans rapport', () => {
    expect(findSimilarContacts('Zorglub', contacts)).toHaveLength(0)
  })

  it('respecte la limite', () => {
    const many = Array.from({ length: 10 }, (_, i) => makeContact({ nom: `Dupont${i}` }))
    expect(findSimilarContacts('Dupont', many, 3)).toHaveLength(3)
  })

  it('renvoie vide pour un nom vide', () => {
    expect(findSimilarContacts('', contacts)).toHaveLength(0)
  })
})

describe('relevanceScore — classement du tri « Pertinence »', () => {
  it('score nul pour une requête vide', () => {
    expect(relevanceScore(makeContact({ nom: 'Durand' }), '')).toBe(0)
    expect(relevanceScore(makeContact({ nom: 'Durand' }), '   ')).toBe(0)
  })

  it('un match sur le nom pèse plus qu’un match dans un commentaire', () => {
    const parNom = makeContact({ nom: 'Diabète', profession: 'Généraliste' })
    const parCommentaire = withComments({ nom: 'Martin', profession: 'Généraliste' }, [
      { type: 'reco', texte: 'suivi diabète' },
    ])
    expect(relevanceScore(parNom, 'diabete')).toBeGreaterThan(
      relevanceScore(parCommentaire, 'diabete'),
    )
    expect(relevanceScore(parCommentaire, 'diabete')).toBeGreaterThan(0)
  })

  it('un match sur la profession pèse plus qu’un match sur l’adresse', () => {
    const parProfession = makeContact({ nom: 'A', profession: 'Podologue' })
    const parAdresse = makeContact({ nom: 'B', adresse: '3 rue du Podologue' })
    expect(relevanceScore(parProfession, 'podologue')).toBeGreaterThan(
      relevanceScore(parAdresse, 'podologue'),
    )
  })

  it('classe correctement une vraie liste (nom > profession > commentaire)', () => {
    const contacts = [
      withComments({ nom: 'Martin', profession: 'Généraliste' }, [
        { type: 'info', texte: 'réseau kiné' },
      ]),
      makeContact({ nom: 'Petit', profession: 'Kinésithérapeute' }),
      makeContact({ nom: 'Kine', profession: 'Ostéopathe' }),
    ]
    const ranked = [...contacts].sort((a, b) => relevanceScore(b, 'kine') - relevanceScore(a, 'kine'))
    expect(ranked.map((c) => c.nom)).toEqual(['Kine', 'Petit', 'Martin'])
  })
})

// Garde-fou : le haystack indexe bien tous les types de commentaires déclarés.
describe('couverture des types de commentaires', () => {
  it('indexe chaque CommentType', () => {
    for (const type of COMMENT_TYPES) {
      const c = withComments({ nom: 'X' }, [{ type, texte: `sentinelle-${type}` }])
      expect(filterContacts([c], `sentinelle-${type}`)).toHaveLength(1)
    }
  })
})
