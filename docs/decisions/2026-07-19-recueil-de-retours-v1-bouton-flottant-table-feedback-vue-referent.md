# 2026-07-19 — Recueil de retours V1 : bouton flottant + table `feedback` (vue référent)

Avant de partager la V1 aux ~10 membres, se donner un canal de **retour à faible friction** pour
corriger vite. Cadré et implémenté le même jour (hors plan `P<n>` : petite fonctionnalité à zone
disjointe — 1 table, 1 widget, 1 écran).

### Décision
Un **bouton flottant « Un souci ? »** monté dans le `Layout` (donc sur toutes les pages
authentifiées, jamais sur `/connexion`), avec **popover explicatif au survol**. Au clic, un panneau :
catégorie (🐞 Problème · ✏️ Donnée erronée · 💡 Suggestion), message libre, et **contexte de page
capturé automatiquement** (URL, écran lisible, **fiche concernée** si `/contact/:id`, viewport,
user-agent) + **capture d'écran**. Stockage dans une nouvelle table `public.feedback`. Relecture par
le **référent seul**, sur un écran `/retours` (statut nouveau/en cours/résolu, capture à la demande,
suppression).

Deux arbitrages tranchés avec Thibault :
1. **Capture d'écran = automatique en 1 clic** (`html2canvas`), pas une pièce jointe manuelle : les
   membres sont non techniques, le « zéro geste » prime. Réserves assumées : `html2canvas` **redessine
   le DOM** (ne photographie pas les pixels) → la **carte Leaflet** (tuiles d'un domaine tiers) et
   parfois les polices rendent mal ; la capture est un **indice**, pas une preuve. Image **recadrée sur
   la zone visible** puis **downscalée (≤1400 px) + JPEG q=0.7** avant envoi.
2. **Récupération = vue in-app réservée au référent**, pas seulement le Table Editor Supabase (qui
   reste le filet de secours). Plus confortable pour trier sans quitter l'app.

### Alternatives écartées
- **Pièce jointe manuelle (coller/upload)** : plus fidèle et sans dépendance, mais un geste de plus →
  écarté au profit du confort (audience non technique).
- **Aucune capture (métadonnées seules)** : trop pauvre pour corriger un bug d'affichage décrit par un
  non-technicien.
- **Table Editor Supabase seul** : zéro écran mais oblige à ouvrir Supabase et lire des lignes brutes.
- **Notification e-mail à chaque retour** : demanderait une Edge Function / SMTP (cf. limite d'envoi
  Supabase, §Auth) — hors périmètre V1 ; le référent consulte `/retours`. Réintroductible plus tard.

### Conséquences
- **Nouvelle dépendance `html2canvas`** (1.4.1, types inclus) — tranchée ici, pas ajoutée par un
  exécutant. **Import dynamique** (`import('html2canvas')` au clic) → chunk séparé (~48 Ko gzip),
  **hors du bundle initial**.
- **Schéma** (`supabase/schema.sql` §6) : table `feedback` (RLS **insert = tout membre**,
  **select/update/delete = référent**) + fonction `public.is_referent()` (security definer, même motif
  que `is_member()`). Colonne `screenshot` (data URL) **jamais** sélectionnée en liste ; drapeau léger
  `has_screenshot` pour savoir qu'une capture existe sans la charger ; `loadFeedbackScreenshot` la
  récupère au clic. **`schema.sql` doit être rejoué** sur la base, et le compte de Thibault doit être
  `role='referent'`, sinon `/retours` redirige et la liste reste vide.
- **Étanchéité intacte** : le widget ne lit que l'URL/le contexte d'affichage, ne touche aucun champ
  pro, n'apparaît jamais sur la feuille patient (auto-masqué à l'impression via un `<style>` scopé
  `[data-feedback-ui]`, sans toucher `global.css`).
- **RGPD / interne** : retours **signés** (`author_id` = membre courant, comme les commentaires) ;
  aucune donnée patient. La capture peut montrer l'écran courant (fiches de correspondants) — reste
  entre membres authentifiés, lisible du seul référent.

### Impact IA
Zone isolée `src/features/feedback/` (widget, écran, `context.ts` pur + testé) + `src/data/feedback.ts`
+ `types/db.ts`. Le contexte de page est dérivé du pathname (`pageLabelFor`/`contactIdFrom`, purs,
testés). Évolutions (nouvelle catégorie, notification) se font là, sans toucher au reste.
