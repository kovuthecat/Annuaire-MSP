import type { CSSProperties } from 'react'
import { useState } from 'react'
import { Section } from '../../components/ui'
import { colors, radii } from '../../theme/tokens'
import { COMMENT_TYPES } from '../../types/db'
import type { CommentType } from '../../types/db'

/**
 * Section repliable "Commentaires" (maquette l.360-386) : 4 chips de type + textarea + bouton
 * d'ajout + liste des commentaires ajoutés dans cette session. En création, `onAdd` met en
 * brouillon (créés via `addComment` après la fiche, cf. S5 §Décision clé) ; en édition, le parent
 * (`EditionPage`) appelle `addComment` immédiatement dans `onAdd` — ce composant ne connaît pas le
 * mode, il affiche simplement les entrées passées par le parent au fil de l'ajout.
 */
export interface DraftComment {
  type: CommentType
  texte: string
  author: string
  date: string
}

interface CommentDraftListProps {
  drafts: DraftComment[]
  onAdd: (type: CommentType, texte: string) => void
}

const TYPE_LABELS: Record<CommentType, string> = {
  reco: 'Recommandation',
  alerte: 'Alerte',
  spec: 'Spécificité',
  info: 'Info pratique',
}

const chipsRowStyle: CSSProperties = {
  display: 'flex',
  gap: 6,
  flexWrap: 'wrap',
}

function chipStyle(type: CommentType, active: boolean): CSSProperties {
  const meta = colors.comment[type]
  return {
    padding: '6px 11px',
    borderRadius: radii.pill,
    font: '600 11px "Plus Jakarta Sans"',
    cursor: 'pointer',
    border: `1.3px solid ${active ? meta.fg : colors.border}`,
    background: active ? meta.bg : colors.white,
    color: active ? meta.fg : colors.text.secondary,
  }
}

const textareaStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  border: `1px solid ${colors.border}`,
  borderRadius: radii.lg,
  font: '500 12.5px "Plus Jakarta Sans"',
  resize: 'none',
  height: 70,
}

const addButtonStyle: CSSProperties = {
  display: 'inline-block',
  font: '700 11.5px "Plus Jakarta Sans"',
  color: '#fff',
  background: colors.text.primary,
  padding: '8px 16px',
  borderRadius: radii.md,
  cursor: 'pointer',
  border: 'none',
  alignSelf: 'flex-start',
}

const draftsListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  marginTop: 4,
  paddingTop: 12,
  borderTop: `1px solid ${colors.borderLight}`,
}

function draftCardStyle(type: CommentType): CSSProperties {
  return {
    background: colors.comment[type].bg,
    borderRadius: radii.lg,
    padding: '9px 12px',
  }
}

const draftHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  marginBottom: 3,
}

function draftDotStyle(type: CommentType): CSSProperties {
  return {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: colors.comment[type].fg,
  }
}

function draftLabelStyle(type: CommentType): CSSProperties {
  return {
    font: '700 10px "Plus Jakarta Sans"',
    color: colors.comment[type].fg,
    textTransform: 'uppercase',
    letterSpacing: '.03em',
  }
}

const draftTextStyle: CSSProperties = {
  font: '500 12px/1.5 "Plus Jakarta Sans"',
  color: colors.text.body,
}

const draftMetaStyle: CSSProperties = {
  font: '600 10px "Plus Jakarta Sans"',
  color: colors.text.muted,
  marginTop: 3,
}

export default function CommentDraftList({ drafts, onAdd }: CommentDraftListProps) {
  const [type, setType] = useState<CommentType>('reco')
  const [texte, setTexte] = useState('')

  const handleAdd = () => {
    if (!texte.trim()) return
    onAdd(type, texte)
    setTexte('')
  }

  return (
    <Section title="Commentaires" subtitle="recommandation, alerte, spécificité…" dotColor={colors.comment.reco.fg}>
      <div style={chipsRowStyle}>
        {COMMENT_TYPES.map((t) => (
          <div key={t} onClick={() => setType(t)} style={chipStyle(t, t === type)}>
            {TYPE_LABELS[t]}
          </div>
        ))}
      </div>
      <textarea
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        placeholder="Votre texte (visible par toute l'équipe, signé et daté automatiquement)…"
        style={textareaStyle}
      />
      <div onClick={handleAdd} style={addButtonStyle}>
        + Ajouter le commentaire
      </div>

      {drafts.length > 0 && (
        <div style={draftsListStyle}>
          {drafts.map((draft, index) => (
            <div key={index} style={draftCardStyle(draft.type)}>
              <div style={draftHeaderStyle}>
                <div style={draftDotStyle(draft.type)} />
                <span style={draftLabelStyle(draft.type)}>{TYPE_LABELS[draft.type]}</span>
              </div>
              <div style={draftTextStyle}>{draft.texte}</div>
              <div style={draftMetaStyle}>
                {draft.author} · {draft.date}
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}
