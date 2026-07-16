import { colors } from '../theme/tokens'

/**
 * Toggle « dans ma liste ». Deux formes dans la maquette :
 * - dot : pastille 18px de la ligne d'annuaire (ligne 157), pas de texte visible (title = tooltip).
 * - button : pilule texte de l'en-tête de fiche (ligne 182).
 */
interface StarToggleProps {
  starred: boolean
  onToggle?: () => void
  variant?: 'dot' | 'button'
}

export default function StarToggle({ starred, onToggle, variant = 'dot' }: StarToggleProps) {
  const label = starred ? '★ Dans ma liste' : '★ Ajouter à ma liste'

  if (variant === 'button') {
    return (
      <div
        onClick={onToggle}
        style={{
          font: '600 11px "Plus Jakarta Sans"',
          color: colors.brand.blue,
          border: '1px solid #d7e7fa',
          padding: '7px 12px',
          borderRadius: 9,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </div>
    )
  }

  return (
    <div
      onClick={onToggle}
      title={label}
      style={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        flex: 'none',
        cursor: 'pointer',
        border: `1.6px solid ${starred ? colors.brand.blue : '#ddd6c4'}`,
        background: starred ? colors.brand.blue : 'transparent',
      }}
    />
  )
}
