import type { CSSProperties, InputHTMLAttributes } from 'react'
import { colors } from '../../theme/tokens'

/**
 * Champ texte — style des inputs de la maquette édition (lignes 283-386).
 * variant="default" = section "Essentiel" (13px, padding 11px 13px) ;
 * variant="compact" = sections repliables secondaires (12.5px, padding 10px 12px).
 */
interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  variant?: 'default' | 'compact'
}

const SIZE_STYLES: Record<'default' | 'compact', CSSProperties> = {
  default: { padding: '11px 13px', borderRadius: 10, font: '500 13px "Plus Jakarta Sans"' },
  compact: { padding: '10px 12px', borderRadius: 10, font: '500 12.5px "Plus Jakarta Sans"' },
}

export default function TextField({ label, variant = 'default', style, ...props }: TextFieldProps) {
  return (
    <div>
      {label && (
        <label
          style={{
            display: 'block',
            font: '600 11.5px "Plus Jakarta Sans"',
            color: colors.text.body,
            marginBottom: 5,
          }}
        >
          {label}
        </label>
      )}
      <input
        {...props}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          border: `1px solid ${colors.border}`,
          color: colors.text.primary,
          ...SIZE_STYLES[variant],
          ...style,
        }}
      />
    </div>
  )
}
