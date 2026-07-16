import type { SelectHTMLAttributes } from 'react'
import { colors } from '../../theme/tokens'

/** Menu déroulant — style des <select> de la maquette édition (ex. lignes 318, 324). */
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
}

export default function Select({ label, style, children, ...props }: SelectProps) {
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
      <select
        {...props}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '10px 12px',
          border: `1px solid ${colors.border}`,
          borderRadius: 10,
          font: '500 12.5px "Plus Jakarta Sans"',
          color: colors.text.primary,
          background: '#fff',
          ...style,
        }}
      >
        {children}
      </select>
    </div>
  )
}
