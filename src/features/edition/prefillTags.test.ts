import { describe, expect, it } from 'vitest'
import { parsePrefill } from './formState'

/**
 * Assainissement des `tags` du contrat `prefill` (actes Doctolib -> tags de recherche, cf.
 * extract.js `mapActes`). Le reste du contrat est couvert indirectement ; ici on cible la seule
 * logique nouvelle et non triviale : tableau borné, dédupliqué, chaînes seules.
 */

/** Encode un objet en `?prefill=<base64url>` comme le fait le bookmarklet (extract.js toBase64Url). */
function encode(obj: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(obj))
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

describe('parsePrefill — tags', () => {
  it('conserve les tags valides, trimés', () => {
    const p = parsePrefill(encode({ nom: 'X', tags: ['IRM', '  Scanner  ', 'Échographie'] }))
    expect(p?.tags).toEqual(['IRM', 'Scanner', 'Échographie'])
  })

  it('déduplique sans tenir compte de la casse et ignore les vides / non-chaînes', () => {
    const p = parsePrefill(encode({ tags: ['IRM', 'irm', '', '   ', 42, null, 'Scanner'] }))
    expect(p?.tags).toEqual(['IRM', 'Scanner'])
  })

  it('borne le nombre de tags à 20', () => {
    const many = Array.from({ length: 30 }, (_, i) => `acte-${i}`)
    const p = parsePrefill(encode({ tags: many }))
    expect(p?.tags).toHaveLength(20)
    expect(p?.tags?.[0]).toBe('acte-0')
  })

  it('tronque un tag trop long à 60 caractères', () => {
    const long = 'a'.repeat(100)
    const p = parsePrefill(encode({ tags: [long] }))
    expect(p?.tags?.[0]).toHaveLength(60)
  })

  it('laisse `tags` indéfini si absent ou non-tableau', () => {
    expect(parsePrefill(encode({ nom: 'X' }))?.tags).toBeUndefined()
    expect(parsePrefill(encode({ tags: 'IRM' }))?.tags).toBeUndefined()
    expect(parsePrefill(encode({ tags: [] }))?.tags).toBeUndefined()
  })
})
