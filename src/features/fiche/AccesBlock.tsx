import type { CSSProperties } from 'react'
import { colors, radii } from '../../theme/tokens'
import type { ContactWithMeta } from '../../types/db'
import { PREND_NOUVEAUX_LABELS, SECTEUR_CONV_LABELS } from './format'

/**
 * Bloc « Adressage & accès » (absent du prototype maquette, listé par ARCHITECTURE.md §Écran 3,
 * cf. plans/P1/S4.md T7 étape 5) — sous-carte **neutre** (tokens `colors.border`/`colors.bg`, pas
 * de couleur sémantique inventée), même langage visuel que les blocs coordonnées. Omise si vide.
 * `prend_nouveaux` et `pmr` ont une valeur par défaut en base (jamais `null`) → toujours affichés,
 * traduits en libellé lisible ; les autres champs sont optionnels et n'apparaissent que si renseignés.
 */
interface AccesBlockProps {
  contact: ContactWithMeta
}

const cardStyle: CSSProperties = {
  background: colors.bg,
  border: `1px solid ${colors.border}`,
  borderRadius: radii.xl,
  padding: '16px 18px',
  marginBottom: 18,
}

const titleStyle: CSSProperties = {
  font: '700 11px "Plus Jakarta Sans"',
  color: colors.text.secondary,
  textTransform: 'uppercase',
  letterSpacing: '.04em',
  marginBottom: 8,
}

const lineStyle: CSSProperties = {
  font: '500 12.5px/1.8 "Plus Jakarta Sans"',
  color: colors.text.body,
}

interface Line {
  label: string
  value: string
}

export default function AccesBlock({ contact }: AccesBlockProps) {
  const lines: Line[] = []

  if (contact.orientation) lines.push({ label: 'Orientation', value: contact.orientation })
  if (contact.sous_type) lines.push({ label: 'Sous-type', value: contact.sous_type })
  lines.push({
    label: 'Prend de nouveaux patients',
    value: PREND_NOUVEAUX_LABELS[contact.prend_nouveaux],
  })
  if (contact.delai) lines.push({ label: 'Délai', value: contact.delai })
  if (contact.secteur_conv) {
    lines.push({ label: 'Secteur conventionnement', value: SECTEUR_CONV_LABELS[contact.secteur_conv] })
  }
  if (contact.tarif) lines.push({ label: 'Tarif indicatif', value: contact.tarif })
  if (contact.langues) lines.push({ label: 'Langues', value: contact.langues })
  lines.push({ label: 'Accès PMR', value: contact.pmr ? 'Oui' : 'Non' })
  if (contact.tele_expertise) {
    lines.push({ label: 'Télé-expertise / avis rapide', value: contact.tele_expertise })
  }
  if (contact.rpps) lines.push({ label: 'RPPS', value: contact.rpps })

  if (lines.length === 0) return null

  return (
    <div style={cardStyle}>
      <div style={titleStyle}>Adressage & accès</div>
      <div style={lineStyle}>
        {lines.map((line) => (
          <div key={line.label}>
            {line.label} : {line.value}
          </div>
        ))}
      </div>
    </div>
  )
}
