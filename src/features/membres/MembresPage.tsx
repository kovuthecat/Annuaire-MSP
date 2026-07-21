import { useEffect, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { Avatar, Badge } from '../../components'
import { Button, TextField } from '../../components/ui'
import { colors } from '../../theme/tokens'
import { supabase } from '../../lib/supabase'
import { updatePassword } from '../../data/auth'
import { memberDisplayName } from '../../data/directory'
import { useDirectory } from '../../data/DirectoryProvider'
import { useAuth } from '../auth/AuthProvider'
import type { Member } from '../../types/db'

/**
 * Écran Membres (cf. plans/P1/S7.md T11) — reproduit la liste de la maquette
 * (design/maquettes/design-annuaire-msp/project/MSP Annuaire.dc.html, lignes ~442-461) + deux
 * blocs hors maquette (édition de profil, mot de passe — cf. ARCHITECTURE.md §Écran 6) et
 * l'encart d'invitation (aucun appel API — cf. T11 §Décision clé).
 */

const pageStyle: CSSProperties = {
  padding: '24px 28px 60px',
  maxWidth: 640,
  margin: '0 auto',
}

const headerRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 16,
  gap: 12,
  flexWrap: 'wrap',
}

const titleStyle: CSSProperties = {
  font: '800 18px "Plus Jakarta Sans"',
  color: colors.text.primary,
}

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

const memberCardStyle: CSSProperties = {
  background: colors.white,
  border: `1px solid ${colors.borderLight}`,
  borderRadius: 14,
  padding: '13px 16px',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
}

const memberNameStyle: CSSProperties = {
  font: '700 13px "Plus Jakarta Sans"',
  color: colors.text.primary,
}

const memberMetaStyle: CSSProperties = {
  font: '500 11.5px "Plus Jakarta Sans"',
  color: colors.text.secondary,
}

const sectionCardStyle: CSSProperties = {
  background: colors.white,
  border: `1px solid ${colors.borderLight}`,
  borderRadius: 14,
  padding: '18px 20px',
  marginTop: 24,
}

const sectionTitleStyle: CSSProperties = {
  font: '800 14px "Plus Jakarta Sans"',
  color: colors.text.primary,
  marginBottom: 14,
}

// `alignItems` par défaut (stretch) : chaque TextField occupe toute la largeur de la carte
// (sa largeur interne à 100% ne peut se résoudre que si son parent a une largeur déterminée).
// Le bouton, lui, ne doit pas s'étirer → `alignSelf: 'flex-start'` posé sur chaque <Button>.
const formStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}

const submitButtonStyle: CSSProperties = { alignSelf: 'flex-start' }

const feedbackErrorStyle: CSSProperties = {
  font: '600 12px "Plus Jakarta Sans"',
  color: colors.comment.alerte.fg,
}

const feedbackOkStyle: CSSProperties = {
  font: '600 12px "Plus Jakarta Sans"',
  color: colors.sector.newpatients.fg,
}

const inviteBoxStyle: CSSProperties = {
  background: colors.coords.pro.bg,
  border: `1px solid ${colors.coords.pro.border}`,
  borderRadius: 12,
  padding: '14px 16px',
  font: '500 12.5px/1.6 "Plus Jakarta Sans"',
  color: colors.text.body,
  marginBottom: 16,
}

/** "Prénom Nom" → "PN" ; à défaut initiale de l'email ; à défaut "?" (même règle que Layout). */
function initialsFor(member: Member): string {
  const p = member.prenom?.trim()?.[0]
  const n = member.nom?.trim()?.[0]
  const combined = `${p ?? ''}${n ?? ''}`.toUpperCase()
  if (combined) return combined
  return member.email ? member.email[0]!.toUpperCase() : '?'
}

const telLinkStyle: CSSProperties = {
  color: colors.brand.blue,
  textDecoration: 'none',
  fontWeight: 600,
}

/** Rangée « Pro : … · Perso : … » sous la profession — uniquement les numéros renseignés. */
function MemberTels({ member }: { member: Member }) {
  const parts: Array<{ label: string; value: string }> = []
  if (member.tel_pro?.trim()) parts.push({ label: 'Pro', value: member.tel_pro.trim() })
  if (member.tel_perso?.trim()) parts.push({ label: 'Perso', value: member.tel_perso.trim() })
  if (parts.length === 0) return null
  return (
    <div style={memberMetaStyle}>
      {parts.map((p, i) => (
        <span key={p.label}>
          {i > 0 && ' · '}
          {p.label} :{' '}
          <a href={`tel:${p.value.replace(/\s/g, '')}`} style={telLinkStyle}>
            {p.value}
          </a>
        </span>
      ))}
    </div>
  )
}

function MembersList({ members }: { members: Member[] }) {
  return (
    <div style={listStyle}>
      {members.map((m) => (
        <div key={m.id} style={memberCardStyle}>
          <Avatar size={36} initials={initialsFor(m)} />
          <div style={{ flex: 1 }}>
            <div style={memberNameStyle}>{memberDisplayName(m)}</div>
            <div style={memberMetaStyle}>
              {m.profession || '—'} · {m.email ?? '—'}
            </div>
            <MemberTels member={m} />
          </div>
          {m.role === 'referent' && <Badge variant="vad" label="Référent" />}
        </div>
      ))}
    </div>
  )
}

function MonProfilCard() {
  const { member, userId, refreshMember } = useAuth()
  const { reload } = useDirectory()
  const [prenom, setPrenom] = useState(member?.prenom ?? '')
  const [nom, setNom] = useState(member?.nom ?? '')
  const [profession, setProfession] = useState(member?.profession ?? '')
  const [telPro, setTelPro] = useState(member?.tel_pro ?? '')
  const [telPerso, setTelPerso] = useState(member?.tel_perso ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  // Le profil peut se résoudre après le premier rendu (chargement initial de l'auth) : on
  // resynchronise les champs quand `member` arrive ou change (ex. après refreshMember()).
  useEffect(() => {
    setPrenom(member?.prenom ?? '')
    setNom(member?.nom ?? '')
    setProfession(member?.profession ?? '')
    setTelPro(member?.tel_pro ?? '')
    setTelPerso(member?.tel_perso ?? '')
  }, [member])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!userId) return
    setSaving(true)
    setError(null)
    setSavedMessage(null)
    const { error: updateError } = await supabase
      .from('members')
      .update({
        prenom: prenom.trim() || null,
        nom: nom.trim() || null,
        profession: profession.trim() || null,
        tel_pro: telPro.trim() || null,
        tel_perso: telPerso.trim() || null,
      })
      .eq('id', userId)
    setSaving(false)
    if (updateError) {
      setError('Échec de la mise à jour du profil.')
      return
    }
    await refreshMember()
    await reload()
    setSavedMessage('Profil mis à jour.')
  }

  return (
    <div style={sectionCardStyle}>
      <div style={sectionTitleStyle}>Mon profil</div>
      <form onSubmit={handleSubmit} style={formStyle}>
        <TextField
          label="Prénom"
          value={prenom}
          onChange={(event) => setPrenom(event.target.value)}
        />
        <TextField
          label="Nom"
          value={nom}
          onChange={(event) => setNom(event.target.value)}
        />
        <TextField
          label="Profession"
          value={profession}
          onChange={(event) => setProfession(event.target.value)}
        />
        <TextField
          label="Téléphone pro"
          type="tel"
          value={telPro}
          onChange={(event) => setTelPro(event.target.value)}
          autoComplete="tel"
        />
        <TextField
          label="Téléphone perso (visible des membres)"
          type="tel"
          value={telPerso}
          onChange={(event) => setTelPerso(event.target.value)}
          autoComplete="tel"
        />
        {error && <div style={feedbackErrorStyle}>{error}</div>}
        {savedMessage && <div style={feedbackOkStyle}>{savedMessage}</div>}
        <Button type="submit" variant="primary" disabled={saving} style={submitButtonStyle}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </form>
    </div>
  )
}

function MotDePasseCard() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSavedMessage(null)
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }
    setSaving(true)
    const { error: updateError } = await updatePassword(password)
    setSaving(false)
    if (updateError) {
      setError('Échec du changement de mot de passe.')
      return
    }
    setPassword('')
    setConfirm('')
    setSavedMessage('Mot de passe modifié.')
  }

  return (
    <div style={sectionCardStyle}>
      <div style={sectionTitleStyle}>Mot de passe</div>
      <form onSubmit={handleSubmit} style={formStyle}>
        <TextField
          label="Nouveau mot de passe"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
        />
        <TextField
          label="Confirmation"
          type="password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          autoComplete="new-password"
        />
        {error && <div style={feedbackErrorStyle}>{error}</div>}
        {savedMessage && <div style={feedbackOkStyle}>{savedMessage}</div>}
        <Button type="submit" variant="primary" disabled={saving} style={submitButtonStyle}>
          {saving ? 'Enregistrement…' : 'Changer le mot de passe'}
        </Button>
      </form>
    </div>
  )
}

export default function MembresPage() {
  const { members } = useDirectory()
  const { member } = useAuth()
  const isReferent = member?.role === 'referent'
  const [inviteOpen, setInviteOpen] = useState(false)

  return (
    <div style={pageStyle}>
      <div style={headerRowStyle}>
        <div style={titleStyle}>Membres</div>
        {isReferent && (
          <Button variant="primary" onClick={() => setInviteOpen((v) => !v)}>
            + Inviter un membre
          </Button>
        )}
      </div>

      {isReferent && inviteOpen && (
        <div style={inviteBoxStyle}>
          L'application ne peut pas créer de compte elle-même (cela exige la clé de service,
          jamais exposée au navigateur). Créez le compte dans Supabase → Auth → Users → Add user
          (email + mot de passe initial + Auto Confirm). La fiche membre est créée automatiquement.
        </div>
      )}

      <MembersList members={members} />

      <MonProfilCard />
      <MotDePasseCard />
    </div>
  )
}
