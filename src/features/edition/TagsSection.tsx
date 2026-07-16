import type { CSSProperties, KeyboardEvent } from 'react'
import { useState } from 'react'
import { Section, TextField } from '../../components/ui'
import { colors, radii } from '../../theme/tokens'
import type { FormState } from './formState'

/**
 * Section repliable "Tags & identifiants" (maquette l.352-359). L'unique champ texte de la
 * maquette ("Tags (autocomplétion sur tags existants)") est ici un vrai multi-valeurs : saisie +
 * Entrée/virgule ajoute une puce, `<datalist>` fournit l'autocomplétion sur les tags déjà utilisés
 * par les fiches chargées (S5 étape 3 : "multi, autocomplétion sur les tags existants").
 */
interface TagsSectionProps {
  form: FormState
  onChange: (patch: Partial<FormState>) => void
  tagOptions: string[]
}

const tagInputStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  border: `1px solid ${colors.border}`,
  borderRadius: radii.lg,
  font: '500 12.5px "Plus Jakarta Sans"',
  color: colors.text.primary,
}

const chipsRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
}

const chipStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '5px 10px',
  borderRadius: radii.pill,
  background: colors.comment.spec.bg,
  color: colors.comment.spec.fg,
  font: '600 11px "Plus Jakarta Sans"',
  cursor: 'pointer',
}

export default function TagsSection({ form, onChange, tagOptions }: TagsSectionProps) {
  const [draft, setDraft] = useState('')

  const addTag = (raw: string) => {
    const value = raw.trim()
    if (!value) return
    if (form.tags.some((tag) => tag.toLowerCase() === value.toLowerCase())) {
      setDraft('')
      return
    }
    onChange({ tags: [...form.tags, value] })
    setDraft('')
  }

  const removeTag = (tag: string) => onChange({ tags: form.tags.filter((t) => t !== tag) })

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addTag(draft)
    }
  }

  return (
    <Section title="Tags & identifiants" subtitle="pour mieux retrouver la fiche" dotColor={colors.comment.spec.fg}>
      <div>
        <input
          list="edition-tag-options"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => addTag(draft)}
          placeholder="Tags (autocomplétion sur tags existants) — Entrée pour ajouter"
          style={tagInputStyle}
        />
        <datalist id="edition-tag-options">
          {tagOptions.map((tag) => (
            <option key={tag} value={tag} />
          ))}
        </datalist>
      </div>
      {form.tags.length > 0 && (
        <div style={chipsRowStyle}>
          {form.tags.map((tag) => (
            <span key={tag} style={chipStyle} onClick={() => removeTag(tag)} title="Retirer ce tag">
              {tag} ×
            </span>
          ))}
        </div>
      )}
      <TextField
        variant="compact"
        placeholder="RPPS/ADELI (facultatif)"
        value={form.rpps}
        onChange={(e) => onChange({ rpps: e.target.value })}
      />
    </Section>
  )
}
