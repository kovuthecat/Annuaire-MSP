import type { CSSProperties } from 'react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDirectory } from '../../data/DirectoryProvider'
import { useSelection } from '../../app/SelectionProvider'
import { filterContacts } from '../../data/search'
import type { ContactFilters } from '../../data/search'
import { Button } from '../../components/ui'
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

/** Valeurs distinctes non vides d'un champ, triées alphabétiquement (locale FR). */
function distinctValues(values: Array<string | null>): string[] {
  const set = new Set(values.filter((v): v is string => Boolean(v && v.trim())))
  return [...set].sort((a, b) => a.localeCompare(b, 'fr'))
}

export default function AnnuairePage() {
  const { contacts, loading, error, reload, adoptContact, unadoptContact } = useDirectory()
  const { selectedIds, toggle } = useSelection()
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  // Mes contacts actif par défaut (cf. maquette — état initial `mesContacts: true`).
  const [mineOnly, setMineOnly] = useState(true)
  const [secteur1, setSecteur1] = useState(false)
  const [vad, setVad] = useState(false)
  const [ameCmu, setAmeCmu] = useState(false)
  const [nouveauxPatients, setNouveauxPatients] = useState(false)
  const [arrondissement, setArrondissement] = useState('')
  const [profession, setProfession] = useState('')
  const [tag, setTag] = useState('')
  const [sort, setSort] = useState<SortOption>('pertinence')

  const arrondissementOptions = useMemo(
    () => distinctValues(contacts.map((c) => c.arrondissement)),
    [contacts],
  )
  const professionOptions = useMemo(
    () => distinctValues(contacts.map((c) => c.profession)),
    [contacts],
  )
  const tagOptions = useMemo(() => distinctValues(contacts.flatMap((c) => c.tags)), [contacts])

  const filters: ContactFilters = useMemo(
    () => ({
      mineOnly,
      secteurConv: secteur1 ? '1' : undefined,
      vad,
      ameCmu,
      prendNouveaux: nouveauxPatients ? 'oui' : undefined,
      arrondissement: arrondissement || undefined,
      profession: profession || undefined,
      tags: tag ? [tag] : undefined,
    }),
    [mineOnly, secteur1, vad, ameCmu, nouveauxPatients, arrondissement, profession, tag],
  )

  const filtered = useMemo(() => filterContacts(contacts, query, filters), [contacts, query, filters])
  const sorted = useMemo(() => sortContacts(filtered, sort), [filtered, sort])

  const hasActiveFilters =
    query !== '' || secteur1 || vad || ameCmu || nouveauxPatients || arrondissement !== '' || profession !== '' || tag !== ''

  const resetFilters = () => {
    setQuery('')
    setSecteur1(false)
    setVad(false)
    setAmeCmu(false)
    setNouveauxPatients(false)
    setArrondissement('')
    setProfession('')
    setTag('')
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
        vad={vad}
        onVadChange={setVad}
        ameCmu={ameCmu}
        onAmeCmuChange={setAmeCmu}
        nouveauxPatients={nouveauxPatients}
        onNouveauxPatientsChange={setNouveauxPatients}
        arrondissement={arrondissement}
        onArrondissementChange={setArrondissement}
        arrondissementOptions={arrondissementOptions}
        profession={profession}
        onProfessionChange={setProfession}
        professionOptions={professionOptions}
        tag={tag}
        onTagChange={setTag}
        tagOptions={tagOptions}
        sort={sort}
        onSortChange={setSort}
        resultCount={sorted.length}
      />

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
            <ContactRow
              key={contact.id}
              contact={contact}
              selected={selectedIds.has(contact.id)}
              onToggleSelect={() => toggle(contact.id)}
              onToggleStar={() =>
                void (contact.starred ? unadoptContact(contact.id) : adoptContact(contact.id))
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
