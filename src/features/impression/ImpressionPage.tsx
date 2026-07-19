import type { CSSProperties } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelection } from '../../app/SelectionProvider'
import { useDirectory } from '../../data/DirectoryProvider'
import { Button } from '../../components/ui'
import { colors } from '../../theme/tokens'
import type { ContactWithMeta } from '../../types/db'
import SelectionPanel from './SelectionPanel'
import SheetPreview from './SheetPreview'
import './print.css'

/**
 * Écran Sélection & impression (maquette l.397-439, cf. plans/P1/S6.md T9) : produit une feuille
 * d'adressage patient à partir des contacts cochés dans l'annuaire (`SelectionProvider`).
 *
 * §Décision clé 1 — la sélection vient de `useSelection().selectedIds` (Set non ordonné, sans API
 * de réordonnancement) ; l'ordre d'affichage est géré ici via un état local `orderedIds`,
 * synchronisé par l'effet ci-dessous (conserve l'ordre courant, ajoute les nouveaux ids en fin,
 * retire ceux qui ont disparu de `selectedIds`). `SelectionProvider` n'est jamais modifié.
 */

const pageStyle: CSSProperties = {
  padding: '24px 28px 60px',
  maxWidth: 960,
  margin: '0 auto',
  display: 'flex',
  gap: 20,
  flexWrap: 'wrap',
}

const emptyStateStyle: CSSProperties = {
  minHeight: '50vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  textAlign: 'center',
  padding: '24px 28px',
}

const emptyTitleStyle: CSSProperties = {
  font: '700 15px "Plus Jakarta Sans"',
  color: colors.text.primary,
}

const emptyBodyStyle: CSSProperties = {
  font: '500 12.5px "Plus Jakarta Sans"',
  color: colors.text.secondary,
  maxWidth: 360,
}

const loadingStyle: CSSProperties = {
  minHeight: '30vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  font: '600 13px "Plus Jakarta Sans"',
  color: colors.text.secondary,
}

const errorStyle: CSSProperties = {
  minHeight: '30vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  padding: '24px 28px',
}

const backLinkStyle: CSSProperties = {
  font: '700 12px "Plus Jakarta Sans"',
  color: colors.brand.blue,
  textDecoration: 'none',
  marginTop: 4,
}

export default function ImpressionPage() {
  const { selectedIds, remove, clear } = useSelection()
  const { contacts, loading, error, reload } = useDirectory()

  const [orderedIds, setOrderedIds] = useState<string[]>(() => [...selectedIds])
  const [avecEntete, setAvecEntete] = useState(true)
  const [pourPatient, setPourPatient] = useState('')
  const [noteLibre, setNoteLibre] = useState('')

  // Conserve l'ordre courant, ajoute en fin les ids nouvellement cochés, retire ceux qui ont
  // disparu de `selectedIds` (déselection depuis l'annuaire ou "Retirer" ci-dessous).
  useEffect(() => {
    setOrderedIds((prev) => {
      const stillSelected = prev.filter((id) => selectedIds.has(id))
      const newlySelected = [...selectedIds].filter((id) => !prev.includes(id))
      return [...stillSelected, ...newlySelected]
    })
  }, [selectedIds])

  const contactsById = useMemo(() => {
    const map = new Map<string, ContactWithMeta>()
    for (const contact of contacts) map.set(contact.id, contact)
    return map
  }, [contacts])

  // Ignore sans planter un id dont le contact est introuvable (fiche supprimée entre-temps,
  // cf. §Étapes 2).
  const resolvedContacts = useMemo(
    () => orderedIds.map((id) => contactsById.get(id)).filter((c): c is ContactWithMeta => Boolean(c)),
    [orderedIds, contactsById],
  )

  const moveUp = (id: string) => {
    setOrderedIds((prev) => {
      const index = prev.indexOf(id)
      if (index <= 0) return prev
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }

  const moveDown = (id: string) => {
    setOrderedIds((prev) => {
      const index = prev.indexOf(id)
      if (index === -1 || index >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
  }

  if (orderedIds.length === 0) {
    return (
      <div style={emptyStateStyle}>
        <div style={emptyTitleStyle}>Aucun contact sélectionné</div>
        <div style={emptyBodyStyle}>
          Cochez des contacts dans l'annuaire pour composer une liste à imprimer.
        </div>
        <Link to="/" style={backLinkStyle}>
          ← Retour à l'annuaire
        </Link>
      </div>
    )
  }

  if (loading) {
    return <div style={loadingStyle}>Chargement…</div>
  }

  if (error) {
    return (
      <div style={errorStyle}>
        <div style={emptyTitleStyle}>Impossible de charger les contacts sélectionnés</div>
        <div style={emptyBodyStyle}>{error}</div>
        <Button variant="outline" onClick={() => void reload()}>
          Réessayer
        </Button>
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      <SelectionPanel
        items={resolvedContacts}
        count={orderedIds.length}
        onMoveUp={moveUp}
        onMoveDown={moveDown}
        onRemove={remove}
        onClear={clear}
        avecEntete={avecEntete}
        onAvecEnteteChange={setAvecEntete}
        pourPatient={pourPatient}
        onPourPatientChange={setPourPatient}
        noteLibre={noteLibre}
        onNoteLibreChange={setNoteLibre}
      />
      <SheetPreview
        items={resolvedContacts}
        avecEntete={avecEntete}
        pourPatient={pourPatient}
        noteLibre={noteLibre}
      />
    </div>
  )
}
