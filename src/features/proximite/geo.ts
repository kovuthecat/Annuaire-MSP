import type { Contact } from '../../types/db'

/**
 * Fonctions géo pures — socle réutilisable par l'annuaire (S2), la carte (S3) et les transports
 * (S4), cf. plans/P3/S2.md T1. Rien ici ne touche au réseau (cf. `geocode.ts` pour l'appel BAN).
 */

export interface LatLng {
  lat: number
  lng: number
}

/**
 * Point de référence par défaut de l'annuaire : « 24 Rue des Plâtrières, 75020 Paris » (la MSP),
 * cf. plans/P3/index.md §Décisions de cadrage (« coordonnées relevées, jamais inventées, figées en
 * dur »).
 *
 * Relevé le 2026-07-18 via la BAN (`api-adresse.data.gouv.fr/search/?q=24 rue des
 * Plâtrières&postcode=75020&limit=1`) :
 * - label BAN : "24 Rue des Plâtrières 75020 Paris"
 * - score : 0,973 (bien au-dessus du seuil `GEOCODE_MIN_SCORE` de `geocode.ts`)
 * - coordonnées (GeoJSON `[lng, lat]`) : [2.390426, 48.867263]
 */
export const MSP_COORDS: LatLng = {
  lat: 48.867263,
  lng: 2.390426,
}

/** Rayon moyen de la Terre en km, pour la formule de Haversine. */
const EARTH_RADIUS_KM = 6371

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/** Distance à vol d'oiseau entre deux points (km) — pure, symétrique, nulle si `a === b`. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)

  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)

  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))

  return EARTH_RADIUS_KM * c
}

/** Coordonnées d'un contact, ou `null` si non géocodé (fiche pas encore backfillée/géocodée). */
export function coordsOf(contact: Pick<Contact, 'latitude' | 'longitude'>): LatLng | null {
  if (contact.latitude === null || contact.longitude === null) return null
  return { lat: contact.latitude, lng: contact.longitude }
}

/**
 * Formatage lisible d'une distance en km : « 850 m » sous 1 km (arrondi à la dizaine de mètres),
 * « 1,2 km » entre 1 et 10 km (une décimale, virgule FR), « 12 km » au-delà (entier).
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    const meters = Math.round((km * 1000) / 10) * 10
    return `${meters} m`
  }
  if (km < 10) {
    return `${km.toFixed(1).replace('.', ',')} km`
  }
  return `${Math.round(km)} km`
}
