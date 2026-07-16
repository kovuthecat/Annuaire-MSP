import type { ReactNode } from 'react'
import { colors } from '../../theme/tokens'

/**
 * Bloc repliable (<details>) des sections secondaires du formulaire d'édition
 * (maquette lignes 307-386 : Lieu, Adressage & accès, Coordonnées, Tags, Commentaires).
 */
interface SectionProps {
  title: string
  subtitle?: string
  /** Couleur de la puce devant le titre (une par section dans la maquette). */
  dotColor?: string
  defaultOpen?: boolean
  children: ReactNode
}

export default function Section({ title, subtitle, dotColor = colors.brand.teal, defaultOpen = false, children }: SectionProps) {
  return (
    <details
      open={defaultOpen}
      style={{
        background: '#fff',
        border: `1px solid ${colors.borderLight}`,
        borderRadius: 14,
        padding: '15px 18px',
      }}
    >
      <summary
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          font: '700 12.5px "Plus Jakarta Sans"',
          color: colors.text.primary,
          cursor: 'pointer',
          listStyle: 'none',
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, display: 'inline-block' }} />
        {title}
        {subtitle && (
          <span style={{ font: '500 11px "Plus Jakarta Sans"', color: colors.text.faint, fontWeight: 500 }}>
            — {subtitle}
          </span>
        )}
      </summary>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>{children}</div>
    </details>
  )
}
