import { describe, expect, it } from 'vitest'
import { highlightSegments } from './highlight'

/** Texte reconstitué depuis les segments (doit toujours égaler l'entrée). */
const rebuilt = (text: string, terms: string[]) =>
  highlightSegments(text, terms)
    .map((s) => s.text)
    .join('')

/** Concaténation des seules portions surlignées. */
const matched = (text: string, terms: string[]) =>
  highlightSegments(text, terms)
    .filter((s) => s.match)
    .map((s) => s.text)
    .join('')

describe('highlightSegments', () => {
  it('ne casse jamais le texte : la reconstitution est fidèle', () => {
    expect(rebuilt('Kinésithérapeute', ['kine'])).toBe('Kinésithérapeute')
    expect(rebuilt('Dr Bélvèze', ['belveze'])).toBe('Dr Bélvèze')
  })

  it('surligne en préservant accents et casse d’origine', () => {
    expect(matched('Kinésithérapeute', ['kine'])).toBe('Kiné')
    expect(matched('CARDIOLOGUE', ['cardio'])).toBe('CARDIO')
    expect(matched('Bélvèze', ['belveze'])).toBe('Bélvèze')
  })

  it('gère plusieurs termes dans le même champ', () => {
    // "20e arr." avec les termes "20e" et "arr"
    expect(matched('20e arr.', ['20e', 'arr'])).toBe('20earr')
  })

  it('ne surligne rien si aucun terme ne correspond', () => {
    const segments = highlightSegments('Ostéopathe', ['kine'])
    expect(segments).toEqual([{ text: 'Ostéopathe', match: false }])
  })

  it('retourne un segment neutre quand il n’y a pas de terme', () => {
    expect(highlightSegments('Durand', [])).toEqual([{ text: 'Durand', match: false }])
  })

  it('retourne une liste vide pour un texte vide', () => {
    expect(highlightSegments('', ['kine'])).toEqual([])
  })

  it('ne surligne pas au travers d’un espace (mots distincts)', () => {
    // le terme "leon" ne doit pas fusionner "Le" et "on" à travers l'espace
    const segments = highlightSegments('Le on', ['leon'])
    expect(segments.filter((s) => s.match)).toHaveLength(0)
  })
})
