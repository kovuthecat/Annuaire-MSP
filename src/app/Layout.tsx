import type { CSSProperties } from 'react'
import { Link, NavLink, Outlet, useMatch } from 'react-router-dom'
import { colors } from '../theme/tokens'

/**
 * Barre du haut — reproduit la maquette (design/maquettes/.../MSP Annuaire.dc.html, lignes 43-62).
 * Composant présentational : la sélection d'impression arrive en props (pas de state global ici),
 * cf. plans/P1/S1.md T2. Pill "Fiche détail" volontairement omise (artefact de démo, cf.
 * ARCHITECTURE.md §Écarts maquette ↔ architecture #4 — en prod la fiche s'ouvre en cliquant un contact).
 */
interface LayoutProps {
  selectedCount?: number
}

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

export default function Layout({ selectedCount = 0 }: LayoutProps) {
  const matchModifier = useMatch('/contact/:id/modifier')

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
          <Link to="/connexion" title="Mon profil / déconnexion" style={profilePastilleStyle} />
        </div>
      </div>

      <Outlet />
    </div>
  )
}
