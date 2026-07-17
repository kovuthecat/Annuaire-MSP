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
