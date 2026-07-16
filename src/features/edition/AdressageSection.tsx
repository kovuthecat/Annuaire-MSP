import type { CSSProperties } from 'react'
import { Section, Select, TextField } from '../../components/ui'
import { colors } from '../../theme/tokens'
import type { PrendNouveaux, SecteurConv } from '../../types/db'
import type { FormState } from './formState'

/**
 * Section repliable "Adressage & accès" (maquette l.315-325). Le plan (S5 étape 3) demande, en
 * plus des 4 champs visibles dans le rendu statique de la maquette (prend_nouveaux + 3 cases +
 * secteur_conv), les champs `delai`/`tarif`/`langues`/`tele_expertise` — absents du prototype
 * mais explicitement requis par plans/P1/S5.md. Le select secteur_conv couvre les 4 valeurs du
 * schéma (1/2/centre/non_conv), alors que la maquette n'en montrait que 3 (pas de "centre").
 */
interface AdressageSectionProps {
  form: FormState
  onChange: (patch: Partial<FormState>) => void
}

const checkboxRowStyle: CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
}

const checkboxLabelStyle: CSSProperties = {
  display: 'flex',
  gap: 6,
  alignItems: 'center',
  font: '500 12px "Plus Jakarta Sans"',
  color: colors.text.body,
}

const checkboxInputStyle: CSSProperties = {
  accentColor: colors.brand.blue,
}

export default function AdressageSection({ form, onChange }: AdressageSectionProps) {
  return (
    <Section title="Adressage & accès" subtitle="nouveaux patients, VAD, tarifs" dotColor={colors.sector.ame.fg}>
      <Select
        value={form.prendNouveaux}
        onChange={(e) => onChange({ prendNouveaux: e.target.value as PrendNouveaux })}
      >
        <option value="inconnu">Prend de nouveaux patients : inconnu</option>
        <option value="oui">Oui</option>
        <option value="non">Non</option>
        <option value="liste_attente">Liste d'attente</option>
      </Select>

      <div style={checkboxRowStyle}>
        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            style={checkboxInputStyle}
            checked={form.vad}
            onChange={(e) => onChange({ vad: e.target.checked })}
          />
          Visites à domicile
        </label>
        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            style={checkboxInputStyle}
            checked={form.ameCmu}
            onChange={(e) => onChange({ ameCmu: e.target.checked })}
          />
          Accepte AME/CMU
        </label>
        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            style={checkboxInputStyle}
            checked={form.pmr}
            onChange={(e) => onChange({ pmr: e.target.checked })}
          />
          Accès PMR
        </label>
      </div>

      <Select
        value={form.secteurConv}
        onChange={(e) => onChange({ secteurConv: e.target.value as SecteurConv | '' })}
      >
        <option value="">Secteur conventionnement</option>
        <option value="1">Secteur 1</option>
        <option value="2">Secteur 2</option>
        <option value="centre">Secteur centre</option>
        <option value="non_conv">Non conventionné</option>
      </Select>

      <TextField
        variant="compact"
        placeholder="Délai indicatif (ex. 2 semaines)"
        value={form.delai}
        onChange={(e) => onChange({ delai: e.target.value })}
      />
      <TextField
        variant="compact"
        placeholder="Tarif indicatif"
        value={form.tarif}
        onChange={(e) => onChange({ tarif: e.target.value })}
      />
      <TextField
        variant="compact"
        placeholder="Langues parlées"
        value={form.langues}
        onChange={(e) => onChange({ langues: e.target.value })}
      />
      <TextField
        variant="compact"
        placeholder="Télé-expertise / avis rapide"
        value={form.teleExpertise}
        onChange={(e) => onChange({ teleExpertise: e.target.value })}
      />
    </Section>
  )
}
