import { createClient } from '@supabase/supabase-js'

/**
 * Client Supabase singleton. Session persistée sur le poste (`persistSession`) et rafraîchie
 * automatiquement (`autoRefreshToken`) — cf. DECISIONS.md §Auth : on se connecte une fois par
 * appareil et on y reste.
 *
 * Variables lues via `import.meta.env` (typées dans `vite-env.d.ts`), définies dans `.env.local`
 * (jamais commité — cf. `.env.example`). Erreur explicite si absentes plutôt qu'un client
 * silencieusement cassé.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Variables d'environnement Supabase manquantes : VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY " +
      'doivent être définies (copier .env.example en .env.local et renseigner les valeurs).',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
