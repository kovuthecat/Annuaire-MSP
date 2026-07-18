import type { LatLng } from './geo'
import { haversineKm } from './geo'

/**
 * Arrêts de transport à proximité (plans/P3/S4.md T2). Le jeu de données (`data/arrets.json`) est
 * construit hors app par `supabase/import/transit_prep.py` à partir du GTFS complet IDFM — cf.
 * l'en-tête de ce script pour la source, la licence et ce que le fichier contient (topologie
 * arrêt↔ligne uniquement, aucune donnée d'horaire).
 */

/** Modes tels que produits par `transit_prep.py` (dérivés du `route_type` GTFS). */
export type TransitMode = 'metro' | 'tram' | 'bus' | 'rer' | 'autre'

/** Un arrêt du jeu embarqué : nom, position, modes et indicatifs de ligne desservant ce point. */
export interface Stop {
  id: string
  nom: string
  lat: number
  lng: number
  modes: TransitMode[]
  lignes: string[]
}

/** Un arrêt proche d'un point de référence, avec sa distance calculée. */
export interface NearbyStop {
  id: string
  nom: string
  modes: TransitMode[]
  lignes: string[]
  distanceM: number
}

export interface NearestStopsOptions {
  /** Rayon de recherche en mètres. Défaut ~600 m (cf. plans/P3/S4.md T2). */
  maxDistanceM?: number
  /** Nombre maximum d'arrêts renvoyés. Défaut ~5. */
  limit?: number
}

const DEFAULT_MAX_DISTANCE_M = 600
const DEFAULT_LIMIT = 5

/**
 * Arrêts les plus proches d'un point, triés par distance croissante, dans un rayon donné.
 * Fonction **pure** : `stops` est injecté plutôt que chargé ici, pour rester testable sur un
 * mini-jeu sans dépendre du chargement paresseux du JSON (cf. `loadStops` ci-dessous pour l'usage
 * réel dans l'app).
 */
export function nearestStops(
  point: LatLng,
  stops: readonly Stop[],
  opts: NearestStopsOptions = {},
): NearbyStop[] {
  const maxDistanceM = opts.maxDistanceM ?? DEFAULT_MAX_DISTANCE_M
  const limit = opts.limit ?? DEFAULT_LIMIT

  const nearby: NearbyStop[] = []
  for (const stop of stops) {
    const distanceM = haversineKm(point, { lat: stop.lat, lng: stop.lng }) * 1000
    if (distanceM <= maxDistanceM) {
      nearby.push({ id: stop.id, nom: stop.nom, modes: stop.modes, lignes: stop.lignes, distanceM })
    }
  }

  nearby.sort((a, b) => a.distanceM - b.distanceM)
  return nearby.slice(0, limit)
}

let stopsPromise: Promise<Stop[]> | null = null

/**
 * Chargement paresseux du jeu d'arrêts (`import()` dynamique — code-splité, cf. plans/P3/S4.md
 * T2 : le JSON n'est utile que sur la fiche, il ne doit pas alourdir le bundle initial). Mémoïsé :
 * un seul fetch du chunk même si plusieurs fiches sont consultées dans la session.
 */
export function loadStops(): Promise<Stop[]> {
  if (!stopsPromise) {
    stopsPromise = import('./data/arrets.json').then((mod) => mod.default as unknown as Stop[])
  }
  return stopsPromise
}
