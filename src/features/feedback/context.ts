/**
 * Capture du contexte de page pour un retour (métadonnées) et de la capture d'écran (html2canvas).
 * html2canvas est chargé en import dynamique : la librairie (~50 Ko gzip) reste hors du bundle
 * initial et n'est téléchargée qu'au premier clic sur le bouton flottant.
 *
 * Le widget marque sa racine DOM avec l'attribut `data-feedback-ui` ; `ignoreElements` s'en sert
 * pour exclure le bouton et le panneau de la capture (on veut la page, pas l'UI de signalement).
 */

/** Attribut posé sur la racine du widget → repère à ignorer à la capture + à masquer à l'impression. */
export const FEEDBACK_UI_ATTR = 'data-feedback-ui'

/** Contexte de page (hors saisie du membre) joint automatiquement au retour. */
export interface PageContext {
  url: string
  page_label: string
  contact_id: string | null
  viewport: string
  user_agent: string
}

/** Nom lisible de l'écran à partir du pathname (pour trier/lire les retours côté référent). */
export function pageLabelFor(pathname: string): string {
  if (pathname === '/') return 'Annuaire'
  if (/^\/contact\/[^/]+\/modifier$/.test(pathname)) return 'Modifier une fiche'
  if (/^\/contact\/[^/]+$/.test(pathname)) return 'Fiche contact'
  if (pathname === '/nouveau') return 'Ajouter un contact'
  if (pathname === '/impression') return 'Sélection & impression'
  if (pathname === '/membres') return 'Membres'
  if (pathname === '/retours') return 'Retours'
  return pathname
}

/** Id de la fiche concernée si on est sur /contact/:id(/modifier), sinon null. */
export function contactIdFrom(pathname: string): string | null {
  const match = pathname.match(/^\/contact\/([^/]+)/)
  return match ? match[1]! : null
}

/** Assemble le contexte de page à l'instant de l'envoi. */
export function capturePageContext(pathname: string): PageContext {
  return {
    url: window.location.href,
    page_label: pageLabelFor(pathname),
    contact_id: contactIdFrom(pathname),
    viewport: `${window.innerWidth}×${window.innerHeight}`,
    user_agent: navigator.userAgent,
  }
}

/** Réduit un canvas à `maxWidth` puis l'exporte en JPEG compressé (data URL). */
function toCompressedDataUrl(canvas: HTMLCanvasElement, maxWidth: number, quality: number): string {
  const ratio = canvas.width > maxWidth ? maxWidth / canvas.width : 1
  if (ratio === 1) return canvas.toDataURL('image/jpeg', quality)
  const out = document.createElement('canvas')
  out.width = Math.round(canvas.width * ratio)
  out.height = Math.round(canvas.height * ratio)
  const ctx = out.getContext('2d')
  if (!ctx) return canvas.toDataURL('image/jpeg', quality)
  ctx.drawImage(canvas, 0, 0, out.width, out.height)
  return out.toDataURL('image/jpeg', quality)
}

/**
 * Capture la zone visible de la page en data URL JPEG (best-effort). Retourne `null` en cas d'échec
 * (html2canvas ne rend pas toujours parfaitement : les tuiles de carte Leaflet, chargées d'un
 * domaine tiers, peuvent apparaître vides — la capture reste un indice, pas une preuve).
 */
export async function captureScreenshot(): Promise<string | null> {
  try {
    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(document.body, {
      useCORS: true,
      logging: false,
      scale: 1,
      backgroundColor: '#efece5',
      ignoreElements: (el) => el.hasAttribute(FEEDBACK_UI_ATTR),
      // Recadre sur la zone réellement visible (plus utile et bien plus léger que la page entière).
      x: window.scrollX,
      y: window.scrollY,
      width: window.innerWidth,
      height: window.innerHeight,
      windowWidth: document.documentElement.clientWidth,
      windowHeight: document.documentElement.clientHeight,
    })
    return toCompressedDataUrl(canvas, 1400, 0.7)
  } catch {
    return null
  }
}
