import { colors, radii } from '../theme/tokens'

/**
 * Badge sémantique (secteur 1/2, AME/CMU, VAD, prend nouveaux patients).
 * Cf. maquette lignes 96-99 (ligne annuaire) et 174-178 (fiche) — même style dans les deux usages.
 */
export type BadgeVariant = 'secteur1' | 'secteur2' | 'ame' | 'vad' | 'newpatients'

const LABELS: Record<BadgeVariant, string> = {
  secteur1: 'Secteur 1',
  secteur2: 'Secteur 2',
  ame: 'AME/CMU',
  vad: 'VAD',
  newpatients: 'Prend nouveaux patients',
}

interface BadgeProps {
  variant: BadgeVariant
  /** Surcharge du libellé par défaut (rarement nécessaire). */
  label?: string
}

export default function Badge({ variant, label }: BadgeProps) {
  const { fg, bg } = colors.sector[variant]
  return (
    <span
      style={{
        font: '600 10.5px "Plus Jakarta Sans"',
        color: fg,
        background: bg,
        padding: '4px 9px',
        borderRadius: radii.pill,
        whiteSpace: 'nowrap',
      }}
    >
      {label ?? LABELS[variant]}
    </span>
  )
}
