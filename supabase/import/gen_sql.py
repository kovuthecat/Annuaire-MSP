# -*- coding: utf-8 -*-
"""Génère le seed SQL d'import (contacts + comments + list_entries).

Les UUID des membres n'existent pas encore (comptes Supabase à provisionner), donc
le seed les résout PAR EMAIL à l'exécution, via une table temporaire que l'humain
renseigne en tête de fichier. Aucun UUID de membre n'est codé en dur.

Les id de contacts, eux, sont déterministes (uuid5) : le script est ré-exécutable
sans créer de doublons (`on conflict do nothing`).
"""
import json, os, uuid, datetime

SCRATCH = os.path.dirname(os.path.abspath(__file__))
NS = uuid.UUID("6f9b1e2a-3c4d-5e6f-8a9b-0c1d2e3f4a5b")   # espace de noms du projet
# elena + maylis ajoutés 2026-07-18 (carnet Elena + listes Google Maps de Maylis),
# emails renseignés le 2026-07-18 (comptes Supabase provisionnés).
OWNERS = ["anne", "charlene", "aurelien", "antonin", "elena", "maylis"]

def cid(idx):
    return str(uuid.uuid5(NS, "annuaire-msp:contact:%d" % idx))

def q(v):
    """Littéral SQL. None -> NULL. Les quotes sont doublées."""
    if v is None or v == "":
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    return "'" + str(v).replace("'", "''") + "'"

def qarr(vals):
    if not vals:
        return "'{}'"
    return "array[" + ",".join(q(v) for v in vals) + "]::text[]"

# Paramétrable : la 2e passe (open data CNAM) part d'un jeu produit hors du dépôt et
# écrit le seed à sa place définitive, dans supabase/.
SRC = os.environ.get("GEN_SRC")
if not SRC:
    SRC = os.path.join(SCRATCH, "merged_enriched.json")
    if not os.path.exists(SRC):
        SRC = os.path.join(SCRATCH, "merged.json")
DEST = os.environ.get("GEN_DEST") or os.path.join(SCRATCH, "seed_annuaire.sql")
data = json.load(open(SRC, encoding="utf-8"))
print("source : %s" % os.path.basename(SRC))

COLS = ["type","sous_type","civilite","nom","prenom","profession","orientation",
        "etablissement","adresse","arrondissement","secteur_conv","tel_secretariat",
        "doctolib","site_web","email_rdv","ligne_directe","bip","portable","fax",
        "email_avis","mssante","consignes_pro","prend_nouveaux","delai","vad",
        "ame_cmu","pmr","langues","tele_expertise","tarif","tags","statut",
        "categorie","grise_reason","grise_alerte","rpps",
        "source_url","source_type","source_checked_at"]
BOOLS = {"vad", "ame_cmu", "pmr"}

def cell(c, k):
    if k == "tags":
        return qarr(c.get("tags") or [])
    if k in BOOLS:
        return q(bool(c.get(k)))
    if k == "source_type":
        # Sans enrichissement web, la donnée vient du carnet d'un médecin.
        return q(c.get("source_type") or "carnet_membre")
    # Grisage : rangé dans _meta.grise = {reason, alerte} (cf. revue d'arbitrage 2026-07-19).
    if k == "grise_reason":
        return q((c.get("_meta", {}).get("grise") or {}).get("reason"))
    if k == "grise_alerte":
        return q((c.get("_meta", {}).get("grise") or {}).get("alerte"))
    return q(c.get(k))

out = []
w = out.append
w("-- ============================================================================")
w("-- Annuaire MSP — seed d'import des carnets d'adresses")
w("-- Généré automatiquement. À exécuter APRÈS schema.sql, dans Supabase → SQL Editor.")
w("-- Ré-exécutable sans doublon (id déterministes + on conflict do nothing).")
w("--")
w("-- Sources : carnets individuels d'Anne, Charlène, Aurélien, Antonin")
w("--           + ancien répertoire partagé (Répertoire partagé MSPM V2.xlsx).")
w("-- ============================================================================")
w("")
w("-- ---------------------------------------------------------------------------")
w("-- Correspondance carnet -> compte Supabase, PAR EMAIL (aucun UUID codé en dur).")
w("-- Les comptes doivent exister (Auth → Users) : le trigger on_auth_user_created")
w("-- a créé leur fiche dans public.members. Le garde-fou ci-dessous refuse de tourner")
w("-- si l'un d'eux manque, plutôt que d'importer un carnet dans le vide.")
w("-- ---------------------------------------------------------------------------")
w("create temp table seed_owner_map (slug text primary key, email text not null);")
w("insert into seed_owner_map (slug, email) values")
w("  ('anne',     'annekammerer.sf@gmail.com'),")
w("  ('charlene', 'charly.lemet@gmail.com'),")
w("  ('aurelien', 'aurelien.descarpentries@gmail.com'),")
w("  ('antonin',  'amathieu@mspmenilmontant.fr'),")
w("  ('elena',    'elena.nasreddine@gmail.com'),")
w("  ('maylis',   'mbayleorthophoniste@gmail.com');")
w("-- Les commentaires de l'ancien répertoire partagé ne figurent pas ici : ils sont")
w("-- importés avec author_id = null et s'affichent « Extrait de l'ancien répertoire ».")
w("")
w("-- Garde-fou : refuser de tourner si un carnet ne correspond à aucun compte,")
w("-- sinon 300 fiches atterriraient silencieusement dans la liste de personne.")
w("do $$")
w("declare manquants text;")
w("begin")
w("  select string_agg(o.slug || ' -> ' || o.email, ', ') into manquants")
w("  from seed_owner_map o")
w("  where not exists (select 1 from public.members m where m.email = o.email);")
w("  if manquants is not null then")
w("    raise exception 'Comptes introuvables dans public.members : %. "
  "Crée-les (Auth -> Users) ou corrige seed_owner_map.', manquants;")
w("  end if;")
w("end $$;")
w("")

# ---- contacts ---------------------------------------------------------------
w("-- ---------------------------------------------------------------------------")
w("-- 1. CONTACTS (%d fiches)" % len(data))
w("-- created_by = 1er carnet d'origine ; null pour les fiches issues du seul")
w("-- répertoire partagé (elles n'appartiennent à personne).")
w("-- ---------------------------------------------------------------------------")
w("create temp table seed_contacts (id uuid primary key, creator_slug text);")
w("")
rows = []
for c in data:
    i = c["_meta"]["idx"]
    rows.append("  (%s::uuid, %s)" % (q(cid(i)), ",".join(cell(c, k) for k in COLS)))
w("insert into public.contacts (id,%s) values" % ",".join(COLS))
w(",\n".join(rows))
w("on conflict (id) do nothing;")
w("")
creators = []
for c in data:
    owners = c["_meta"]["owners"]
    slug = next((o for o in OWNERS if o in owners), None)
    creators.append("  (%s::uuid, %s)" % (q(cid(c["_meta"]["idx"])), q(slug)))
w("insert into seed_contacts (id, creator_slug) values")
w(",\n".join(creators))
w("on conflict (id) do nothing;")
w("")
w("update public.contacts c set created_by = m.id")
w("from seed_contacts s")
w("  join seed_owner_map o on o.slug = s.creator_slug")
w("  join public.members m on m.email = o.email")
w("where c.id = s.id and c.created_by is null;")
w("")

# ---- comments ---------------------------------------------------------------
comments = [(c["_meta"]["idx"], cm) for c in data for cm in (c.get("comments") or [])]
w("-- ---------------------------------------------------------------------------")
w("-- 2. COMMENTAIRES (%d) — signés par l'auteur du carnet d'origine." % len(comments))
w("-- Une fiche connue de 2 médecins porte les avis des 2, chacun attribué.")
w("-- author_id null = « Extrait de l'ancien répertoire » (xlsx, auteur inconnu).")
w("-- ---------------------------------------------------------------------------")
w("create temp table seed_comments (contact_id uuid, slug text, origine text,")
w("                                  type text, texte text);")
crows = []
for idx, cm in comments:
    # Trois provenances possibles (cf. comments.origine) :
    #  - author = anne/charlene/... -> commentaire signé du carnet d'origine
    #  - author = 'partage'         -> ancien répertoire xlsx, auteur inconnu
    #  - author = None + origine    -> ajouté par l'enrichissement web ou la MSP
    slug = cm.get("author")
    origine = cm.get("origine")
    if slug == "partage":
        slug, origine = None, "repertoire_partage"
    if slug is None and not origine:
        origine = "enrichissement_web"
    if slug is not None:
        origine = None          # un commentaire signé n'a pas d'origine système
    crows.append("  (%s::uuid, %s, %s, %s, %s)" % (
        q(cid(idx)), q(slug), q(origine),
        q(cm.get("type", "info")), q(cm.get("texte"))))
if crows:
    w("insert into seed_comments (contact_id, slug, origine, type, texte) values")
    w(",\n".join(crows) + ";")
    w("")
    # left join : un slug null (ancien répertoire) donne author_id null et reste importé.
    w("insert into public.comments (contact_id, author_id, origine, type, texte)")
    w("select s.contact_id, m.id, s.origine, s.type, s.texte")
    w("from seed_comments s")
    w("  left join seed_owner_map o on o.slug = s.slug")
    w("  left join public.members m on m.email = o.email")
    w("where not exists (")
    w("  select 1 from public.comments x")
    w("  where x.contact_id = s.contact_id and x.texte = s.texte")
    w("    and x.author_id is not distinct from m.id")
    w(");")
w("")

# ---- list_entries -----------------------------------------------------------
entries = [(c["_meta"]["idx"], o) for c in data for o in c["_meta"]["owners"]]
w("-- ---------------------------------------------------------------------------")
w("-- 3. « MES CONTACTS » (%d entrées)" % len(entries))
w("-- Chaque fiche retourne dans la liste perso du/des médecin(s) dont elle vient.")
w("-- Une fiche connue de plusieurs médecins apparaît dans la liste de chacun.")
w("-- Les fiches du seul répertoire partagé n'entrent dans la liste de personne.")
w("-- ---------------------------------------------------------------------------")
w("create temp table seed_list (contact_id uuid, slug text);")
lrows = ["  (%s::uuid, %s)" % (q(cid(i)), q(o)) for i, o in entries]
w("insert into seed_list (contact_id, slug) values")
w(",\n".join(lrows) + ";")
w("")
w("insert into public.list_entries (member_id, contact_id)")
w("select m.id, s.contact_id")
w("from seed_list s")
w("  join seed_owner_map o on o.slug = s.slug")
w("  join public.members m on m.email = o.email")
w("on conflict (member_id, contact_id) do nothing;")
w("")

# ---- contrôle ---------------------------------------------------------------
w("-- ---------------------------------------------------------------------------")
w("-- 4. CONTRÔLE — à lire après exécution")
w("-- ---------------------------------------------------------------------------")
w("select 'contacts'     as table, count(*) from public.contacts")
w("union all select 'comments',    count(*) from public.comments")
w("union all select 'list_entries', count(*) from public.list_entries")
w("union all select 'à vérifier',  count(*) from public.contacts where statut = 'a_verifier'")
w("union all select 'fiches vérifiées sur le web', count(*) from public.contacts")
w("           where source_checked_at is not null")
w("union all select 'commentaires signés', count(*) from public.comments where author_id is not null")
w("union all select 'comm. ancien répertoire', count(*) from public.comments")
w("           where origine = 'repertoire_partage'")
w("union all select 'comm. trouvés sur le web', count(*) from public.comments")
w("           where origine = 'enrichissement_web'")
w("union all select 'comm. signalés par la MSP', count(*) from public.comments")
w("           where origine = 'signalement_msp';")
w("")
w("-- Carnets dont l'email n'a pas été retrouvé dans members (=> import partiel) :")
w("select o.slug, o.email")
w("from seed_owner_map o")
w("where not exists (select 1 from public.members m where m.email = o.email);")

path = DEST
open(path, "w", encoding="utf-8").write("\n".join(out) + "\n")
kb = os.path.getsize(path) / 1024
print("écrit : seed_annuaire.sql (%.0f Ko)" % kb)
print("  contacts     : %d" % len(data))
print("  comments     : %d" % len(comments))
print("  list_entries : %d" % len(entries))
