import type { CSSProperties } from 'react'
import { Button, TextField } from '../../components/ui'
import { colors, radii } from '../../theme/tokens'
import type { ContactWithMeta } from '../../types/db'
import { toPatientView } from './patientView'

/**
 * Colonne gauche (maquette l.400-420, cf. plans/P1/S6.md T9 §Étapes 2-3) : panneau de sélection
 * (réordonner / retirer) + options (en-tête, "Pour :", note libre) + boutons Imprimer / Export PDF.
 */
interface SelectionPanelProps {
  items: ContactWithMeta[]
  count: number
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  onRemove: (id: string) => void
  avecEntete: boolean
  onAvecEnteteChange: (value: boolean) => void
  pourPatient: string
  onPourPatientChange: (value: string) => void
  noteLibre: string
  onNoteLibreChange: (value: string) => void
}

const columnStyle: CSSProperties = { width: 300, flex: 'none' }

const titleStyle: CSSProperties = {
  font: '800 15px "Plus Jakarta Sans"',
  color: colors.text.primary,
  marginBottom: 12,
}

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  marginBottom: 20,
}

const itemStyle: CSSProperties = {
  background: colors.white,
  border: `1px solid ${colors.borderLight}`,
  borderRadius: radii.xl,
  padding: '10px 12px',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
}

const itemNameStyle: CSSProperties = {
  flex: 1,
  font: '600 12px "Plus Jakarta Sans"',
  color: colors.text.primary,
  minWidth: 0,
}

const reorderGroupStyle: CSSProperties = { display: 'flex', gap: 2 }

function reorderButtonStyle(disabled: boolean): CSSProperties {
  return {
    border: 'none',
    background: 'transparent',
    padding: '2px 5px',
    borderRadius: radii.sm,
    font: '700 11px "Plus Jakarta Sans"',
    color: disabled ? colors.text.faint : colors.text.secondary,
    cursor: disabled ? 'default' : 'pointer',
  }
}

// #c1734a : couleur "Retirer" de la maquette (l.406), locale à cet écran — absente des tokens.
const removeLinkStyle: CSSProperties = {
  border: 'none',
  background: 'transparent',
  padding: 0,
  font: '600 11px "Plus Jakarta Sans"',
  color: '#c1734a',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const emptyHintStyle: CSSProperties = {
  font: '500 12px "Plus Jakarta Sans"',
  color: colors.text.muted,
}

const optionsLabelStyle: CSSProperties = {
  font: '700 11px "Plus Jakarta Sans"',
  color: colors.text.muted,
  textTransform: 'uppercase',
  letterSpacing: '.04em',
  marginBottom: 10,
}

const optionsGroupStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  marginBottom: 16,
}

const checkboxLabelStyle: CSSProperties = {
  display: 'flex',
  gap: 6,
  alignItems: 'center',
  font: '500 12px "Plus Jakarta Sans"',
  color: colors.text.body,
}

const textareaStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '9px 11px',
  border: `1px solid ${colors.border}`,
  borderRadius: radii.sm,
  font: '500 12px "Plus Jakarta Sans"',
  resize: 'none',
  height: 56,
}

const buttonsRowStyle: CSSProperties = { display: 'flex', gap: 8 }

export default function SelectionPanel({
  items,
  count,
  onMoveUp,
  onMoveDown,
  onRemove,
  avecEntete,
  onAvecEnteteChange,
  pourPatient,
  onPourPatientChange,
  noteLibre,
  onNoteLibreChange,
}: SelectionPanelProps) {
  return (
    <div style={columnStyle}>
      <div style={titleStyle}>Sélection ({count})</div>
      <div style={listStyle}>
        {items.length === 0 ? (
          <div style={emptyHintStyle}>Aucun contact sélectionné — cochez des lignes dans l'annuaire.</div>
        ) : (
          items.map((contact, index) => {
            const { displayName } = toPatientView(contact)
            const isFirst = index === 0
            const isLast = index === items.length - 1
            return (
              <div key={contact.id} style={itemStyle}>
                <span style={itemNameStyle}>{displayName}</span>
                <div style={reorderGroupStyle}>
                  <button
                    type="button"
                    disabled={isFirst}
                    onClick={() => onMoveUp(contact.id)}
                    style={reorderButtonStyle(isFirst)}
                    aria-label={`Monter ${displayName}`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={isLast}
                    onClick={() => onMoveDown(contact.id)}
                    style={reorderButtonStyle(isLast)}
                    aria-label={`Descendre ${displayName}`}
                  >
                    ↓
                  </button>
                </div>
                <button type="button" onClick={() => onRemove(contact.id)} style={removeLinkStyle}>
                  Retirer
                </button>
              </div>
            )
          })
        )}
      </div>

      <div style={optionsLabelStyle}>Options</div>
      <div style={optionsGroupStyle}>
        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            checked={avecEntete}
            onChange={(e) => onAvecEnteteChange(e.target.checked)}
            style={{ accentColor: colors.brand.blue }}
          />
          En-tête MSP (logo + adresse)
        </label>
        <TextField
          variant="compact"
          placeholder="Pour : [prénom du patient]"
          value={pourPatient}
          onChange={(e) => onPourPatientChange(e.target.value)}
        />
        <textarea
          placeholder="Note libre en bas de page"
          value={noteLibre}
          onChange={(e) => onNoteLibreChange(e.target.value)}
          style={textareaStyle}
        />
      </div>

      <div style={buttonsRowStyle}>
        <Button variant="primary" style={{ flex: 1, textAlign: 'center' }} onClick={() => window.print()}>
          Imprimer
        </Button>
        <Button variant="outline" style={{ flex: 1, textAlign: 'center' }} onClick={() => window.print()}>
          Export PDF
        </Button>
      </div>
    </div>
  )
}
