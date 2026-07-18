import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, Badge, CommentIcons, StarToggle } from '../../components'
import type { CommentEntries, CommentCounts } from '../../components'
import { colors, radii } from '../../theme/tokens'
import { COMMENT_TYPES } from '../../types/db'
import type { Comment, ContactWithMeta } from '../../types/db'
import { useReference } from '../proximite/ReferenceProvider'
import { coordsOf, formatDistance, haversineKm } from '../proximite/geo'

/**
 * Une ligne de l'annuaire — reproduit la maquette lignes 89-158 (cf. les 2 PNG de
 * `design/maquettes/design-annuaire-msp/project/uploads/` pour le rendu attendu).
 * Ordre des enfants du flex row (gap 14, tous alignés sur une ligne, cf. maquette) :
 * case à cocher · avatar · bloc nom/profession (cliquable → fiche) · badges conditionnels ·
 * pastille de distance (plans/P3/S2.md T4) · icônes de commentaires (variant compact) ·
 * téléphone patient · étoile "dans ma liste".
 */
interface ContactRowProps {
  contact: ContactWithMeta
  selected: boolean
  /** Ligne mise en évidence depuis la carte partagée (plans/P3/S3.md T2 étape 2, épingle → ligne). */
  highlighted?: boolean
  onToggleSelect: () => void
  onToggleStar: () => void
}

function rowStyle(highlighted: boolean): CSSProperties {
  return {
    background: colors.white,
    border: `1px solid ${highlighted ? colors.brand.blue : colors.borderLight}`,
    borderRadius: radii.xxl,
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    boxShadow: highlighted ? '0 0 0 3px rgba(31,127,214,.14)' : '0 1px 3px rgba(0,0,0,.03)',
  }
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

/** Pastille de distance (plans/P3/S2.md T4 étape 1) — sobre, tokens existants, jamais une couleur
 * sémantique dédiée : ce n'est pas un badge de statut. */
const distanceStyle: CSSProperties = {
  font: '500 12px "Plus Jakarta Sans"',
  color: colors.text.muted,
  whiteSpace: 'nowrap',
  flex: 'none',
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

export default function ContactRow({
  contact,
  selected,
  highlighted = false,
  onToggleSelect,
  onToggleStar,
}: ContactRowProps) {
  const navigate = useNavigate()
  const open = () => navigate(`/contact/${contact.id}`)
  const { reference, isPatientAddress } = useReference()

  const counts: CommentCounts = contact.counts
  const comments: CommentEntries = {}
  for (const type of COMMENT_TYPES) {
    comments[type] = toEntries(contact.comments[type], contact.authorNames)
  }

  const metaParts = [contact.profession, contact.arrondissement ? `${contact.arrondissement} arr.` : null].filter(
    Boolean,
  )

  // Pastille de distance (plans/P3/S2.md T4 étape 1) : « — » discret si la fiche n'a pas encore de
  // coordonnées (backfill non passé ou géocodage échoué) — jamais une distance inventée.
  const coords = coordsOf(contact)
  const distanceLabel = coords ? formatDistance(haversineKm(reference.coords, coords)) : '—'
  const distanceTitle = isPatientAddress
    ? `Distance depuis ${reference.label} (non enregistrée)`
    : 'Distance depuis la MSP'

  return (
    <div style={rowStyle(highlighted)}>
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
      <span style={distanceStyle} title={distanceTitle}>
        {coords && isPatientAddress ? `${distanceLabel} du patient` : distanceLabel}
      </span>
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
