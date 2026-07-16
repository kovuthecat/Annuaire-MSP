import { createBrowserRouter } from 'react-router-dom'
import Layout from './Layout'
import RequireAuth from '../features/auth/RequireAuth'
import ConnexionPage from '../features/auth/ConnexionPage'
import AnnuairePage from '../features/annuaire/AnnuairePage'
import FichePage from '../features/fiche/FichePage'
import EditionPage from '../features/edition/EditionPage'
import ImpressionPage from '../features/impression/ImpressionPage'
import MembresPage from '../features/membres/MembresPage'

/**
 * Routes définitives (cf. plans/P1/S1.md T2 — S3-S7 ne touchent que leur dossier de feature) :
 * /connexion · / (annuaire) · /contact/:id (fiche) · /nouveau · /contact/:id/modifier
 * · /impression · /membres.
 * /connexion est hors Layout (pas de barre du haut) ; le reste passe par Layout (barre + Outlet),
 * protégé par `RequireAuth` (cf. plans/P1/S7.md T10 — redirige vers /connexion sans session).
 */
export const router = createBrowserRouter([
  { path: '/connexion', element: <ConnexionPage /> },
  {
    element: (
      <RequireAuth>
        <Layout />
      </RequireAuth>
    ),
    children: [
      { path: '/', element: <AnnuairePage /> },
      { path: '/contact/:id', element: <FichePage /> },
      { path: '/nouveau', element: <EditionPage /> },
      { path: '/contact/:id/modifier', element: <EditionPage /> },
      { path: '/impression', element: <ImpressionPage /> },
      { path: '/membres', element: <MembresPage /> },
    ],
  },
])
