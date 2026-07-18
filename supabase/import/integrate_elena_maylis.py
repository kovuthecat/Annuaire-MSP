# -*- coding: utf-8 -*-
"""Intègre les carnets Elena + Maylis dans annuaire_donnees.json (base 1052 fiches).

Étapes :
  A. Dédup INTERNE elena <-> maylis (+ répétitions internes) -> fiches neuves fusionnées,
     owners = {elena?, maylis?}, comments cumulés et signés.
  B. Dédup contre la BASE (idx 0..1051) :
       - match sûr    -> ajoute owner(s) à la fiche base, empile comments, remplit les
                         champs null (jamais d'écrasement), signale les conflits en comment.
       - ambigu       -> fiche NEUVE + _meta.doublon_possible (revue humaine).
       - pas de match -> fiche NEUVE (idx 1052+).
  C. Écrit la base mise à jour, le nouveau CSV (format Feuille de calcul), le rapport.

Ne modifie PAS le CSV de la passe Doctolib en cours (Downloads). La réconciliation de
celui-ci avec le JSON reste à faire plus tard, sur les idx 0..1051 (disjoints des neufs).
"""
import json, re, unicodedata, itertools, os, csv
from collections import defaultdict, Counter

HERE   = os.path.dirname(os.path.abspath(__file__))
REPO   = r"c:\Users\kovu\SynologyDrive\Thibault\Projets\annuaire-msp\supabase"
BASE_F = os.path.join(REPO, "annuaire_donnees.json")
ELENA  = os.path.join(HERE, "contacts_elena.json")
MAYLIS = os.path.join(HERE, "contacts_maylis.json")
OUT_JSON = os.path.join(HERE, "annuaire_donnees.NEW.json")   # inspection avant écrasement
OUT_CSV  = os.path.join(HERE, "nouvelles_fiches_worklist.csv")
OUT_RPT  = os.path.join(HERE, "integration_report.txt")

# ---------------------------------------------------------------- helpers (repris de merge.py)
def strip_accents(s):
    return "".join(c for c in unicodedata.normalize("NFD", s)
                   if unicodedata.category(c) != "Mn")

TITLES = re.compile(r"^(dr|dre|pr|docteur|professeur|m|mme|me|mr)\.?\s+", re.I)

def norm_name(s):
    if not s:
        return ""
    s = strip_accents(str(s)).lower().strip()
    while TITLES.match(s):
        s = TITLES.sub("", s)
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    return re.sub(r"\s+", " ", s).strip()

def norm_phone(s):
    if not s:
        return None
    d = re.sub(r"\D", "", str(s))
    if d.startswith("33") and len(d) == 11:
        d = "0" + d[2:]
    return d if len(d) == 10 else None

def phones(c):
    out = set()
    for f in ("tel_secretariat", "ligne_directe", "portable", "fax"):
        for part in re.split(r"[/;,]| ou ", str(c.get(f) or "")):
            p = norm_phone(part)
            if p:
                out.add(p)
    return out

FAMILIES = {
    "gyneco": ["gyneco", "obstet", "sage-femme", "sage femme", "colposcop", "amp", "pma"],
    "derma": ["dermato", "venerolog"],
    "cardio": ["cardio"],
    "gastro": ["gastro", "hepato", "procto", "endoscop"],
    "psy": ["psychiatre", "psycholog", "psychanalyste", "psychothera", "pedopsy", "sexolog",
            "neuropsy"],
    "kine": ["kine", "masseur", "osteo", "psychomot", "ergothera", "chiro", "kinesiolog"],
    "neuro": ["neurolog"],
    "rhumato": ["rhumato"],
    "ortho": ["orthoped", "traumato", "chirurgien orthop"],
    "orl": ["orl", "oto-rhino", "oto rhino"],
    "ophta": ["ophtalmo", "orthopt"],
    "endoc": ["endocrino", "diabeto", "nutrition", "dieteti"],
    "pneumo": ["pneumo", "allergo"],
    "uro": ["urolog", "nephro"],
    "pediatrie": ["pediatr", "puericult"],
    "bio": ["labo", "biolog"],
    "imagerie": ["radiolog", "imagerie", "echograph", "irm", "scanner"],
    "generaliste": ["generalis", "medecine generale"],
    "dentiste": ["dentiste", "stomato", "orthodont", "parodont"],
    "podo": ["podolog", "pedicure"],
    "ortho_phonie": ["orthophon"],
    "infirmier": ["infirmier", "ide"],
    "social": ["social", "assistante", "mediateur"],
    "acupuncture": ["acupunct"],
    "sagefemme": ["sage-femme", "sage femme"],
}

def families(c):
    blob = norm_name(" ".join(filter(None, [
        c.get("profession"), c.get("orientation"), " ".join(c.get("tags") or [])])))
    return {fam for fam, kws in FAMILIES.items() if any(k in blob for k in kws)}

def prof_compatible(a, b):
    fa, fb = families(a), families(b)
    if not fa or not fb:
        return True
    return bool(fa & fb)

def lev(a, b, cap=3):
    if abs(len(a) - len(b)) > cap:
        return cap + 1
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        if min(cur) > cap:
            return cap + 1
        prev = cur
    return prev[-1]

def prenom_compatible(a, b):
    pa, pb = norm_name(a.get("prenom")), norm_name(b.get("prenom"))
    if not pa or not pb:
        return True
    if pa == pb:
        return True
    if len(pa) == 1 or len(pb) == 1:
        return pa[0] == pb[0]
    return pa[0] == pb[0] and lev(pa, pb) <= 1

# variantes d'orthographe connues (reprises de merge.py ; utile car Elena écrit
# « de belilovsky », « moyal baracco » déjà canonisés dans la base)
CANON = {
    "boddocq": "beddocq", "ben jazia": "benjazia",
    "moyal baracco": "moyal barracco", "moyal barraco": "moyal barracco",
    "de belilorski": "de belilovsky", "de belilovski": "de belilovsky",
    "aguilevar": "aguilera", "assadouria": "assadourian",
}

def canon_nom(c):
    n = norm_name(c.get("nom"))
    return CANON.get(n, n)

STREET_STOP = {"rue","r","av","avenue","bd","boulevard","bld","allee","all","place","pl",
               "impasse","quai","cours","cite","villa","passage","chemin","route","square",
               "faubourg","fbg","bis","ter","de","du","des","la","le","les","d","l","a","et",
               "metro","paris"}
def street_tokens(adr):
    return {t for t in norm_name(adr).split()
            if t and not t.isdigit() and t not in STREET_STOP}
def adresse_compatible(a, b):
    ta, tb = street_tokens(a.get("adresse")), street_tokens(b.get("adresse"))
    if not ta or not tb:
        return False
    return len(ta & tb) >= 2 or (bool(ta & tb) and (ta <= tb or tb <= ta))
def tokens(c):
    return set(canon_nom(c).split())
def subset_names(a, b):
    ta, tb = tokens(a), tokens(b)
    return bool(ta) and bool(tb) and (ta <= tb or tb <= ta) and ta != tb

def pick(vals):
    vals = [v for v in vals if v not in (None, "", [])]
    if not vals:
        return None
    return max(vals, key=lambda v: (len(str(v)), str(v)))

def pick_name(vals):
    vals = [v for v in vals if v not in (None, "", [])]
    if not vals:
        return None
    counts = Counter(norm_name(v) for v in vals)
    best_norm, _ = counts.most_common(1)[0]
    cands = [v for v in vals if norm_name(v) == best_norm]
    def accents(v):
        return sum(1 for ch in str(v) if ch != strip_accents(ch))
    return max(cands, key=lambda v: (accents(v), len(str(v))))

SCALARS = ["type","sous_type","civilite","nom","prenom","profession","orientation",
           "etablissement","adresse","arrondissement","secteur_conv","tel_secretariat",
           "doctolib","site_web","email_rdv","ligne_directe","bip","portable","fax",
           "email_avis","mssante","consignes_pro","delai","langues","tele_expertise",
           "tarif","rpps"]
CONF = {"high": 3, "medium": 2, "low": 1}

# ---------------------------------------------------------------- Étape A : dédup interne
def load_new(path, owner):
    if not os.path.exists(path):
        raise SystemExit("!! manquant : " + path)
    recs = json.load(open(path, encoding="utf-8"))
    for c in recs:
        c.setdefault("_meta", {})
        c["_meta"]["source_owner"] = c["_meta"].get("source_owner", owner)
    return recs

records = load_new(ELENA, "elena") + load_new(MAYLIS, "maylis")
print("nouvelles fiches brutes : %d (elena+maylis)" % len(records))

buckets = defaultdict(list)
for i, c in enumerate(records):
    k = canon_nom(c)
    if k:
        buckets[k].append(i)
    for p in phones(c):
        buckets["tel:" + p].append(i)

parent = list(range(len(records)))
def find(x):
    while parent[x] != x:
        parent[x] = parent[parent[x]]; x = parent[x]
    return x
def union(a, b):
    ra, rb = find(a), find(b)
    if ra != rb:
        parent[max(ra, rb)] = min(ra, rb)

internal_review = []
for k, idxs in buckets.items():
    if len(idxs) < 2 or len(idxs) > 60:
        continue
    for i, j in itertools.combinations(idxs, 2):
        a, b = records[i], records[j]
        if a["type"] != b["type"]:
            continue
        shared_phone = bool(phones(a) & phones(b))
        if k.startswith("tel:"):
            if norm_name(a.get("nom")) == norm_name(b.get("nom")) \
               or not norm_name(a.get("nom")) or not norm_name(b.get("nom")):
                union(i, j)
            else:
                internal_review.append((i, j, "même téléphone, noms différents"))
            continue
        if not prenom_compatible(a, b):
            continue
        if shared_phone:
            union(i, j); continue
        if a["type"] == "structure":
            same_etab = norm_name(a.get("etablissement")) == norm_name(b.get("etablissement"))
            same_prof = norm_name(a.get("profession")) == norm_name(b.get("profession"))
            if same_prof and same_etab:
                union(i, j)
            continue
        if not prof_compatible(a, b):
            internal_review.append((i, j, "même nom, spécialités incompatibles")); continue
        union(i, j)

# passe floue interne : variantes d'orthographe / double nom / ordre — mais seulement
# avec un corroborant (même prénom, même adresse, ou même arrondissement). Sans preuve
# secondaire, on renvoie à la revue plutôt que de fusionner à tort (cf. merge.py).
by_type_new = defaultdict(list)
for i, c in enumerate(records):
    if norm_name(c.get("nom")):
        by_type_new[c["type"]].append(i)
fuzzy = 0
for t, idxs in by_type_new.items():
    for i, j in itertools.combinations(idxs, 2):
        if find(i) == find(j):
            continue
        a, b = records[i], records[j]
        na, nb = canon_nom(a), canon_nom(b)
        if na == nb or min(len(na), len(nb)) < 4:
            continue
        sub = subset_names(a, b)
        d = lev(na, nb, cap=2)
        if not sub and (d > 2 or na[0] != nb[0]):
            continue
        worth = sub or d <= 1        # dist-2 sans double-nom : trop peu fiable pour signaler
        if not (prenom_compatible(a, b) and prof_compatible(a, b)):
            if worth:
                internal_review.append((i, j, "nom proche (dist %d) — à confirmer" % d))
            continue
        pa, pb = norm_name(a.get("prenom")), norm_name(b.get("prenom"))
        corrob = bool(phones(a) & phones(b)) or adresse_compatible(a, b) or \
                 (a.get("arrondissement") and a.get("arrondissement") == b.get("arrondissement"))
        if (d <= 1 and pa and pb) or corrob or (sub and prof_compatible(a, b) and (pa or pb)):
            union(i, j); fuzzy += 1
        elif worth:
            internal_review.append((i, j, "nom proche (dist %d) — à confirmer" % d))
print("rapprochements flous internes : %d" % fuzzy)

groups = defaultdict(list)
for i in range(len(records)):
    groups[find(i)].append(i)

def merge_group(idxs):
    cs = sorted((records[i] for i in idxs),
                key=lambda c: -CONF.get(c["_meta"].get("confidence", "medium"), 2))
    NAMEISH = {"nom", "prenom", "civilite", "profession"}
    out = {f: (pick_name if f in NAMEISH else pick)([c.get(f) for c in cs]) for f in SCALARS}
    out["prend_nouveaux"] = pick([c.get("prend_nouveaux") for c in cs
                                  if c.get("prend_nouveaux") != "inconnu"]) or "inconnu"
    for f in ("vad", "ame_cmu", "pmr"):
        out[f] = any(bool(c.get(f)) for c in cs)
    tags = []
    for c in cs:
        for t in (c.get("tags") or []):
            t = (t or "").strip().lower()
            if t and t not in tags:
                tags.append(t)
    out["tags"] = tags
    statuts = {c.get("statut", "actif") for c in cs}
    out["statut"] = ("ne_prend_plus" if "ne_prend_plus" in statuts
                     else "a_verifier" if "a_verifier" in statuts else "actif")
    comments, seen_txt = [], set()
    for c in cs:
        for cm in (c.get("comments") or []):
            txt = (cm.get("texte") or "").strip()
            if txt and txt.lower() not in seen_txt:
                seen_txt.add(txt.lower())
                comments.append({"type": cm.get("type", "info"), "texte": txt,
                                 "author": c["_meta"]["source_owner"]})
    out["comments"] = comments
    owners = sorted({c["_meta"]["source_owner"] for c in cs})
    out["_meta"] = {
        "owners": owners, "from_partage": False,
        "garbled": any(c["_meta"].get("garbled") for c in cs),
        "needs_web": any(c["_meta"].get("needs_web") for c in cs),
        "maps_doctolib": any(c["_meta"].get("maps_doctolib") for c in cs),
        "confidence": min((c["_meta"].get("confidence", "medium") for c in cs),
                          key=lambda x: CONF.get(x, 2)),
        "source_text": [c["_meta"].get("source_text") for c in cs
                        if isinstance(c["_meta"].get("source_text"), str)][:4],
        "merged_from": len(cs),
    }
    return out

new_fiches = [merge_group(idxs) for idxs in groups.values()]
internal_review = [(i, j, w) for i, j, w in internal_review if find(i) != find(j)]
n_internal = sum(1 for f in new_fiches if f["_meta"]["merged_from"] > 1)
print("après dédup interne : %d fiches neuves (%d fusions internes)" % (len(new_fiches), n_internal))

# ---------------------------------------------------------------- Étape B : match contre la base
base = json.load(open(BASE_F, encoding="utf-8"))
base_snapshot = list(base)                 # les 1052 d'origine (avant ajout des neuves)
by_idx = {c["_meta"]["idx"]: c for c in base}
bidx_name = defaultdict(list)
bidx_phone = defaultdict(list)
for c in base:
    k = canon_nom(c)
    if k:
        bidx_name[k].append(c)
    for p in phones(c):
        bidx_phone[p].append(c)

FILL = ["civilite","prenom","profession","orientation","etablissement","adresse",
        "arrondissement","secteur_conv","sous_type","tel_secretariat","doctolib","site_web",
        "ligne_directe","bip","portable","fax","email_avis","mssante","consignes_pro",
        "langues","tarif","rpps","delai","tele_expertise"]
CONFLICT_WATCH = ["adresse", "arrondissement", "tel_secretariat"]
LIBSEC = {"1": "secteur 1", "2": "secteur 2", "non_conv": "non conventionné",
          "centre": "centre de santé"}

def candidates(nf):
    cand = {}
    for c in bidx_name.get(canon_nom(nf), []):
        cand[c["_meta"]["idx"]] = c
    for p in phones(nf):
        for c in bidx_phone.get(p, []):
            cand[c["_meta"]["idx"]] = c
    return list(cand.values())

# mots trop communs pour identifier une structure (sinon tous les services « Tenon »
# se ressemblent) : dynamiques (>2 structures base) + stoplist manuelle.
_stok = Counter()
for c in base_snapshot:
    if c["type"] == "structure":
        _stok.update(tokens(c))
COMMON_STRUCT = {t for t, n in _stok.items() if n > 2} | {
    "hopital","hospital","hopitaux","centre","service","consultation","avis","ligne","unite",
    "pole","groupe","hospitalier","clinique","institut","cabinet","maison","reseau","paris",
    "ap","hp","aphp","de","du","des","la","le","les","saint","st","ste","sainte","fondation"}

def fuzzy_base_candidates(nf):
    """Doublons-base PROBABLES — signalés (a_verifier + note), jamais fusionnés
    automatiquement : un humain confirme.
      - praticien/labo/autre : distance ≤ 1 OU double nom (« Begon » ⊂ « Begon Bagdassarian »).
      - structure : partage d'un token DISTINCTIF (hors mots communs), l'un inclus dans l'autre.
    """
    cn = canon_nom(nf)
    if not cn or len(cn) < 4:
        return []
    res = []
    if nf["type"] == "structure":
        a = tokens(nf); da = a - COMMON_STRUCT
        if not da:
            return []
        for bf in base_snapshot:
            if bf["type"] != "structure":
                continue
            b = tokens(bf); db = b - COMMON_STRUCT
            if db and (da & db) and (da <= b or db <= a):
                res.append(bf["_meta"]["idx"])
        return res[:6]
    for bf in base_snapshot:
        if bf["type"] != nf["type"]:
            continue
        bn = canon_nom(bf)
        if not bn or bn == cn:
            continue
        sub = subset_names(nf, bf)
        if not (sub or (lev(cn, bn, cap=1) <= 1 and cn[0] == bn[0])):
            continue
        if prenom_compatible(nf, bf) and prof_compatible(nf, bf):
            res.append(bf["_meta"]["idx"])
    return res[:6]

def is_match(nf, bf):
    if nf["type"] != bf["type"]:
        return None
    shared = bool(phones(nf) & phones(bf))
    same_name = canon_nom(nf) and canon_nom(nf) == canon_nom(bf)
    if shared and (same_name or not canon_nom(nf) or not canon_nom(bf)):
        return "phone"
    if not same_name:
        return None
    if not prenom_compatible(nf, bf):
        return None            # homonyme (les deux Alice) -> pas un match
    if nf["type"] == "structure":
        same_etab = norm_name(nf.get("etablissement")) == norm_name(bf.get("etablissement")) \
                    or not nf.get("etablissement") or not bf.get("etablissement")
        if prof_compatible(nf, bf) and same_etab:
            return "structure_nom"
        return None
    if shared:
        return "phone"
    if prof_compatible(nf, bf):
        return "nom_prenom_prof"
    return None

report = {"owner_added": [], "conflicts": [], "ambigu": [], "new": [], "internal": n_internal}
next_idx = max(by_idx) + 1
csv_rows = []

# doublons-base confirmés à la main par Thibault (2026-07-18) : fusion forcée vers la
# fiche existante (au lieu du drapeau doublon_possible), pas de fiche neuve.
CONFIRMED_MERGES = {"dreux de colombel": 614, "begon bagdassarian": 11}

def add_owner_and_enrich(nf, bf, how):
    changed = []
    for o in nf["_meta"]["owners"]:
        if o not in bf["_meta"].setdefault("owners", []):
            bf["_meta"]["owners"].append(o)
    bf["_meta"]["owners"] = sorted(set(bf["_meta"]["owners"]))
    bf["_meta"]["from_partage"] = bf["_meta"].get("from_partage", False)
    # remplir les null uniquement ; jamais d'écrasement
    for f in FILL:
        nv = nf.get(f)
        if nv in (None, "", []):
            continue
        ov = bf.get(f)
        if ov in (None, "", []):
            bf[f] = nv
            changed.append(f)
        elif f in CONFLICT_WATCH and norm_name(str(ov)) != norm_name(str(nv)):
            # une adresse-locator sans numéro (« Métro Couronnes », « Avenue de Villiers »)
            # n'est pas un conflit : c'est juste moins précis que la base -> on ignore.
            if f == "adresse" and not re.search(r"\d", str(nv)):
                continue
            who = "/".join(nf["_meta"]["owners"])
            bf.setdefault("comments", []).append({
                "type": "info",
                "texte": "Selon le carnet de %s : %s = « %s » (la fiche porte « %s »). À vérifier."
                         % (who, f, nv, ov),
                "author": nf["_meta"]["owners"][0]})
            if bf.get("statut") == "actif":
                bf["statut"] = "a_verifier"
            report["conflicts"].append((bf["_meta"]["idx"], f, ov, nv, who))
    # secteur : la base (CNAM) fait foi ; si divergence, note seulement
    if nf.get("secteur_conv") and bf.get("secteur_conv") and \
       nf["secteur_conv"] != bf["secteur_conv"]:
        who = "/".join(nf["_meta"]["owners"])
        bf.setdefault("comments", []).append({
            "type": "info",
            "texte": "Le carnet de %s indique %s (la base : %s). L'Assurance Maladie fait foi."
                     % (who, LIBSEC.get(nf["secteur_conv"], nf["secteur_conv"]),
                        LIBSEC.get(bf["secteur_conv"], bf["secteur_conv"])),
            "author": nf["_meta"]["owners"][0]})
    # comments empilés (signés), sans doublon de texte
    seen = {(c.get("texte") or "").strip().lower() for c in (bf.get("comments") or [])}
    for cm in nf.get("comments") or []:
        txt = (cm.get("texte") or "").strip()
        if txt and txt.lower() not in seen:
            bf.setdefault("comments", []).append(dict(cm))
            seen.add(txt.lower())
    # tags union, booléens OR, prend_nouveaux
    for t in nf.get("tags") or []:
        if t not in (bf.get("tags") or []):
            bf.setdefault("tags", []).append(t)
    for f in ("vad", "ame_cmu", "pmr"):
        bf[f] = bool(bf.get(f)) or bool(nf.get(f))
    if bf.get("prend_nouveaux") in (None, "", "inconnu") and \
       nf.get("prend_nouveaux") not in (None, "", "inconnu"):
        bf["prend_nouveaux"] = nf["prend_nouveaux"]
    # trace
    for st in nf["_meta"].get("source_text") or []:
        bf["_meta"].setdefault("source_text", [])
        if st not in bf["_meta"]["source_text"]:
            bf["_meta"]["source_text"].append(st)
    bf["_meta"].setdefault("enrichi_par", [])
    for o in nf["_meta"]["owners"]:
        if o not in bf["_meta"]["enrichi_par"]:
            bf["_meta"]["enrichi_par"].append(o)
    report["owner_added"].append((bf["_meta"]["idx"], nf.get("nom"), nf["_meta"]["owners"],
                                  how, changed))

def make_new_fiche(nf, dup_hint=None):
    global next_idx
    fiche = {f: nf.get(f) for f in SCALARS}
    fiche["prend_nouveaux"] = nf.get("prend_nouveaux", "inconnu")
    for f in ("vad", "ame_cmu", "pmr"):
        fiche[f] = bool(nf.get(f))
    fiche["tags"] = nf.get("tags") or []
    fiche["statut"] = nf.get("statut", "actif")
    fiche["comments"] = nf.get("comments") or []
    m = dict(nf["_meta"])
    m["idx"] = next_idx
    if dup_hint:
        m["doublon_possible"] = dup_hint
        # signal fort (praticien : dist≤1 / double-nom) -> a_verifier ; structure : note seule
        if fiche["statut"] == "actif" and nf["type"] != "structure":
            fiche["statut"] = "a_verifier"
    fiche["_meta"] = m
    base.append(fiche)
    by_idx[next_idx] = fiche
    report["new"].append((next_idx, nf.get("nom"), nf.get("profession"), nf["_meta"]["owners"],
                          bool(dup_hint)))
    # ligne CSV (format Feuille de calcul) — colonnes CNAM/saisie laissées vides
    csv_rows.append({
        "id": next_idx, "priorite": "", "vague": "", "etat_cnam": "", "motif_non_match": "",
        "civilite": nf.get("civilite") or "", "nom": nf.get("nom") or "",
        "prenom": nf.get("prenom") or "", "profession": nf.get("profession") or "",
        "arrondissement": nf.get("arrondissement") or "", "adresse": nf.get("adresse") or "",
        "secteur_conv": nf.get("secteur_conv") or "",
        "source_secteur": "carnet" if nf.get("secteur_conv") else "",
        "statut": fiche["statut"], "apport_doctolib_attendu": "", "lien_a_verifier": "",
        "etat": "", "verdict_lien": "", "doctolib_url_verifiee": "", "activite_constatee": "",
        "mode_rdv": "", "prend_nouveaux": "", "motifs_consultation": "", "langues": "",
        "pmr": "", "tarif": "",
        "note": ("doublon possible base : idx " + ", ".join(str(i) for i in dup_hint)
                 if dup_hint else ""),
    })
    next_idx += 1

for nf in new_fiches:
    forced = CONFIRMED_MERGES.get(canon_nom(nf))
    if forced is not None and forced in by_idx:
        add_owner_and_enrich(nf, by_idx[forced], "confirmé")
        continue
    cands = candidates(nf)
    matches = [(bf, is_match(nf, bf)) for bf in cands]
    matches = [(bf, how) for bf, how in matches if how]
    if len(matches) == 1:
        add_owner_and_enrich(nf, matches[0][0], matches[0][1])
    elif len(matches) > 1:
        report["ambigu"].append((nf.get("nom"), nf.get("profession"),
                                 [b["_meta"]["idx"] for b, _ in matches]))
        make_new_fiche(nf, dup_hint=[b["_meta"]["idx"] for b, _ in matches])
    else:
        make_new_fiche(nf, dup_hint=fuzzy_base_candidates(nf) or None)

# ---------------------------------------------------------------- Étape C : écritures
base.sort(key=lambda c: c["_meta"]["idx"])
json.dump(base, open(OUT_JSON, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

CSV_COLS = ["id","priorite","vague","etat_cnam","motif_non_match","civilite","nom","prenom",
            "profession","arrondissement","adresse","secteur_conv","source_secteur","statut",
            "apport_doctolib_attendu","lien_a_verifier","etat","verdict_lien",
            "doctolib_url_verifiee","activite_constatee","mode_rdv","prend_nouveaux",
            "motifs_consultation","langues","pmr","tarif","note"]
with open(OUT_CSV, "w", encoding="utf-8-sig", newline="") as f:
    w = csv.DictWriter(f, fieldnames=CSV_COLS)
    w.writeheader()
    for r in sorted(csv_rows, key=lambda r: r["id"]):
        w.writerow(r)

# ---------------------------------------------------------------- rapport
lines = []
def P(s=""):
    lines.append(s)
P("=== INTÉGRATION Elena + Maylis ===")
P("Fiches brutes : %d | après dédup interne : %d (%d fusions internes)"
  % (len(records), len(new_fiches), n_internal))
P("Doublons-base (owner ajouté) : %d" % len(report["owner_added"]))
P("Ambigus (>1 candidat base -> fiche neuve + drapeau) : %d" % len(report["ambigu"]))
P("Fiches NEUVES créées (idx %d..%d) : %d" % (
    min((r[0] for r in report["new"]), default=0),
    max((r[0] for r in report["new"]), default=0), len(report["new"])))
P("Conflits de champ signalés en commentaire : %d" % len(report["conflicts"]))
P("")
P("-- OWNERS AJOUTÉS À DES FICHES EXISTANTES --")
for idx, nom, owners, how, changed in sorted(report["owner_added"]):
    P("  idx %-4s  %-28s  +%s  [%s]  champs remplis: %s"
      % (idx, (nom or "")[:28], ",".join(owners), how, ",".join(changed) or "—"))
P("")
P("-- CONFLITS (fiche existante ≠ carnet, en commentaire, a_verifier) --")
for idx, f, ov, nv, who in report["conflicts"]:
    P("  idx %-4s  %-14s base=%r  carnet(%s)=%r" % (idx, f, ov, who, nv))
P("")
P("-- AMBIGUS (plusieurs candidats base exacts — fiche neuve créée, à trancher) --")
for nom, prof, idxs in report["ambigu"]:
    P("  %-26s %-20s candidats base: %s" % ((nom or "")[:26], (prof or "")[:20], idxs))
P("")
P("-- DOUBLONS-BASE PROBABLES (nom proche/double nom ; fiche neuve + a_verifier, à confirmer) --")
for f in base:
    dp = f["_meta"].get("doublon_possible")
    if dp and f["_meta"]["idx"] >= 1052:
        cible = ", ".join("idx %s (%s)" % (i, (by_idx[i].get("nom") or "")) for i in dp)
        P("  idx %-4s %-26s %-18s ~ %s" % (f["_meta"]["idx"], (f.get("nom") or "")[:26],
                                            (f.get("profession") or "")[:18], cible))
P("")
P("-- PAIRES INTERNES À REVOIR (non fusionnées) --")
for i, j, w in internal_review:
    P("  %s | %s  <>  %s | %s   (%s)" % (
        records[i]["_meta"]["source_owner"], records[i].get("nom"),
        records[j]["_meta"]["source_owner"], records[j].get("nom"), w))
P("")
P("-- FICHES NEUVES --")
for idx, nom, prof, owners, dup in sorted(report["new"]):
    P("  idx %-4s  %-30s %-22s [%s]%s"
      % (idx, (nom or "")[:30], (prof or "")[:22], ",".join(owners),
         "  ⚠ doublon possible" if dup else ""))
open(OUT_RPT, "w", encoding="utf-8").write("\n".join(lines))
print("\n".join(lines[:8]))
print("\n-> base: %s" % OUT_JSON)
print("-> CSV : %s (%d lignes)" % (OUT_CSV, len(csv_rows)))
print("-> rapport : %s" % OUT_RPT)
