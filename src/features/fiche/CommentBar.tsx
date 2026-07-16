import type { CSSProperties } from 'react'
import { CommentIcons } from '../../components'
import type { CommentCounts, CommentEntries } from '../../components'
import { colors } from '../../theme/tokens'

/**
 * Rangée de commentaires (maquette l.200-252, cf. plans/P1/S4.md T7 étape 6) : label + `CommentIcons`
 * variant `detailed`, déclencheur « + Ajouter un commentaire » (déplie `AddCommentForm`, rendu par le
 * parent `FichePage`), et méta modifié/créé par poussée à droite (`margin-left:auto`).
 */
interface CommentBarProps {
  counts: CommentCounts
  comments: CommentEntries
  metaLine: string
  addOpen: boolean
  onToggleAdd: () => void
}

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  paddingTop: 16,
  borderTop: '1px solid #f1ede4',
  flexWrap: 'wrap',
}

const labelStyle: CSSProperties = {
  font: '600 11px "Plus Jakarta Sans"',
  color: colors.text.secondary,
}

const triggerStyle: CSSProperties = {
  font: '600 11px "Plus Jakarta Sans"',
  color: colors.brand.blue,
  cursor: 'pointer',
  background: 'none',
  border: 'none',
  padding: 0,
}

const metaStyle: CSSProperties = {
  marginLeft: 'auto',
  font: '500 11px "Plus Jakarta Sans"',
  color: colors.text.faint,
}

export default function CommentBar({ counts, comments, metaLine, addOpen, onToggleAdd }: CommentBarProps) {
  return (
    <div style={rowStyle}>
      <span style={labelStyle}>Commentaires :</span>
      <CommentIcons counts={counts} comments={comments} variant="detailed" />
      <button type="button" style={triggerStyle} onClick={onToggleAdd}>
        {addOpen ? 'Annuler' : '+ Ajouter un commentaire'}
      </button>
      <span style={metaStyle}>{metaLine}</span>
    </div>
  )
}
