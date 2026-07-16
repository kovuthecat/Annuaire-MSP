import { colors } from '../theme/tokens'

/**
 * Cercle en dégradé teal→bleu, initiales optionnelles.
 * Cf. maquette : avatar ligne annuaire (38px, sans initiales, ligne 91), en-tête fiche
 * (56px, sans initiales, ligne 169), liste membres (36px, avec initiales, ligne 451).
 */
interface AvatarProps {
  size?: number
  initials?: string
  onClick?: () => void
}

export default function Avatar({ size = 38, initials, onClick }: AvatarProps) {
  return (
    <div
      onClick={onClick}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: colors.gradientPrimaryDiagonal,
        flex: 'none',
        cursor: onClick ? 'pointer' : undefined,
        display: initials ? 'flex' : undefined,
        alignItems: initials ? 'center' : undefined,
        justifyContent: initials ? 'center' : undefined,
        color: '#fff',
        font: '700 12px "Plus Jakarta Sans"',
      }}
    >
      {initials}
    </div>
  )
}
