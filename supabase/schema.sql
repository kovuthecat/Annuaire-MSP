-- ============================================================================
-- Annuaire MSP — schéma Supabase (Postgres) + RLS
-- À exécuter dans Supabase → SQL Editor → Run. Ré-exécutable sans casse.
-- Modèle : DECISIONS.md · ARCHITECTURE.md §Données affichées.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. MEMBRES (liés aux comptes auth Supabase)
-- ---------------------------------------------------------------------------
create table if not exists public.members (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  nom        text,
  prenom     text,
  profession text,
  role       text not null default 'membre' check (role in ('membre','referent')),
  created_at timestamptz not null default now()
);

-- À la création d'un compte auth, on crée automatiquement sa fiche membre.
-- (Provisionnement = inviter l'utilisateur dans Supabase → Auth → Users.)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.members (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Test d'appartenance (security definer => évite la récursion RLS sur members).
create or replace function public.is_member()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.members where id = auth.uid());
$$;

-- Test « est référent » (security definer, même motif que is_member) : sert la RLS des retours
-- (table feedback, section 6) — seul un référent lit / traite les retours des membres.
create or replace function public.is_referent()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.members where id = auth.uid() and role = 'referent'
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. CONTACTS (fiche flexible : praticien OU structure/ressource)
-- ---------------------------------------------------------------------------
create table if not exists public.contacts (
  id            uuid primary key default gen_random_uuid(),
  type          text not null default 'praticien'
                  check (type in ('praticien','structure','labo','autre')),
  sous_type     text,                         -- fin, optionnel (hôpital, centre de santé, CPTS…)
  civilite      text,                         -- Dr / Pr / M. / Mme
  nom           text not null,
  prenom        text,
  profession    text,                         -- spécialité
  orientation   text,                         -- « spé endométriose »
  etablissement text,
  adresse       text,
  arrondissement text,
  secteur_conv  text check (secteur_conv in ('1','2','centre','non_conv')),

  -- Coordonnées PATIENT (imprimables)
  tel_secretariat text,
  doctolib        text,
  site_web        text,
  email_rdv       text,                       -- mail public de prise de RDV (rdv@ghpsj.fr…)
                                              -- ≠ email_avis, qui est un canal pro confidentiel

  -- Coordonnées PRO (confidentielles — jamais imprimées)
  ligne_directe text,
  bip           text,
  portable      text,
  fax           text,
  email_avis    text,
  mssante       text,
  consignes_pro text,                         -- « préciser : adressé par la CPTS »…

  -- Adressage / accès
  prend_nouveaux text not null default 'inconnu'
                  check (prend_nouveaux in ('oui','non','liste_attente','inconnu')),
  delai         text,
  vad           boolean not null default false,
  ame_cmu       boolean not null default false,
  pmr           boolean not null default false,
  langues       text,
  tele_expertise text,
  tarif         text,

  -- Méta
  tags          text[] not null default '{}',
  statut        text not null default 'actif'
                  check (statut in ('actif','a_verifier','ne_prend_plus')),
  rpps          text,
  created_by    uuid references public.members (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_by    uuid references public.members (id) on delete set null,
  updated_at    timestamptz not null default now(),

  -- Provenance : d'où viennent les coordonnées, pour pouvoir les réactualiser plus tard.
  -- source_url pointe vers la page consultée (profil Doctolib, annuaire santé, site de la
  -- structure) — c'est le point d'entrée d'une future fonction « vérifier la fiche ».
  source_url        text,
  source_type       text check (source_type in
                      ('doctolib','annuaire_sante','site_officiel','carnet_membre','autre')),
  source_checked_at timestamptz
);

-- Ajout idempotent des colonnes récentes pour une base déjà créée
-- (create table if not exists ne les ajouterait pas).
alter table public.contacts add column if not exists email_rdv         text;
alter table public.contacts add column if not exists source_url        text;
alter table public.contacts add column if not exists source_type       text;
alter table public.contacts add column if not exists source_checked_at timestamptz;

-- Position géographique (géocodage BAN, backfill hors app — cf. plans/P3).
-- Pas d'index : le calcul de distance (Haversine) se fait côté client.
alter table public.contacts add column if not exists latitude      double precision;
alter table public.contacts add column if not exists longitude     double precision;
alter table public.contacts add column if not exists geocode_score real;          -- confiance BAN 0..1
alter table public.contacts add column if not exists geocoded_at   timestamptz;

-- Catégorie d'annuaire (facette de filtre, cf. revue 2026-07-19) — dérivée à l'import de
-- type/sous_type/tags, jamais saisie à la main. 5 valeurs : le praticien qu'on adresse, le
-- lieu de soin, la ligne d'avis (pro→pro), le transport sanitaire, la ressource (asso/outil).
alter table public.contacts add column if not exists categorie text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'contacts_categorie_check') then
    alter table public.contacts add constraint contacts_categorie_check check (categorie in
      ('Praticien','Structure de soins','Ligne d''avis','Transport sanitaire','Ressource'));
  end if;
end $$;
create index if not exists contacts_categorie_idx on public.contacts (categorie);

-- État « grisé » : fiche non exploitable en l'état, affichée en retrait. RÉVERSIBLE (cf. décision
-- Thibault 2026-07-19). Deux motifs :
--   'parti'     : le pro a cessé / quitté Paris / fermé → alerte « ne pas adresser » (levée à la main).
--   'incomplet' : coordonnées introuvables → un membre la DÉGRISE en la complétant (trigger ci-dessous).
alter table public.contacts add column if not exists grise_reason text;
alter table public.contacts add column if not exists grise_alerte text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'contacts_grise_reason_check') then
    alter table public.contacts add constraint contacts_grise_reason_check
      check (grise_reason in ('parti','incomplet'));
  end if;
end $$;

-- Dégrisage automatique : une fiche 'incomplet' redevient normale quand un membre lui AJOUTE
-- une coordonnée exploitable — c.-à-d. une transition « vide -> non vide » sur adresse ou un
-- moyen de contact. Volontairement en UPDATE SEULEMENT (pas à l'INSERT : le chargement initial
-- pose un état grisé délibéré) et sur transition (une fiche 'incomplet' qui possède déjà une
-- coordonnée — ex. doute d'identité — n'est PAS dégrisée). 'parti' n'est jamais effacé auto.
create or replace function public.clear_grise_on_complete()
returns trigger language plpgsql as $$
begin
  if new.grise_reason = 'incomplet' and (
       (coalesce(old.adresse,'')        = '' and coalesce(new.adresse,'')        <> '')
    or (coalesce(old.tel_secretariat,'')= '' and coalesce(new.tel_secretariat,'')<> '')
    or (coalesce(old.doctolib,'')       = '' and coalesce(new.doctolib,'')       <> '')
    or (coalesce(old.site_web,'')       = '' and coalesce(new.site_web,'')       <> '')
    or (coalesce(old.ligne_directe,'')  = '' and coalesce(new.ligne_directe,'')  <> '')
    or (coalesce(old.portable,'')       = '' and coalesce(new.portable,'')       <> '')
    or (coalesce(old.email_rdv,'')      = '' and coalesce(new.email_rdv,'')      <> '')
  ) then
    new.grise_reason := null;
    new.grise_alerte := null;
  end if;
  return new;
end;
$$;
drop trigger if exists contacts_clear_grise on public.contacts;
create trigger contacts_clear_grise
  before update on public.contacts
  for each row execute function public.clear_grise_on_complete();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'contacts_source_type_check') then
    alter table public.contacts add constraint contacts_source_type_check
      check (source_type in
        ('doctolib','annuaire_sante','site_officiel','carnet_membre','autre'));
  end if;
end;
$$;

-- updated_at / updated_by automatiques à chaque modification.
create or replace function public.set_updated()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists contacts_set_updated on public.contacts;
create trigger contacts_set_updated
  before update on public.contacts
  for each row execute function public.set_updated();

create index if not exists contacts_type_idx on public.contacts (type);
create index if not exists contacts_arr_idx  on public.contacts (arrondissement);
create index if not exists contacts_tags_idx on public.contacts using gin (tags);
-- Sert la future revue « fiches les plus anciennes à revérifier » (nulls = jamais vérifiées).
create index if not exists contacts_checked_idx on public.contacts (source_checked_at nulls first);

-- ---------------------------------------------------------------------------
-- 3. COMMENTAIRES (typés, signés, datés)
-- ---------------------------------------------------------------------------
create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  -- author_id NULL = commentaire sans auteur humain ; c'est alors `origine` qui dit d'où
  -- il vient et sert de signature à l'affichage. On n'attribue à aucun médecin un avis
  -- qu'il n'a pas écrit — une reco vaut par qui la porte.
  -- Les commentaires saisis dans l'app restent signés : la policy comments_insert
  -- impose author_id = auth.uid(). Seul l'import (hors RLS) écrit des null.
  author_id  uuid references public.members (id) on delete cascade default auth.uid(),
  -- Signature affichée quand author_id est null :
  --   'repertoire_partage' -> « Extrait de l'ancien répertoire »
  --   'enrichissement_web' -> « Trouvé sur le web » (source dans contacts.source_url)
  --   'signalement_msp'    -> « Signalé par la MSP » : fait connu de l'équipe, transmis à
  --                           l'import, qu'aucune source web ne confirme encore (le web est
  --                           souvent en retard sur une fermeture ou un déménagement).
  origine    text check (origine in
               ('repertoire_partage','enrichissement_web','signalement_msp')),
  type       text not null check (type in ('reco','alerte','spec','info')),
  texte      text not null,
  created_at timestamptz not null default now(),
  -- Un commentaire a soit un auteur humain, soit une origine documentée — jamais aucun des deux.
  constraint comments_auteur_ou_origine check (author_id is not null or origine is not null)
);

-- Idempotent : évolutions pour une base déjà créée.
alter table public.comments alter column author_id drop not null;
alter table public.comments add column if not exists origine text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'comments_origine_check') then
    alter table public.comments add constraint comments_origine_check
      check (origine in ('repertoire_partage','enrichissement_web','signalement_msp'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'comments_auteur_ou_origine') then
    alter table public.comments add constraint comments_auteur_ou_origine
      check (author_id is not null or origine is not null);
  end if;
end;
$$;

comment on column public.comments.author_id is
  'NULL = pas d''auteur humain ; la signature à afficher est donnée par `origine`.';
comment on column public.comments.origine is
  'Provenance d''un commentaire non signé : repertoire_partage (xlsx historique) ou '
  'enrichissement_web (import automatique). NULL pour un commentaire saisi dans l''app.';

create index if not exists comments_contact_idx on public.comments (contact_id);

-- ---------------------------------------------------------------------------
-- 4. « MA LISTE » (adoption d'une fiche par un membre)
--    « Mes contacts » = fiches créées par moi OU présentes dans ma liste.
-- ---------------------------------------------------------------------------
create table if not exists public.list_entries (
  member_id  uuid not null references public.members (id) on delete cascade default auth.uid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  added_at   timestamptz not null default now(),
  primary key (member_id, contact_id)
);

create index if not exists list_entries_contact_idx on public.list_entries (contact_id);

-- ---------------------------------------------------------------------------
-- 5. RLS — accès réservé aux membres authentifiés
-- ---------------------------------------------------------------------------
alter table public.members      enable row level security;
alter table public.contacts     enable row level security;
alter table public.comments     enable row level security;
alter table public.list_entries enable row level security;

-- MEMBERS : les membres se voient entre eux ; chacun édite sa propre fiche.
drop policy if exists members_select on public.members;
create policy members_select on public.members
  for select using (public.is_member());
drop policy if exists members_update_self on public.members;
create policy members_update_self on public.members
  for update using (id = auth.uid()) with check (id = auth.uid());

-- CONTACTS : lecture + création + édition collaborative + suppression par tout membre.
drop policy if exists contacts_select on public.contacts;
create policy contacts_select on public.contacts
  for select using (public.is_member());
drop policy if exists contacts_insert on public.contacts;
create policy contacts_insert on public.contacts
  for insert with check (public.is_member());
drop policy if exists contacts_update on public.contacts;
create policy contacts_update on public.contacts
  for update using (public.is_member()) with check (public.is_member());
drop policy if exists contacts_delete on public.contacts;
create policy contacts_delete on public.contacts
  for delete using (public.is_member());

-- COMMENTS : lecture par tous les membres ; chacun ne modifie/supprime que les siens.
drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments
  for select using (public.is_member());
drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments
  for insert with check (public.is_member() and author_id = auth.uid());
drop policy if exists comments_update_own on public.comments;
create policy comments_update_own on public.comments
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());
drop policy if exists comments_delete_own on public.comments;
create policy comments_delete_own on public.comments
  for delete using (author_id = auth.uid());

-- Commentaires « Extrait de l'ancien répertoire » (author_id null) : sans auteur, ils
-- ne matcheraient aucune policy « own » et seraient donc ineffaçables. Comme les fiches
-- (éditables par tout membre, cf. DECISIONS.md), on les rend curables collectivement.
drop policy if exists comments_update_legacy on public.comments;
create policy comments_update_legacy on public.comments
  for update using (author_id is null and public.is_member())
  with check (public.is_member());
drop policy if exists comments_delete_legacy on public.comments;
create policy comments_delete_legacy on public.comments
  for delete using (author_id is null and public.is_member());

-- LIST_ENTRIES : chacun ne gère que sa propre liste.
drop policy if exists list_entries_select on public.list_entries;
create policy list_entries_select on public.list_entries
  for select using (member_id = auth.uid());
drop policy if exists list_entries_insert on public.list_entries;
create policy list_entries_insert on public.list_entries
  for insert with check (member_id = auth.uid());
drop policy if exists list_entries_delete on public.list_entries;
create policy list_entries_delete on public.list_entries
  for delete using (member_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 6. RETOURS (feedback des membres sur la V1 — « Signaler un souci »)
--    Un membre dépose un retour signé (bouton flottant présent sur chaque page) ; seul le
--    référent les relit et les traite (écran /retours). Contexte de la page capturé
--    automatiquement (URL, fiche concernée, écran, navigateur) + capture d'écran optionnelle.
-- ---------------------------------------------------------------------------
create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  -- author_id = auth.uid() par défaut (retour signé, comme les commentaires). on delete set null :
  -- si le compte part, le retour reste lisible (utile pour corriger la V1).
  author_id   uuid references public.members (id) on delete set null default auth.uid(),
  category    text not null default 'probleme'
                check (category in ('probleme','donnee','suggestion')),
  message     text not null,
  status      text not null default 'nouveau'
                check (status in ('nouveau','en_cours','resolu')),

  -- Contexte capturé automatiquement à l'envoi (aide à reproduire / corriger).
  url         text,                    -- URL complète (pathname + query)
  page_label  text,                    -- nom lisible de l'écran (« Fiche », « Annuaire »…)
  -- Fiche concernée si le retour est émis depuis /contact/:id — set null si la fiche est supprimée.
  contact_id  uuid references public.contacts (id) on delete set null,
  viewport    text,                    -- « 1440×900 »
  user_agent  text,
  -- Capture d'écran (data URL JPEG redimensionnée+compressée côté client), optionnelle et
  -- volumineuse : jamais sélectionnée dans la liste des retours, chargée à la demande au détail.
  screenshot  text,
  -- Drapeau léger « ce retour a une capture » : la liste référent l'affiche sans charger l'image.
  has_screenshot boolean not null default false,

  created_at  timestamptz not null default now()
);

-- Idempotent (base déjà créée avant l'ajout du drapeau).
alter table public.feedback add column if not exists has_screenshot boolean not null default false;

create index if not exists feedback_status_idx  on public.feedback (status, created_at desc);
create index if not exists feedback_contact_idx on public.feedback (contact_id);

alter table public.feedback enable row level security;

-- Tout membre dépose un retour signé ; seul le référent lit, traite (statut) et supprime.
drop policy if exists feedback_insert on public.feedback;
create policy feedback_insert on public.feedback
  for insert with check (public.is_member() and author_id = auth.uid());
drop policy if exists feedback_select on public.feedback;
create policy feedback_select on public.feedback
  for select using (public.is_referent());
drop policy if exists feedback_update on public.feedback;
create policy feedback_update on public.feedback
  for update using (public.is_referent()) with check (public.is_referent());
drop policy if exists feedback_delete on public.feedback;
create policy feedback_delete on public.feedback
  for delete using (public.is_referent());

-- ============================================================================
-- APRÈS EXÉCUTION :
--  1. Auth → Providers → Email : activer « Email + Password » ; DÉSACTIVER « Confirm email »
--     et « Allow new users to sign up » (groupe fermé, comptes provisionnés). Pas de Magic Link.
--  2. Créer les membres : Auth → Users → Add user (email + mot de passe initial + « Auto Confirm »).
--     Le trigger crée la fiche membre. Chacun changera son mot de passe dans l'app.
--     (L'envoi d'emails intégré étant limité à ~2/h, on n'y a pas recours pour le login.)
--  3. Se désigner référent :  update public.members set role='referent'
--                             where email='ton.email@msp-menilmontant.fr';
-- ============================================================================
