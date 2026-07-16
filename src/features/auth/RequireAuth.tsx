import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'

const loadingStyle = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#8b8578',
  font: '600 14px "Plus Jakarta Sans"',
} as const

/**
 * Garde de route (cf. plans/P1/S7.md T10) : protège tout l'arbre `Layout` (annuaire, fiche,
 * édition, impression, membres). Sans session → redirection vers `/connexion`. Pendant la
 * résolution initiale (`loading`), on n'affiche qu'un indicateur neutre — pas de redirection —
 * pour éviter un flash vers `/connexion` au rechargement d'une page protégée.
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) return <div style={loadingStyle}>Chargement…</div>
  if (!session) return <Navigate to="/connexion" replace />

  return <>{children}</>
}
