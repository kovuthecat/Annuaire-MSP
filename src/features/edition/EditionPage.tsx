import type { CSSProperties, FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDirectory } from '../../data/DirectoryProvider'
import { memberDisplayName } from '../../data/directory'
import { findSimilarContacts } from '../../data/search'
import { useAuth } from '../auth/AuthProvider'
import { Button } from '../../components/ui'
import { colors, radii } from '../../theme/tokens'
import type { CommentType } from '../../types/db'
import EssentielCard from './EssentielCard'
import LieuSection from './LieuSection'
import AdressageSection from './AdressageSection'
import CoordonneesSection from './CoordonneesSection'
import TagsSection from './TagsSection'
import CommentDraftList from './CommentDraftList'
import type { DraftComment } from './CommentDraftList'
import { buildContactPayload, emptyForm, formFromContact, validateForm } from './formState'
import type { FormState } from './formState'

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
  const { contacts, loading, createContact, updateContact, addComment, reload } = useDirectory()
  const { member } = useAuth()

  const existingContact = useMemo(
    () => (mode === 'edit' ? contacts.find((c) => c.id === id) : undefined),
    [mode, contacts, id],
  )

  const [form, setForm] = useState<FormState>(() => emptyForm())
  // `true` dès le départ en création (rien à charger) ; en édition, passe à `true` une fois la
  // fiche trouvée dans le dataset — évite de re-remplir le formulaire (et d'écraser la saisie en
  // cours) à chaque rechargement du dataset déclenché par `addComment`/`reload` pendant l'édition.
  const [initialized, setInitialized] = useState(mode === 'create')
  const [drafts, setDrafts] = useState<DraftComment[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

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
      if (mode === 'create') {
        const created = await createContact(payload)
        for (const draft of drafts) {
          await addComment(created.id, draft.type, draft.texte)
        }
      } else if (existingContact) {
        await updateContact(existingContact.id, payload)
      }
      await reload()
      navigate('/')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.")
    } finally {
      setSubmitting(false)
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
        <span style={stickyHintStyle}>Vous pourrez compléter la fiche à tout moment.</span>
        <Button type="button" variant="ghost" onClick={() => navigate('/')}>
          Annuler
        </Button>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? 'Enregistrement…' : 'Enregistrer la fiche'}
        </Button>
      </div>
    </form>
  )
}
