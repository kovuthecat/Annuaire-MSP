import type { CSSProperties } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useMatch, useNavigate } from 'react-router-dom'
import { colors } from '../theme/tokens'
import { useAuth } from '../features/auth/AuthProvider'
import { useSelection } from './SelectionProvider'
import FeedbackWidget from '../features/feedback/FeedbackWidget'
import type { Member } from '../types/db'

/**
 * Barre du haut — reproduit la maquette (design/maquettes/.../MSP Annuaire.dc.html, lignes 43-62).
 * La sélection d'impression est lue depuis `SelectionProvider` (état client transitoire partagé,
 * cf. plans/P1/S3.md T6) — pas de props, tout écran peut cocher des contacts pour l'impression.
 * Pill "Fiche détail" volontairement omise (artefact de démo, cf.
 * ARCHITECTURE.md §Écarts maquette ↔ architecture #4 — en prod la fiche s'ouvre en cliquant un contact).
 * Pastille profil (cf. plans/P1/S7.md T10) : initiales du membre + menu « Mon profil » / « Se
 * déconnecter » (la maquette ne montrait qu'un lien statique vers /connexion).
 */

const topBarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 18,
  padding: '14px 28px',
  background: colors.gradientPrimary,
  color: '#fff',
  flexWrap: 'wrap',
}

const logoLinkStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  cursor: 'pointer',
  textDecoration: 'none',
  color: '#fff',
}

const logoBoxStyle: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  background: 'rgba(255,255,255,.22)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  font: '800 13px/1 "Plus Jakarta Sans"',
}

const logoTitleStyle: CSSProperties = {
  font: '700 14px/1 "Plus Jakarta Sans"',
}

const navGroupStyle: CSSProperties = {
  display: 'flex',
  gap: 4,
  marginLeft: 12,
  flexWrap: 'wrap',
}

function pillStyle(active: boolean): CSSProperties {
  return {
    padding: '7px 12px',
    borderRadius: 8,
    font: '600 12px "Plus Jakarta Sans"',
    cursor: 'pointer',
    background: active ? 'rgba(255,255,255,.28)' : 'transparent',
    color: '#fff',
    textDecoration: 'none',
    display: 'inline-block',
  }
}

const rightGroupStyle: CSSProperties = {
  marginLeft: 'auto',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
}

const selectionIndicatorStyle: CSSProperties = {
  font: '700 11.5px "Plus Jakarta Sans"',
  background: 'rgba(255,255,255,.22)',
  padding: '6px 12px',
  borderRadius: 20,
  cursor: 'pointer',
  color: '#fff',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
}

const addLinkStyle: CSSProperties = {
  font: '600 12px "Plus Jakarta Sans"',
  cursor: 'pointer',
  color: '#fff',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
}

const profilePastilleStyle: CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: '50%',
  background: 'rgba(255,255,255,.28)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  font: '700 11px "Plus Jakarta Sans"',
  cursor: 'pointer',
  color: '#fff',
  textDecoration: 'none',
}

const profileMenuWrapperStyle: CSSProperties = {
  position: 'relative',
}

const profileMenuStyle: CSSProperties = {
  position: 'absolute',
  top: 34,
  right: 0,
  zIndex: 30,
  minWidth: 170,
  background: '#fff',
  border: `1px solid ${colors.borderLight}`,
  borderRadius: 12,
  boxShadow: '0 6px 20px rgba(0,0,0,.14)',
  padding: 6,
  display: 'flex',
  flexDirection: 'column',
}

const profileMenuItemStyle: CSSProperties = {
  padding: '9px 12px',
  borderRadius: 8,
  font: '600 12px "Plus Jakarta Sans"',
  color: colors.text.body,
  textDecoration: 'none',
  cursor: 'pointer',
  background: 'transparent',
  border: 'none',
  textAlign: 'left',
}

/** "Prénom Nom" → "PN" ; à défaut initiale de l'email ; à défaut "?" (cf. T10 §Étapes 4). */
function initialsFor(member: Member | null, email: string | null | undefined): string {
  const p = member?.prenom?.trim()?.[0]
  const n = member?.nom?.trim()?.[0]
  const combined = `${p ?? ''}${n ?? ''}`.toUpperCase()
  if (combined) return combined
  return email ? email[0]!.toUpperCase() : '?'
}

function ProfileMenu() {
  const { member, session, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Fermeture au clic extérieur plutôt qu'au survol (`onMouseLeave`) : le menu est positionné en
  // absolu avec un petit écart sous la pastille (top: 34 vs pastille de 26px) — un `mouseLeave`
  // se déclenchait en traversant cet écart, avant que le clic sur un item n'ait pu arriver.
  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  const handleSignOut = async () => {
    setOpen(false)
    await signOut()
    navigate('/connexion')
  }

  return (
    <div ref={wrapperRef} style={profileMenuWrapperStyle}>
      <div
        onClick={() => setOpen((v) => !v)}
        title="Mon profil / déconnexion"
        style={profilePastilleStyle}
      >
        {initialsFor(member, session?.user.email)}
      </div>
      {open && (
        <div style={profileMenuStyle}>
          <Link to="/membres" style={profileMenuItemStyle} onClick={() => setOpen(false)}>
            Mon profil
          </Link>
          <button type="button" onClick={handleSignOut} style={profileMenuItemStyle}>
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  )
}

export default function Layout() {
  const matchModifier = useMatch('/contact/:id/modifier')
  const { count: selectedCount } = useSelection()
  const { member } = useAuth()
  const isReferent = member?.role === 'referent'

  return (
    <div>
      <div style={topBarStyle}>
        <Link to="/" style={logoLinkStyle}>
          <div style={logoBoxStyle}>M</div>
          <div style={logoTitleStyle}>MSP Ménilmontant</div>
        </Link>

        <div style={navGroupStyle}>
          <NavLink to="/" end style={({ isActive }) => pillStyle(isActive)}>
            Annuaire
          </NavLink>
          <NavLink to="/nouveau" style={({ isActive }) => pillStyle(isActive || !!matchModifier)}>
            Ajouter / Modifier
          </NavLink>
          <NavLink to="/impression" style={({ isActive }) => pillStyle(isActive)}>
            Sélection & impression
          </NavLink>
          <NavLink to="/membres" style={({ isActive }) => pillStyle(isActive)}>
            Membres
          </NavLink>
          {isReferent && (
            <NavLink to="/retours" style={({ isActive }) => pillStyle(isActive)}>
              Retours
            </NavLink>
          )}
        </div>

        <div style={rightGroupStyle}>
          {selectedCount > 0 && (
            <Link to="/impression" style={selectionIndicatorStyle}>
              {selectedCount} sélectionné(s) → Imprimer
            </Link>
          )}
          <Link to="/nouveau" style={addLinkStyle}>
            + Ajouter
          </Link>
          <ProfileMenu />
        </div>
      </div>

      <Outlet />

      {/* Bouton flottant « Un souci ? » présent sur chaque page authentifiée (cf. FeedbackWidget). */}
      <FeedbackWidget />
    </div>
  )
}
