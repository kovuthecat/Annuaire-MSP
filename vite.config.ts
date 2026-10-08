import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Port propre au projet (voir Outils/dev-launcher) : strictPort évite le basculement silencieux sur un autre port.
  server: { port: 5181, strictPort: true },
})
