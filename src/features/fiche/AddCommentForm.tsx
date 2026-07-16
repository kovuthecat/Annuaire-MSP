import type { CSSProperties } from 'react'
import { useState } from 'react'
import { useDirectory } from '../../data/DirectoryProvider'
import { Button } from '../../components/ui'
import { colors, radii } from '../../theme/tokens'
import { COMMENT_TYPES } from '../../types/db'
import type { CommentType } from '../../types/db'

/**
 * Formulaire compact d'ajout de commentaire (maquette l.250 « + Ajouter un commentaire », cf.
 * plans/P1/S4.md T7 étape 7) : **pas de brouillon** (contrairement à la création en S5) — envoi
 * immédiat via `addComment(contact.id, type, texte)` du provider, qui `reload()` derrière. Vidé +
 * replié au succès (`onClose`) ; erreur affichée ; bouton désactivé si texte vide.
 */
interface AddCommentFormProps {
  contactId: string
  onClose: () => void
}

const TYPE_LABELS: Record<CommentType, string> = {
  reco: 'Recommandation',
  alerte: 'Alerte',
  spec: 'Spécificité',
  info: 'Info pratique',
}

const wrapperStyle: CSSProperties = {
  marginTop: 14,
  background: colors.bg,
  border: `1px solid ${colors.border}`,
  borderRadius: radii.xl,
  padding: '14px 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

const chipsRowStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
}

function chipStyle(active: boolean, fg: string, bg: string): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '5px 10px',
    borderRadius: radii.pill,
    cursor: 'pointer',
    border: active ? 'none' : `1px solid ${colors.border}`,
    background: active ? bg : '#fff',
    font: `600 11px "Plus Jakarta Sans"`,
    color: active ? fg : colors.text.muted,
  }
}

const dotStyle = (fg: string): CSSProperties => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: fg,
  flex: 'none',
})

const textareaStyle: CSSProperties = {
  font: '500 12.5px "Plus Jakarta Sans"',
  color: colors.text.body,
  border: `1px solid ${colors.border}`,
  borderRadius: radii.lg,
  padding: '10px 12px',
  resize: 'vertical',
  minHeight: 64,
  background: '#fff',
}

const footerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
}

const errorStyle: CSSProperties = {
  font: '600 11.5px "Plus Jakarta Sans"',
  color: colors.comment.alerte.fg,
}

export default function AddCommentForm({ contactId, onClose }: AddCommentFormProps) {
  const { addComment } = useDirectory()
  const [type, setType] = useState<CommentType>('reco')
  const [texte, setTexte] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = texte.trim() !== '' && !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      await addComment(contactId, type, texte.trim())
      setTexte('')
      setType('reco')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'ajout du commentaire.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={wrapperStyle}>
      <div style={chipsRowStyle}>
        {COMMENT_TYPES.map((t) => {
          const meta = colors.comment[t]
          return (
            <div key={t} style={chipStyle(type === t, meta.fg, meta.bg)} onClick={() => setType(t)}>
              <div style={dotStyle(meta.fg)} />
              {TYPE_LABELS[t]}
            </div>
          )
        })}
      </div>
      <textarea
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        placeholder="Votre commentaire…"
        style={textareaStyle}
      />
      <div style={footerStyle}>
        <Button variant="outline" onClick={() => void handleSubmit()} disabled={!canSubmit}>
          {submitting ? 'Ajout…' : 'Ajouter le commentaire'}
        </Button>
        {error && <span style={errorStyle}>{error}</span>}
      </div>
    </div>
  )
}
