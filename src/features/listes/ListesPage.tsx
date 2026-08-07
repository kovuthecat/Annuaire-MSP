import type { CSSProperties } from 'react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { usePrintLists } from '../../data/PrintListsProvider'
import { useSelection } from '../../app/SelectionProvider'
import { useSessionState } from '../../app/useSessionState'
import { Button, TextField } from '../../components/ui'
import StarToggle from '../../components/StarToggle'
import { colors, radii } from '../../theme/tokens'
import { formatDate } from '../fiche/format'

/**
 * Écran Listes d'impression (favorites, nommées) : bascule Mes listes/Toutes (même segmented control
 * que FiltersBar.mineOnly), création à partir de la sélection d'impression courante
 * (`useSelection`), favori par membre (même principe que `StarToggle` sur les contacts).
 * Distinct de « Sélection & impression » (panier de travail transitoire, non nommé) : une liste ici
 * est nommée, partagée, réutilisable dans le temps (cf. `src/data/printLists.ts`).
 */

const pageStyle: CSSProperties = {
  padding: '24px 28px 60px',
  maxWidth: 780,
  margin: '0 auto',
}

const headerRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  marginBottom: 16,
  flexWrap: 'wrap',
}

const titleStyle: CSSProperties = {
  font: '800 18px "Plus Jakarta Sans"',
  color: colors.text.primary,
  flex: 1,
  minWidth: 160,
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

const newListCardStyle: CSSProperties = {
  background: colors.white,
  border: `1px solid ${colors.borderLight}`,
  borderRadius: radii.xl,
  padding: '14px 16px',
  marginBottom: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

const newListRowStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  alignItems: 'flex-end',
}

const newListFieldStyle: CSSProperties = { flex: 1 }

const newListHintStyle: CSSProperties = {
  font: '500 11.5px "Plus Jakarta Sans"',
  color: colors.text.muted,
}

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  background: colors.white,
  border: `1px solid ${colors.borderLight}`,
  borderRadius: radii.xl,
  padding: '12px 14px',
}

const rowMainStyle: CSSProperties = { flex: 1, minWidth: 0 }

const rowNameStyle: CSSProperties = {
  font: '700 13px "Plus Jakarta Sans"',
  color: colors.text.primary,
  textDecoration: 'none',
  display: 'block',
}

const rowMetaStyle: CSSProperties = {
  font: '500 11.5px "Plus Jakarta Sans"',
  color: colors.text.muted,
  marginTop: 2,
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
  maxWidth: 380,
}

export default function ListesPage() {
  const { lists, loading, error, reload, createPrintList, favoritePrintList, unfavoritePrintList } =
    usePrintLists()
  const { selectedIds, count: selectionCount } = useSelection()
  const navigate = useNavigate()

  const [mineOnly, setMineOnly] = useSessionState('listes:mineOnly', true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const filtered = useMemo(
    () => (mineOnly ? lists.filter((l) => l.isMine) : lists),
    [lists, mineOnly],
  )

  const startCreating = () => {
    setCreating(true)
    setNewName('')
    setCreateError(null)
  }

  const cancelCreating = () => {
    setCreating(false)
    setNewName('')
    setCreateError(null)
  }

  const submitCreate = async () => {
    const name = newName.trim()
    if (!name) return
    setSaving(true)
    setCreateError(null)
    try {
      const id = await createPrintList(name, [...selectedIds])
      setCreating(false)
      setNewName('')
      navigate(`/listes/${id}`)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Impossible de créer la liste.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={messageCardStyle}>
          <div style={messageTitleStyle}>Chargement des listes…</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <div style={messageCardStyle}>
          <div style={messageTitleStyle}>Impossible de charger les listes</div>
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
      <div style={headerRowStyle}>
        <div style={titleStyle}>Listes d'impression</div>
        <div style={segmentedWrapperStyle}>
          <div onClick={() => setMineOnly(true)} style={segmentStyle(mineOnly)}>
            Mes listes
          </div>
          <div onClick={() => setMineOnly(false)} style={segmentStyle(!mineOnly)}>
            Toutes les listes
          </div>
        </div>
        {!creating && (
          <Button variant="primary" onClick={startCreating}>
            + Nouvelle liste
          </Button>
        )}
      </div>

      {creating && (
        <div style={newListCardStyle}>
          <div style={newListRowStyle}>
            <div style={newListFieldStyle}>
              <TextField
                variant="compact"
                label="Nom de la liste"
                placeholder="Ex. Adressage cardio"
                value={newName}
                autoFocus
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void submitCreate()
                  if (e.key === 'Escape') cancelCreating()
                }}
              />
            </div>
            <Button variant="primary" disabled={!newName.trim() || saving} onClick={() => void submitCreate()}>
              {saving ? 'Création…' : 'Créer'}
            </Button>
            <Button variant="ghost" onClick={cancelCreating}>
              Annuler
            </Button>
          </div>
          <div style={newListHintStyle}>
            {selectionCount > 0
              ? `Sera créée avec les ${selectionCount} contact${selectionCount > 1 ? 's' : ''} actuellement en sélection d'impression.`
              : "Sera créée vide — vous pourrez y ajouter votre sélection d'impression ensuite, depuis la liste."}
          </div>
          {createError && <div style={{ ...newListHintStyle, color: colors.sector.ame.fg }}>{createError}</div>}
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={messageCardStyle}>
          <div style={messageTitleStyle}>
            {mineOnly ? 'Aucune liste créée pour l’instant' : 'Aucune liste partagée pour l’instant'}
          </div>
          <div style={messageBodyStyle}>
            {mineOnly
              ? 'Cochez des contacts dans l\'annuaire (ou sur une fiche), puis créez une liste nommée pour les retrouver et les imprimer à nouveau — ex. « Adressage cardio ».'
              : 'Dès qu\'un membre créera une liste, elle apparaîtra ici.'}
          </div>
          {mineOnly && (
            <Button variant="outline" onClick={() => setMineOnly(false)}>
              Voir toutes les listes
            </Button>
          )}
        </div>
      ) : (
        <div style={listStyle}>
          {filtered.map((list) => (
            <div key={list.id} style={rowStyle}>
              <StarToggle
                starred={list.favorited}
                onToggle={() =>
                  void (list.favorited ? unfavoritePrintList(list.id) : favoritePrintList(list.id))
                }
              />
              <div style={rowMainStyle}>
                <Link to={`/listes/${list.id}`} style={rowNameStyle}>
                  {list.name}
                </Link>
                <div style={rowMetaStyle}>
                  {list.contactIds.length} contact{list.contactIds.length !== 1 ? 's' : ''}
                  {!list.isMine && ` · par ${list.ownerName}`}
                  {' · maj '}
                  {formatDate(list.updatedAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
