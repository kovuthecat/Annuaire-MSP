# -*- coding: utf-8 -*-
"""Seed incremental pour l'integration du carnet de Clara (2026-08-10).

A la difference de gen_sql.py (qui regenere le seed complet des 1233 fiches), ce script
ne touche que les fiches modifiees par cette integration : 7 nouvelles (idx 1233-1239)
+ 13 existantes enrichies (owner clara + quelques champs/commentaires nouveaux).

Sur en prod (contacts/comments/list_entries deja peuples), inutile et risque de rejouer
le seed complet - celui-ci est volontairement petit (~20 fiches) et review-able.
Idempotent : id deterministes + on conflict do nothing, comme gen_sql.py.
"""
import json, os, uuid

HERE = os.path.dirname(os.path.abspath(__file__))
NS = uuid.UUID("6f9b1e2a-3c4d-5e6f-8a9b-0c1d2e3f4a5b")
OWNERS = ["anne", "charlene", "aurelien", "antonin", "elena", "maylis", "clara"]

NEW_IDX = list(range(1233, 1240))
TOUCHED_IDX = [27, 32, 98, 110, 112, 266, 273, 526, 637, 702, 886, 933, 1139]

def cid(idx):
    return str(uuid.uuid5(NS, "annuaire-msp:contact:%d" % idx))

def q(v):
    if v is None or v == "":
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    return "'" + str(v).replace("'", "''") + "'"

def qarr(vals):
    if not vals:
        return "'{}'"
    return "array[" + ",".join(q(v) for v in vals) + "]::text[]"

COLS = ["type","sous_type","civilite","nom","prenom","profession","orientation",
        "etablissement","adresse","arrondissement","secteur_conv","tel_secretariat",
        "doctolib","site_web","email_rdv","ligne_directe","bip","portable","fax",
        "email_avis","mssante","consignes_pro","prend_nouveaux","delai","vad",
        "ame_cmu","pmr","langues","tele_expertise","tarif","tags","statut",
        "categorie","grise_reason","grise_alerte","rpps",
        "source_url","source_type","source_checked_at",
        "latitude","longitude","geocode_score","geocoded_at"]
BOOLS = {"vad", "ame_cmu", "pmr"}
NUMS = {"latitude", "longitude", "geocode_score"}

def cell(c, k):
    if k == "tags":
        return qarr(c.get("tags") or [])
    if k in BOOLS:
        return q(bool(c.get(k)))
    if k in NUMS:
        v = c.get(k)
        return "null" if v in (None, "") else repr(float(v))
    if k == "source_type":
        return q(c.get("source_type") or "carnet_membre")
    if k == "grise_reason":
        return q((c.get("_meta", {}).get("grise") or {}).get("reason"))
    if k == "grise_alerte":
        return q((c.get("_meta", {}).get("grise") or {}).get("alerte"))
    return q(c.get(k))

SRC = os.path.join(HERE, "..", "annuaire_donnees.json")
DEST = os.path.join(HERE, "..", "seed_clara_incremental.sql")
data = json.load(open(SRC, encoding="utf-8"))
by_idx = {c["_meta"]["idx"]: c for c in data}
new_records = [by_idx[i] for i in NEW_IDX]
touched_records = [by_idx[i] for i in TOUCHED_IDX]

out = []
w = out.append
w("-- ============================================================================")
w("-- Annuaire MSP -- seed incremental : integration du carnet de Clara (2026-08-10)")
w("-- 7 fiches nouvelles + 13 fiches existantes enrichies (owner clara + champs/commentaires).")
w("-- A executer dans Supabase -> SQL Editor, sur la base de PRODUCTION.")
w("-- Idempotent (id deterministes, on conflict do nothing / not exists) : rejouable sans")
w("-- doublon si interrompu ou relance. Ne touche AUCUNE autre fiche que celles listees ici.")
w("-- ============================================================================")
w("")
w("create temp table seed_owner_map (slug text primary key, email text not null);")
w("insert into seed_owner_map (slug, email) values")
w("  ('anne',     'annekammerer.sf@gmail.com'),")
w("  ('charlene', 'charly.lemet@gmail.com'),")
w("  ('aurelien', 'aurelien.descarpentries@gmail.com'),")
w("  ('antonin',  'amathieu@mspmenilmontant.fr'),")
w("  ('elena',    'elena.nasreddine@gmail.com'),")
w("  ('maylis',   'mbayleorthophoniste@gmail.com'),")
w("  ('clara',    'clara.douchaine@gmail.com');")
w("")
w("do $$")
w("declare manquants text;")
w("begin")
w("  select string_agg(o.slug || ' -> ' || o.email, ', ') into manquants")
w("  from seed_owner_map o")
w("  where not exists (select 1 from public.members m where m.email = o.email);")
w("  if manquants is not null then")
w("    raise exception 'Comptes introuvables dans public.members : %.', manquants;")
w("  end if;")
w("end $$;")
w("")

# ---- 1. nouveaux contacts ----------------------------------------------------
w("-- ---------------------------------------------------------------------------")
w("-- 1. NOUVEAUX CONTACTS (%d fiches, idx 1233-1239)" % len(new_records))
w("-- ---------------------------------------------------------------------------")
w("create temp table seed_contacts (id uuid primary key, creator_slug text);")
w("")
rows = []
for c in new_records:
    i = c["_meta"]["idx"]
    rows.append("  (%s::uuid, %s)" % (q(cid(i)), ",".join(cell(c, k) for k in COLS)))
w("insert into public.contacts (id,%s) values" % ",".join(COLS))
w(",\n".join(rows))
w("on conflict (id) do nothing;")
w("")
creators = []
for c in new_records:
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

# ---- 2. commentaires (nouveaux + ajoutes aux fiches existantes) -------------
all_for_comments = new_records + touched_records
comments = []
for c in all_for_comments:
    idx = c["_meta"]["idx"]
    for cm in (c.get("comments") or []):
        comments.append((idx, cm))
w("-- ---------------------------------------------------------------------------")
w("-- 2. COMMENTAIRES (%d) -- fiches nouvelles + fiches existantes enrichies." % len(comments))
w("-- Dedoublonnage sur (contact_id, texte, author) : les commentaires deja presents")
w("-- (deja importes lors du seed initial) sont ignores, seuls les nouveaux s'ajoutent.")
w("-- ---------------------------------------------------------------------------")
w("create temp table seed_comments (contact_id uuid, slug text, origine text,")
w("                                  type text, texte text);")
crows = []
for idx, cm in comments:
    slug = cm.get("author")
    origine = cm.get("origine")
    if slug == "partage":
        slug, origine = None, "repertoire_partage"
    if slug is None and not origine:
        origine = "enrichissement_web"
    if slug is not None:
        origine = None
    crows.append("  (%s::uuid, %s, %s, %s, %s)" % (
        q(cid(idx)), q(slug), q(origine),
        q(cm.get("type", "info")), q(cm.get("texte"))))
if crows:
    w("insert into seed_comments (contact_id, slug, origine, type, texte) values")
    w(",\n".join(crows) + ";")
    w("")
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

# ---- 3. "mes contacts" (owners), nouvelles fiches + fiches enrichies -------
entries = []
for c in new_records:
    for o in c["_meta"]["owners"]:
        entries.append((c["_meta"]["idx"], o))
for c in touched_records:
    entries.append((c["_meta"]["idx"], "clara"))
w("-- ---------------------------------------------------------------------------")
w("-- 3. « MES CONTACTS » (%d entrees) -- ajoute Clara comme proprietaire des" % len(entries))
w("-- fiches deja existantes qu'elle a confirmees, + les proprietaires des 7 fiches neuves.")
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

# ---- 4. mises a jour de champs sur des fiches existantes (fill-empty only) --
w("-- ---------------------------------------------------------------------------")
w("-- 4. CHAMPS COMPLETES sur 2 fiches existantes -- UNIQUEMENT si encore vides en base")
w("-- (coalesce : ne peut pas ecraser une valeur saisie depuis par un membre dans l'app).")
w("-- ---------------------------------------------------------------------------")
w("update public.contacts set")
w("  tel_secretariat = coalesce(tel_secretariat, %s)," % q("01 77 37 57 30"))
w("  prend_nouveaux  = case when prend_nouveaux = 'inconnu' then 'oui' else prend_nouveaux end")
w("where id = %s::uuid;  -- idx 112, Lepelletier-Beaufond Clemence" % q(cid(112)))
w("")
w("update public.contacts set")
w("  email_rdv = coalesce(email_rdv, %s)" % q("consultation.hepatogast@aphp.fr"))
w("where id = %s::uuid;  -- idx 273, Hepato-Gastro-Enterologie Tenon" % q(cid(273)))
w("")

# ---- 5. controle --------------------------------------------------------------
w("-- ---------------------------------------------------------------------------")
w("-- 5. CONTROLE")
w("-- ---------------------------------------------------------------------------")
w("select 'contacts total' as label, count(*)::text from public.contacts")
w("union all select 'nouvelles fiches Clara presentes', count(*)::text from public.contacts")
w("  where id in (%s)" % ",".join("%s::uuid" % q(cid(i)) for i in NEW_IDX))
w("union all select 'fiches Clara dans mes contacts', count(*)::text from public.list_entries le")
w("  join public.members m on m.id = le.member_id and m.email = 'clara.douchaine@gmail.com';")

path = DEST
open(path, "w", encoding="utf-8").write("\n".join(out) + "\n")
kb = os.path.getsize(path) / 1024
print("ecrit : %s (%.1f Ko)" % (os.path.basename(path), kb))
print("  nouveaux contacts : %d" % len(new_records))
print("  comments (fiches touchees) : %d" % len(comments))
print("  list_entries : %d" % len(entries))
