import type { CSSProperties, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, Badge, CommentIcons, StarToggle } from '../../components'
import type { CommentEntries, CommentCounts } from '../../components'
import { colors, radii } from '../../theme/tokens'
import { COMMENT_TYPES } from '../../types/db'
import type { Comment, ContactWithMeta } from '../../types/db'
import { useReference } from '../proximite/ReferenceProvider'
import { coordsOf, formatDistance, haversineKm } from '../proximite/geo'
import { highlightSegments } from './highlight'

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
  /** Mots de la recherche courante, surlignés dans le nom et la ligne meta (cf. Highlight). */
  queryTerms?: string[]
  onToggleSelect: () => void
  onToggleStar: () => void
}

function rowStyle(highlighted: boolean, grise: boolean): CSSProperties {
  return {
    // Fiche grisée (départ/cessation ou coordonnées introuvables) : fond en retrait — cf. revue
    // 2026-07-19. L'alerte reste, elle, en pleine couleur (voir GriseAlerte).
    background: grise ? '#f6f4ef' : colors.white,
    border: `1px solid ${highlighted ? colors.brand.blue : colors.borderLight}`,
    borderRadius: radii.xxl,
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    boxShadow: highlighted ? '0 0 0 3px rgba(31,127,214,.14)' : '0 1px 3px rgba(0,0,0,.03)',
  }
}

/** Puce d'alerte d'une fiche grisée (survol = motif). `parti` en ambre (« ne pas adresser »),
 * `incomplet` en gris (« à compléter »). Couleurs = tokens existants (jamais inventées). */
function GriseAlerte({ reason, alerte }: { reason: 'parti' | 'incomplet'; alerte: string | null }) {
  const parti = reason === 'parti'
  const style: CSSProperties = {
    flex: 'none',
    padding: '3px 8px',
    borderRadius: radii.sm,
    font: '600 10.5px "Plus Jakarta Sans"',
    whiteSpace: 'nowrap',
    cursor: 'help',
    color: parti ? colors.comment.alerte.fg : colors.text.muted,
    background: parti ? colors.comment.alerte.bg : '#ece7dd',
  }
  return (
    <span style={style} title={alerte ?? undefined}>
      {parti ? '⚠ Ne pas adresser' : 'À compléter'}
    </span>
  )
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

/** Étiquette de catégorie (Structure / Ressource / Ligne d'avis / Transport) à côté du nom —
 * discrète, pour identifier une fiche non-praticien sans l'ouvrir. */
const catTagStyle: CSSProperties = {
  marginLeft: 8,
  padding: '1px 7px',
  borderRadius: radii.sm,
  font: '600 10px "Plus Jakarta Sans"',
  color: colors.text.muted,
  background: '#f1ede4',
  verticalAlign: 'middle',
  whiteSpace: 'nowrap',
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

// Surlignage des termes de recherche (fond = teinte bleue de marque, cohérente avec la mise en
// évidence des lignes). Logique pure dans `highlight.ts` ; ici on ne fait que la rendre.
const markStyle: CSSProperties = {
  background: 'rgba(31,127,214,.18)',
  color: 'inherit',
  borderRadius: 3,
  padding: '0 1px',
}

function Highlight({ text, terms }: { text: string; terms: string[] }): ReactNode {
  if (terms.length === 0 || !text) return text
  const segments = highlightSegments(text, terms)
  if (!segments.some((segment) => segment.match)) return text
  return segments.map((segment, i) =>
    segment.match ? (
      <mark key={i} style={markStyle}>
        {segment.text}
      </mark>
    ) : (
      segment.text
    ),
  )
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
  queryTerms = [],
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

  // Affichage normalisé du nom : « NOM Prénom » pour les praticiens (l'annuaire d'origine est
  // hétéroclite), nom brut pour structures/ressources (ce ne sont pas des personnes).
  const isPraticien = contact.type === 'praticien'
  const displayName = isPraticien
    ? `${contact.nom.toUpperCase()}${contact.prenom ? ` ${contact.prenom}` : ''}`
    : contact.nom
  const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase()
  // Sous-titre : spécialité + établissement (ex. « Cardiologie · Hôpital Saint-Antoine ») +
  // arrondissement. On masque profession/établissement s'ils répètent le nom.
  const metaParts = [
    norm(contact.profession) && norm(contact.profession) !== norm(contact.nom)
      ? contact.profession
      : null,
    norm(contact.etablissement) && norm(contact.etablissement) !== norm(contact.nom)
      ? contact.etablissement
      : null,
    contact.arrondissement ? `${contact.arrondissement} arr.` : null,
  ].filter((part): part is string => Boolean(part))
  // Étiquette de catégorie pour tout ce qui n'est pas un praticien — l'identifier sans ouvrir.
  const categorieTag =
    contact.categorie && contact.categorie !== 'Praticien' ? contact.categorie : null

  // Pastille de distance (plans/P3/S2.md T4 étape 1) : « — » discret si la fiche n'a pas encore de
  // coordonnées (backfill non passé ou géocodage échoué) — jamais une distance inventée.
  const coords = coordsOf(contact)
  const distanceLabel = coords ? formatDistance(haversineKm(reference.coords, coords)) : '—'
  const distanceTitle = isPatientAddress
    ? `Distance depuis ${reference.label} (non enregistrée)`
    : 'Distance depuis la MSP'

  // Fiche grisée (départ/cessation ou coordonnées introuvables) : contenu en retrait, alerte au
  // survol, et on n'affiche pas le téléphone (ne pas inviter à adresser). Cf. revue 2026-07-19.
  const grise = Boolean(contact.grise_reason)
  const nameBlockGriseStyle: CSSProperties = grise
    ? { ...nameBlockStyle, opacity: 0.6 }
    : nameBlockStyle

  return (
    <div style={rowStyle(highlighted, grise)}>
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggleSelect}
        style={checkboxStyle}
        aria-label={`Sélectionner ${contact.nom} pour l'impression`}
      />
      <Avatar onClick={open} />
      <div onClick={open} style={nameBlockGriseStyle}>
        <div style={nameStyle}>
          <Highlight text={displayName} terms={queryTerms} />
          {categorieTag && <span style={catTagStyle}>{categorieTag}</span>}
        </div>
        {metaParts.length > 0 && (
          <div style={metaLineStyle}>
            {metaParts.map((part, i) => (
              <span key={i}>
                {i > 0 && ' · '}
                <Highlight text={part} terms={queryTerms} />
              </span>
            ))}
          </div>
        )}
      </div>
      {grise && contact.grise_reason && (
        <GriseAlerte reason={contact.grise_reason} alerte={contact.grise_alerte} />
      )}
      {contact.secteur_conv === '1' && <Badge variant="secteur1" />}
      {contact.secteur_conv === '2' && <Badge variant="secteur2" />}
      {contact.ame_cmu && <Badge variant="ame" />}
      {contact.vad && <Badge variant="vad" />}
      <span style={distanceStyle} title={distanceTitle}>
        {coords && isPatientAddress ? `${distanceLabel} du patient` : distanceLabel}
      </span>
      <CommentIcons counts={counts} comments={comments} variant="compact" />
      {!grise && contact.tel_secretariat && (
        <a href={`tel:${contact.tel_secretariat}`} style={phoneStyle}>
          {contact.tel_secretariat}
        </a>
      )}
      <StarToggle starred={contact.starred} onToggle={onToggleStar} variant="dot" />
    </div>
  )
}
