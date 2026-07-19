import type { CSSProperties } from 'react'
import { useEffect, useRef, useState } from 'react'
import { colors, radii } from '../../theme/tokens'
// Source unique : le favori minifié généré par tools/doctolib-bookmarklet/build.cjs. Importé en
// texte brut (?raw) pour ne jamais dupliquer la chaîne `javascript:` dans le code React.
import bookmarkletHref from '../../../tools/doctolib-bookmarklet/bookmarklet.txt?raw'

/**
 * Panneau « Importer depuis Doctolib » sur l'écran Ajouter (création uniquement). L'extraction
 * elle-même se fait par un **favori (bookmarklet)** exécuté SUR la page Doctolib — l'app web ne peut
 * pas lire l'onglet Doctolib. Ce panneau est donc le point de découverte manquant : il explique le
 * flux et propose le favori à installer (glisser dans la barre des favoris, ou copier le lien).
 * Détail complet et vérification CSP : tools/doctolib-bookmarklet/README.md (cf. P4/T-007).
 */

const wrapStyle: CSSProperties = {
  marginBottom: 14,
}

const toggleStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  border: `1px solid ${colors.comment.info.fg}`,
  background: colors.comment.info.bg,
  color: colors.comment.info.fg,
  borderRadius: radii.lg,
  padding: '9px 13px',
  cursor: 'pointer',
  font: '700 12px "Plus Jakarta Sans"',
}

const panelStyle: CSSProperties = {
  marginTop: 10,
  border: `1px solid ${colors.borderLight}`,
  background: colors.white,
  borderRadius: radii.lg,
  padding: '14px 16px',
}

const paragraphStyle: CSSProperties = {
  font: '500 12.5px/1.6 "Plus Jakarta Sans"',
  color: colors.text.body,
  marginBottom: 10,
}

const stepsStyle: CSSProperties = {
  font: '500 12.5px/1.7 "Plus Jakarta Sans"',
  color: colors.text.body,
  margin: '0 0 12px 18px',
  padding: 0,
}

const installRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap',
  padding: '10px 12px',
  borderRadius: radii.md,
  background: colors.bg,
  border: `1px dashed ${colors.border}`,
  marginBottom: 10,
}

const favoriStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  background: colors.gradientPrimary,
  color: '#fff',
  borderRadius: radii.pill,
  padding: '8px 14px',
  font: '700 12px "Plus Jakarta Sans"',
  textDecoration: 'none',
  cursor: 'grab',
  whiteSpace: 'nowrap',
}

const dragHintStyle: CSSProperties = {
  font: '500 11.5px/1.5 "Plus Jakarta Sans"',
  color: colors.text.secondary,
  flex: 1,
  minWidth: 160,
}

const copyBtnStyle: CSSProperties = {
  border: `1px solid ${colors.border}`,
  background: colors.white,
  color: colors.text.body,
  borderRadius: radii.sm,
  padding: '7px 11px',
  cursor: 'pointer',
  font: '600 11.5px "Plus Jakarta Sans"',
  whiteSpace: 'nowrap',
}

const caveatStyle: CSSProperties = {
  font: '500 11px/1.55 "Plus Jakarta Sans"',
  color: colors.text.muted,
  marginTop: 4,
}

export default function DoctolibImportPanel() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const favoriRef = useRef<HTMLAnchorElement>(null)

  // `href="javascript:…"` posé impérativement : React assainit/prévient sur les URL `javascript:`
  // dans le JSX, mais un bookmarklet DOIT porter cette URL pour être installable par glisser-déposer.
  useEffect(() => {
    if (open && favoriRef.current) favoriRef.current.setAttribute('href', bookmarkletHref)
  }, [open])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(bookmarkletHref)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div style={wrapStyle}>
      <button type="button" style={toggleStyle} onClick={() => setOpen((v) => !v)}>
        <span aria-hidden>🔖</span> Importer depuis une page Doctolib {open ? '▲' : '▼'}
      </button>

      {open && (
        <div style={panelStyle}>
          <div style={paragraphStyle}>
            L'import se fait avec un <strong>favori</strong> à installer une fois dans votre
            navigateur. Ensuite, sur n'importe quelle fiche Doctolib, un clic sur ce favori rouvre cet
            écran <strong>prérempli</strong> (nom, spécialité, adresse, lien…), en statut « à
            vérifier ». Le favori lit seulement la page déjà ouverte — aucune donnée n'est envoyée
            ailleurs.
          </div>

          <div style={installRowStyle}>
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
            <a ref={favoriRef} style={favoriStyle} onClick={(e) => e.preventDefault()}>
              <span aria-hidden>→</span> Annuaire MSP
            </a>
            <span style={dragHintStyle}>
              Glissez ce bouton dans votre barre de favoris (affichez-la avec Ctrl+Maj+B).
            </span>
            <button type="button" style={copyBtnStyle} onClick={() => void copy()}>
              {copied ? '✓ Copié' : 'Copier le lien'}
            </button>
          </div>

          <ol style={stepsStyle}>
            <li>Ouvrez la fiche Doctolib du praticien ou du centre.</li>
            <li>Cliquez sur le favori « → Annuaire MSP ».</li>
            <li>Cet écran se rouvre prérempli : relisez chaque champ, complétez, enregistrez.</li>
          </ol>

          <div style={caveatStyle}>
            Si rien ne s'ouvre (certains sites bloquent les favoris de ce type), signalez-le : on
            bascule alors sur une petite extension. Seuls des champs « patient » sont importés, jamais
            de coordonnée « pro ».
          </div>
        </div>
      )}
    </div>
  )
}
