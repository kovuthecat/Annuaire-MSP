import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import '@fontsource/plus-jakarta-sans/400.css'
import '@fontsource/plus-jakarta-sans/500.css'
import '@fontsource/plus-jakarta-sans/600.css'
import '@fontsource/plus-jakarta-sans/700.css'
import '@fontsource/plus-jakarta-sans/800.css'
import './theme/global.css'
import { router } from './app/router'
import { AuthProvider } from './features/auth/AuthProvider'
import { DirectoryProvider } from './data/DirectoryProvider'

// AuthProvider au-dessus de DirectoryProvider (cf. plans/P1/S7.md T10 §Décision clé) :
// DirectoryProvider s'abonne lui-même à onAuthStateChange pour recharger le dataset au
// changement de session — pas de dépendance directe au contexte AuthProvider.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <DirectoryProvider>
        <RouterProvider router={router} />
      </DirectoryProvider>
    </AuthProvider>
  </StrictMode>,
)
