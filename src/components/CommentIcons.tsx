import { useState } from 'react'
import type { CSSProperties } from 'react'
import { colors } from '../theme/tokens'

/**
 * Rangée d'icônes de commentaires par type — n'affiche une icône que si son compteur > 0.
 * Popover au survol (desktop) / tap (mobile) listant les commentaires du type.
 * Réutilisé tel quel sur les lignes d'annuaire (variant="compact", S3) et la fiche
 * (variant="detailed", S4). Cf. DECISIONS.md §Commentaires typés + ARCHITECTURE.md §Maquette.
 *
 * Formes (ne pas improviser d'autre forme) : reco = pastille verte · alerte = triangle orange
 * (bordures CSS) · spec = losange violet (rotate 45deg) · info = pastille bleue (4e type, cf. décision).
 */
export type CommentType = 'reco' | 'alerte' | 'spec' | 'info'

export interface CommentEntry {
  text: string
  author: string
  date: string
}

export type CommentCounts = Partial<Record<CommentType, number>>
export type CommentEntries = Partial<Record<CommentType, CommentEntry[]>>

interface CommentIconsProps {
  counts: CommentCounts
  comments?: CommentEntries
  /** compact = ligne d'annuaire (maquette lignes 100-155) · detailed = fiche (lignes 200-249). */
  variant?: 'compact' | 'detailed'
}

const TYPE_ORDER: CommentType[] = ['reco', 'alerte', 'spec', 'info']

const TYPE_META: Record<
  CommentType,
  { color: string; bg: string; singular: string; title: string; gap: number }
> = {
  reco: { color: colors.comment.reco.fg, bg: colors.comment.reco.bg, singular: 'recommandation', title: 'Recommandations', gap: 5 },
  alerte: { color: colors.comment.alerte.fg, bg: colors.comment.alerte.bg, singular: 'alerte', title: 'Alertes', gap: 5 },
  spec: { color: colors.comment.spec.fg, bg: colors.comment.spec.bg, singular: 'spécificité', title: 'Spécificités', gap: 6 },
  info: { color: colors.comment.info.fg, bg: colors.comment.info.bg, singular: 'info pratique', title: 'Infos pratiques', gap: 5 },
}

const VARIANT_CONFIG = {
  compact: {
    rowGap: 6,
    dot: 9,
    triangleSide: 5,
    triangleHeight: 8,
    losange: 9,
    countWeight: 700,
    showLabel: false,
    titleSize: '10.5px',
    textSize: '11.5px/1.5',
    metaSize: '10px',
    entryGap: 8,
    popoverPadding: '12px 14px',
    popoverStyle: { top: 26, right: 0 } as CSSProperties,
    popoverWidth: 270,
  },
  detailed: {
    rowGap: 10,
    dot: 8,
    triangleSide: 4.5,
    triangleHeight: 8,
    losange: 8,
    countWeight: 600,
    showLabel: true,
    titleSize: '11px',
    textSize: '12.5px/1.6',
    metaSize: '10.5px',
    entryGap: 10,
    popoverPadding: '14px 16px',
    popoverStyle: { bottom: 30, left: 0 } as CSSProperties,
    popoverWidth: 320,
  },
} as const

type VariantKey = keyof typeof VARIANT_CONFIG

function Shape({ type, cfg }: { type: CommentType; cfg: (typeof VARIANT_CONFIG)[VariantKey] }) {
  const meta = TYPE_META[type]
  if (type === 'alerte') {
    return (
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: `${cfg.triangleSide}px solid transparent`,
          borderRight: `${cfg.triangleSide}px solid transparent`,
          borderBottom: `${cfg.triangleHeight}px solid ${meta.color}`,
          flex: 'none',
        }}
      />
    )
  }
  if (type === 'spec') {
    return (
      <div
        style={{
          width: cfg.losange,
          height: cfg.losange,
          background: meta.color,
          transform: 'rotate(45deg)',
          flex: 'none',
        }}
      />
    )
  }
  // reco & info : pastille ronde.
  return (
    <div
      style={{
        width: cfg.dot,
        height: cfg.dot,
        borderRadius: '50%',
        background: meta.color,
        flex: 'none',
      }}
    />
  )
}

function CommentIcon({
  type,
  count,
  entries,
  variant,
}: {
  type: CommentType
  count: number
  entries: CommentEntry[]
  variant: VariantKey
}) {
  // Survol (desktop) et tap (mobile, pas d'évènement hover) sont indépendants : le popover
  // reste ouvert tant que l'un des deux est actif, pour éviter qu'un clic pendant le survol
  // (desktop) ne referme immédiatement le popover qui vient de s'ouvrir au hover.
  const [hovered, setHovered] = useState(false)
  const [clicked, setClicked] = useState(false)
  const open = hovered || clicked
  const meta = TYPE_META[type]
  const cfg = VARIANT_CONFIG[variant]
  const suffix = cfg.showLabel ? ` ${meta.singular}(s)` : ''

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false)
        setClicked(false)
      }}
      onClick={() => setClicked((v) => !v)}
      style={{ position: 'relative', cursor: 'pointer' }}
      title={`${count} ${meta.singular}${count > 1 ? 's' : ''} — survolez ou touchez pour lire`}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: meta.gap,
          background: meta.bg,
          padding: '4px 9px',
          borderRadius: 20,
        }}
      >
        <Shape type={type} cfg={cfg} />
        <span style={{ font: `${cfg.countWeight} 11px "Plus Jakarta Sans"`, color: meta.color }}>
          {count}
          {suffix}
        </span>
      </div>
      {open && (
        <div
          style={{
            position: 'absolute',
            zIndex: 20,
            width: cfg.popoverWidth,
            background: '#fff',
            border: '1px solid #e6e2d8',
            borderRadius: 12,
            boxShadow: '0 6px 20px rgba(0,0,0,.12)',
            padding: cfg.popoverPadding,
            textAlign: 'left',
            ...cfg.popoverStyle,
          }}
        >
          <div
            style={{
              font: `700 ${cfg.titleSize} "Plus Jakarta Sans"`,
              color: meta.color,
              marginBottom: cfg.entryGap,
              textTransform: 'uppercase',
              letterSpacing: '.04em',
            }}
          >
            {meta.title}
          </div>
          {entries.map((entry, i) => (
            <div key={i} style={{ marginBottom: cfg.entryGap }}>
              <div style={{ font: `500 ${cfg.textSize} "Plus Jakarta Sans"`, color: '#3d443f' }}>{entry.text}</div>
              <div style={{ font: `600 ${cfg.metaSize} "Plus Jakarta Sans"`, color: '#a39c8e', marginTop: variant === 'compact' ? 2 : 3 }}>
                {entry.author} · {entry.date}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CommentIcons({ counts, comments = {}, variant = 'compact' }: CommentIconsProps) {
  const rowGap = VARIANT_CONFIG[variant].rowGap
  return (
    <div style={{ display: 'flex', gap: rowGap, flexWrap: 'wrap' }}>
      {TYPE_ORDER.map((type) => {
        const count = counts[type] ?? 0
        if (count <= 0) return null
        return <CommentIcon key={type} type={type} count={count} entries={comments[type] ?? []} variant={variant} />
      })}
    </div>
  )
}
