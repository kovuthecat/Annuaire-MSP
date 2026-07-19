import type { CSSProperties } from 'react'
import { useState } from 'react'
import { colors, radii } from '../../theme/tokens'
import type { Categorie } from '../../types/db'
import { useReference } from '../proximite/ReferenceProvider'
import type { SortOption } from './sort'

/** Ordre d'affichage de la facette « Catégorie » (cf. revue d'arbitrage 2026-07-19). */
export const CATEGORIES: readonly Categorie[] = [
  'Praticien',
  'Structure de soins',
  "Ligne d'avis",
  'Transport sanitaire',
  'Ressource',
]

/**
 * Barre de recherche + bascule Mes contacts/Tous + rangée de filtres. Filtres réduits à 3 chips à
 * forte valeur d'adressage (cf. DECISIONS.md 2026-07-18 §Filtres) : **Secteur 1 / Pédiatrie / Avis**.
 * VAD, AME/CMU, « + Nouveaux patients » et les menus Arrondissement/Profession/Tag ont été retirés
 * (marginaux, non refusables, ou plus rapides à taper dans la recherche). Les chips reprennent des
 * teintes de `colors.sector` (aucune couleur inventée).
 */
export interface FiltersBarProps {
  query: string
  onQueryChange: (value: string) => void

  mineOnly: boolean
  onMineOnlyChange: (value: boolean) => void

  secteur1: boolean
  onSecteur1Change: (value: boolean) => void
  pediatrie: boolean
  onPediatrieChange: (value: boolean) => void
  avis: boolean
  onAvisChange: (value: boolean) => void

  /** Facette « Catégorie » — `''` = toutes. */
  categorie: Categorie | ''
  onCategorieChange: (value: Categorie | '') => void

  sort: SortOption
  onSortChange: (value: SortOption) => void

  resultCount: number
}

const searchWrapperStyle: CSSProperties = {
  flex: 1,
  minWidth: 220,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  background: colors.white,
  border: `1px solid ${colors.border}`,
  borderRadius: radii.xl,
  padding: '11px 14px',
  boxShadow: '0 1px 2px rgba(0,0,0,.03)',
}

const searchInputStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  font: '500 13px "Plus Jakarta Sans"',
  color: colors.text.primary,
}

const clearButtonStyle: CSSProperties = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  padding: 2,
  lineHeight: 0,
  color: '#9a9488',
  display: 'flex',
}

const topRowStyle: CSSProperties = {
  display: 'flex',
  gap: 12,
  alignItems: 'center',
  marginBottom: 14,
  flexWrap: 'wrap',
}

const segmentedWrapperStyle: CSSProperties = {
  display: 'flex',
  background: '#f1ede4',
  borderRadius: radii.lg,
  padding: 3,
}

function segmentStyle(active: boolean): CSSProperties {
  return {
    padding: '7px 14px',
    borderRadius: radii.sm,
    font: '600 12px "Plus Jakarta Sans"',
    cursor: 'pointer',
    background: active ? '#fff' : 'transparent',
    boxShadow: active ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
    color: active ? '#1a3d5c' : colors.text.muted,
  }
}

const filtersRowStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  marginBottom: 16,
  flexWrap: 'wrap',
  alignItems: 'center',
}

const filtersLabelStyle: CSSProperties = {
  font: '500 11px "Plus Jakarta Sans"',
  color: colors.text.muted,
}

const chipBaseStyle: CSSProperties = {
  padding: '7px 13px',
  borderRadius: radii.md,
  border: 'none',
  cursor: 'pointer',
}

const chipInactiveStyle: CSSProperties = {
  ...chipBaseStyle,
  font: '600 12px "Plus Jakarta Sans"',
  color: colors.text.secondary,
  background: '#ece7dd',
}

function chipActiveStyle(fg: string, bg: string): CSSProperties {
  return {
    ...chipBaseStyle,
    font: '600 12px "Plus Jakarta Sans"',
    color: fg,
    background: bg,
  }
}

/** Cartouche englobant la zone de filtres, pour la rendre plus grande et visible. */
const filtersCardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  background: colors.white,
  border: `1px solid ${colors.borderLight}`,
  borderRadius: radii.xl,
  padding: '12px 14px',
  marginBottom: 14,
}

/** Pastille de catégorie active (sélection unique) : bleu de marque plein. */
const catChipActiveStyle: CSSProperties = {
  ...chipBaseStyle,
  font: '600 12px "Plus Jakarta Sans"',
  color: colors.white,
  background: colors.brand.blue,
}

/** Rangée « Distances depuis / résultats / tri », sous le cartouche de filtres. */
const referenceBarStyle: CSSProperties = {
  display: 'flex',
  gap: 12,
  marginBottom: 16,
  flexWrap: 'wrap',
  alignItems: 'center',
}

const resultCountStyle: CSSProperties = {
  marginLeft: 'auto',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  font: '500 11px "Plus Jakarta Sans"',
  color: colors.text.muted,
}

const sortSelectStyle: CSSProperties = {
  border: 'none',
  outline: 'none',
  background: 'transparent',
  cursor: 'pointer',
  font: '500 11px "Plus Jakarta Sans"',
  color: colors.text.muted,
}

// ---------------------------------------------------------------------------
// Sélecteur de référence (plans/P3/S2.md T4 étape 3) — « Distances depuis : MSP ▾ / Autre
// adresse… ». État transitoire, jamais persisté (RGPD) : rappel discret quand une adresse patient
// est active.
// ---------------------------------------------------------------------------

const referenceRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
}

const referenceLabelStyle: CSSProperties = {
  font: '500 11px "Plus Jakarta Sans"',
  color: colors.text.muted,
}

const referenceLinkStyle: CSSProperties = {
  border: 'none',
  background: 'none',
  padding: 0,
  cursor: 'pointer',
  font: '600 11px "Plus Jakarta Sans"',
  color: colors.brand.blue,
  textDecoration: 'underline',
}

const referenceHintStyle: CSSProperties = {
  font: '500 10.5px "Plus Jakarta Sans"',
  color: colors.text.faint,
}

const referenceInputStyle: CSSProperties = {
  border: `1px solid ${colors.border}`,
  borderRadius: radii.sm,
  padding: '4px 8px',
  font: '500 11px "Plus Jakarta Sans"',
  color: colors.text.primary,
  minWidth: 180,
}

const referenceButtonStyle: CSSProperties = {
  border: 'none',
  borderRadius: radii.sm,
  padding: '4px 10px',
  cursor: 'pointer',
  font: '600 11px "Plus Jakarta Sans"',
  color: '#fff',
  background: colors.brand.blue,
}

const referenceGhostButtonStyle: CSSProperties = {
  ...referenceLinkStyle,
  color: colors.text.muted,
  textDecoration: 'none',
}

const referenceErrorStyle: CSSProperties = {
  font: '600 11px "Plus Jakarta Sans"',
  color: colors.sector.ame.fg,
}

function ReferenceSelector() {
  const { reference, isPatientAddress, setPatientAddress, resetToMSP } = useReference()
  const [editing, setEditing] = useState(false)
  const [addressInput, setAddressInput] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startEditing = () => {
    setEditing(true)
    setError(null)
    setAddressInput('')
  }

  const cancelEditing = () => {
    setEditing(false)
    setError(null)
    setAddressInput('')
  }

  const handleSubmit = async () => {
    if (!addressInput.trim()) return
    setPending(true)
    setError(null)
    const ok = await setPatientAddress(addressInput)
    setPending(false)
    if (ok) {
      setEditing(false)
      setAddressInput('')
    } else {
      setError('Adresse introuvable.')
    }
  }

  if (editing) {
    return (
      <span style={referenceRowStyle}>
        <input
          type="text"
          value={addressInput}
          onChange={(e) => setAddressInput(e.target.value)}
          placeholder="Adresse du patient…"
          style={referenceInputStyle}
          aria-label="Adresse de référence pour les distances"
        />
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={pending}
          style={referenceButtonStyle}
        >
          {pending ? 'Recherche…' : 'Valider'}
        </button>
        <button type="button" onClick={cancelEditing} style={referenceGhostButtonStyle}>
          Annuler
        </button>
        {error && <span style={referenceErrorStyle}>{error}</span>}
      </span>
    )
  }

  return (
    <span style={referenceRowStyle}>
      <span style={referenceLabelStyle}>
        Distances depuis :{' '}
        <strong style={{ color: colors.text.secondary }}>
          {isPatientAddress ? reference.label : 'MSP'}
        </strong>
      </span>
      <button type="button" onClick={startEditing} style={referenceLinkStyle}>
        Autre adresse…
      </button>
      {isPatientAddress && (
        <>
          <button type="button" onClick={resetToMSP} style={referenceLinkStyle}>
            Revenir à la MSP
          </button>
          <span style={referenceHintStyle}>Adresse non enregistrée</span>
        </>
      )}
    </span>
  )
}

interface BoolChipProps {
  label: string
  active: boolean
  onToggle: () => void
  fg: string
  bg: string
}

function BoolChip({ label, active, onToggle, fg, bg }: BoolChipProps) {
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onToggle()
      }}
      style={active ? chipActiveStyle(fg, bg) : chipInactiveStyle}
    >
      {label}
    </span>
  )
}

/** Pastille de catégorie (sélection unique parmi les 5 : un clic sélectionne, un 2e efface). */
function CatChip({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onToggle()
      }}
      style={active ? catChipActiveStyle : chipInactiveStyle}
    >
      {label}
    </span>
  )
}

export default function FiltersBar({
  query,
  onQueryChange,
  mineOnly,
  onMineOnlyChange,
  secteur1,
  onSecteur1Change,
  pediatrie,
  onPediatrieChange,
  avis,
  onAvisChange,
  categorie,
  onCategorieChange,
  sort,
  onSortChange,
  resultCount,
}: FiltersBarProps) {
  return (
    <div>
      <style>{`.annuaire-search-input::placeholder { color: #9a9488; }`}</style>
      <div style={topRowStyle}>
        <div style={searchWrapperStyle}>
          <svg width="16" height="16" viewBox="0 0 16 16">
            <circle cx="7" cy="7" r="5" fill="none" stroke="#9a9488" strokeWidth="1.6" />
            <line x1="11" y1="11" x2="15" y2="15" stroke="#9a9488" strokeWidth="1.6" />
          </svg>
          <input
            className="annuaire-search-input"
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Rechercher un nom, une spécialité, un tag, un commentaire…"
            style={searchInputStyle}
          />
          {query !== '' && (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              style={clearButtonStyle}
              aria-label="Effacer la recherche"
              title="Effacer"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <line x1="3.5" y1="3.5" x2="10.5" y2="10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <line x1="10.5" y1="3.5" x2="3.5" y2="10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
        <div style={segmentedWrapperStyle}>
          <div onClick={() => onMineOnlyChange(true)} style={segmentStyle(mineOnly)}>
            Mes contacts
          </div>
          <div onClick={() => onMineOnlyChange(false)} style={segmentStyle(!mineOnly)}>
            Tous
          </div>
        </div>
      </div>

      <div style={filtersCardStyle}>
        <div style={{ ...filtersRowStyle, marginBottom: 0 }}>
          <span style={filtersLabelStyle}>Filtres</span>
          <BoolChip
            label="Secteur 1"
            active={secteur1}
            onToggle={() => onSecteur1Change(!secteur1)}
            fg={colors.sector.secteur1.fg}
            bg={colors.sector.secteur1.bg}
          />
          <BoolChip
            label="Pédiatrie"
            active={pediatrie}
            onToggle={() => onPediatrieChange(!pediatrie)}
            fg={colors.sector.pediatrie.fg}
            bg={colors.sector.pediatrie.bg}
          />
          <BoolChip
            label="Avis"
            active={avis}
            onToggle={() => onAvisChange(!avis)}
            fg={colors.sector.avis.fg}
            bg={colors.sector.avis.bg}
          />
        </div>
        <div style={{ ...filtersRowStyle, marginBottom: 0 }}>
          <span style={filtersLabelStyle}>Catégorie</span>
          {CATEGORIES.map((c) => (
            <CatChip
              key={c}
              label={c}
              active={categorie === c}
              onToggle={() => onCategorieChange(categorie === c ? '' : c)}
            />
          ))}
        </div>
      </div>

      <div style={referenceBarStyle}>
        <ReferenceSelector />
        <span style={resultCountStyle}>
          {resultCount} résultat{resultCount !== 1 ? 's' : ''} · Tri
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            style={sortSelectStyle}
            aria-label="Trier les résultats"
          >
            <option value="pertinence">Pertinence</option>
            <option value="nom">Nom (A→Z)</option>
            <option value="arrondissement">Arrondissement</option>
            <option value="distance">Distance</option>
          </select>
        </span>
      </div>
    </div>
  )
}
