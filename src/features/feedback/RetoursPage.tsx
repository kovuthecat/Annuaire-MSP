import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { colors } from '../../theme/tokens'
import { useAuth } from '../auth/AuthProvider'
import {
  deleteFeedback,
  loadFeedback,
  loadFeedbackScreenshot,
  updateFeedbackStatus,
} from '../../data/feedback'
import type { FeedbackListItem } from '../../data/feedback'
import type { FeedbackCategory, FeedbackStatus } from '../../types/db'

/**
 * Écran /retours (réservé au référent — RLS `feedback_select`) : relit les retours des membres sur
 * la V1, change leur statut (nouveau / en cours / résolu), ouvre la capture d'écran à la demande,
 * et supprime les retours traités. La capture (volumineuse) n'est jamais dans la liste : elle est
 * chargée au clic sur « Voir la capture » (cf. loadFeedbackScreenshot).
 */

const CATEGORY_META: Record<
  FeedbackCategory,
  { icon: string; label: string; color: { fg: string; bg: string } }
> = {
  probleme: { icon: '🐞', label: 'Problème', color: colors.comment.alerte },
  donnee: { icon: '✏️', label: 'Donnée erronée', color: colors.comment.spec },
  suggestion: { icon: '💡', label: 'Suggestion', color: colors.comment.info },
}

const STATUS_META: Record<FeedbackStatus, { label: string; color: { fg: string; bg: string } }> = {
  nouveau: { label: 'Nouveau', color: colors.sector.avis },
  en_cours: { label: 'En cours', color: colors.comment.alerte },
  resolu: { label: 'Résolu', color: colors.comment.reco },
}

const STATUS_ORDER: readonly FeedbackStatus[] = ['nouveau', 'en_cours', 'resolu']

type StatusFilter = FeedbackStatus | 'tous'

const pageStyle: CSSProperties = { padding: '24px 28px 80px', maxWidth: 760, margin: '0 auto' }
const titleStyle: CSSProperties = {
  font: '800 18px "Plus Jakarta Sans"',
  color: colors.text.primary,
  marginBottom: 4,
}
const subtitleStyle: CSSProperties = {
  font: '500 12px "Plus Jakarta Sans"',
  color: colors.text.secondary,
  marginBottom: 18,
}
const filterRowStyle: CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }
const listStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12 }
const cardStyle: CSSProperties = {
  background: colors.white,
  border: `1px solid ${colors.borderLight}`,
  borderRadius: 14,
  padding: '15px 17px',
}
const cardHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
  marginBottom: 10,
}
const messageStyle: CSSProperties = {
  font: '500 13px/1.55 "Plus Jakarta Sans"',
  color: colors.text.body,
  whiteSpace: 'pre-wrap',
  marginBottom: 12,
}
const metaLineStyle: CSSProperties = {
  font: '600 11px "Plus Jakarta Sans"',
  color: colors.text.secondary,
  marginBottom: 6,
  wordBreak: 'break-all',
}
const cardFooterStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap',
  marginTop: 12,
  paddingTop: 12,
  borderTop: `1px solid ${colors.borderLight}`,
}
const linkBtnStyle: CSSProperties = {
  font: '600 11.5px "Plus Jakarta Sans"',
  color: colors.brand.blue,
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  padding: 0,
  textDecoration: 'none',
}
const dangerBtnStyle: CSSProperties = { ...linkBtnStyle, color: colors.comment.alerte.fg }
const selectStyle: CSSProperties = {
  padding: '6px 10px',
  borderRadius: 8,
  border: `1px solid ${colors.border}`,
  font: '600 11.5px "Plus Jakarta Sans"',
  color: colors.text.primary,
  background: '#fff',
  cursor: 'pointer',
}
const emptyStyle: CSSProperties = {
  font: '500 13px "Plus Jakarta Sans"',
  color: colors.text.muted,
  padding: '40px 0',
  textAlign: 'center',
}
const lightboxStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 60,
  background: 'rgba(0,0,0,.72)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  cursor: 'zoom-out',
}
const lightboxImgStyle: CSSProperties = {
  maxWidth: '100%',
  maxHeight: '100%',
  borderRadius: 8,
  boxShadow: '0 12px 40px rgba(0,0,0,.5)',
}

function badgeStyle(color: { fg: string; bg: string }): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 9px',
    borderRadius: 999,
    background: color.bg,
    color: color.fg,
    font: '700 10.5px "Plus Jakarta Sans"',
  }
}

function chipStyle(active: boolean): CSSProperties {
  return {
    padding: '7px 13px',
    borderRadius: 999,
    border: `1px solid ${active ? colors.brand.teal : colors.border}`,
    background: active ? colors.brand.teal : '#fff',
    color: active ? '#fff' : colors.text.secondary,
    font: '700 11.5px "Plus Jakarta Sans"',
    cursor: 'pointer',
  }
}

function authorLabel(a: FeedbackListItem['author']): string {
  if (!a) return 'Compte supprimé'
  const full = [a.prenom, a.nom].filter(Boolean).join(' ').trim()
  return full || a.email || 'Membre'
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function FeedbackCard({
  item,
  onStatusChange,
  onDelete,
  onViewShot,
}: {
  item: FeedbackListItem
  onStatusChange: (id: string, status: FeedbackStatus) => void
  onDelete: (id: string) => void
  onViewShot: (id: string) => void
}) {
  const cat = CATEGORY_META[item.category]
  const status = STATUS_META[item.status]
  return (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}>
        <span style={badgeStyle(cat.color)}>
          <span aria-hidden>{cat.icon}</span> {cat.label}
        </span>
        <span style={badgeStyle(status.color)}>{status.label}</span>
        <span style={{ marginLeft: 'auto', font: '600 11px "Plus Jakarta Sans"', color: colors.text.muted }}>
          {authorLabel(item.author)} · {formatDate(item.created_at)}
        </span>
      </div>

      <div style={messageStyle}>{item.message}</div>

      <div style={metaLineStyle}>
        📄 {item.page_label ?? '—'}
        {item.url ? ` · ${item.url}` : ''}
      </div>
      {item.viewport && (
        <div style={metaLineStyle}>🖥️ {item.viewport}</div>
      )}

      <div style={cardFooterStyle}>
        <label style={{ font: '600 11px "Plus Jakarta Sans"', color: colors.text.secondary }}>
          Statut{' '}
          <select
            style={selectStyle}
            value={item.status}
            onChange={(e) => onStatusChange(item.id, e.target.value as FeedbackStatus)}
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
        </label>

        {item.contact_id && (
          <Link to={`/contact/${item.contact_id}`} style={linkBtnStyle}>
            Ouvrir la fiche concernée
          </Link>
        )}
        {item.has_screenshot && (
          <button type="button" style={linkBtnStyle} onClick={() => onViewShot(item.id)}>
            Voir la capture
          </button>
        )}
        <button
          type="button"
          style={{ ...dangerBtnStyle, marginLeft: 'auto' }}
          onClick={() => onDelete(item.id)}
        >
          Supprimer
        </button>
      </div>
    </div>
  )
}

export default function RetoursPage() {
  const { member, loading: authLoading } = useAuth()
  const [items, setItems] = useState<FeedbackListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<StatusFilter>('tous')
  const [lightbox, setLightbox] = useState<string | 'loading' | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await loadFeedback())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec du chargement des retours.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (member?.role === 'referent') void refresh()
  }, [member?.role, refresh])

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { tous: items.length, nouveau: 0, en_cours: 0, resolu: 0 }
    for (const it of items) c[it.status] += 1
    return c
  }, [items])

  const visible = useMemo(
    () => (filter === 'tous' ? items : items.filter((it) => it.status === filter)),
    [items, filter],
  )

  const handleStatus = async (id: string, status: FeedbackStatus) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status } : it)))
    try {
      await updateFeedbackStatus(id, status)
    } catch {
      void refresh() // resync en cas d'échec
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer définitivement ce retour ?')) return
    setItems((prev) => prev.filter((it) => it.id !== id))
    try {
      await deleteFeedback(id)
    } catch {
      void refresh()
    }
  }

  const handleViewShot = async (id: string) => {
    setLightbox('loading')
    try {
      const url = await loadFeedbackScreenshot(id)
      setLightbox(url ?? null)
      if (!url) window.alert('Aucune capture disponible pour ce retour.')
    } catch {
      setLightbox(null)
      window.alert('Échec du chargement de la capture.')
    }
  }

  // Garde d'accès : réservé au référent (double barrière avec la RLS côté base).
  if (authLoading) return <div style={emptyStyle}>Chargement…</div>
  if (member?.role !== 'referent') return <Navigate to="/" replace />

  return (
    <div style={pageStyle}>
      <div style={titleStyle}>Retours des membres</div>
      <div style={subtitleStyle}>
        Les signalements envoyés depuis le bouton « Un souci ? ». Vous seul (référent) y avez accès.
      </div>

      <div style={filterRowStyle}>
        {(['tous', ...STATUS_ORDER] as StatusFilter[]).map((f) => (
          <button key={f} type="button" style={chipStyle(filter === f)} onClick={() => setFilter(f)}>
            {f === 'tous' ? 'Tous' : STATUS_META[f].label} ({counts[f]})
          </button>
        ))}
      </div>

      {error && (
        <div style={{ ...emptyStyle, color: colors.comment.alerte.fg }}>{error}</div>
      )}
      {loading && !items.length ? (
        <div style={emptyStyle}>Chargement des retours…</div>
      ) : visible.length === 0 ? (
        <div style={emptyStyle}>
          {items.length === 0 ? 'Aucun retour pour le moment.' : 'Aucun retour dans ce filtre.'}
        </div>
      ) : (
        <div style={listStyle}>
          {visible.map((it) => (
            <FeedbackCard
              key={it.id}
              item={it}
              onStatusChange={handleStatus}
              onDelete={handleDelete}
              onViewShot={handleViewShot}
            />
          ))}
        </div>
      )}

      {lightbox !== null && (
        <div style={lightboxStyle} onClick={() => setLightbox(null)}>
          {lightbox === 'loading' ? (
            <div style={{ color: '#fff', font: '600 14px "Plus Jakarta Sans"' }}>
              Chargement de la capture…
            </div>
          ) : (
            <img src={lightbox} style={lightboxImgStyle} alt="Capture d'écran du retour" />
          )}
        </div>
      )}
    </div>
  )
}
