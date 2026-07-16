import type { ButtonHTMLAttributes, CSSProperties } from 'react'
import { colors } from '../../theme/tokens'

/**
 * Bouton — 4 variantes vues dans la maquette édition/fiche/impression/membres :
 * primary (dégradé, ex. "Enregistrer la fiche"), outline (bordure bleue, ex. "Export PDF"),
 * ghost (texte seul, ex. "Annuler"), neutral (bordure neutre, ex. "Signaler à vérifier").
 */
type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'neutral'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

const VARIANT_STYLES: Record<ButtonVariant, CSSProperties> = {
  primary: {
    color: '#fff',
    background: colors.gradientPrimary,
    border: 'none',
    padding: '10px 22px',
    borderRadius: 10,
    font: '700 12px "Plus Jakarta Sans"',
  },
  outline: {
    color: colors.brand.blue,
    background: '#fff',
    border: '1px solid #d7e7fa',
    padding: '10px 22px',
    borderRadius: 10,
    font: '700 12px "Plus Jakarta Sans"',
  },
  ghost: {
    color: colors.text.secondary,
    background: 'transparent',
    border: 'none',
    padding: '10px 18px',
    borderRadius: 10,
    font: '600 12px "Plus Jakarta Sans"',
  },
  neutral: {
    color: colors.text.muted,
    background: '#fff',
    border: `1px solid ${colors.border}`,
    padding: '7px 12px',
    borderRadius: 9,
    font: '600 11px "Plus Jakarta Sans"',
  },
}

export default function Button({ variant = 'primary', style, children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      style={{
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        ...VARIANT_STYLES[variant],
        ...style,
      }}
    >
      {children}
    </button>
  )
}
