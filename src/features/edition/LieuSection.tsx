import { Section, TextField } from '../../components/ui'
import { colors } from '../../theme/tokens'
import type { FormState } from './formState'

/**
 * Section repliable "Lieu" (maquette l.307-314). Le champ "Précision du type" (`sous_type`) est
 * une addition du plan (S5 étape 3 / DECISIONS.md §types de contact) absente du rendu statique de
 * la maquette — elle y est ajoutée sciemment.
 */
interface LieuSectionProps {
  form: FormState
  onChange: (patch: Partial<FormState>) => void
}

export default function LieuSection({ form, onChange }: LieuSectionProps) {
  return (
    <Section title="Lieu" subtitle="adresse, arrondissement" dotColor={colors.brand.teal}>
      <TextField
        variant="compact"
        placeholder="Établissement / structure"
        value={form.etablissement}
        onChange={(e) => onChange({ etablissement: e.target.value })}
      />
      <TextField
        variant="compact"
        placeholder="Adresse"
        value={form.adresse}
        onChange={(e) => onChange({ adresse: e.target.value })}
      />
      <TextField
        variant="compact"
        placeholder="Arrondissement / secteur"
        value={form.arrondissement}
        onChange={(e) => onChange({ arrondissement: e.target.value })}
      />
      <TextField
        variant="compact"
        placeholder="Précision du type (hôpital, centre de santé, structure médico-sociale, transport, réseau/CPTS…)"
        value={form.sousType}
        onChange={(e) => onChange({ sousType: e.target.value })}
      />
    </Section>
  )
}
