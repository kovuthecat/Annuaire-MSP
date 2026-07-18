import type { CSSProperties } from 'react'
import { Suspense, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useDirectory } from '../../data/DirectoryProvider'
import { useSelection } from '../../app/SelectionProvider'
import { Avatar, Badge, StarToggle } from '../../components'
import type { CommentCounts, CommentEntries } from '../../components'
import { Button } from '../../components/ui'
import { ProximityMap } from '../../components/Map'
import type { MapPoint } from '../../components/Map'
import { colors, radii } from '../../theme/tokens'
import { COMMENT_TYPES } from '../../types/db'
import type { ContactWithMeta } from '../../types/db'
import { MSP_COORDS, coordsOf, formatDistance, haversineKm } from '../proximite/geo'
import { loadStops, nearestStops } from '../proximite/transit'
import type { NearbyStop, Stop, TransitMode } from '../proximite/transit'
import CoordsBlock from './CoordsBlock'
import AccesBlock from './AccesBlock'
import CommentBar from './CommentBar'
import AddCommentForm from './AddCommentForm'
import { formatDate } from './format'

/**
 * Écran Fiche détail (maquette l.164-255, cf. plans/P1/S4.md T7) : toute l'info d'un correspondant
 * + l'expérience partagée de l'équipe (commentaires), et la barre d'actions (ma liste / sélection
 * impression / modifier / signaler à vérifier). Source de la fiche : `useDirectory().contacts`
 * (dataset déjà chargé — pas de requête Supabase directe ici, cf. §Décision clé).
 */

const pageStyle: CSSProperties = {
  padding: '24px 28px 60px',
  maxWidth: 820,
  margin: '0 auto',
}

const cardStyle: CSSProperties = {
  background: colors.white,
  border: `1px solid ${colors.borderLight}`,
  borderRadius: radii.round,
  padding: '24px 26px',
}

const guardCardStyle: CSSProperties = {
  minHeight: '30vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 14,
  textAlign: 'center',
  background: colors.white,
  border: `1px solid ${colors.borderLight}`,
  borderRadius: radii.xxl,
  padding: '40px 24px',
}

const guardTitleStyle: CSSProperties = {
  font: '700 14px "Plus Jakarta Sans"',
  color: colors.text.primary,
}

const guardBodyStyle: CSSProperties = {
  font: '500 12.5px "Plus Jakarta Sans"',
  color: colors.text.secondary,
  maxWidth: 360,
}

const guardLinkStyle: CSSProperties = {
  font: '600 12px "Plus Jakarta Sans"',
  color: colors.brand.blue,
  textDecoration: 'underline',
}

const headerRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 14,
  marginBottom: 18,
  flexWrap: 'wrap',
}

const identityBlockStyle: CSSProperties = {
  flex: 1,
  minWidth: 200,
}

const nameStyle: CSSProperties = {
  font: '800 19px "Plus Jakarta Sans"',
  color: colors.text.primary,
}

const metaLineStyle: CSSProperties = {
  font: '500 13px "Plus Jakarta Sans"',
  color: colors.text.secondary,
  marginTop: 2,
}

const badgesRowStyle: CSSProperties = {
  display: 'flex',
  gap: 6,
  marginTop: 8,
  flexWrap: 'wrap',
  alignItems: 'center',
}

const tagStyle: CSSProperties = {
  font: '600 10.5px "Plus Jakarta Sans"',
  color: colors.text.muted,
  background: colors.bg,
  padding: '4px 9px',
  borderRadius: radii.pill,
  whiteSpace: 'nowrap',
}

const verifStyle: CSSProperties = {
  font: '600 10.5px "Plus Jakarta Sans"',
  color: colors.text.muted,
  background: colors.bg,
  border: `1px solid ${colors.border}`,
  padding: '4px 9px',
  borderRadius: radii.pill,
  whiteSpace: 'nowrap',
}

const actionsRowStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
}

const selectionPillStyle: CSSProperties = {
  font: '600 11px "Plus Jakarta Sans"',
  color: colors.brand.blue,
  border: '1px solid #d7e7fa',
  padding: '7px 12px',
  borderRadius: 9,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const modifierLinkStyle: CSSProperties = {
  font: '600 11px "Plus Jakarta Sans"',
  color: '#fff',
  background: colors.gradientPrimary,
  padding: '7px 12px',
  borderRadius: 9,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  textDecoration: 'none',
}

// ---------------------------------------------------------------------------
// Carte de la fiche (plans/P3/S3.md T3) — praticien + MSP, distance à la MSP en clair. Pas de
// coordonnées → invite discrète à compléter l'adresse, jamais de carte vide (cf. §Étapes).
// ---------------------------------------------------------------------------

const ficheMapSectionStyle: CSSProperties = {
  marginBottom: 18,
}

const ficheDistanceStyle: CSSProperties = {
  font: '600 12px "Plus Jakarta Sans"',
  color: colors.text.secondary,
  marginTop: 8,
}

const ficheNoPositionStyle: CSSProperties = {
  font: '500 12.5px "Plus Jakarta Sans"',
  color: colors.text.faint,
  marginBottom: 18,
}

const ficheMapLoadingStyle: CSSProperties = {
  height: 220,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: colors.white,
  border: `1px solid ${colors.borderLight}`,
  borderRadius: radii.xl,
  font: '500 12.5px "Plus Jakarta Sans"',
  color: colors.text.secondary,
}

function FicheMapBlock({ contact }: { contact: ContactWithMeta }) {
  const coords = coordsOf(contact)

  if (!coords) {
    return (
      <div style={ficheNoPositionStyle}>
        Position à préciser —{' '}
        <Link to={`/contact/${contact.id}/modifier`} style={guardLinkStyle}>
          compléter l'adresse
        </Link>
      </div>
    )
  }

  const points: MapPoint[] = [
    { id: contact.id, coords, label: contact.nom, kind: 'contact' },
    { id: 'msp', coords: MSP_COORDS, label: 'MSP', kind: 'msp' },
  ]

  return (
    <div style={ficheMapSectionStyle}>
      <Suspense fallback={<div style={ficheMapLoadingStyle}>Chargement de la carte…</div>}>
        <ProximityMap points={points} height={220} />
      </Suspense>
      <div style={ficheDistanceStyle}>{formatDistance(haversineKm(coords, MSP_COORDS))} de la MSP</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Transports à proximité (plans/P3/S4.md T3) — sous la carte. Jeu d'arrêts embarqué (IDFM,
// cf. src/features/proximite/transit.ts), chargé paresseusement pour ne pas alourdir le bundle
// initial. Pas de coordonnées → bloc absent (pas d'invite, contrairement à la carte).
// ---------------------------------------------------------------------------

const TRANSIT_MAX_DISTANCE_M = 600

const transitCardStyle: CSSProperties = {
  background: colors.bg,
  border: `1px solid ${colors.border}`,
  borderRadius: radii.xl,
  padding: '16px 18px',
  marginBottom: 18,
}

const transitTitleStyle: CSSProperties = {
  font: '700 11px "Plus Jakarta Sans"',
  color: colors.text.secondary,
  textTransform: 'uppercase',
  letterSpacing: '.04em',
  marginBottom: 10,
}

const transitRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 8,
  padding: '5px 0',
  font: '500 12.5px "Plus Jakarta Sans"',
  color: colors.text.body,
}

const transitPastilleStyle: CSSProperties = {
  font: '700 10px "Plus Jakarta Sans"',
  color: colors.text.secondary,
  background: colors.white,
  border: `1px solid ${colors.border}`,
  borderRadius: radii.sm,
  padding: '2px 7px',
  whiteSpace: 'nowrap',
  flexShrink: 0,
}

const transitLignesStyle: CSSProperties = {
  fontWeight: 700,
  color: colors.text.primary,
}

const transitNomStyle: CSSProperties = {
  flex: 1,
}

const transitDistanceStyle: CSSProperties = {
  color: colors.text.secondary,
  whiteSpace: 'nowrap',
}

const transitEmptyStyle: CSSProperties = {
  font: '500 12.5px "Plus Jakarta Sans"',
  color: colors.text.faint,
}

const MODE_LABELS: Record<TransitMode, string> = {
  metro: 'M',
  tram: 'T',
  rer: 'RER',
  bus: 'Bus',
  autre: 'Autre',
}

function TransitRow({ stop }: { stop: NearbyStop }) {
  return (
    <div style={transitRowStyle}>
      <span style={transitPastilleStyle}>{stop.modes.map((m) => MODE_LABELS[m]).join('/')}</span>
      <span style={transitNomStyle}>
        <span style={transitLignesStyle}>{stop.lignes.join(', ')}</span> {stop.nom}
      </span>
      <span style={transitDistanceStyle}>{formatDistance(stop.distanceM / 1000)}</span>
    </div>
  )
}

function TransitBlock({ contact }: { contact: ContactWithMeta }) {
  const coords = coordsOf(contact)
  const [stops, setStops] = useState<Stop[] | null>(null)

  useEffect(() => {
    if (!coords) return
    let cancelled = false
    void loadStops().then((loaded) => {
      if (!cancelled) setStops(loaded)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords?.lat, coords?.lng])

  if (!coords) return null

  const nearby = stops ? nearestStops(coords, stops, { maxDistanceM: TRANSIT_MAX_DISTANCE_M }) : []

  return (
    <div style={transitCardStyle}>
      <div style={transitTitleStyle}>Transports à proximité</div>
      {stops === null ? (
        <div style={transitEmptyStyle}>Chargement…</div>
      ) : nearby.length === 0 ? (
        <div style={transitEmptyStyle}>Aucun arrêt à moins de {TRANSIT_MAX_DISTANCE_M} m</div>
      ) : (
        nearby.map((stop) => <TransitRow key={stop.id} stop={stop} />)
      )}
    </div>
  )
}

export default function FichePage() {
  const { id } = useParams<{ id: string }>()
  const { contacts, loading, error, reload, adoptContact, unadoptContact, updateContact } = useDirectory()
  const { selectedIds, toggle } = useSelection()
  const [addOpen, setAddOpen] = useState(false)

  const contact = contacts.find((c) => c.id === id)

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={guardCardStyle}>
          <div style={guardTitleStyle}>Chargement de la fiche…</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <div style={guardCardStyle}>
          <div style={guardTitleStyle}>Impossible de charger la fiche</div>
          <div style={guardBodyStyle}>{error}</div>
          <Button variant="outline" onClick={() => void reload()}>
            Réessayer
          </Button>
        </div>
      </div>
    )
  }

  if (!contact) {
    return (
      <div style={pageStyle}>
        <div style={guardCardStyle}>
          <div style={guardTitleStyle}>Fiche introuvable</div>
          <div style={guardBodyStyle}>Ce contact n'existe pas, ou a été supprimé.</div>
          <Link to="/" style={guardLinkStyle}>
            ← Retour à l'annuaire
          </Link>
        </div>
      </div>
    )
  }

  const identity = [contact.civilite, contact.prenom, contact.nom].filter(Boolean).join(' ')
  const metaParts = [
    contact.profession,
    contact.arrondissement ? `${contact.arrondissement} arr.` : null,
  ].filter(Boolean)

  const counts: CommentCounts = contact.counts
  const comments: CommentEntries = {}
  for (const type of COMMENT_TYPES) {
    comments[type] = contact.comments[type].map((c) => ({
      text: c.texte,
      author: c.author_id
        ? (contact.authorNames[c.author_id] ?? 'Membre inconnu')
        : "Extrait de l'ancien répertoire",
      date: formatDate(c.created_at),
    }))
  }

  const metaLine = contact.updatedByName
    ? `Modifié par ${contact.updatedByName} le ${formatDate(contact.updated_at)}`
    : `Créé par ${contact.created_by ? (contact.authorNames[contact.created_by] ?? 'Membre inconnu') : 'Membre inconnu'} le ${formatDate(contact.created_at)}`

  const inSelection = selectedIds.has(contact.id)
  const aVerifier = contact.statut === 'a_verifier'

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={headerRowStyle}>
          <Avatar size={56} />
          <div style={identityBlockStyle}>
            <div style={nameStyle}>{identity}</div>
            {metaParts.length > 0 && <div style={metaLineStyle}>{metaParts.join(' · ')}</div>}
            <div style={badgesRowStyle}>
              {contact.secteur_conv === '1' && <Badge variant="secteur1" />}
              {contact.secteur_conv === '2' && <Badge variant="secteur2" />}
              {contact.ame_cmu && <Badge variant="ame" />}
              {contact.vad && <Badge variant="vad" />}
              {contact.prend_nouveaux === 'oui' && <Badge variant="newpatients" />}
              {contact.tags.map((tag) => (
                <span key={tag} style={tagStyle}>
                  {tag}
                </span>
              ))}
              {aVerifier && <span style={verifStyle}>À vérifier</span>}
            </div>
          </div>
          <div style={actionsRowStyle}>
            <StarToggle
              starred={contact.starred}
              onToggle={() => void (contact.starred ? unadoptContact(contact.id) : adoptContact(contact.id))}
              variant="button"
            />
            <div onClick={() => toggle(contact.id)} style={selectionPillStyle}>
              {inSelection ? '✓ Dans la sélection' : '+ Sélection impression'}
            </div>
            <Link to={`/contact/${contact.id}/modifier`} style={modifierLinkStyle}>
              Modifier
            </Link>
            {aVerifier ? (
              <Button variant="neutral" disabled style={{ cursor: 'default' }}>
                Marquée à vérifier
              </Button>
            ) : (
              <Button
                variant="neutral"
                onClick={() => void updateContact(contact.id, { statut: 'a_verifier' })}
              >
                Signaler à vérifier
              </Button>
            )}
          </div>
        </div>

        <CoordsBlock contact={contact} />
        <FicheMapBlock contact={contact} />
        <TransitBlock contact={contact} />
        <AccesBlock contact={contact} />
        <CommentBar
          counts={counts}
          comments={comments}
          metaLine={metaLine}
          addOpen={addOpen}
          onToggleAdd={() => setAddOpen((v) => !v)}
        />
        {addOpen && <AddCommentForm contactId={contact.id} onClose={() => setAddOpen(false)} />}
      </div>
    </div>
  )
}
