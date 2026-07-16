import type { CSSProperties, ReactNode } from 'react'
import { colors, radii } from '../../theme/tokens'
import type { ContactWithMeta } from '../../types/db'
import { isUrl } from './format'

/**
 * Les deux blocs coordonnées (maquette l.187-199, cf. plans/P1/S4.md T7 §Décision clé) : patient
 * (fond `colors.coords.patient`, communicable) et pro (fond `colors.coords.pro`, cadenas + mention
 * confidentielle). Un champ par ligne, labellisé — jamais concaténé comme le fait le prototype.
 * **Piège** : `email_rdv` est patient (public), `email_avis` est pro (confidentiel) — ne pas les
 * intervertir (cf. DECISIONS.md §Coordonnées).
 */
interface CoordsBlockProps {
  contact: ContactWithMeta
}

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 14,
  marginBottom: 18,
}

function cardStyle(bg: string, border: string): CSSProperties {
  return {
    background: bg,
    border: `1px solid ${border}`,
    borderRadius: radii.xl,
    padding: '16px 18px',
  }
}

const titleRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  marginBottom: 8,
}

function titleStyle(accent: string): CSSProperties {
  return {
    font: '700 11px "Plus Jakarta Sans"',
    color: accent,
    textTransform: 'uppercase',
    letterSpacing: '.04em',
  }
}

const lineStyle: CSSProperties = {
  font: '500 12.5px/1.8 "Plus Jakarta Sans"',
  color: colors.text.body,
}

const linkStyle: CSSProperties = {
  color: 'inherit',
  textDecoration: 'underline',
}

const emptyStyle: CSSProperties = {
  font: '500 12.5px "Plus Jakarta Sans"',
  color: colors.text.faint,
}

interface Line {
  label: string
  value: ReactNode
}

function Lines({ lines }: { lines: Line[] }) {
  if (lines.length === 0) return <div style={emptyStyle}>—</div>
  return (
    <div style={lineStyle}>
      {lines.map((line, i) => (
        <div key={i}>
          {line.label} : {line.value}
        </div>
      ))}
    </div>
  )
}

/** Rend une valeur en lien (tel:/mailto:/http) si pertinent, sinon en texte brut. */
function linkOrText(value: string, kind: 'tel' | 'mail' | 'url'): ReactNode {
  if (kind === 'tel') {
    return (
      <a href={`tel:${value}`} style={linkStyle}>
        {value}
      </a>
    )
  }
  if (kind === 'mail') {
    return (
      <a href={`mailto:${value}`} style={linkStyle}>
        {value}
      </a>
    )
  }
  // url : seulement si ça y ressemble, sinon texte brut (le champ peut être une simple note).
  if (isUrl(value)) {
    return (
      <a href={value} target="_blank" rel="noreferrer" style={linkStyle}>
        {value}
      </a>
    )
  }
  return value
}

export default function CoordsBlock({ contact }: CoordsBlockProps) {
  const patientLines: Line[] = []
  if (contact.adresse) patientLines.push({ label: 'Adresse', value: contact.adresse })
  if (contact.etablissement) patientLines.push({ label: 'Établissement', value: contact.etablissement })
  if (contact.tel_secretariat) {
    patientLines.push({ label: 'Secrétariat', value: linkOrText(contact.tel_secretariat, 'tel') })
  }
  if (contact.email_rdv) {
    patientLines.push({ label: 'Email RDV', value: linkOrText(contact.email_rdv, 'mail') })
  }
  if (contact.doctolib) {
    patientLines.push({ label: 'Doctolib', value: linkOrText(contact.doctolib, 'url') })
  }
  if (contact.site_web) {
    patientLines.push({ label: 'Site web', value: linkOrText(contact.site_web, 'url') })
  }

  const proLines: Line[] = []
  if (contact.ligne_directe) {
    proLines.push({ label: 'Ligne directe', value: linkOrText(contact.ligne_directe, 'tel') })
  }
  if (contact.bip) proLines.push({ label: 'Bip', value: linkOrText(contact.bip, 'tel') })
  if (contact.portable) proLines.push({ label: 'Portable', value: linkOrText(contact.portable, 'tel') })
  if (contact.fax) proLines.push({ label: 'Fax', value: contact.fax })
  if (contact.email_avis) {
    proLines.push({ label: "Email d'avis", value: linkOrText(contact.email_avis, 'mail') })
  }
  if (contact.mssante) proLines.push({ label: 'MSSanté', value: contact.mssante })
  if (contact.consignes_pro) proLines.push({ label: 'Consignes', value: contact.consignes_pro })

  return (
    <div className="fiche-coords-grid" style={gridStyle}>
      <style>{`
        @media (max-width: 640px) {
          .fiche-coords-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div style={cardStyle(colors.coords.patient.bg, colors.coords.patient.border)}>
        <div style={titleRowStyle}>
          <span style={titleStyle(colors.coords.patient.accent)}>Pour le patient</span>
        </div>
        <Lines lines={patientLines} />
      </div>
      <div style={cardStyle(colors.coords.pro.bg, colors.coords.pro.border)}>
        <div style={titleRowStyle}>
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect x="2" y="5" width="8" height="6" rx="1.5" fill={colors.coords.pro.accent} />
            <path d="M4 5V3.5a2 2 0 0 1 4 0V5" fill="none" stroke={colors.coords.pro.accent} strokeWidth="1.3" />
          </svg>
          <span style={titleStyle(colors.coords.pro.accent)}>
            Réservé aux pros — ne pas communiquer au patient
          </span>
        </div>
        <Lines lines={proLines} />
      </div>
    </div>
  )
}
