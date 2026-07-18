import type { CSSProperties } from 'react'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDirectory } from '../../data/DirectoryProvider'
import { useSelection } from '../../app/SelectionProvider'
import { useReference } from '../proximite/ReferenceProvider'
import { MSP_COORDS, coordsOf } from '../proximite/geo'
import { filterContacts, queryTerms } from '../../data/search'
import type { ContactFilters } from '../../data/search'
import { Button } from '../../components/ui'
import { ProximityMap } from '../../components/Map'
import type { MapPoint } from '../../components/Map'
import { colors, radii } from '../../theme/tokens'
import ContactRow from './ContactRow'
import FiltersBar from './FiltersBar'
import { sortContacts } from './sort'
import type { SortOption } from './sort'

/**
 * Écran Annuaire (maquette lignes 64-162, cf. plans/P1/S3.md T6) : recherche + filtres 100 % côté
 * client via `filterContacts` (S2, non modifié), bascule Mes contacts/Tous, sélection d'impression
 * partagée via `SelectionProvider`. Le dataset est chargé une fois par `DirectoryProvider`.
 */

const pageStyle: CSSProperties = {
  padding: '24px 28px 90px',
  maxWidth: 980,
  margin: '0 auto',
}

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

const messageCardStyle: CSSProperties = {
  minHeight: '30vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 14,
  textAlign: 'center',
  background: colors.white,
  border: `1px solid ${colors.borderLight}`,
  borderRadius: radii.xxl,
  padding: '40px 24px',
}

const messageTitleStyle: CSSProperties = {
  font: '700 14px "Plus Jakarta Sans"',
  color: colors.text.primary,
}

const messageBodyStyle: CSSProperties = {
  font: '500 12.5px "Plus Jakarta Sans"',
  color: colors.text.secondary,
  maxWidth: 360,
}

// ---------------------------------------------------------------------------
// Panneau carte (plans/P3/S3.md T2) — une carte unique pour tout l'écran (pas une mini-carte par
// ligne, cf. §Décision clé perf), repliée par défaut (la liste prime, cf. ARCHITECTURE §Contraintes
// UI). Chargée en lazy (`components/Map`) : Leaflet n'entre dans le bundle que si le panneau
// s'ouvre.
// ---------------------------------------------------------------------------

const mapToggleRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginBottom: 14,
}

const mapHintStyle: CSSProperties = {
  font: '500 11px "Plus Jakarta Sans"',
  color: colors.text.faint,
}

const mapPanelStyle: CSSProperties = {
  marginBottom: 14,
}

const mapLoadingStyle: CSSProperties = {
  height: 320,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: colors.white,
  border: `1px solid ${colors.borderLight}`,
  borderRadius: radii.xl,
  font: '500 12.5px "Plus Jakarta Sans"',
  color: colors.text.secondary,
}

export default function AnnuairePage() {
  const { contacts, loading, error, reload, adoptContact, unadoptContact } = useDirectory()
  const { selectedIds, toggle } = useSelection()
  const { reference, isPatientAddress } = useReference()
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  // Mes contacts actif par défaut (cf. maquette — état initial `mesContacts: true`).
  const [mineOnly, setMineOnly] = useState(true)
  // Filtres réduits à 3 chips à forte valeur d'adressage (cf. DECISIONS.md 2026-07-18 §Filtres).
  const [secteur1, setSecteur1] = useState(false)
  const [pediatrie, setPediatrie] = useState(false)
  const [avis, setAvis] = useState(false)
  const [sort, setSort] = useState<SortOption>('pertinence')
  // Panneau carte : replié par défaut (mobile ET desktop, cf. plan T2 étape 3 — la liste prime).
  const [mapOpen, setMapOpen] = useState(false)
  // Épingle cliquée → ligne mise en évidence (plan T2 étape 2, « au minimum épingle → ligne »).
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  const filters: ContactFilters = useMemo(
    () => ({
      mineOnly,
      secteurConv: secteur1 ? '1' : undefined,
      pediatrie: pediatrie || undefined,
      avis: avis || undefined,
    }),
    [mineOnly, secteur1, pediatrie, avis],
  )

  const filtered = useMemo(() => filterContacts(contacts, query, filters), [contacts, query, filters])
  // Mots de la requête, surlignés dans chaque ligne de résultat (cf. Highlight).
  const terms = useMemo(() => queryTerms(query), [query])
  // La référence n'est utilisée que par le tri "distance" et `query` que par "pertinence" (cf.
  // sort.ts) mais toujours passées — recalcule au changement de référence/requête/tri.
  const sorted = useMemo(
    () => sortContacts(filtered, sort, reference.coords, query),
    [filtered, sort, reference, query],
  )

  // Carte partagée (plans/P3/S3.md T2 étape 1) : MSP + référence active (si ≠ MSP) + les résultats
  // filtrés ayant des coordonnées. Les contacts sans coordonnées sont exclus (comptés à part).
  const mapPoints = useMemo<MapPoint[]>(() => {
    const points: MapPoint[] = [{ id: 'msp', coords: MSP_COORDS, label: 'MSP', kind: 'msp' }]
    if (isPatientAddress) {
      points.push({ id: 'reference', coords: reference.coords, label: reference.label, kind: 'reference' })
    }
    for (const contact of sorted) {
      const coords = coordsOf(contact)
      if (coords) points.push({ id: contact.id, coords, label: contact.nom, kind: 'contact' })
    }
    return points
  }, [sorted, reference, isPatientAddress])

  const contactsWithoutCoords = useMemo(
    () => sorted.filter((contact) => !coordsOf(contact)).length,
    [sorted],
  )

  // Épingle → ligne (plan T2 étape 2) : scrolle et met en évidence la ligne correspondante.
  useEffect(() => {
    if (!highlightedId) return
    const row = document.getElementById(`contact-row-${highlightedId}`)
    row?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlightedId])

  const hasActiveFilters = query !== '' || secteur1 || pediatrie || avis

  const resetFilters = () => {
    setQuery('')
    setSecteur1(false)
    setPediatrie(false)
    setAvis(false)
  }

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={messageCardStyle}>
          <div style={messageTitleStyle}>Chargement de l'annuaire…</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <div style={messageCardStyle}>
          <div style={messageTitleStyle}>Impossible de charger l'annuaire</div>
          <div style={messageBodyStyle}>{error}</div>
          <Button variant="outline" onClick={() => void reload()}>
            Réessayer
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      <FiltersBar
        query={query}
        onQueryChange={setQuery}
        mineOnly={mineOnly}
        onMineOnlyChange={setMineOnly}
        secteur1={secteur1}
        onSecteur1Change={setSecteur1}
        pediatrie={pediatrie}
        onPediatrieChange={setPediatrie}
        avis={avis}
        onAvisChange={setAvis}
        sort={sort}
        onSortChange={setSort}
        resultCount={sorted.length}
      />

      <div style={mapToggleRowStyle}>
        <Button variant="outline" onClick={() => setMapOpen((v) => !v)}>
          {mapOpen ? 'Masquer la carte' : 'Afficher la carte'}
        </Button>
        {contactsWithoutCoords > 0 && (
          <span style={mapHintStyle}>{contactsWithoutCoords} sans position</span>
        )}
      </div>

      {mapOpen && (
        <div style={mapPanelStyle}>
          <Suspense fallback={<div style={mapLoadingStyle}>Chargement de la carte…</div>}>
            <ProximityMap
              points={mapPoints}
              activeId={highlightedId ?? undefined}
              onSelect={setHighlightedId}
            />
          </Suspense>
        </div>
      )}

      {sorted.length === 0 ? (
        contacts.length === 0 ? (
          <div style={messageCardStyle}>
            <div style={messageTitleStyle}>Aucun contact pour l'instant</div>
            <div style={messageBodyStyle}>
              Commencez par en ajouter un — la fiche est rapide à créer, vous pourrez la compléter
              plus tard.
            </div>
            <Button variant="primary" onClick={() => navigate('/nouveau')}>
              + Ajouter un contact
            </Button>
          </div>
        ) : (
          <div style={messageCardStyle}>
            <div style={messageTitleStyle}>Aucun résultat</div>
            <div style={messageBodyStyle}>
              {mineOnly
                ? 'Aucun contact dans « Mes contacts » pour cette recherche ou ces filtres.'
                : `Aucun contact ne correspond à cette recherche${hasActiveFilters ? ' ou ces filtres' : ''}.`}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {mineOnly && (
                <Button variant="outline" onClick={() => setMineOnly(false)}>
                  Voir tous les contacts
                </Button>
              )}
              {hasActiveFilters && (
                <Button variant="outline" onClick={resetFilters}>
                  Réinitialiser les filtres
                </Button>
              )}
            </div>
          </div>
        )
      ) : (
        <div style={listStyle}>
          {sorted.map((contact) => (
            <div key={contact.id} id={`contact-row-${contact.id}`}>
              <ContactRow
                contact={contact}
                selected={selectedIds.has(contact.id)}
                highlighted={highlightedId === contact.id}
                queryTerms={terms}
                onToggleSelect={() => toggle(contact.id)}
                onToggleStar={() =>
                  void (contact.starred ? unadoptContact(contact.id) : adoptContact(contact.id))
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
