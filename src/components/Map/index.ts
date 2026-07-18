import { lazy } from 'react'

/**
 * Point d'entrée « lazy » de la carte (plans/P3/S3.md T1 étape 1) : Leaflet + react-leaflet ne
 * sont chargés que lorsqu'un écran affiche effectivement une carte (panneau carte de l'annuaire
 * ouvert, ou fiche avec coordonnées) — pas dans le bundle initial. Les appelants doivent envelopper
 * `<ProximityMap>` dans un `<Suspense fallback={…}>`.
 */
export const ProximityMap = lazy(() => import('./ProximityMap'))

export type { MapPoint, MapPointKind } from './ProximityMap'
