import { normalizeChar } from '../../data/search'

/**
 * Surlignage des termes de recherche dans un champ affiché (cf. ContactRow). Fonction **pure** et
 * testable : `<Highlight>` (highlight.tsx) ne fait que la rendre.
 *
 * Principe : on normalise `text` **caractère par caractère** (accents/casse retirés, espaces
 * conservés) tout en gardant une table `position normalisée -> position d'origine`. On cherche
 * chaque terme (déjà normalisé) dans le texte normalisé, puis on reporte les positions trouvées sur
 * le texte d'origine — qui garde donc sa casse et ses accents à l'affichage. Seules les
 * correspondances **exactes en sous-chaîne** sont surlignées (un repêchage flou ne dit pas quelles
 * lettres marquer).
 */

export interface HighlightSegment {
  text: string
  match: boolean
}

export function highlightSegments(text: string, terms: string[]): HighlightSegment[] {
  const activeTerms = terms.filter(Boolean)
  if (!text) return []
  if (activeTerms.length === 0) return [{ text, match: false }]

  // `Array.from` itère par point de code (gère paires de substitution / emoji).
  const chars = Array.from(text)
  let norm = ''
  const originIndex: number[] = [] // originIndex[i] = index (point de code) source du i-ème car. normalisé
  chars.forEach((ch, oi) => {
    const n = normalizeChar(ch)
    for (let k = 0; k < n.length; k++) {
      norm += n[k]
      originIndex.push(oi)
    }
  })

  // Positions d'origine couvertes par au moins un terme.
  const covered = new Array<boolean>(chars.length).fill(false)
  for (const term of activeTerms) {
    let from = 0
    let idx = norm.indexOf(term, from)
    while (idx !== -1) {
      const start = originIndex[idx]
      const end = originIndex[idx + term.length - 1]
      for (let o = start; o <= end; o++) covered[o] = true
      from = idx + term.length
      idx = norm.indexOf(term, from)
    }
  }

  // Regroupe les caractères contigus de même état (surligné / non surligné).
  const segments: HighlightSegment[] = []
  let buffer = ''
  let bufferMatch = covered[0]
  chars.forEach((ch, oi) => {
    if (covered[oi] === bufferMatch) {
      buffer += ch
    } else {
      segments.push({ text: buffer, match: bufferMatch })
      buffer = ch
      bufferMatch = covered[oi]
    }
  })
  if (buffer) segments.push({ text: buffer, match: bufferMatch })
  return segments
}
