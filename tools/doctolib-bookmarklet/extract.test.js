import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

// `extract.js` est un fichier autonome (bundlé en IIFE navigateur par build.cjs), pas un module ESM
// du projet — on le charge en CommonJS via `createRequire`, comme le ferait un `require()` Node
// classique. Le fichier ne s'auto-exécute qu'en présence de `document`/`window` (cf. son bas de
// fichier) : le `require()` ici ne déclenche donc aucun `window.open`.
const require = createRequire(import.meta.url)
const { extractFromPage } = require('./extract.js')

/**
 * Régression audit pré-partage (2026-07-19) : le bookmarklet testé sur deux vraies pages Doctolib.
 * Fixtures = JSON-LD réellement observé sur ces pages (capturé le 2026-07-19), pas inventé.
 */

/** Fabrique un `document` minimal portant les scripts JSON-LD + éléments lus par extract.js. */
function fakeDocument({ jsonLd = [], canonicalHref, h1Text } = {}) {
  const scripts = jsonLd.map((obj) => ({ textContent: JSON.stringify(obj) }))
  return {
    querySelectorAll(selector) {
      if (selector === 'script[type="application/ld+json"]') return scripts
      return []
    },
    querySelector(selector) {
      if (selector === 'link[rel="canonical"]') {
        return canonicalHref ? { getAttribute: (attr) => (attr === 'href' ? canonicalHref : null) } : null
      }
      if (selector === 'h1') return h1Text ? { textContent: h1Text } : null
      return null // adresse microdonnées, tel:, mailto: — absents des fixtures réelles ci-dessous
    },
  }
}

describe('extractFromPage — page structure/centre sans praticien identifié', () => {
  // Fixture : JSON-LD réel de https://www.doctolib.fr/cabinet-medical/boulogne-billancourt/
  // centre-de-specialites-pediatriques-de-boulogne (capturé le 2026-07-19). Pas de nœud
  // Physician/Person : seul un MedicalOrganization identifie la page.
  const jsonLd = [
    {
      '@context': 'http://schema.org/',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 2, item: { '@type': 'MedicalSpecialty', name: 'Cabinet médical' } },
      ],
    },
    {
      '@context': 'http://schema.org/',
      '@type': 'MedicalOrganization',
      name: 'Centre de Spécialités Pédiatriques de Boulogne   ',
      legalName: 'Centre de Spécialités Pédiatriques',
      url: '/cabinet-medical/boulogne-billancourt/centre-de-specialites-pediatriques-de-boulogne',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '94 Avenue Victor Hugo',
        postalCode: '92100',
        addressLocality: 'Boulogne-Billancourt',
      },
      availableService: [],
      telephone: '0189885400',
    },
  ]
  const doc = fakeDocument({
    jsonLd,
    canonicalHref:
      'https://www.doctolib.fr/cabinet-medical/boulogne-billancourt/centre-de-specialites-pediatriques-de-boulogne',
    h1Text: 'Centre de Spécialités Pédiatriques de Boulogne', // même texte que le nom de la structure
  })
  const location = {
    href: 'https://www.doctolib.fr/cabinet-medical/boulogne-billancourt/centre-de-specialites-pediatriques-de-boulogne?pid=practice-797659',
  }

  it('pose le même nom de structure dans `nom` ET `etablissement`, sans le découper en personne', () => {
    const result = extractFromPage(doc, location)
    expect(result.etablissement).toBe('Centre de Spécialités Pédiatriques de Boulogne')
    // Avant fix : `nom` valait "de Spécialités Pédiatriques de Boulogne" (h1 redécoupé comme une
    // personne) et un `prenom` fantôme "Centre" apparaissait — non-régression du bug corrigé.
    expect(result.nom).toBe('Centre de Spécialités Pédiatriques de Boulogne')
    expect(result.prenom).toBeUndefined()
    expect(result.civilite).toBeUndefined()
  })

  it("n'invente aucune coordonnée pro et récupère le reste correctement", () => {
    const result = extractFromPage(doc, location)
    expect(result.adresse).toBe('94 Avenue Victor Hugo, 92100 Boulogne-Billancourt')
    expect(result.arrondissement).toBeUndefined() // 92100 n'est pas un CP parisien : pas de deviné
    expect(result.tel_secretariat).toBe('0189885400')
    expect(result.doctolib).toBe(
      'https://www.doctolib.fr/cabinet-medical/boulogne-billancourt/centre-de-specialites-pediatriques-de-boulogne',
    )
  })
})

describe('extractFromPage — page praticien individuel (référence, ne doit pas régresser)', () => {
  // Fixture : JSON-LD réel de https://www.doctolib.fr/sage-femme/paris/anne-kammerer (2026-07-19).
  const jsonLd = [
    {
      '@context': 'http://schema.org/',
      '@type': 'BreadcrumbList',
      itemListElement: [{ '@type': 'ListItem', position: 2, item: { '@type': 'MedicalSpecialty', name: 'Sage-femme' } }],
    },
    {
      '@context': 'http://schema.org/',
      '@type': 'Physician',
      name: 'Anne KAMMERER',
      legalName: null,
      url: '/sage-femme/paris/anne-kammerer',
      address: {
        '@type': 'PostalAddress',
        name: 'Maison de santé Ménilmontant',
        streetAddress: '24 Rue des Plâtrières',
        postalCode: '75020',
        addressLocality: 'Paris',
      },
      availableService: [{ '@type': 'MedicalProcedure', name: 'Frottis' }, { '@type': 'MedicalProcedure', name: 'Suivi de grossesse' }],
      telephone: '01 84 25 69 69',
    },
  ]
  const doc = fakeDocument({
    jsonLd,
    canonicalHref: 'https://www.doctolib.fr/sage-femme/paris/anne-kammerer',
    h1Text: 'Anne KAMMERER',
  })
  const location = { href: 'https://www.doctolib.fr/sage-femme/paris/anne-kammerer?pid=practice-26679' }

  it('sépare correctement prénom/nom, sans toucher au comportement existant', () => {
    const result = extractFromPage(doc, location)
    expect(result.prenom).toBe('Anne')
    expect(result.nom).toBe('KAMMERER')
    expect(result.etablissement).toBeUndefined() // limite connue : address.name n'est pas mappé
  })

  it('récupère profession (via le fil d’Ariane), adresse, arrondissement et les actes', () => {
    const result = extractFromPage(doc, location)
    expect(result.profession).toBe('Sage-femme')
    expect(result.adresse).toBe('24 Rue des Plâtrières, 75020 Paris')
    expect(result.arrondissement).toBe('20e')
    expect(result.tags).toEqual(['Frottis', 'Suivi de grossesse'])
  })
})

describe('extractFromPage — aucune donnée structurée (repli DOM, dernier recours)', () => {
  it('déduit encore un nom de personne depuis le <h1> quand il n’y a aucun JSON-LD', () => {
    const doc = fakeDocument({ jsonLd: [], h1Text: 'Jean Dupont' })
    const location = { href: 'https://www.doctolib.fr/exemple' }
    const result = extractFromPage(doc, location)
    expect(result.prenom).toBe('Jean')
    expect(result.nom).toBe('Dupont')
  })
})
