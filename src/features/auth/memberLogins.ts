/**
 * Connexion par prénom (dropdown) → email.
 *
 * Supabase Auth s'authentifie par **email** : ce module traduit le prénom choisi en email
 * AVANT `signInWithPassword`. Comme la RLS interdit de lire la table `members` sans session,
 * la liste est **statique** — cohérent avec un outil interne (~10 membres).
 *
 * ⚠️ Ajouter / retirer un membre = éditer cette liste (puis redéployer).
 * ⚠️ Les prénoms doivent rester **uniques** (sinon deux membres partageraient un identifiant
 *    de connexion). En cas d'homonyme : différencier (« Anne K. ») et garder l'unicité.
 *
 * Mapping confirmé avec Thibault le 2026-07-18 (mêmes valeurs que supabase/set_member_prenoms.sql).
 */
export interface MemberLogin {
  prenom: string
  email: string
}

/** Trié par prénom pour l'affichage du menu déroulant. */
export const MEMBER_LOGINS: MemberLogin[] = [
  { prenom: 'Adèle', email: 'adele.labbe.le.picard@gmail.com' },
  { prenom: 'Anne', email: 'annekammerer.sf@gmail.com' },
  { prenom: 'Antonin', email: 'amathieu@mspmenilmontant.fr' },
  { prenom: 'Aurélien', email: 'aurelien.descarpentries@gmail.com' },
  { prenom: 'Cécile', email: 'cecilegatter@gmail.com' },
  { prenom: 'Charlène', email: 'charly.lemet@gmail.com' },
  { prenom: 'Elena', email: 'elena.nasreddine@gmail.com' },
  { prenom: 'Estelle', email: 'gregoreestelle@gmail.com' },
  { prenom: 'Maylis', email: 'mbayleorthophoniste@gmail.com' },
  { prenom: 'Thibault', email: 'ipamspmenilmontant@tuta.com' },
]

/** Email associé à un prénom, ou `undefined` si le prénom n'est pas dans la liste. */
export function emailForPrenom(prenom: string): string | undefined {
  return MEMBER_LOGINS.find((m) => m.prenom === prenom)?.email
}
