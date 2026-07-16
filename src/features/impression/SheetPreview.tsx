import type { CSSProperties } from 'react'
import { colors, radii } from '../../theme/tokens'
import type { ContactWithMeta } from '../../types/db'
import { toPatientView } from './patientView'

/**
 * Aperçu de la feuille d'adressage patient (maquette l.422-437, cf. plans/P1/S6.md T9 §Étape 4).
 * Porte la classe `impression-sheet` : c'est le seul élément conservé par `print.css` à
 * l'impression. N'affiche QUE des champs patient (cf. `patientView.ts` — jamais de coordonnée pro
 * ni de commentaire).
 */
interface SheetPreviewProps {
  items: ContactWithMeta[]
  avecEntete: boolean
  pourPatient: string
  noteLibre: string
}

const MSP_NOM = 'MSP Ménilmontant'
const MSP_ADRESSE = '4 rue de Ménilmontant, 75020 Paris'

const sheetStyle: CSSProperties = {
  flex: 1,
  minWidth: 340,
  background: colors.white,
  border: `1px solid ${colors.borderLight}`,
  borderRadius: radii.xxl,
  padding: 28,
}

const headerRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  paddingBottom: 14,
  borderBottom: '1px solid #f1ede4',
  marginBottom: 16,
}

const headerBadgeStyle: CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: radii.sm,
  background: colors.gradientPrimaryDiagonal,
  flex: 'none',
}

const headerTitleStyle: CSSProperties = {
  font: '800 13px "Plus Jakarta Sans"',
  color: colors.text.primary,
}

const headerSubtitleStyle: CSSProperties = {
  font: '500 10.5px "Plus Jakarta Sans"',
  color: colors.text.muted,
}

const pourPatientStyle: CSSProperties = {
  font: '600 12px "Plus Jakarta Sans"',
  color: colors.text.body,
  marginBottom: 16,
}

const contactBlockStyle: CSSProperties = {
  padding: '12px 0',
  borderBottom: '1px solid #f6f3ea',
}

const contactNameStyle: CSSProperties = {
  font: '700 13px "Plus Jakarta Sans"',
  color: colors.text.primary,
}

const contactProfessionStyle: CSSProperties = {
  font: '500 12px "Plus Jakarta Sans"',
  color: colors.text.secondary,
}

const contactDetailStyle: CSSProperties = {
  font: '500 12px "Plus Jakarta Sans"',
  lineHeight: 1.7,
  color: colors.text.body,
  marginTop: 4,
}

const noteLibreStyle: CSSProperties = {
  marginTop: 16,
  font: '500 12px "Plus Jakarta Sans"',
  color: colors.text.body,
  whiteSpace: 'pre-wrap',
}

export default function SheetPreview({ items, avecEntete, pourPatient, noteLibre }: SheetPreviewProps) {
  const dateEtablie = new Date().toLocaleDateString('fr-FR')

  return (
    <div className="impression-sheet" style={sheetStyle}>
      {avecEntete && (
        <div style={headerRowStyle}>
          <div style={headerBadgeStyle} />
          <div>
            <div style={headerTitleStyle}>{MSP_NOM}</div>
            <div style={headerSubtitleStyle}>
              {MSP_ADRESSE} · Établi le {dateEtablie}
            </div>
          </div>
        </div>
      )}

      {pourPatient.trim() !== '' && <div style={pourPatientStyle}>Pour : {pourPatient}</div>}

      {items.map((contact) => {
        const view = toPatientView(contact)
        return (
          <div key={contact.id} style={contactBlockStyle}>
            <div style={contactNameStyle}>{view.displayName}</div>
            {view.displayProfession && <div style={contactProfessionStyle}>{view.displayProfession}</div>}
            {view.detailLine && <div style={contactDetailStyle}>{view.detailLine}</div>}
          </div>
        )
      })}

      {noteLibre.trim() !== '' && <div style={noteLibreStyle}>{noteLibre}</div>}
    </div>
  )
}
