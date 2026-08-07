import type { CSSProperties } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { usePrintLists } from '../../data/PrintListsProvider'
import { useDirectory } from '../../data/DirectoryProvider'
import { useSelection } from '../../app/SelectionProvider'
import { Button, TextField } from '../../components/ui'
import StarToggle from '../../components/StarToggle'
import { colors, radii } from '../../theme/tokens'
import { formatDate } from '../fiche/format'
import { toPatientView } from '../impression/patientView'
import type { ContactWithMeta } from '../../types/db'

/**
 * Détail d'une liste d'impression nommée (cf. `ListesPage`) : renommer/supprimer réservés au
 * propriétaire (RLS `print_lists_update_own`/`print_lists_delete_own`), favori ouvert à tous
 * (même principe que `StarToggle` sur les contacts). « Imprimer cette liste » remplace la
 * sélection d'impression courante (`SelectionProvider.setSelection`) et ouvre `/impression`.
 */

const pageStyle: CSSProperties = {
  padding: '24px 28px 60px',
  maxWidth: 720,
  margin: '0 auto',
}

const backButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  marginBottom: 14,
  border: 'none',
  background: 'transparent',
  padding: 0,
  cursor: 'pointer',
  font: '600 12.5px "Plus Jakarta Sans"',
  color: colors.brand.blue,
}

const cardStyle: CSSProperties = {
  background: colors.white,
  border: `1px solid ${colors.borderLight}`,
  borderRadius: radii.round,
  padding: '22px 24px',
}

const headerRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 12,
  marginBottom: 6,
  flexWrap: 'wrap',
}

const titleBlockStyle: CSSProperties = { flex: 1, minWidth: 200 }

const titleStyle: CSSProperties = {
  font: '800 18px "Plus Jakarta Sans"',
  color: colors.text.primary,
}

const editableTitleRowStyle: CSSProperties = { display: 'flex', gap: 8, alignItems: 'center' }

const editIconButtonStyle: CSSProperties = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  color: colors.text.muted,
  font: '600 11px "Plus Jakarta Sans"',
  padding: '2px 4px',
}

const metaLineStyle: CSSProperties = {
  font: '500 12px "Plus Jakarta Sans"',
  color: colors.text.secondary,
  marginTop: 4,
}

const actionsRowStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  margin: '16px 0 18px',
}

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}

const itemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  background: colors.bg,
  border: `1px solid ${colors.border}`,
  borderRadius: radii.xl,
  padding: '10px 12px',
}

const itemMainStyle: CSSProperties = { flex: 1, minWidth: 0 }

const itemNameStyle: CSSProperties = {
  font: '600 12.5px "Plus Jakarta Sans"',
  color: colors.text.primary,
  textDecoration: 'none',
  display: 'block',
}

const itemMetaStyle: CSSProperties = {
  font: '500 11px "Plus Jakarta Sans"',
  color: colors.text.muted,
  marginTop: 1,
}

const removeButtonStyle: CSSProperties = {
  border: 'none',
  background: 'transparent',
  padding: 0,
  font: '600 11px "Plus Jakarta Sans"',
  color: '#c1734a',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const emptyHintStyle: CSSProperties = {
  font: '500 12.5px "Plus Jakarta Sans"',
  color: colors.text.muted,
}

const guardCardStyle: CSSProperties = {
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

const guardTitleStyle: CSSProperties = {
  font: '700 14px "Plus Jakarta Sans"',
  color: colors.text.primary,
}

const guardBodyStyle: CSSProperties = {
  font: '500 12.5px "Plus Jakarta Sans"',
  color: colors.text.secondary,
  maxWidth: 360,
}

const guardLinkStyle: CSSProperties = {
  font: '600 12px "Plus Jakarta Sans"',
  color: colors.brand.blue,
  textDecoration: 'underline',
}

export default function ListeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    lists,
    loading,
    error,
    reload,
    renamePrintList,
    deletePrintList,
    setPrintListItems,
    favoritePrintList,
    unfavoritePrintList,
  } = usePrintLists()
  const { contacts, loading: contactsLoading } = useDirectory()
  const { selectedIds, count: selectionCount, setSelection } = useSelection()

  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const list = lists.find((l) => l.id === id)

  useEffect(() => {
    if (list) setNameDraft(list.name)
  }, [list?.name]) // eslint-disable-line react-hooks/exhaustive-deps

  const contactsById = useMemo(() => {
    const map = new Map<string, ContactWithMeta>()
    for (const contact of contacts) map.set(contact.id, contact)
    return map
  }, [contacts])

  const resolvedItems = useMemo(
    () => (list?.contactIds ?? []).map((cid) => contactsById.get(cid)).filter((c): c is ContactWithMeta => Boolean(c)),
    [list, contactsById],
  )

  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/listes')
  }

  if (loading || contactsLoading) {
    return (
      <div style={pageStyle}>
        <div style={guardCardStyle}>
          <div style={guardTitleStyle}>Chargement…</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <div style={guardCardStyle}>
          <div style={guardTitleStyle}>Impossible de charger la liste</div>
          <div style={guardBodyStyle}>{error}</div>
          <Button variant="outline" onClick={() => void reload()}>
            Réessayer
          </Button>
        </div>
      </div>
    )
  }

  if (!list) {
    return (
      <div style={pageStyle}>
        <div style={guardCardStyle}>
          <div style={guardTitleStyle}>Liste introuvable</div>
          <div style={guardBodyStyle}>Cette liste n'existe pas, ou a été supprimée.</div>
          <Link to="/listes" style={guardLinkStyle}>
            ← Retour aux listes
          </Link>
        </div>
      </div>
    )
  }

  const startRenaming = () => {
    setNameDraft(list.name)
    setRenaming(true)
    setActionError(null)
  }

  const submitRename = async () => {
    const name = nameDraft.trim()
    if (!name || name === list.name) {
      setRenaming(false)
      return
    }
    setBusy(true)
    setActionError(null)
    try {
      await renamePrintList(list.id, name)
      setRenaming(false)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Impossible de renommer la liste.')
    } finally {
      setBusy(false)
    }
  }

  const handlePrint = () => {
    setSelection(list.contactIds)
    navigate('/impression')
  }

  const handleAddSelection = async () => {
    setBusy(true)
    setActionError(null)
    try {
      const merged = [...list.contactIds, ...[...selectedIds].filter((id2) => !list.contactIds.includes(id2))]
      await setPrintListItems(list.id, merged)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Impossible d'ajouter la sélection.")
    } finally {
      setBusy(false)
    }
  }

  const handleRemoveContact = async (contactId: string) => {
    setBusy(true)
    setActionError(null)
    try {
      await setPrintListItems(list.id, list.contactIds.filter((cid) => cid !== contactId))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Impossible de retirer ce contact.')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Supprimer définitivement la liste « ${list.name} » ? Cette action est irréversible.`,
    )
    if (!confirmed) return
    setBusy(true)
    setActionError(null)
    try {
      await deletePrintList(list.id)
      navigate('/listes')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Impossible de supprimer la liste.')
      setBusy(false)
    }
  }

  return (
    <div style={pageStyle}>
      <button type="button" onClick={goBack} style={backButtonStyle}>
        <span aria-hidden="true">←</span> Retour aux listes
      </button>
      <div style={cardStyle}>
        <div style={headerRowStyle}>
          <div style={titleBlockStyle}>
            {renaming ? (
              <div style={editableTitleRowStyle}>
                <TextField
                  variant="compact"
                  value={nameDraft}
                  autoFocus
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void submitRename()
                    if (e.key === 'Escape') setRenaming(false)
                  }}
                  style={{ maxWidth: 320 }}
                />
                <Button variant="primary" disabled={busy} onClick={() => void submitRename()}>
                  Valider
                </Button>
                <Button variant="ghost" onClick={() => setRenaming(false)}>
                  Annuler
                </Button>
              </div>
            ) : (
              <div style={editableTitleRowStyle}>
                <div style={titleStyle}>{list.name}</div>
                {list.isMine && (
                  <button type="button" onClick={startRenaming} style={editIconButtonStyle} title="Renommer">
                    ✎ Renommer
                  </button>
                )}
              </div>
            )}
            <div style={metaLineStyle}>
              {list.isMine ? 'Créée par vous' : `Créée par ${list.ownerName}`} · {resolvedItems.length} contact
              {resolvedItems.length !== 1 ? 's' : ''} · maj {formatDate(list.updatedAt)}
            </div>
          </div>
          <StarToggle
            starred={list.favorited}
            onToggle={() => void (list.favorited ? unfavoritePrintList(list.id) : favoritePrintList(list.id))}
            variant="button"
          />
        </div>

        <div style={actionsRowStyle}>
          <Button variant="primary" disabled={resolvedItems.length === 0} onClick={handlePrint}>
            🖨️ Imprimer cette liste
          </Button>
          {list.isMine && (
            <Button variant="outline" disabled={selectionCount === 0 || busy} onClick={() => void handleAddSelection()}>
              + Ajouter la sélection courante ({selectionCount})
            </Button>
          )}
          {list.isMine && (
            <Button variant="ghost" disabled={busy} onClick={() => void handleDelete()} style={{ color: '#c1734a' }}>
              Supprimer la liste
            </Button>
          )}
        </div>

        {actionError && <div style={{ ...emptyHintStyle, color: colors.sector.ame.fg, marginBottom: 12 }}>{actionError}</div>}

        {resolvedItems.length === 0 ? (
          <div style={emptyHintStyle}>
            Liste vide — cochez des contacts dans l'annuaire ou depuis une fiche (« + Sélection impression »),
            puis revenez ici {list.isMine ? 'et cliquez « Ajouter la sélection courante »' : ''}.
          </div>
        ) : (
          <div style={listStyle}>
            {resolvedItems.map((contact) => {
              const { displayName, displayProfession } = toPatientView(contact)
              return (
                <div key={contact.id} style={itemStyle}>
                  <div style={itemMainStyle}>
                    <Link to={`/contact/${contact.id}`} style={itemNameStyle}>
                      {displayName}
                    </Link>
                    {displayProfession && <div style={itemMetaStyle}>{displayProfession}</div>}
                  </div>
                  {list.isMine && (
                    <button
                      type="button"
                      onClick={() => void handleRemoveContact(contact.id)}
                      style={removeButtonStyle}
                      disabled={busy}
                    >
                      Retirer
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
