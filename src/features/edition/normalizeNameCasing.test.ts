import { describe, expect, it } from 'vitest'
import { normalizeNameCasing } from './formState'

/**
 * Régression audit pré-partage #9 : des fiches importées portaient un nom tout en minuscules, sans
 * espace (« bordeaumonfun »). La normalisation doit corriger ce cas sans jamais toucher un mot qui
 * porte déjà une majuscule (sigles, casse mixte) — cf. doctrine « ne jamais deviner ».
 */
describe('normalizeNameCasing', () => {
  it('met en Title Case un nom tout en minuscules', () => {
    expect(normalizeNameCasing('jean dupont')).toBe('Jean Dupont')
  })

  it('capitalise après un tiret ou une apostrophe', () => {
    expect(normalizeNameCasing("jean-pierre o'brien")).toBe("Jean-Pierre O'Brien")
  })

  it('laisse un sigle en majuscules intact', () => {
    expect(normalizeNameCasing('CSAPA Montreuil')).toBe('CSAPA Montreuil')
  })

  it('laisse une casse mixte déjà posée intacte (McDonald, Dr)', () => {
    expect(normalizeNameCasing('Dr McDonald')).toBe('Dr McDonald')
  })

  it('ne touche pas un nom déjà correctement capitalisé', () => {
    expect(normalizeNameCasing('Khadra')).toBe('Khadra')
  })

  it('collapse les espaces internes multiples', () => {
    expect(normalizeNameCasing('jean   dupont')).toBe('Jean Dupont')
  })

  it('ne modifie pas une chaîne vide', () => {
    expect(normalizeNameCasing('')).toBe('')
  })
})
