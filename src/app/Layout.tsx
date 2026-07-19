import type { CSSProperties } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useMatch, useNavigate } from 'react-router-dom'
import { colors } from '../theme/tokens'
import { useAuth } from '../features/auth/AuthProvider'
import { useSelection } from './SelectionProvider'
import { useIsMobile } from './useMediaQuery'
import FeedbackWidget from '../features/feedback/FeedbackWidget'
import logoMsp from '../assets/logo-msp-menilmontant.png'
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

// Logo officiel dans une pastille blanche : le lockup couleur (fond blanc, contient déjà le nom)
// serait illisible posé à même la barre dégradée teal→bleu. La pastille garantit contraste et
// lisibilité, et le fond blanc du PNG s'y fond sans bord visible.
const logoPillStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  background: '#fff',
  borderRadius: 8,
  padding: '5px 9px',
}

const logoImgStyle: CSSProperties = {
  height: 26,
  width: 'auto',
  display: 'block',
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

// ---------------------------------------------------------------------------
// Navigation mobile (audit pré-partage #1) : sous 640 px, la barre du haut ne peut pas porter toute
// la nav (elle s'empilait sur ~5 lignes, ~230 px avant le contenu). On la remplace par une barre
// FIXE en bas avec les 3 destinations les plus fréquentes + un menu « … » (Membres / Retours).
// Desktop : inchangé (nav dans la barre du haut). La barre du bas est masquée sur les écrans
// Ajouter/Modifier (leur propre barre d'action collante occupe déjà le bas).
// ---------------------------------------------------------------------------

const bottomNavStyle: CSSProperties = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  height: 58,
  background: '#fff',
  borderTop: `1px solid ${colors.borderLight}`,
  boxShadow: '0 -2px 10px rgba(0,0,0,.05)',
  display: 'flex',
  zIndex: 40,
}

function bottomItemStyle(active: boolean): CSSProperties {
  return {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    textDecoration: 'none',
    font: '600 10px "Plus Jakarta Sans"',
    color: active ? colors.brand.blue : colors.text.muted,
    position: 'relative',
  }
}

const bottomIconStyle: CSSProperties = { fontSize: 17, lineHeight: 1 }

const bottomBadgeStyle: CSSProperties = {
  position: 'absolute',
  top: 5,
  left: 'calc(50% + 5px)',
  minWidth: 15,
  height: 15,
  padding: '0 4px',
  borderRadius: 8,
  background: colors.brand.blue,
  color: '#fff',
  font: '700 9px "Plus Jakarta Sans"',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const bottomPlusMenuStyle: CSSProperties = {
  position: 'absolute',
  bottom: 62,
  right: 8,
  minWidth: 160,
  background: '#fff',
  border: `1px solid ${colors.borderLight}`,
  borderRadius: 12,
  boxShadow: '0 6px 20px rgba(0,0,0,.16)',
  padding: 6,
  display: 'flex',
  flexDirection: 'column',
  zIndex: 41,
}

function BottomNav({ isReferent, selectedCount }: { isReferent: boolean; selectedCount: number }) {
  const [plusOpen, setPlusOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!plusOpen) return
    const onDown = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setPlusOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [plusOpen])

  return (
    <div ref={wrapperRef} style={bottomNavStyle}>
      <NavLink to="/" end style={({ isActive }) => bottomItemStyle(isActive)} onClick={() => setPlusOpen(false)}>
        <span style={bottomIconStyle} aria-hidden>🔍</span>
        Annuaire
      </NavLink>
      <NavLink to="/nouveau" style={({ isActive }) => bottomItemStyle(isActive)} onClick={() => setPlusOpen(false)}>
        <span style={bottomIconStyle} aria-hidden>＋</span>
        Ajouter
      </NavLink>
      <NavLink to="/impression" style={({ isActive }) => bottomItemStyle(isActive)} onClick={() => setPlusOpen(false)}>
        <span style={bottomIconStyle} aria-hidden>🖨️</span>
        Impression
        {selectedCount > 0 && <span style={bottomBadgeStyle}>{selectedCount}</span>}
      </NavLink>
      <button type="button" style={bottomItemStyle(plusOpen)} onClick={() => setPlusOpen((v) => !v)}>
        <span style={bottomIconStyle} aria-hidden>☰</span>
        Plus
      </button>
      {plusOpen && (
        <div style={bottomPlusMenuStyle}>
          <NavLink to="/membres" style={profileMenuItemStyle} onClick={() => setPlusOpen(false)}>
            Membres
          </NavLink>
          {isReferent && (
            <NavLink to="/retours" style={profileMenuItemStyle} onClick={() => setPlusOpen(false)}>
              Retours
            </NavLink>
          )}
        </div>
      )}
    </div>
  )
}

/** Contenu décalé au-dessus de la barre du bas (mobile) pour ne pas être masqué par elle. */
const contentAboveBottomNavStyle: CSSProperties = { paddingBottom: 66 }

export default function Layout() {
  const matchModifier = useMatch('/contact/:id/modifier')
  const matchNouveau = useMatch('/nouveau')
  const { count: selectedCount } = useSelection()
  const { member } = useAuth()
  const isReferent = member?.role === 'referent'
  const isMobile = useIsMobile()
  // Écrans Ajouter/Modifier : barre d'action collante en bas → pas de barre de nav en plus.
  const isEditionRoute = Boolean(matchModifier || matchNouveau)
  const showBottomNav = isMobile && !isEditionRoute

  return (
    <div>
      <div style={topBarStyle}>
        <Link to="/" style={logoLinkStyle} aria-label="MSP Ménilmontant — accueil">
          <span style={logoPillStyle}>
            <img src={logoMsp} alt="MSP Ménilmontant" style={logoImgStyle} />
          </span>
        </Link>

        {!isMobile && (
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
        )}

        <div style={rightGroupStyle}>
          {!isMobile && selectedCount > 0 && (
            <Link to="/impression" style={selectionIndicatorStyle}>
              {selectedCount} sélectionné(s) → Imprimer
            </Link>
          )}
          <ProfileMenu />
        </div>
      </div>

      <div style={showBottomNav ? contentAboveBottomNavStyle : undefined}>
        <Outlet />
      </div>

      {showBottomNav && <BottomNav isReferent={isReferent} selectedCount={selectedCount} />}

      {/* Bouton flottant « Un souci ? » présent sur chaque page authentifiée (cf. FeedbackWidget). */}
      <FeedbackWidget />
    </div>
  )
}
