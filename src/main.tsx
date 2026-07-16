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
import { DirectoryProvider } from './data/DirectoryProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DirectoryProvider>
      <RouterProvider router={router} />
    </DirectoryProvider>
  </StrictMode>,
)
