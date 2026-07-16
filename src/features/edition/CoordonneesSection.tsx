import type { CSSProperties } from 'react'
import { Section } from '../../components/ui'
import { colors, radii } from '../../theme/tokens'
import type { FormState } from './formState'

/**
 * Section repliable "Coordonnées patient / pro" (maquette l.326-345). La maquette regroupe
 * certains champs pro par commodité ("Ligne directe médecins / bip", "Portable perso / fax") —
 * S5 étape 3 demande explicitement **un champ par colonne** : on ne suit pas ce regroupement.
 * `email_rdv` porte le libellé exact demandé par le plan ("Email de RDV (public)").
 */
interface CoordonneesSectionProps {
  form: FormState
  onChange: (patch: Partial<FormState>) => void
}

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 14,
}

const blockStyle = (bg: string): CSSProperties => ({
  background: bg,
  borderRadius: radii.lg,
  padding: '12px 14px',
})

const blockTitleRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  marginBottom: 8,
}

const patientTitleStyle: CSSProperties = {
  font: '700 10.5px "Plus Jakarta Sans"',
  color: colors.brand.teal,
}

const proTitleStyle: CSSProperties = {
  font: '700 10.5px "Plus Jakarta Sans"',
  color: colors.coords.pro.accent,
}

const fieldsColumnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}

const compactBorderedInput = (border: string): CSSProperties => ({
  padding: '9px 11px',
  border: `1px solid ${border}`,
  borderRadius: radii.sm,
  font: '500 12px "Plus Jakarta Sans"',
})

export default function CoordonneesSection({ form, onChange }: CoordonneesSectionProps) {
  return (
    <Section
      title="Coordonnées patient / pro"
      subtitle="ce qui est communicable, ce qui ne l'est pas"
      dotColor={colors.brand.blue}
    >
      <div style={gridStyle}>
        <div style={blockStyle(colors.coords.patient.bg)}>
          <div style={blockTitleRowStyle}>
            <span style={patientTitleStyle}>COORDS. PATIENT</span>
          </div>
          <div style={fieldsColumnStyle}>
            <input
              placeholder="Secrétariat"
              value={form.telSecretariat}
              onChange={(e) => onChange({ telSecretariat: e.target.value })}
              style={compactBorderedInput(colors.coords.patient.border)}
            />
            <input
              placeholder="Email de RDV (public)"
              value={form.emailRdv}
              onChange={(e) => onChange({ emailRdv: e.target.value })}
              style={compactBorderedInput(colors.coords.patient.border)}
            />
            <input
              placeholder="Doctolib / lien de RDV"
              value={form.doctolib}
              onChange={(e) => onChange({ doctolib: e.target.value })}
              style={compactBorderedInput(colors.coords.patient.border)}
            />
            <input
              placeholder="Site web"
              value={form.siteWeb}
              onChange={(e) => onChange({ siteWeb: e.target.value })}
              style={compactBorderedInput(colors.coords.patient.border)}
            />
          </div>
        </div>

        <div style={blockStyle(colors.coords.pro.bg)}>
          <div style={blockTitleRowStyle}>
            <svg width="11" height="11" viewBox="0 0 12 12">
              <rect x="2" y="5" width="8" height="6" rx="1" fill={colors.coords.pro.accent} />
              <path
                d="M4 5V3.5a2 2 0 0 1 4 0V5"
                fill="none"
                stroke={colors.coords.pro.accent}
                strokeWidth={1.2}
              />
            </svg>
            <span style={proTitleStyle}>COORDS. PRO — réservé aux pros</span>
          </div>
          <div style={fieldsColumnStyle}>
            <input
              placeholder="Ligne directe médecins"
              value={form.ligneDirecte}
              onChange={(e) => onChange({ ligneDirecte: e.target.value })}
              style={compactBorderedInput(colors.coords.pro.border)}
            />
            <input
              placeholder="Bip"
              value={form.bip}
              onChange={(e) => onChange({ bip: e.target.value })}
              style={compactBorderedInput(colors.coords.pro.border)}
            />
            <input
              placeholder="Portable perso"
              value={form.portable}
              onChange={(e) => onChange({ portable: e.target.value })}
              style={compactBorderedInput(colors.coords.pro.border)}
            />
            <input
              placeholder="Fax"
              value={form.fax}
              onChange={(e) => onChange({ fax: e.target.value })}
              style={compactBorderedInput(colors.coords.pro.border)}
            />
            <input
              placeholder="Email d'avis"
              value={form.emailAvis}
              onChange={(e) => onChange({ emailAvis: e.target.value })}
              style={compactBorderedInput(colors.coords.pro.border)}
            />
            <input
              placeholder="MSSanté"
              value={form.mssante}
              onChange={(e) => onChange({ mssante: e.target.value })}
              style={compactBorderedInput(colors.coords.pro.border)}
            />
            <input
              placeholder="Consignes pro (ex. préciser être adressé par la CPTS)"
              value={form.consignesPro}
              onChange={(e) => onChange({ consignesPro: e.target.value })}
              style={compactBorderedInput(colors.coords.pro.border)}
            />
          </div>
        </div>
      </div>
    </Section>
  )
}
