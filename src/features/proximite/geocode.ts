/**
 * Géocodage BAN (Base Adresse Nationale, `api-adresse.data.gouv.fr`) — service public FR, sans
 * clé. Cf. plans/P3/index.md §Décisions de cadrage : score de confiance renvoyé par la BAN,
 * seuil `GEOCODE_MIN_SCORE` (0,6) en dessous duquel on ne place pas d'épingle (« ne jamais
 * deviner »). Utilisé à la saisie (T2, en arrière-plan) et par `ReferenceProvider` (T3, adresse
 * patient transitoire).
 */

/** Score BAN minimal pour considérer une position fiable (cf. plans/P3/index.md). */
export const GEOCODE_MIN_SCORE = 0.6

export interface GeocodeResult {
  lat: number
  lng: number
  score: number
}

interface BanFeature {
  geometry: { coordinates: [number, number] } // [lng, lat]
  properties: { score: number }
}

interface BanResponse {
  features?: BanFeature[]
}

/**
 * Géocode une adresse via la BAN. Tolérant aux erreurs réseau/format : renvoie toujours `null` en
 * cas d'échec (ne jette jamais) — le géocodage ne doit jamais bloquer l'appelant (saisie, sélecteur
 * de référence).
 */
export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const trimmed = query.trim()
  if (!trimmed) return null

  try {
    const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(trimmed)}&limit=1`
    const response = await fetch(url)
    if (!response.ok) return null

    const data = (await response.json()) as BanResponse
    const feature = data.features?.[0]
    if (!feature) return null

    const [lng, lat] = feature.geometry.coordinates
    const score = feature.properties.score
    if (typeof score !== 'number' || score < GEOCODE_MIN_SCORE) return null

    return { lat, lng, score }
  } catch {
    return null
  }
}
