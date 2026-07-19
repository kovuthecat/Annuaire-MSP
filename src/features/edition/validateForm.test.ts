import { describe, expect, it } from 'vitest'
import { emptyForm, formFromPrefill, validateForm } from './formState'

/**
 * Règle « au moins un moyen de contact » à la création. Régression : une fiche préremplie depuis
 * Doctolib pose le téléphone dans `telSecretariat` (et le lien dans `doctolib`), jamais dans le champ
 * de saisie rapide `moyenDeContact` — elle doit rester enregistrable.
 */
describe('validateForm — moyen de contact (création)', () => {
  const base = () => ({ ...emptyForm(), nom: 'Schemoul', profession: 'Radiologue' })

  it('accepte le champ rapide « moyen de contact »', () => {
    expect(validateForm({ ...base(), moyenDeContact: '01 23 45 67 89' }, 'create')).toBeNull()
  })

  it('accepte une coordonnée détaillée seule (Secrétariat), sans champ rapide', () => {
    expect(validateForm({ ...base(), telSecretariat: '01 43 66 20 22' }, 'create')).toBeNull()
  })

  it('accepte un lien Doctolib seul', () => {
    expect(validateForm({ ...base(), doctolib: 'https://www.doctolib.fr/…' }, 'create')).toBeNull()
  })

  it('accepte une fiche préremplie Doctolib (tel dans telSecretariat)', () => {
    const form = formFromPrefill({
      nom: 'Schemoul',
      prenom: 'Gilles',
      profession: 'Radiologue',
      tel_secretariat: '01 43 66 20 22',
      doctolib: 'https://www.doctolib.fr/radiologue/vincennes/gilles-schemoul-vincennes',
    })
    expect(validateForm(form, 'create')).toBeNull()
  })

  it('refuse quand aucun moyen de contact', () => {
    expect(validateForm(base(), 'create')).toMatch(/moyen de contact/i)
  })

  it('n’exige pas de moyen de contact en édition', () => {
    expect(validateForm(base(), 'edit')).toBeNull()
  })
})
