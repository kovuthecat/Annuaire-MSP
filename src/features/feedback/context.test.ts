import { describe, expect, it } from 'vitest'
import { contactIdFrom, pageLabelFor } from './context'

describe('pageLabelFor', () => {
  it('nomme les écrans connus', () => {
    expect(pageLabelFor('/')).toBe('Annuaire')
    expect(pageLabelFor('/nouveau')).toBe('Ajouter un contact')
    expect(pageLabelFor('/impression')).toBe('Sélection & impression')
    expect(pageLabelFor('/membres')).toBe('Membres')
    expect(pageLabelFor('/retours')).toBe('Retours')
  })

  it('distingue fiche et édition d’une fiche', () => {
    expect(pageLabelFor('/contact/abc-123')).toBe('Fiche contact')
    expect(pageLabelFor('/contact/abc-123/modifier')).toBe('Modifier une fiche')
  })

  it('retombe sur le pathname pour une route inconnue', () => {
    expect(pageLabelFor('/inconnu')).toBe('/inconnu')
  })
})

describe('contactIdFrom', () => {
  it('extrait l’id sur /contact/:id et /contact/:id/modifier', () => {
    expect(contactIdFrom('/contact/abc-123')).toBe('abc-123')
    expect(contactIdFrom('/contact/abc-123/modifier')).toBe('abc-123')
  })

  it('renvoie null hors des pages fiche', () => {
    expect(contactIdFrom('/')).toBeNull()
    expect(contactIdFrom('/membres')).toBeNull()
    expect(contactIdFrom('/nouveau')).toBeNull()
  })
})
