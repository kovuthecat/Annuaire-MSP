import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, Badge, CommentIcons, StarToggle } from '../../components'
import type { CommentEntries, CommentCounts } from '../../components'
import { colors, radii } from '../../theme/tokens'
import { COMMENT_TYPES } from '../../types/db'
import type { Comment, ContactWithMeta } from '../../types/db'

/**
 * Une ligne de l'annuaire — reproduit la maquette lignes 89-158 (cf. les 2 PNG de
 * `design/maquettes/design-annuaire-msp/project/uploads/` pour le rendu attendu).
 * Ordre des enfants du flex row (gap 14, tous alignés sur une ligne, cf. maquette) :
 * case à cocher · avatar · bloc nom/profession (cliquable → fiche) · badges conditionnels ·
 * icônes de commentaires (variant compact) · téléphone patient · étoile "dans ma liste".
 */
interface ContactRowProps {
  contact: ContactWithMeta
  selected: boolean
  onToggleSelect: () => void
  onToggleStar: () => void
}

const rowStyle: CSSProperties = {
  background: colors.white,
  border: `1px solid ${colors.borderLight}`,
  borderRadius: radii.xxl,
  padding: '14px 16px',
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  boxShadow: '0 1px 3px rgba(0,0,0,.03)',
}

const checkboxStyle: CSSProperties = {
  width: 15,
  height: 15,
  accentColor: colors.brand.blue,
  flex: 'none',
}

const nameBlockStyle: CSSProperties = {
  flex: 1,
  cursor: 'pointer',
  minWidth: 0,
}

const nameStyle: CSSProperties = {
  font: '700 13.5px "Plus Jakarta Sans"',
  color: colors.text.primary,
}

const metaLineStyle: CSSProperties = {
  font: '500 12px "Plus Jakarta Sans"',
  color: colors.text.secondary,
}

const phoneStyle: CSSProperties = {
  font: '500 12px "Plus Jakarta Sans"',
  color: colors.brand.blue,
  textDecoration: 'underline',
  whiteSpace: 'nowrap',
}

/** "12/03/2026" — même format court pour les 3 usages (compact ici, detailed en fiche S4). */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR')
}

function toEntries(comments: Comment[], authorNames: Record<string, string>) {
  return comments.map((comment) => ({
    text: comment.texte,
    author: authorNames[comment.author_id] ?? 'Membre inconnu',
    date: formatDate(comment.created_at),
  }))
}

export default function ContactRow({ contact, selected, onToggleSelect, onToggleStar }: ContactRowProps) {
  const navigate = useNavigate()
  const open = () => navigate(`/contact/${contact.id}`)

  const counts: CommentCounts = contact.counts
  const comments: CommentEntries = {}
  for (const type of COMMENT_TYPES) {
    comments[type] = toEntries(contact.comments[type], contact.authorNames)
  }

  const metaParts = [contact.profession, contact.arrondissement ? `${contact.arrondissement} arr.` : null].filter(
    Boolean,
  )

  return (
    <div style={rowStyle}>
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggleSelect}
        style={checkboxStyle}
        aria-label={`Sélectionner ${contact.nom} pour l'impression`}
      />
      <Avatar onClick={open} />
      <div onClick={open} style={nameBlockStyle}>
        <div style={nameStyle}>{contact.nom}</div>
        {metaParts.length > 0 && <div style={metaLineStyle}>{metaParts.join(' · ')}</div>}
      </div>
      {contact.secteur_conv === '1' && <Badge variant="secteur1" />}
      {contact.secteur_conv === '2' && <Badge variant="secteur2" />}
      {contact.ame_cmu && <Badge variant="ame" />}
      {contact.vad && <Badge variant="vad" />}
      <CommentIcons counts={counts} comments={comments} variant="compact" />
      {contact.tel_secretariat && (
        <a href={`tel:${contact.tel_secretariat}`} style={phoneStyle}>
          {contact.tel_secretariat}
        </a>
      )}
      <StarToggle starred={contact.starred} onToggle={onToggleStar} variant="dot" />
    </div>
  )
}
