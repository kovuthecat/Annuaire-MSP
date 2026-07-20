import type { CSSProperties, FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useIsMobile } from '../../app/useMediaQuery'
import { useDirectory } from '../../data/DirectoryProvider'
import { memberDisplayName } from '../../data/directory'
import { findSimilarContacts } from '../../data/search'
import { useAuth } from '../auth/AuthProvider'
import { Button } from '../../components/ui'
import { colors, radii } from '../../theme/tokens'
import type { CommentType } from '../../types/db'
import DoctolibImportPanel from './DoctolibImportPanel'
import EssentielCard from './EssentielCard'
import LieuSection from './LieuSection'
import AdressageSection from './AdressageSection'
import CoordonneesSection from './CoordonneesSection'
import TagsSection from './TagsSection'
import CommentDraftList from './CommentDraftList'
import type { DraftComment } from './CommentDraftList'
import {
  buildContactPayload,
  defaultCategorieForType,
  emptyForm,
  formFromContact,
  formFromPrefill,
  parsePrefill,
  validateForm,
} from './formState'
import type { FormState } from './formState'
import { geocodeAddress } from '../proximite/geocode'

/**
 * Écran Ajouter / Modifier une fiche (maquette l.257-395, cf. plans/P1/S5.md T8). Un seul
 * composant sert `/nouveau` et `/contact/:id/modifier` : `useParams()` détermine le mode, l'état
 * du formulaire vient de `formState.ts` (repris tel quel, cf. bilan de session). Découpage en
 * sous-composants locaux, un par bloc de la maquette (Essentiel, Lieu, Adressage, Coordonnées,
 * Tags, Commentaires) + la barre d'enregistrement collante ci-dessous.
 */

const pageStyle: CSSProperties = {
  padding: '28px 28px 110px',
  maxWidth: 920,
  margin: '0 auto',
}

const headerRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  marginBottom: 6,
}

const iconBoxStyle: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: radii.xl,
  background: colors.gradientPrimaryDiagonal,
  flex: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  font: '800 20px "Plus Jakarta Sans"',
}

const titleStyle: CSSProperties = {
  font: '800 19px "Plus Jakarta Sans"',
  color: colors.text.primary,
}

const subtitleStyle: CSSProperties = {
  font: '500 12.5px "Plus Jakarta Sans"',
  color: colors.text.secondary,
}

const helperTextStyle: CSSProperties = {
  font: '500 12px "Plus Jakarta Sans"',
  color: colors.text.muted,
  textAlign: 'center',
  marginBottom: 14,
}

const twoColGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: 14,
  marginBottom: 14,
  alignItems: 'start',
}

const coordonneesWrapStyle: CSSProperties = {
  marginBottom: 14,
}

const errorBannerStyle: CSSProperties = {
  background: colors.sector.ame.bg,
  color: colors.sector.ame.fg,
  border: `1px solid ${colors.sector.ame.fg}`,
  borderRadius: radii.lg,
  padding: '10px 14px',
  font: '600 12px "Plus Jakarta Sans"',
  marginBottom: 14,
}

/** Bandeau « pré-rempli depuis Doctolib » (T2) : ton sobre, bleu info existant (cf. ARCHITECTURE
 * §Ton visuel — pas de couleur « notation » agressive, donc pas la teinte d'alerte `sector.ame`). */
const prefillBannerStyle: CSSProperties = {
  background: colors.comment.info.bg,
  color: colors.comment.info.fg,
  border: `1px solid ${colors.comment.info.fg}`,
  borderRadius: radii.lg,
  padding: '10px 14px',
  font: '600 12px "Plus Jakarta Sans"',
  marginBottom: 14,
}

/** Message discret si le `prefill` reçu est illisible (base64/JSON corrompu) — pas un blocage,
 * juste une mention que le formulaire s'est ouvert vide plutôt que prérempli (T1 §Décision clé). */
const prefillUnreadableStyle: CSSProperties = {
  font: '500 11.5px "Plus Jakarta Sans"',
  color: colors.text.muted,
  marginBottom: 14,
}

const stickyBarStyle: CSSProperties = {
  position: 'sticky',
  bottom: 0,
  left: 0,
  right: 0,
  background: colors.white,
  borderTop: `1px solid ${colors.borderLight}`,
  padding: '14px 28px',
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  maxWidth: 920,
  margin: '0 auto',
  boxShadow: '0 -4px 16px rgba(0,0,0,.04)',
  flexWrap: 'wrap',
}

const stickyHintStyle: CSSProperties = {
  font: '500 11.5px "Plus Jakarta Sans"',
  color: colors.text.muted,
  flex: 1,
}

// #c1734a : même couleur « destructive » que « Retirer »/« Tout vider » (SelectionPanel), pour que
// l'action se reconnaisse d'un coup d'œil dans toute l'app — pas de couleur inventée.
const deleteButtonStyle: CSSProperties = {
  color: '#c1734a',
}

const centeredMsgStyle: CSSProperties = {
  minHeight: '40vh',
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

const centeredMsgTitleStyle: CSSProperties = {
  font: '700 14px "Plus Jakarta Sans"',
  color: colors.text.primary,
}

/** "12/03/2026" — même format que `ContactRow.formatDate` (S3, non exporté : petite duplication
 * assumée plutôt que de toucher `src/features/annuaire/`, hors périmètre de cette session). */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR')
}

export default function EditionPage() {
  const { id } = useParams<{ id: string }>()
  const mode: 'create' | 'edit' = id ? 'edit' : 'create'
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [searchParams] = useSearchParams()
  const { contacts, loading, createContact, updateContact, deleteContact, addComment, reload } =
    useDirectory()
  const { member } = useAuth()

  const existingContact = useMemo(
    () => (mode === 'edit' ? contacts.find((c) => c.id === id) : undefined),
    [mode, contacts, id],
  )

  // Contrat `prefill` (P4/S1, cf. formState.ts) : uniquement en création — `/nouveau?prefill=…`.
  // En édition, le paramètre est ignoré : une fiche existante n'est jamais réécrite par un prefill.
  const rawPrefill = mode === 'create' ? searchParams.get('prefill') : null
  // `null` = pas de prefill dans l'URL ; `undefined` = présent mais illisible (base64/JSON corrompu) ;
  // sinon un `Prefill` assaini (potentiellement vide si aucune clé reconnue).
  const prefill = useMemo(() => {
    if (!rawPrefill) return null
    const parsed = parsePrefill(rawPrefill)
    return parsed ?? undefined
  }, [rawPrefill])
  const prefillUnreadable = prefill === undefined

  const [form, setForm] = useState<FormState>(() =>
    prefill ? formFromPrefill(prefill) : emptyForm(),
  )
  // `true` dès le départ en création (rien à charger) ; en édition, passe à `true` une fois la
  // fiche trouvée dans le dataset — évite de re-remplir le formulaire (et d'écraser la saisie en
  // cours) à chaque rechargement du dataset déclenché par `addComment`/`reload` pendant l'édition.
  const [initialized, setInitialized] = useState(mode === 'create')
  const [drafts, setDrafts] = useState<DraftComment[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (mode === 'edit' && !initialized && existingContact) {
      setForm(formFromContact(existingContact))
      setInitialized(true)
    }
  }, [mode, initialized, existingContact])

  const patchForm = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }))

  const duplicates = useMemo(
    () => (mode === 'create' ? findSimilarContacts(form.nom, contacts) : []),
    [mode, form.nom, contacts],
  )

  const tagOptions = useMemo(() => {
    const set = new Set<string>()
    for (const contact of contacts) {
      for (const tag of contact.tags) set.add(tag)
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'fr'))
  }, [contacts])

  const authorLabel = memberDisplayName(member)

  const lastEditLabel = useMemo(() => {
    if (mode !== 'edit' || !existingContact) return null
    if (existingContact.updated_by) {
      return `Dernière modification par ${existingContact.updatedByName ?? 'un membre'} le ${formatDate(existingContact.updated_at)}`
    }
    if (existingContact.created_by) {
      const createdByName = existingContact.authorNames[existingContact.created_by] ?? 'un membre'
      return `Créée par ${createdByName} le ${formatDate(existingContact.created_at)}`
    }
    return null
  }, [mode, existingContact])

  const handleAddComment = (type: CommentType, texte: string) => {
    const trimmed = texte.trim()
    if (!trimmed) return
    const dateLabel = new Date().toLocaleDateString('fr-FR')
    if (mode === 'edit' && existingContact) {
      // Édition : création immédiate (S5 §Décision clé), pas de brouillon en attente.
      void addComment(existingContact.id, type, trimmed)
    }
    setDrafts((prev) => [...prev, { type, texte: trimmed, author: authorLabel, date: dateLabel }])
  }

  if (mode === 'edit' && !initialized) {
    return (
      <div style={pageStyle}>
        <div style={centeredMsgStyle}>
          <div style={centeredMsgTitleStyle}>
            {loading ? 'Chargement de la fiche…' : 'Fiche introuvable.'}
          </div>
          {!loading && (
            <Button variant="outline" onClick={() => navigate('/')}>
              Retour à l'annuaire
            </Button>
          )}
        </div>
      </div>
    )
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const validationError = validateForm(form, mode)
    if (validationError) {
      setFormError(validationError)
      return
    }
    setFormError(null)
    setSubmitError(null)
    setSubmitting(true)
    try {
      const payload = buildContactPayload(form, mode)
      let contactId: string | null = null
      if (mode === 'create') {
        // Catégorie dérivée du type à la création (cf. defaultCategorieForType) : sans elle, la
        // fiche restait `categorie = null` et était masquée par tout filtre de catégorie.
        const withCategorie = { ...payload, categorie: defaultCategorieForType(payload.type) }
        // Provenance (T1 §Étapes 2) : posée uniquement quand la fiche part d'un `prefill` valide —
        // jamais en saisie manuelle (le payload standard, lui, ne porte aucune colonne de provenance).
        const created = await createContact(
          prefill
            ? {
                ...withCategorie,
                source_url: prefill.source_url ?? null,
                source_type: 'doctolib',
                statut: 'a_verifier',
              }
            : withCategorie,
        )
        contactId = created.id
        for (const draft of drafts) {
          await addComment(created.id, draft.type, draft.texte)
        }
      } else if (existingContact) {
        // Rattrapage : une fiche créée avant la pose de `categorie` (ou importée sans) l'obtient à
        // la 1re édition. On ne réécrit jamais une catégorie déjà fixée (affinée à l'import).
        const patch = existingContact.categorie
          ? payload
          : { ...payload, categorie: defaultCategorieForType(payload.type) }
        await updateContact(existingContact.id, patch)
        contactId = existingContact.id
      }

      // Géocodage à la saisie (plans/P3/S2.md T2 §Décision clé) : la fiche est déjà
      // créée/modifiée ci-dessus (comportement inchangé) ; le géocodage se déclenche en
      // arrière-plan et ne retarde jamais la navigation — `reload()` du provider rafraîchira la
      // position quand elle arrive. Uniquement si l'adresse est renseignée et (création, ou
      // adresse modifiée en édition). Échec silencieux (BAN muette, score < seuil, ou RLS sur
      // l'update de suivi juste après l'insert, cf. T2 §Si bloqué) : latitude/longitude restent
      // `null`, rien ne remonte à l'utilisateur.
      if (contactId && payload.adresse) {
        const adresseChanged = mode === 'edit' && payload.adresse !== (existingContact?.adresse ?? null)
        if (mode === 'create' || adresseChanged) {
          const idToGeocode = contactId
          const addressToGeocode = payload.adresse
          void (async () => {
            const result = await geocodeAddress(addressToGeocode)
            if (!result) return
            try {
              await updateContact(idToGeocode, {
                latitude: result.lat,
                longitude: result.lng,
                geocode_score: result.score,
                geocoded_at: new Date().toISOString(),
              })
            } catch {
              // Échec silencieux — cf. T2 §Si bloqué (RLS) : ne jamais faire remonter d'erreur
              // pour ce suivi en arrière-plan.
            }
          })()
        }
      }

      await reload()
      navigate('/')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!existingContact) return
    const confirmed = window.confirm(
      `Supprimer définitivement la fiche « ${existingContact.nom} » ? Cette action est irréversible ` +
        '— ses commentaires et son statut « ma liste » chez les autres membres seront supprimés avec elle.',
    )
    if (!confirmed) return
    setSubmitError(null)
    setDeleting(true)
    try {
      await deleteContact(existingContact.id)
      navigate('/')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Erreur lors de la suppression.')
      setDeleting(false)
    }
  }

  const title = mode === 'create' ? 'Ajouter un correspondant' : 'Modifier un correspondant'
  const subtitle =
    mode === 'create'
      ? "30 secondes pour l'essentiel — toute l'équipe pourra enrichir la fiche ensuite."
      : (lastEditLabel ?? 'Complétez ou corrigez les informations puis enregistrez.')

  return (
    <form onSubmit={(e) => void handleSubmit(e)}>
      <div style={pageStyle}>
        <div style={headerRowStyle}>
          <div style={iconBoxStyle}>{mode === 'create' ? '+' : '✎'}</div>
          <div>
            <div style={titleStyle}>{title}</div>
            <div style={subtitleStyle}>{subtitle}</div>
          </div>
        </div>

        {prefill && (
          <div style={prefillBannerStyle}>
            Fiche pré-remplie depuis Doctolib — vérifiez chaque champ avant d'enregistrer. Source
            déclarative, non datée.
          </div>
        )}
        {prefillUnreadable && (
          <div style={prefillUnreadableStyle}>
            Préremplissage illisible — le formulaire s'est ouvert vide.
          </div>
        )}

        {/* Découverte de l'import Doctolib (P4/T-007) : seulement en création manuelle, pas quand la
            fiche arrive déjà préremplie depuis le favori (le bandeau ci-dessus suffit alors). */}
        {mode === 'create' && !prefill && <DoctolibImportPanel />}

        <EssentielCard mode={mode} form={form} onChange={patchForm} duplicates={duplicates} />

        <div style={helperTextStyle}>
          Tout le reste est facultatif — complétez maintenant, ou revenez-y plus tard
        </div>

        <div style={twoColGridStyle}>
          <LieuSection form={form} onChange={patchForm} />
          <AdressageSection form={form} onChange={patchForm} />
        </div>

        <div style={coordonneesWrapStyle}>
          <CoordonneesSection form={form} onChange={patchForm} />
        </div>

        <div style={twoColGridStyle}>
          <TagsSection form={form} onChange={patchForm} tagOptions={tagOptions} />
          <CommentDraftList drafts={drafts} onAdd={handleAddComment} />
        </div>

        {(formError ?? submitError) && <div style={errorBannerStyle}>{formError ?? submitError}</div>}
      </div>

      <div style={stickyBarStyle}>
        {mode === 'edit' && existingContact && (
          <Button
            type="button"
            variant="ghost"
            style={deleteButtonStyle}
            onClick={() => void handleDelete()}
            disabled={deleting || submitting}
          >
            {deleting ? 'Suppression…' : 'Supprimer la fiche'}
          </Button>
        )}
        {/* Hint masqué sur mobile (audit pré-partage #6) : il serrait les boutons. Le span garde
            son flex: 1 pour maintenir Annuler/Enregistrer alignés à droite. */}
        <span style={stickyHintStyle}>
          {!isMobile && 'Vous pourrez compléter la fiche à tout moment.'}
        </span>
        <Button type="button" variant="ghost" onClick={() => navigate('/')} disabled={deleting}>
          Annuler
        </Button>
        <Button type="submit" variant="primary" disabled={submitting || deleting}>
          {submitting ? 'Enregistrement…' : 'Enregistrer la fiche'}
        </Button>
      </div>
    </form>
  )
}
