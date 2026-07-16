/**
 * Design tokens — Annuaire MSP.
 * Source de vérité : ARCHITECTURE.md §Maquette + design/maquettes/design-annuaire-msp/.
 * Ces valeurs reprennent telles quelles les styles inline de la maquette (couleurs hex, radius).
 * Toute nouvelle couleur doit venir de la maquette, pas être inventée.
 */

export const colors = {
  bg: '#efece5',
  white: '#ffffff',
  borderLight: '#efe9dc',
  border: '#e6e2d8',

  text: {
    primary: '#1c2024',
    body: '#3d443f',
    secondary: '#8b8578',
    muted: '#a39c8e',
    faint: '#c2bcae',
  },

  brand: {
    teal: '#0f9f8e',
    blue: '#1f7fd6',
  },
  gradientPrimary: 'linear-gradient(90deg, #0f9f8e, #1f7fd6)',
  gradientPrimaryDiagonal: 'linear-gradient(135deg, #0f9f8e, #1f7fd6)',

  // Badges sémantiques (annuaire + fiche).
  sector: {
    secteur1: { fg: '#0f9f8e', bg: '#e4f5f2' },
    secteur2: { fg: '#7a6ec9', bg: '#eeecfb' },
    ame: { fg: '#b8894a', bg: '#fbf0e0' },
    vad: { fg: '#1f7fd6', bg: '#e7f1fc' },
    newpatients: { fg: '#3aa876', bg: '#e9f7ef' },
  },

  // 4 types de commentaire (cf. DECISIONS.md).
  comment: {
    reco: { fg: '#3aa876', bg: '#e9f7ef' },
    alerte: { fg: '#d3843d', bg: '#fbf0e0' },
    spec: { fg: '#7a6ec9', bg: '#eeecfb' },
    info: { fg: '#1f7fd6', bg: '#e7f1fc' },
  },

  // Blocs coordonnées patient / pro (fiche + édition).
  coords: {
    patient: { bg: '#f4f9f8', border: '#dcf0eb', accent: '#0f9f8e' },
    pro: { bg: '#fbf5ea', border: '#f2e4c8', accent: '#b8894a' },
  },
} as const

export const radii = {
  sm: 8,
  md: 9,
  lg: 10,
  xl: 12,
  xxl: 14,
  round: 16,
  pill: 20,
  circle: '50%',
} as const

export const fontFamily = '"Plus Jakarta Sans", system-ui, sans-serif'
