import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { Button, TextField } from '../../components/ui'
import { colors } from '../../theme/tokens'

/**
 * Écran de connexion (cf. plans/P1/S7.md T10) — reproduit la carte de la maquette
 * (design/maquettes/design-annuaire-msp/project/MSP Annuaire.dc.html, lignes ~22-38) avec
 * email + mot de passe au lieu du lien magique (cf. DECISIONS.md §Auth).
 * Ajouts hors maquette (décision T10) : message d'erreur, état « connexion… », mention
 * « mot de passe oublié → référent ».
 */

const pageStyle = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
} as const

const loadingStyle = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#8b8578',
  font: '600 14px "Plus Jakarta Sans"',
} as const

const cardStyle = {
  width: 380,
  maxWidth: '100%',
  boxSizing: 'border-box',
  background: colors.white,
  border: `1px solid ${colors.borderLight}`,
  borderRadius: 20,
  boxShadow: '0 4px 24px rgba(0,0,0,.06)',
  padding: '36px 32px',
  textAlign: 'center',
} as const

const logoStyle = {
  width: 52,
  height: 52,
  borderRadius: 14,
  background: colors.gradientPrimaryDiagonal,
  margin: '0 auto 18px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  font: '800 18px "Plus Jakarta Sans"',
} as const

const titleStyle = {
  font: '800 18px "Plus Jakarta Sans"',
  color: colors.text.primary,
  marginBottom: 4,
} as const

const subtitleStyle = {
  font: '500 12.5px "Plus Jakarta Sans"',
  color: colors.text.secondary,
  marginBottom: 24,
} as const

const fieldGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  marginBottom: 16,
  textAlign: 'left',
} as const

const errorStyle = {
  background: colors.comment.alerte.bg,
  color: colors.comment.alerte.fg,
  borderRadius: 12,
  padding: '12px 14px',
  font: '600 12.5px/1.5 "Plus Jakarta Sans"',
  marginBottom: 14,
  textAlign: 'left',
} as const

const forgotStyle = {
  marginTop: 16,
  font: '500 11.5px "Plus Jakarta Sans"',
  color: colors.text.muted,
} as const

export default function ConnexionPage() {
  const { session, loading, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pendant la résolution initiale, ne rien afficher qui présuppose l'état de session (cf. T10
  // "pendant loading, ne rien rediriger").
  if (loading) return <div style={loadingStyle}>Chargement…</div>
  // Déjà connecté (ex. onglet ouvert sur /connexion) → retour à l'annuaire.
  if (session) return <Navigate to="/" replace />

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error: signInError } = await signIn(email, password)
    setSubmitting(false)
    if (signInError) {
      setError('Email ou mot de passe incorrect.')
    }
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={logoStyle}>M</div>
        <div style={titleStyle}>MSP Ménilmontant</div>
        <div style={subtitleStyle}>Réservé aux membres de la MSP</div>

        {error && <div style={errorStyle}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={fieldGroupStyle}>
            <TextField
              type="email"
              placeholder="prenom.nom@msp-menilmontant.fr"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
            <TextField
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <Button type="submit" variant="primary" disabled={submitting} style={{ width: '100%' }}>
            {submitting ? 'Connexion…' : 'Se connecter'}
          </Button>
        </form>

        <div style={forgotStyle}>Mot de passe oublié ? Contactez le référent.</div>
      </div>
    </div>
  )
}
