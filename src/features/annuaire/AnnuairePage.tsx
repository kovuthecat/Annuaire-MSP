import type { CSSProperties } from 'react'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDirectory } from '../../data/DirectoryProvider'
import { useSelection } from '../../app/SelectionProvider'
import { useSessionState } from '../../app/useSessionState'
import { useIsMobile } from '../../app/useMediaQuery'
import { useReference } from '../proximite/ReferenceProvider'
import { MSP_COORDS, MAP_FIT_RADIUS_KM, coordsOf, haversineKm } from '../proximite/geo'
import { filterContacts, queryTerms } from '../../data/search'
import type { ContactFilters } from '../../data/search'
import type { Categorie } from '../../types/db'
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
  const isMobile = useIsMobile()

  // État de recherche persisté en session (cf. useSessionState) : ouvrir une fiche puis revenir
  // (bouton Retour ou navigation arrière) remonte l'annuaire — sans persistance, tous les critères
  // seraient à ressaisir. Survit aussi à un rechargement d'onglet.
  const [query, setQuery] = useSessionState('search:query', '')
  // Mes contacts actif par défaut (cf. maquette — état initial `mesContacts: true`).
  const [mineOnly, setMineOnly] = useSessionState('search:mineOnly', true)
  // Filtres réduits à 3 chips à forte valeur d'adressage (cf. DECISIONS.md 2026-07-18 §Filtres).
  const [secteur1, setSecteur1] = useSessionState('search:secteur1', false)
  const [pediatrie, setPediatrie] = useSessionState('search:pediatrie', false)
  // Chip « À compléter » (audit pré-partage #9) : oriente vers les fiches grisées `incomplet` pour
  // l'enrichissement collaboratif (cf. DECISIONS.md §Filtres — même logique que secteur1/pediatrie).
  const [incomplet, setIncomplet] = useSessionState('search:incomplet', false)
  // Facette « Catégorie » (Praticien / Structure / Ligne d'avis / Transport / Ressource).
  const [categorie, setCategorie] = useSessionState<Categorie | ''>('search:categorie', '')
  const [sort, setSort] = useSessionState<SortOption>('search:sort', 'pertinence')
  // Panneau carte : replié par défaut (mobile ET desktop, cf. plan T2 étape 3 — la liste prime).
  const [mapOpen, setMapOpen] = useState(false)
  // Épingle cliquée → ligne mise en évidence (plan T2 étape 2, « au minimum épingle → ligne »).
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  const filters: ContactFilters = useMemo(
    () => ({
      mineOnly,
      secteurConv: secteur1 ? '1' : undefined,
      pediatrie: pediatrie || undefined,
      incomplet: incomplet || undefined,
      categorie: categorie || undefined,
    }),
    [mineOnly, secteur1, pediatrie, incomplet, categorie],
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
  // Audit pré-partage #9 : les contacts géocodés à plus de `MAP_FIT_RADIUS_KM` de la MSP sont eux
  // aussi exclus de la carte (pas seulement du cadrage) — une poignée de fiches réellement
  // éloignées forçait `fitBounds` à dézoomer sur toute l'Europe, rendant la carte inutilisable pour
  // repérer les correspondants proches. Comptées à part (`contactsOutsideMapRadius`) pour rester
  // visibles dans la liste, jamais silencieusement perdues.
  const mapPoints = useMemo<MapPoint[]>(() => {
    const points: MapPoint[] = [{ id: 'msp', coords: MSP_COORDS, label: 'MSP', kind: 'msp' }]
    if (isPatientAddress) {
      points.push({ id: 'reference', coords: reference.coords, label: reference.label, kind: 'reference' })
    }
    for (const contact of sorted) {
      const coords = coordsOf(contact)
      if (coords && haversineKm(coords, MSP_COORDS) <= MAP_FIT_RADIUS_KM) {
        points.push({ id: contact.id, coords, label: contact.nom, kind: 'contact' })
      }
    }
    return points
  }, [sorted, reference, isPatientAddress])

  const contactsWithoutCoords = useMemo(
    () => sorted.filter((contact) => !coordsOf(contact)).length,
    [sorted],
  )

  const contactsOutsideMapRadius = useMemo(
    () =>
      sorted.filter((contact) => {
        const coords = coordsOf(contact)
        return coords !== null && haversineKm(coords, MSP_COORDS) > MAP_FIT_RADIUS_KM
      }).length,
    [sorted],
  )

  // Épingle → ligne (plan T2 étape 2) : scrolle et met en évidence la ligne correspondante.
  useEffect(() => {
    if (!highlightedId) return
    const row = document.getElementById(`contact-row-${highlightedId}`)
    row?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlightedId])

  const hasActiveFilters = query !== '' || secteur1 || pediatrie || incomplet || categorie !== ''

  const resetFilters = () => {
    setQuery('')
    setSecteur1(false)
    setPediatrie(false)
    setIncomplet(false)
    setCategorie('')
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
        incomplet={incomplet}
        onIncompletChange={setIncomplet}
        categorie={categorie}
        onCategorieChange={setCategorie}
        sort={sort}
        onSortChange={setSort}
        resultCount={sorted.length}
        isMobile={isMobile}
      />

      <div style={mapToggleRowStyle}>
        <Button variant="outline" onClick={() => setMapOpen((v) => !v)}>
          {mapOpen ? 'Masquer la carte' : 'Afficher la carte'}
        </Button>
        {contactsWithoutCoords > 0 && (
          <span style={mapHintStyle}>
            {contactsWithoutCoords} fiche{contactsWithoutCoords > 1 ? 's' : ''} sans adresse localisée
          </span>
        )}
        {contactsOutsideMapRadius > 0 && (
          <span style={mapHintStyle}>
            {contactsOutsideMapRadius} fiche{contactsOutsideMapRadius > 1 ? 's' : ''} trop loin de Paris
            pour la carte (&gt; {MAP_FIT_RADIUS_KM} km)
          </span>
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
        ) : mineOnly && !hasActiveFilters ? (
          // Premier login (audit pré-partage #8) : « Mes contacts » vide, sans recherche ni filtre
          // → message d'accueil plutôt qu'un « Aucun résultat » trompeur.
          <div style={messageCardStyle}>
            <div style={messageTitleStyle}>Bienvenue dans l'annuaire de la MSP</div>
            <div style={messageBodyStyle}>
              Votre liste « Mes contacts » est encore vide. Basculez sur « Tous » pour explorer
              l'annuaire partagé, puis ajoutez à votre liste les fiches que vous utilisez le plus.
            </div>
            <Button variant="primary" onClick={() => setMineOnly(false)}>
              Voir tous les contacts
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
                isMobile={isMobile}
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
