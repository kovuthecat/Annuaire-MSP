/**
 * Extracteur Doctolib → prefill annuaire MSP.
 * ============================================
 *
 * Source lisible et commentée : c'est CE fichier qu'on maintient. `bookmarklet.txt` (à côté) est
 * une version minifiée générée depuis celui-ci (voir README.md §Build) — ne jamais éditer le
 * bookmarklet minifié directement.
 *
 * Contrat consommé (figé par P4/S1, cf. plans/P4/S1.md et src/features/edition/formState.ts) :
 * l'objet produit ici est encodé en base64url et transmis via
 * `${APP_ORIGIN}/nouveau?prefill=<data>`. Le lecteur côté app (`parsePrefill`) applique de toute
 * façon une liste blanche + un assainissement — mais on ne produit ICI que des clés patient
 * (jamais un champ pro), par construction, en double barrière.
 *
 * Doctrine (DECISIONS.md T-005 + 2026-07-17 P4) : **ne jamais inventer** une donnée. Un champ
 * absent ou incertain reste absent du payload — le formulaire le laissera vide, le membre relit et
 * complète. Priorité au JSON-LD (schema.org, structure stable) ; repli DOM heuristique seulement
 * pour les champs qu'aucun JSON-LD ne donne, toujours tolérant à l'absence (jamais d'exception si
 * un nœud manque).
 *
 * Statut de la structure DOM/JSON-LD réelle : élaborée à partir du vocabulaire schema.org standard
 * (Physician/MedicalBusiness/MedicalClinic/Person, PostalAddress, GeoCoordinates — cf.
 * plans/P4/index.md §Décisions). **Pas encore vérifiée sur une vraie page Doctolib** (test humain
 * restant, cf. README.md et le Bilan de session de plans/P4/S2.md) : le repli DOM, en particulier,
 * est prudent par construction et pourra être affiné après ce test (cf. S2.md §Si bloqué).
 */

// URL Vercel stable de production de l'annuaire (confirmée par Thibault — ne pas deviner).
const APP_ORIGIN = 'https://annuaire-msp.vercel.app'

/**
 * @typedef {Object} Prefill
 * @property {string} [nom]
 * @property {string} [prenom]
 * @property {string} [civilite]
 * @property {string} [profession]
 * @property {string} [etablissement]
 * @property {string} [adresse]
 * @property {string} [arrondissement]
 * @property {string} [doctolib]
 * @property {string} [site_web]
 * @property {string} [tel_secretariat]
 * @property {string} [email_rdv]
 * @property {string} [secteur_conv]
 * @property {string} [langues]
 * @property {string} [source_url]
 * @property {number} [latitude]
 * @property {number} [longitude]
 * @property {number} [geocode_score]
 */

// Liste blanche des clés qu'on est autorisé à produire (contrat P4/index.md). Double barrière avec
// la liste blanche du lecteur côté app : même si une clé indésirable s'infiltrait plus haut dans ce
// fichier, `pickAllowedKeys` l'éliminerait avant l'ouverture de l'URL.
const ALLOWED_KEYS = [
  'nom', 'prenom', 'civilite', 'profession', 'etablissement', 'adresse', 'arrondissement',
  'doctolib', 'site_web', 'tel_secretariat', 'email_rdv', 'secteur_conv', 'langues',
  'source_url', 'latitude', 'longitude', 'geocode_score',
]

// -----------------------------------------------------------------------------------------------
// 1. Lecture du JSON-LD
// -----------------------------------------------------------------------------------------------

/**
 * Récupère tous les objets JSON-LD de la page, aplatis (gère `@graph` et les tableaux top-level).
 * Tolérant : un `<script>` illisible (JSON invalide) est ignoré, jamais d'exception qui remonte.
 * @param {Document} document
 * @returns {Record<string, unknown>[]}
 */
function readJsonLdNodes(document) {
  /** @type {Record<string, unknown>[]} */
  const nodes = []
  const scripts = document.querySelectorAll('script[type="application/ld+json"]')
  scripts.forEach((script) => {
    let parsed
    try {
      parsed = JSON.parse(script.textContent || '')
    } catch {
      return // script illisible : on l'ignore, on ne devine pas son contenu
    }
    const items = Array.isArray(parsed) ? parsed : [parsed]
    items.forEach((item) => {
      if (!item || typeof item !== 'object') return
      if (Array.isArray(item['@graph'])) {
        item['@graph'].forEach((n) => n && typeof n === 'object' && nodes.push(n))
      } else {
        nodes.push(item)
      }
    })
  })
  return nodes
}

/** @param {Record<string, unknown>} node */
function typesOf(node) {
  const t = node['@type']
  if (Array.isArray(t)) return t.filter((x) => typeof x === 'string')
  return typeof t === 'string' ? [t] : []
}

/**
 * @param {Record<string, unknown>} node
 * @param {string[]} list
 */
function hasType(node, list) {
  return typesOf(node).some((t) => list.includes(t))
}

const PERSON_TYPES = ['Physician', 'Person']
const ORG_TYPES = ['MedicalBusiness', 'MedicalClinic', 'MedicalOrganization', 'LocalBusiness']

// -----------------------------------------------------------------------------------------------
// 2. Mappings schema.org -> contrat prefill
// -----------------------------------------------------------------------------------------------

const CIVILITY_PATTERN = /^(Docteur|Professeur|Dr\.?|Pr\.?|Mme|Mlle|M\.?)\s+/i

/**
 * Découpe un `name` schema.org de personne en civilité/prénom/nom, prudemment : si on ne peut pas
 * couper sans deviner (un seul mot restant), tout part dans `nom` plutôt que d'inventer un prénom.
 * @param {string} rawName
 */
function splitPersonName(rawName) {
  const name = rawName.trim().replace(/\s+/g, ' ')
  if (!name) return {}
  let civilite
  let rest = name
  const civilityMatch = rest.match(CIVILITY_PATTERN)
  if (civilityMatch) {
    civilite = civilityMatch[0].trim()
    rest = rest.slice(civilityMatch[0].length).trim()
  }
  if (!rest) return { civilite }
  const parts = rest.split(' ').filter(Boolean)
  if (parts.length >= 2) {
    return { civilite, prenom: parts[0], nom: parts.slice(1).join(' ') }
  }
  // Un seul mot restant : impossible de séparer prénom/nom sans deviner -> tout dans `nom`.
  return { civilite, nom: parts[0] }
}

/**
 * @param {unknown} address - PostalAddress schema.org
 * @returns {{ adresse?: string, arrondissement?: string }}
 */
function mapAddress(address) {
  if (!address || typeof address !== 'object') return {}
  const a = address
  const street = typeof a.streetAddress === 'string' ? a.streetAddress.trim() : ''
  const postalCode = typeof a.postalCode === 'string' ? a.postalCode.trim() : ''
  const locality = typeof a.addressLocality === 'string' ? a.addressLocality.trim() : ''
  const parts = [street, [postalCode, locality].filter(Boolean).join(' ')].filter(Boolean)
  const adresse = parts.join(', ') || undefined

  // Arrondissement parisien dérivé du code postal (75020 -> "20e"). Jamais deviné hors de ce
  // pattern strict : un code postal hors 750xx (ou absent) laisse `arrondissement` indéfini.
  let arrondissement
  const match = postalCode.match(/^750(\d{2})$/)
  if (match) {
    const n = parseInt(match[1], 10)
    if (n >= 1 && n <= 20) arrondissement = `${n}e`
  }
  return { adresse, arrondissement }
}

/**
 * @param {unknown} geo - GeoCoordinates schema.org
 * @returns {{ latitude?: number, longitude?: number, geocode_score?: number }}
 */
function mapGeo(geo) {
  if (!geo || typeof geo !== 'object') return {}
  const g = geo
  const lat = typeof g.latitude === 'number' ? g.latitude : Number(g.latitude)
  const lng = typeof g.longitude === 'number' ? g.longitude : Number(g.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return {}
  // geocode_score = 1 (max) : coordonnée fournie directement par la source (Doctolib), pas un
  // géocodage approximatif — cf. plans/P4/index.md §Décision clé T1 (« geocode_score élevé »).
  // Échelle alignée sur P3 (score BAN 0..1, seuil 0,6) : 1 = confiance maximale, source directe.
  return { latitude: lat, longitude: lng, geocode_score: 1 }
}

/**
 * medicalSpecialty (Physician) ou jobTitle (Person) -> profession. Peut être une chaîne, un
 * tableau de chaînes, ou un objet `{ name }` selon la page.
 * @param {Record<string, unknown>} node
 */
function mapProfession(node) {
  const raw = node.medicalSpecialty ?? node.jobTitle
  if (!raw) return undefined
  const toText = (v) => {
    if (typeof v === 'string') return v.trim()
    if (v && typeof v === 'object' && typeof v.name === 'string') return v.name.trim()
    return ''
  }
  if (Array.isArray(raw)) {
    const joined = raw.map(toText).filter(Boolean).join(', ')
    return joined || undefined
  }
  const text = toText(raw)
  return text || undefined
}

/**
 * knowsLanguage -> langues (chaîne lisible, virgule-séparée).
 * @param {Record<string, unknown>} node
 */
function mapLangues(node) {
  const raw = node.knowsLanguage
  if (!raw) return undefined
  const toText = (v) => {
    if (typeof v === 'string') return v.trim()
    if (v && typeof v === 'object' && typeof v.name === 'string') return v.name.trim()
    return ''
  }
  const list = Array.isArray(raw) ? raw.map(toText) : [toText(raw)]
  const joined = list.filter(Boolean).join(', ')
  return joined || undefined
}

/**
 * URL(s) externes (`sameAs`/`url`) qui ne pointent PAS vers doctolib.fr -> site_web du cabinet.
 * On ne veut pas dupliquer le lien Doctolib lui-même dans `site_web`.
 * @param {Record<string, unknown>} node
 */
function mapSiteWeb(node) {
  const candidates = []
  if (typeof node.url === 'string') candidates.push(node.url)
  if (typeof node.sameAs === 'string') candidates.push(node.sameAs)
  if (Array.isArray(node.sameAs)) {
    node.sameAs.forEach((u) => typeof u === 'string' && candidates.push(u))
  }
  const external = candidates.find((u) => {
    try {
      return !new URL(u).hostname.endsWith('doctolib.fr')
    } catch {
      return false
    }
  })
  return external || undefined
}

/**
 * URL canonique doctolib.fr du nœud (sa propre page) -> champ `doctolib`.
 * @param {Record<string, unknown>} node
 */
function mapDoctolibUrl(node) {
  const candidates = [node.url, node.mainEntityOfPage].filter((v) => typeof v === 'string')
  return candidates.find((u) => {
    try {
      return new URL(u).hostname.endsWith('doctolib.fr')
    } catch {
      return false
    }
  })
}

// -----------------------------------------------------------------------------------------------
// 3. Repli DOM (uniquement pour ce que le JSON-LD n'a pas donné)
// -----------------------------------------------------------------------------------------------

/**
 * Lit un attribut/texte de façon tolérante : jamais d'exception si le sélecteur ne matche rien.
 * @param {Document} document
 * @param {string} selector
 */
function safeText(document, selector) {
  try {
    const el = document.querySelector(selector)
    const text = el && el.textContent ? el.textContent.trim() : ''
    return text || undefined
  } catch {
    return undefined
  }
}

/** @param {Document} document */
function domFallback(document) {
  /** @type {Partial<Prefill>} */
  const out = {}

  // Nom : en dernier recours, le <h1> de la page (souvent le nom du praticien ou du centre).
  // On ne sait pas trancher personne/structure sans JSON-LD -> laissé dans `nom`, le membre relit.
  const h1 = safeText(document, 'h1')
  if (h1) {
    const { civilite, prenom, nom } = splitPersonName(h1)
    if (nom) {
      out.civilite = civilite
      out.prenom = prenom
      out.nom = nom
    }
  }

  // Adresse : microdonnées `itemprop="address"` ou balise <address>, si présentes.
  const adresse = safeText(document, '[itemprop="address"]') || safeText(document, 'address')
  if (adresse) out.adresse = adresse

  // Téléphone / email affichés en lien direct (tel:/mailto:) — patient-facing par construction
  // (ce sont les liens de contact affichés sur une page publique destinée aux patients).
  try {
    const telLink = document.querySelector('a[href^="tel:"]')
    if (telLink) {
      const tel = telLink.getAttribute('href').replace(/^tel:/, '').trim()
      if (tel) out.tel_secretariat = tel
    }
  } catch {
    // tolérant : pas de lien tel, on continue
  }
  try {
    const mailLink = document.querySelector('a[href^="mailto:"]')
    if (mailLink) {
      const mail = mailLink.getAttribute('href').replace(/^mailto:/, '').trim()
      if (mail) out.email_rdv = mail
    }
  } catch {
    // tolérant : pas de lien mailto, on continue
  }

  return out
}

// -----------------------------------------------------------------------------------------------
// 4. Assemblage
// -----------------------------------------------------------------------------------------------

/**
 * @param {Document} document
 * @param {Location} location
 * @returns {Prefill}
 */
function extractFromPage(document, location) {
  const nodes = readJsonLdNodes(document)
  const person = nodes.find((n) => hasType(n, PERSON_TYPES))
  const org = nodes.find((n) => hasType(n, ORG_TYPES))
  const primary = person || org

  /** @type {Partial<Prefill>} */
  let out = {}

  if (primary) {
    if (person && typeof person.name === 'string') {
      // Nœud "personne" : on découpe le nom en civilité/prénom/nom (jamais deviné au-delà du
      // motif sûr — cf. splitPersonName).
      Object.assign(out, splitPersonName(person.name))
    } else if (org && typeof org.name === 'string') {
      // Nœud "structure" uniquement (page centre/établissement, pas de praticien identifié) :
      // le nom va dans `etablissement`, jamais dans nom/prenom/civilite (on ne sait pas que
      // c'est une personne).
      out.etablissement = org.name.trim() || undefined
    }

    // Établissement rattaché à un praticien (ex. `worksFor`), si présent et distinct du nom perso.
    if (!out.etablissement && person && person.worksFor && typeof person.worksFor === 'object') {
      const workplace = person.worksFor
      if (typeof workplace.name === 'string' && workplace.name.trim()) {
        out.etablissement = workplace.name.trim()
      }
    }

    out.profession = mapProfession(primary)
    Object.assign(out, mapAddress(primary.address))
    Object.assign(out, mapGeo(primary.geo))
    out.langues = mapLangues(primary)
    out.doctolib = mapDoctolibUrl(primary)
    out.site_web = mapSiteWeb(primary)
    if (typeof primary.telephone === 'string' && primary.telephone.trim()) {
      out.tel_secretariat = primary.telephone.trim()
    }
  }

  // Repli DOM : seulement pour les champs encore vides après le JSON-LD.
  const fallback = domFallback(document)
  for (const key of Object.keys(fallback)) {
    if (out[key] === undefined) out[key] = fallback[key]
  }

  // Lien Doctolib : si toujours rien (ni JSON-LD ni canonical), la page courante EST la page
  // Doctolib qu'on lit -> son URL est un lien Doctolib valide par construction.
  if (!out.doctolib) {
    const canonical = document.querySelector('link[rel="canonical"]')
    out.doctolib = (canonical && canonical.getAttribute('href')) || location.href
  }

  // Provenance : toujours l'URL réellement ouverte (jamais devinée).
  out.source_url = location.href

  // Note : `secteur_conv` n'est PAS extrait ici. Aucun signal JSON-LD standard fiable ne le porte
  // (schema.org ne modélise pas le secteur conventionnel) et deviner depuis un texte libre du DOM
  // violerait la doctrine « ne jamais inventer » (DECISIONS.md T-005). Champ laissé absent :
  // le membre le renseigne à la main si besoin, comme en saisie manuelle.

  return pickAllowedKeys(out)
}

/**
 * Double barrière : ne renvoie que les clés du contrat, et seulement celles définies/non-vides.
 * @param {Partial<Prefill>} candidate
 * @returns {Prefill}
 */
function pickAllowedKeys(candidate) {
  /** @type {Prefill} */
  const result = {}
  for (const key of ALLOWED_KEYS) {
    const value = candidate[key]
    if (value === undefined || value === null) continue
    if (typeof value === 'string' && value.trim() === '') continue
    result[key] = value
  }
  return result
}

// -----------------------------------------------------------------------------------------------
// 5. Encodage + ouverture de l'URL (relais sans réseau, cf. DECISIONS.md 2026-07-17 P4)
// -----------------------------------------------------------------------------------------------

/**
 * JSON -> base64url (RFC 4648 §5, sans padding), UTF-8. Miroir exact de `base64UrlDecode` côté app
 * (src/features/edition/formState.ts) : mêmes octets, sens inverse.
 * @param {unknown} value
 */
function toBase64Url(value) {
  const json = JSON.stringify(value)
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  const base64 = btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * @param {Prefill} prefill
 */
function buildPrefillUrl(prefill) {
  const data = toBase64Url(prefill)
  return `${APP_ORIGIN}/nouveau?prefill=${data}`
}

// -----------------------------------------------------------------------------------------------
// 6. Point d'entrée (bookmarklet)
// -----------------------------------------------------------------------------------------------

;(function run() {
  try {
    const prefill = extractFromPage(document, location)
    const url = buildPrefillUrl(prefill)
    window.open(url, '_blank')
  } catch (err) {
    // Doctrine : jamais planter la page du membre. On l'informe et il peut saisir à la main.
    // eslint-disable-next-line no-alert
    alert('Annuaire MSP : extraction impossible sur cette page. Saisie manuelle nécessaire.')
    // eslint-disable-next-line no-console
    console.error('[annuaire-msp] extraction Doctolib échouée :', err)
  }
})()
