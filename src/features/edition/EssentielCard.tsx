import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { TextField } from '../../components/ui'
import { colors, radii } from '../../theme/tokens'
import type { ContactType, ContactWithMeta } from '../../types/db'
import type { FormState } from './formState'

/**
 * Carte "Essentiel" (maquette l.269-302) — toujours ouverte, seuls champs requis. Le champ "Un
 * moyen de contact" et l'encart de détection de doublon n'apparaissent qu'en création (cf.
 * plans/P1/S5.md T8 §Décision clé). L'encart de doublon est rendu actionnable : chaque fiche
 * proche a un lien "ouvrir" vers `/contact/:id` (S5 étape 2), au lieu du simple texte statique
 * de la maquette.
 */
interface EssentielCardProps {
  mode: 'create' | 'edit'
  form: FormState
  onChange: (patch: Partial<FormState>) => void
  duplicates: ContactWithMeta[]
}

const TYPE_OPTIONS: Array<{ value: ContactType; label: string }> = [
  { value: 'praticien', label: 'Praticien' },
  { value: 'structure', label: 'Structure / établissement' },
  { value: 'labo', label: 'Laboratoire / imagerie' },
  { value: 'autre', label: 'Autre ressource' },
]

const cardStyle: CSSProperties = {
  background: colors.white,
  border: '1.5px solid #cdeee7',
  borderRadius: radii.round,
  padding: '20px 22px',
  margin: '20px 0 14px',
  boxShadow: '0 2px 12px rgba(15,159,142,.06)',
}

const headerRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 16,
}

const labelStyle: CSSProperties = {
  font: '700 13px "Plus Jakarta Sans"',
  color: colors.brand.teal,
}

const pastilleStyle: CSSProperties = {
  font: '600 10px "Plus Jakarta Sans"',
  color: colors.brand.teal,
  background: colors.sector.secteur1.bg,
  padding: '2px 8px',
  borderRadius: radii.pill,
}

const typeFieldLabelStyle: CSSProperties = {
  font: '600 11.5px "Plus Jakarta Sans"',
  color: colors.text.body,
  marginBottom: 8,
}

const typeRowStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  marginBottom: 16,
}

function typeButtonStyle(active: boolean): CSSProperties {
  return {
    padding: '9px 16px',
    borderRadius: radii.lg,
    font: '600 12px "Plus Jakarta Sans"',
    cursor: 'pointer',
    border: `1.5px solid ${active ? colors.brand.teal : colors.border}`,
    background: active ? colors.brand.teal : colors.white,
    color: active ? '#fff' : colors.text.body,
  }
}

const fieldsColumnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
}

const hintBoxStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
  marginTop: 16,
  background: '#eef6fd',
  borderRadius: radii.lg,
  padding: '10px 12px',
}

const hintTextStyle: CSSProperties = {
  font: '500 11.5px/1.5 "Plus Jakarta Sans"',
  color: '#2c5c86',
}

const hintRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
  font: '500 11.5px/1.5 "Plus Jakarta Sans"',
  color: '#2c5c86',
}

const hintLinkStyle: CSSProperties = {
  font: '700 11px "Plus Jakarta Sans"',
  color: colors.brand.blue,
  whiteSpace: 'nowrap',
}

export default function EssentielCard({ mode, form, onChange, duplicates }: EssentielCardProps) {
  return (
    <div style={cardStyle}>
      <div style={headerRowStyle}>
        <span style={labelStyle}>Essentiel</span>
        <span style={pastilleStyle}>requis</span>
      </div>

      <div style={typeFieldLabelStyle}>Type de contact</div>
      <div style={typeRowStyle}>
        {TYPE_OPTIONS.map((option) => (
          <div
            key={option.value}
            onClick={() => onChange({ type: option.value })}
            style={typeButtonStyle(form.type === option.value)}
          >
            {option.label}
          </div>
        ))}
      </div>

      <div style={fieldsColumnStyle}>
        <TextField
          label="Nom (personne ou structure)"
          placeholder="Ex. Dr Camille Berthier"
          value={form.nom}
          onChange={(e) => onChange({ nom: e.target.value })}
        />
        <TextField
          label="Profession / spécialité"
          placeholder="Ex. Médecin généraliste, endométriose"
          value={form.profession}
          onChange={(e) => onChange({ profession: e.target.value })}
        />
        {mode === 'create' && (
          <TextField
            label="Un moyen de contact"
            placeholder="Téléphone, email…"
            value={form.moyenDeContact}
            onChange={(e) => onChange({ moyenDeContact: e.target.value })}
          />
        )}
      </div>

      {mode === 'create' && (
        <div style={hintBoxStyle}>
          <svg width="14" height="14" viewBox="0 0 16 16" style={{ flex: 'none', marginTop: 1 }}>
            <circle cx="8" cy="8" r="7" fill="none" stroke={colors.brand.blue} strokeWidth={1.4} />
            <line x1="8" y1="7" x2="8" y2="11.5" stroke={colors.brand.blue} strokeWidth={1.4} />
            <circle cx="8" cy="4.6" r="0.9" fill={colors.brand.blue} />
          </svg>
          {duplicates.length === 0 ? (
            <span style={hintTextStyle}>
              Un nom proche existe déjà dans l'annuaire ? On vous proposera d'ouvrir la fiche
              existante plutôt que d'en créer une en double.
            </span>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={hintTextStyle}>
                {duplicates.length === 1
                  ? 'Un nom proche existe déjà dans l\'annuaire :'
                  : 'Des noms proches existent déjà dans l\'annuaire :'}
              </span>
              {duplicates.map((duplicate) => (
                <div key={duplicate.id} style={hintRowStyle}>
                  <span>
                    {duplicate.nom}
                    {duplicate.profession ? ` · ${duplicate.profession}` : ''}
                  </span>
                  <Link to={`/contact/${duplicate.id}`} style={hintLinkStyle}>
                    ouvrir
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
