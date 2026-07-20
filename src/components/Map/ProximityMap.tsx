import type { CSSProperties } from 'react'
import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { divIcon, latLngBounds } from 'leaflet'
import type { DivIcon } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { colors, radii } from '../../theme/tokens'
import type { LatLng } from '../../features/proximite/geo'

/**
 * Carte Leaflet réutilisable (plans/P3/S3.md T1) — un seul composant partagé par l'annuaire (carte
 * unique de tous les résultats filtrés, S3 T2) et la fiche (praticien + MSP, S3 T3). Chargé en
 * lazy (cf. `./index.ts` + `React.lazy`) pour ne pas embarquer Leaflet dans le bundle initial.
 *
 * **Piège des icônes par défaut** (cf. plan §Si bloqué) : le marqueur PNG par défaut de Leaflet
 * casse avec les bundlers (chemins d'images non résolus). On utilise ici un `divIcon` maison
 * (SVG inline) — aucun asset externe.
 */

export type MapPointKind = 'msp' | 'reference' | 'contact'

export interface MapPoint {
  id: string
  coords: LatLng
  label: string
  kind: MapPointKind
}

interface ProximityMapProps {
  points: MapPoint[]
  /** Épingle mise en évidence (annuaire : lien carte → ligne survolée/sélectionnée). */
  activeId?: string
  /** Clic sur une épingle (annuaire : sélectionne/scrolle la ligne correspondante). */
  onSelect?: (id: string) => void
  /** Cadre automatiquement la vue sur l'ensemble des points (défaut : oui). */
  fitToPoints?: boolean
  /** Hauteur de la carte en px (le rayon des bords vient des tokens, pas la hauteur). */
  height?: number
}

const MARKER_COLOR: Record<MapPointKind, string> = {
  msp: colors.brand.teal,
  reference: colors.brand.blue,
  contact: colors.text.body,
}

/** Épingle SVG maison — évite le piège de l'icône PNG par défaut de Leaflet (cf. en-tête). */
function markerIcon(kind: MapPointKind, active: boolean): DivIcon {
  const color = MARKER_COLOR[kind]
  const size = active ? 30 : 24
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 1c-5 0-9 3.8-9 8.6 0 6 9 13.4 9 13.4s9-7.4 9-13.4C21 4.8 17 1 12 1z"
            fill="${color}" stroke="#ffffff" stroke-width="1.4" />
      <circle cx="12" cy="9.6" r="3.2" fill="#ffffff" />
    </svg>
  `
  return divIcon({
    html: svg,
    className: 'proximity-map-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  })
}

/** Cadre la carte sur l'ensemble des points (ou centre sur l'épingle active) — doit vivre sous
 * `<MapContainer>` pour accéder à l'instance Leaflet via `useMap`. */
function FitBounds({
  points,
  fitToPoints,
  activeId,
}: {
  points: MapPoint[]
  fitToPoints: boolean
  activeId?: string
}) {
  const map = useMap()

  useEffect(() => {
    if (!fitToPoints || points.length === 0) return
    if (points.length === 1) {
      map.setView([points[0].coords.lat, points[0].coords.lng], 15)
      return
    }
    const bounds = latLngBounds(points.map((p) => [p.coords.lat, p.coords.lng]))
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 16 })
    // Volontairement pas de dépendance sur `fitToPoints`/`map` : un changement de référence ou de
    // résultats filtrés (donc de `points`) doit ré-encadrer la vue ; `fitToPoints`/`map` sont
    // stables tant que le composant est monté.
  }, [points])

  useEffect(() => {
    if (!activeId) return
    const active = points.find((p) => p.id === activeId)
    if (active) map.panTo([active.coords.lat, active.coords.lng])
  }, [map, points, activeId])

  return null
}

function wrapperStyle(height: number): CSSProperties {
  return {
    height,
    borderRadius: radii.xl,
    overflow: 'hidden',
    border: `1px solid ${colors.borderLight}`,
    // Contexte d'empilement (retours V1 2026-07-20) : Leaflet donne à ses panneaux internes des
    // z-index élevés (tuiles 200, marqueurs 600, contrôles 800). Sans contexte propre, ils vivent
    // dans le contexte racine et passaient AU-DESSUS de la barre de navigation basse fixe (z-index
    // 40) au défilement. `position:relative` + `zIndex:0` les confine sous la carte.
    position: 'relative',
    zIndex: 0,
  }
}

export default function ProximityMap({
  points,
  activeId,
  onSelect,
  fitToPoints = true,
  height = 320,
}: ProximityMapProps) {
  // Aucun point → pas de carte (cf. plan T1 §Étapes) ; le message « position à préciser » ou « N
  // sans position » est de la responsabilité de l'écran appelant (annuaire/fiche).
  if (points.length === 0) return null

  const center = points[0].coords

  return (
    <div style={wrapperStyle(height)}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} fitToPoints={fitToPoints} activeId={activeId} />
        {points.map((point) => (
          <Marker
            key={point.id}
            position={[point.coords.lat, point.coords.lng]}
            icon={markerIcon(point.kind, point.id === activeId)}
            eventHandlers={onSelect ? { click: () => onSelect(point.id) } : undefined}
          >
            <Popup>{point.label}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
