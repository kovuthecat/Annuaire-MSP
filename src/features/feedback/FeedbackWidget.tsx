import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { useLocation } from 'react-router-dom'
import { colors } from '../../theme/tokens'
import { submitFeedback } from '../../data/feedback'
import type { FeedbackCategory } from '../../types/db'
import { FEEDBACK_UI_ATTR, capturePageContext, captureScreenshot, pageLabelFor } from './context'

/**
 * Bouton flottant « Un souci ? » présent sur chaque page (monté dans le Layout, donc sous
 * RequireAuth : jamais sur l'écran de connexion). Au survol, un popover explique la fonction ; au
 * clic, un panneau permet de décrire le problème. Le contexte de la page (URL, fiche concernée,
 * écran, navigateur) et une capture d'écran best-effort sont joints automatiquement, puis envoyés
 * dans la table `feedback` (lue par le référent sur /retours).
 *
 * La racine porte `data-feedback-ui` : `captureScreenshot` l'ignore (on veut la page, pas ce widget)
 * et le `<style>` ci-dessous le masque à l'impression sur toutes les pages (sans toucher global.css,
 * cf. note de src/features/impression/print.css).
 */

interface CategoryMeta {
  key: FeedbackCategory
  icon: string
  label: string
  color: { fg: string; bg: string }
  placeholder: string
}

const CATEGORIES: readonly CategoryMeta[] = [
  {
    key: 'probleme',
    icon: '🐞',
    label: 'Problème',
    color: colors.comment.alerte,
    placeholder: "Qu'est-ce qui ne marche pas ? Que faisiez-vous juste avant ?",
  },
  {
    key: 'donnee',
    icon: '✏️',
    label: 'Donnée erronée',
    color: colors.comment.spec,
    placeholder: 'Quelle information est fausse ou manquante, et quelle est la bonne ?',
  },
  {
    key: 'suggestion',
    icon: '💡',
    label: 'Suggestion',
    color: colors.comment.info,
    placeholder: "Qu'est-ce qui vous simplifierait la vie ?",
  },
]

const fabWrapStyle: CSSProperties = { position: 'fixed', right: 24, bottom: 24, zIndex: 45 }

const fabStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '12px 18px',
  borderRadius: 999,
  background: colors.gradientPrimary,
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  font: '700 13px "Plus Jakarta Sans"',
  boxShadow: '0 8px 22px rgba(15,159,142,.38)',
}

const tooltipStyle: CSSProperties = {
  position: 'absolute',
  bottom: 'calc(100% + 10px)',
  right: 0,
  width: 244,
  padding: '11px 13px',
  borderRadius: 12,
  background: colors.text.primary,
  color: '#fff',
  font: '500 11.5px/1.55 "Plus Jakarta Sans"',
  boxShadow: '0 8px 24px rgba(0,0,0,.24)',
  pointerEvents: 'none',
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 50,
  background: 'rgba(28,32,36,.42)',
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'flex-end',
  padding: 20,
}

const panelStyle: CSSProperties = {
  width: 392,
  maxWidth: '92vw',
  maxHeight: '86vh',
  overflowY: 'auto',
  background: colors.white,
  borderRadius: 18,
  boxShadow: '0 18px 50px rgba(0,0,0,.30)',
  padding: 20,
}

const panelTitleStyle: CSSProperties = {
  font: '800 16px "Plus Jakarta Sans"',
  color: colors.text.primary,
}

const panelSubtitleStyle: CSSProperties = {
  font: '500 11.5px/1.55 "Plus Jakarta Sans"',
  color: colors.text.secondary,
  marginTop: 4,
  marginBottom: 14,
}

const categoryRowStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  marginBottom: 12,
}

const textareaStyle: CSSProperties = {
  width: '100%',
  minHeight: 96,
  resize: 'vertical',
  padding: '10px 12px',
  borderRadius: 10,
  border: `1px solid ${colors.border}`,
  font: '500 12.5px/1.5 "Plus Jakarta Sans"',
  color: colors.text.body,
  outline: 'none',
}

const noteStyle: CSSProperties = {
  font: '500 11px/1.5 "Plus Jakarta Sans"',
  color: colors.text.muted,
  marginTop: 10,
}

const shotRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginTop: 12,
  padding: 8,
  borderRadius: 10,
  border: `1px solid ${colors.borderLight}`,
  background: colors.bg,
  cursor: 'pointer',
}

const thumbStyle: CSSProperties = {
  width: 64,
  height: 42,
  objectFit: 'cover',
  borderRadius: 6,
  border: `1px solid ${colors.border}`,
  background: '#fff',
}

const ctxLineStyle: CSSProperties = {
  font: '600 11px "Plus Jakarta Sans"',
  color: colors.text.secondary,
  marginTop: 12,
  wordBreak: 'break-all',
}

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
  marginTop: 16,
}

const primaryBtnStyle: CSSProperties = {
  padding: '10px 20px',
  borderRadius: 10,
  border: 'none',
  background: colors.gradientPrimary,
  color: '#fff',
  cursor: 'pointer',
  font: '700 12px "Plus Jakarta Sans"',
}

const ghostBtnStyle: CSSProperties = {
  padding: '10px 16px',
  borderRadius: 10,
  border: 'none',
  background: 'transparent',
  color: colors.text.secondary,
  cursor: 'pointer',
  font: '600 12px "Plus Jakarta Sans"',
}

const errorStyle: CSSProperties = {
  font: '600 11.5px "Plus Jakarta Sans"',
  color: colors.comment.alerte.fg,
  marginTop: 10,
}

const doneStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '18px 4px',
  font: '700 13px "Plus Jakarta Sans"',
  color: colors.comment.reco.fg,
}

function chipStyle(active: boolean, color: { fg: string; bg: string }): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 11px',
    borderRadius: 10,
    cursor: 'pointer',
    border: `1.5px solid ${active ? color.fg : colors.border}`,
    background: active ? color.bg : '#fff',
    color: active ? color.fg : colors.text.secondary,
    font: `${active ? 700 : 600} 11.5px "Plus Jakarta Sans"`,
  }
}

export default function FeedbackWidget() {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [category, setCategory] = useState<FeedbackCategory>('probleme')
  const [message, setMessage] = useState('')
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [includeShot, setIncludeShot] = useState(true)
  const [capturing, setCapturing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeCategory = CATEGORIES.find((c) => c.key === category) ?? CATEGORIES[0]!

  const close = useCallback(() => {
    if (submitting) return
    setOpen(false)
    setHovered(false)
  }, [submitting])

  const openPanel = () => {
    setOpen(true)
    setHovered(false)
    setDone(false)
    setError(null)
    setMessage('')
    setCategory('probleme')
    setScreenshot(null)
    setIncludeShot(true)
    setCapturing(true)
    // Laisse le panneau (ignoré via data-feedback-ui) se peindre avant de capturer la page.
    requestAnimationFrame(() => {
      void captureScreenshot().then((shot) => {
        setScreenshot(shot)
        setIncludeShot(shot !== null)
        setCapturing(false)
      })
    })
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close])

  const handleSubmit = async () => {
    if (!message.trim()) {
      setError("Décrivez le souci ou l'idée en quelques mots.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const ctx = capturePageContext(location.pathname)
      await submitFeedback({
        category,
        message: message.trim(),
        ...ctx,
        screenshot: includeShot ? screenshot : null,
      })
      setDone(true)
      window.setTimeout(() => {
        setOpen(false)
        setDone(false)
      }, 1700)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'envoi. Réessayez.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div {...{ [FEEDBACK_UI_ATTR]: '' }}>
      <style>{`@media print { [${FEEDBACK_UI_ATTR}] { display: none !important; } }`}</style>

      {!open && (
        <div style={fabWrapStyle}>
          {hovered && (
            <div style={tooltipStyle}>
              Un souci ou une idée sur cette page ? Signalez-le en un clic — l'adresse de la page et
              une capture d'écran sont jointes automatiquement pour aider à corriger.
            </div>
          )}
          <button
            type="button"
            style={fabStyle}
            onClick={openPanel}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            aria-label="Signaler un souci ou une idée sur cette page"
          >
            <span aria-hidden>💬</span> Un souci ?
          </button>
        </div>
      )}

      {open && (
        <div style={overlayStyle} onClick={close}>
          <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
            {done ? (
              <div style={doneStyle}>
                <span aria-hidden>✓</span> Merci ! Votre retour a bien été envoyé.
              </div>
            ) : (
              <>
                <div style={panelTitleStyle}>Un souci ? Une idée ?</div>
                <div style={panelSubtitleStyle}>
                  Votre message va au référent. L'adresse de la page et son contexte sont joints
                  automatiquement — pas besoin de tout réexpliquer.
                </div>

                <div style={categoryRowStyle}>
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      style={chipStyle(category === c.key, c.color)}
                      onClick={() => setCategory(c.key)}
                    >
                      <span aria-hidden>{c.icon}</span>
                      {c.label}
                    </button>
                  ))}
                </div>

                <textarea
                  style={textareaStyle}
                  placeholder={activeCategory.placeholder}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  autoFocus
                />

                {capturing && <div style={noteStyle}>Capture de la page en cours…</div>}
                {!capturing && screenshot && (
                  <label style={shotRowStyle}>
                    <input
                      type="checkbox"
                      checked={includeShot}
                      onChange={(e) => setIncludeShot(e.target.checked)}
                    />
                    <img src={screenshot} style={thumbStyle} alt="Aperçu de la capture de la page" />
                    <span style={{ font: '600 11.5px "Plus Jakarta Sans"', color: colors.text.body }}>
                      Joindre cette capture d'écran
                    </span>
                  </label>
                )}
                {!capturing && !screenshot && (
                  <div style={noteStyle}>
                    Capture d'écran indisponible sur cette page — le reste du contexte est joint.
                  </div>
                )}

                <div style={ctxLineStyle}>
                  📄 {pageLabelFor(location.pathname)} · {location.pathname}
                </div>

                {error && <div style={errorStyle}>{error}</div>}

                <div style={actionsStyle}>
                  <button type="button" style={ghostBtnStyle} onClick={close} disabled={submitting}>
                    Annuler
                  </button>
                  <button
                    type="button"
                    style={primaryBtnStyle}
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? 'Envoi…' : 'Envoyer le retour'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
