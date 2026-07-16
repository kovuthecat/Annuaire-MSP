import type { CSSProperties } from 'react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useDirectory } from '../../data/DirectoryProvider'
import { useSelection } from '../../app/SelectionProvider'
import { Avatar, Badge, StarToggle } from '../../components'
import type { CommentCounts, CommentEntries } from '../../components'
import { Button } from '../../components/ui'
import { colors, radii } from '../../theme/tokens'
import { COMMENT_TYPES } from '../../types/db'
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
