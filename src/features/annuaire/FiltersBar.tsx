import type { CSSProperties } from 'react'
import { colors, radii } from '../../theme/tokens'
import type { SortOption } from './sort'

/**
 * Barre de recherche + bascule Mes contacts/Tous + rangée de filtres (maquette lignes 67-85).
 * Les chips booléens (Secteur 1/VAD/AME-CMU/+Nouveaux patients) reprennent les couleurs
 * sémantiques exactes de la capture (cf. `colors.sector`) ; les 3 sélecteurs (Arrondissement,
 * Profession, Tag) sont un ajout de câblage (ARCHITECTURE.md §Écarts #5 — absents des bindings
 * réels du prototype, qui n'affichait qu'un texte statique) : même style de chip au repos, texte
 * plus foncé une fois une valeur choisie (pas de couleur sémantique dédiée dans la maquette).
 */
export interface FiltersBarProps {
  query: string
  onQueryChange: (value: string) => void

  mineOnly: boolean
  onMineOnlyChange: (value: boolean) => void

  secteur1: boolean
  onSecteur1Change: (value: boolean) => void
  vad: boolean
  onVadChange: (value: boolean) => void
  ameCmu: boolean
  onAmeCmuChange: (value: boolean) => void
  nouveauxPatients: boolean
  onNouveauxPatientsChange: (value: boolean) => void

  arrondissement: string
  onArrondissementChange: (value: string) => void
  arrondissementOptions: string[]

  profession: string
  onProfessionChange: (value: string) => void
  professionOptions: string[]

  tag: string
  onTagChange: (value: string) => void
  tagOptions: string[]

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
  padding: '5px 10px',
  borderRadius: radii.sm,
  border: 'none',
  cursor: 'pointer',
}

const chipInactiveStyle: CSSProperties = {
  ...chipBaseStyle,
  font: '500 11px "Plus Jakarta Sans"',
  color: colors.text.muted,
  background: '#f1ede4',
}

function chipActiveStyle(fg: string, bg: string): CSSProperties {
  return {
    ...chipBaseStyle,
    font: '600 11px "Plus Jakarta Sans"',
    color: fg,
    background: bg,
  }
}

function selectChipStyle(active: boolean): CSSProperties {
  return {
    ...chipBaseStyle,
    font: `${active ? 600 : 500} 11px "Plus Jakarta Sans"`,
    color: active ? colors.text.primary : colors.text.muted,
    background: '#f1ede4',
  }
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

export default function FiltersBar({
  query,
  onQueryChange,
  mineOnly,
  onMineOnlyChange,
  secteur1,
  onSecteur1Change,
  vad,
  onVadChange,
  ameCmu,
  onAmeCmuChange,
  nouveauxPatients,
  onNouveauxPatientsChange,
  arrondissement,
  onArrondissementChange,
  arrondissementOptions,
  profession,
  onProfessionChange,
  professionOptions,
  tag,
  onTagChange,
  tagOptions,
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

      <div style={filtersRowStyle}>
        <span style={filtersLabelStyle}>Filtres :</span>
        <BoolChip
          label="Secteur 1"
          active={secteur1}
          onToggle={() => onSecteur1Change(!secteur1)}
          fg={colors.sector.secteur1.fg}
          bg={colors.sector.secteur1.bg}
        />
        <BoolChip
          label="VAD"
          active={vad}
          onToggle={() => onVadChange(!vad)}
          fg={colors.sector.vad.fg}
          bg={colors.sector.vad.bg}
        />
        <BoolChip
          label="AME/CMU"
          active={ameCmu}
          onToggle={() => onAmeCmuChange(!ameCmu)}
          fg={colors.sector.ame.fg}
          bg={colors.sector.ame.bg}
        />
        <BoolChip
          label="+ Nouveaux patients"
          active={nouveauxPatients}
          onToggle={() => onNouveauxPatientsChange(!nouveauxPatients)}
          fg={colors.sector.newpatients.fg}
          bg={colors.sector.newpatients.bg}
        />

        <select
          value={arrondissement}
          onChange={(e) => onArrondissementChange(e.target.value)}
          style={selectChipStyle(arrondissement !== '')}
          aria-label="Filtrer par arrondissement"
        >
          <option value="">Arrondissement</option>
          {arrondissementOptions.map((value) => (
            <option key={value} value={value}>
              {value} arr.
            </option>
          ))}
        </select>

        <select
          value={profession}
          onChange={(e) => onProfessionChange(e.target.value)}
          style={selectChipStyle(profession !== '')}
          aria-label="Filtrer par profession/spécialité"
        >
          <option value="">Profession / spécialité</option>
          {professionOptions.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>

        <select
          value={tag}
          onChange={(e) => onTagChange(e.target.value)}
          style={selectChipStyle(tag !== '')}
          aria-label="Filtrer par tag"
        >
          <option value="">Tag</option>
          {tagOptions.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>

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
          </select>
        </span>
      </div>
    </div>
  )
}
