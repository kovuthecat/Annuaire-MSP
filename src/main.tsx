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
import { PrintListsProvider } from './data/PrintListsProvider'
import { SelectionProvider } from './app/SelectionProvider'
import { ReferenceProvider } from './features/proximite/ReferenceProvider'

// AuthProvider au-dessus de DirectoryProvider (cf. plans/P1/S7.md T10 §Décision clé) :
// DirectoryProvider s'abonne lui-même à onAuthStateChange pour recharger le dataset au
// changement de session — pas de dépendance directe au contexte AuthProvider.
// SelectionProvider (sélection d'impression, cf. plans/P1/S3.md T6) et ReferenceProvider (point de
// référence des distances, cf. plans/P3/S2.md T3) sont des états client transitoires indépendants
// des deux autres : montés sous AuthProvider, sans lien avec le dataset, jamais persistés.
// PrintListsProvider (listes d'impression nommées/favorites) suit le même schéma que
// DirectoryProvider (dataset Supabase propre, rechargé à l'auth) mais un dataset distinct — pas de
// dépendance à DirectoryProvider, simple voisin dans l'arbre.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <SelectionProvider>
        <ReferenceProvider>
          <DirectoryProvider>
            <PrintListsProvider>
              <RouterProvider router={router} />
            </PrintListsProvider>
          </DirectoryProvider>
        </ReferenceProvider>
      </SelectionProvider>
    </AuthProvider>
  </StrictMode>,
)
