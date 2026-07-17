# -*- coding: utf-8 -*-
"""Fusionne les extractions par source, déduplique, et prépare l'import.

Une fiche vue dans les carnets d'Anne ET d'Antonin => UNE fiche commune, présente
dans « mes contacts » des DEUX (objectif d'harmonisation de DECISIONS.md). Les
comments sont cumulés et attribués à leur auteur.
"""
import json, re, unicodedata, itertools, os
from collections import defaultdict, Counter

SCRATCH = os.path.dirname(os.path.abspath(__file__))
SOURCES = ["anne", "charlene", "aurelien", "antonin", "partage"]

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
    "psy": ["psychiatre", "psycholog", "psychanalyste", "psychothera", "pedopsy", "sexolog"],
    "kine": ["kine", "masseur", "osteo", "psychomot", "ergothera"],
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
    "dentiste": ["dentiste", "stomato", "orthodont"],
    "podo": ["podolog", "pedicure"],
    "ortho_phonie": ["orthophon"],
    "infirmier": ["infirmier", "ide"],
    "social": ["social", "assistante", "mediateur"],
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
    """Distance de Levenshtein, court-circuitée au-delà de `cap`."""
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
    # « Géraud » vs « Gereaud », « Benedicte » vs « Bénédicte » (accents déjà retirés) :
    # les carnets sont tapés à la main, une lettre d'écart n'est pas une autre personne.
    return pa[0] == pb[0] and lev(pa, pb) <= 1

# ---- arbitrages manuels ------------------------------------------------------
# Variantes d'orthographe relues une à une (cf. review_pairs.txt) : même personne,
# graphie flottante d'un carnet à l'autre. On ramène chaque variante à une forme
# canonique servant UNIQUEMENT au regroupement — le nom affiché reste choisi par
# vote majoritaire, et ces fiches passent en `a_verifier` pour que la graphie
# exacte soit confirmée (le web tranchera).
CANON = {
    "boddocq": "beddocq",                 # centre de santé Bauchat, gynéco
    "ben jazia": "benjazia",              # gastro, 86 bd de Belleville
    "moyal baracco": "moyal barracco",    # dermato vulvaire
    "moyal barraco": "moyal barracco",
    "de belilorski": "de belilovsky",     # dermato, Institut Fournier
    "de belilovski": "de belilovsky",
    "aguilevar": "aguilera",              # kiné Ignacio, rééduc périnéale
    "assadouria": "assadourian",          # rhumato Marina, centre ELSAN
}
FORCE_VERIFY = set(CANON) | set(CANON.values())

# À l'inverse, ces paires sont proches orthographiquement mais bien DISTINCTES —
# une lettre sépare parfois deux services hospitaliers (Néphrologie/Neurologie) ou
# deux départements (LUP 77 / LUP 93). Vérifiées à la main, laissées séparées :
# Tassin≠Tassel, Denis≠denait, Cohen≠copin, Ferran≠Feron, Viano≠Vienot,
# CECOS≠CEOSP, LUP 77≠LUP 93, parents 19e≠20e, avis dermato≠hémato St-Louis.

def canon_nom(c):
    n = norm_name(c.get("nom"))
    return CANON.get(n, n)

# ---- load --------------------------------------------------------------------
records = []
for src in SOURCES:
    path = os.path.join(SCRATCH, "contacts_%s.json" % src)
    if not os.path.exists(path):
        print("!! manquant :", path); continue
    for c in json.load(open(path, encoding="utf-8")):
        c.setdefault("_meta", {})
        c["_meta"]["source_owner"] = src
        records.append(c)
print("chargés : %d fiches brutes" % len(records))

# ---- normalisation : mobiles non qualifiés ----------------------------------
# Les agents ont divergé sur « Nom, adresse, 06 XX » sans marqueur : les uns ont
# classé en tel_secretariat (patient), les autres en portable (pro). On tranche
# uniformément dans le sens prudent.
#
# L'asymétrie du risque commande : un numéro public classé pro ne s'imprime pas
# (agaçant, corrigible d'un clic) ; un mobile perso de confrère classé patient
# finit imprimé sur une feuille remise au patient — irrattrapable, et contraire
# à la règle d'étanchéité du projet. Le web pourra le repromouvoir sur preuve
# (cf. ENRICH_SPEC : un numéro que le praticien publie EST un numéro patient).
PATIENT_MARKERS = re.compile(
    r"pour (les )?patients?|communiquer aux patients|doctolib|secr[ée]tariat|"
    r"standard|accueil|prise de rdv|prendre rdv|rendez-vous", re.I)
PRO_MARKERS = re.compile(r"\bperso\b|\bpro\b|de ma part|\bbip\b|\bdect\b|ligne directe|"
                         r"\bdirect\b|avis|correspondant", re.I)

def is_mobile(s):
    d = re.sub(r"\D", "", str(s or ""))
    return len(d) == 10 and d[:2] in ("06", "07")

demoted = 0
for c in records:
    tel = c.get("tel_secretariat")
    if not tel or not is_mobile(tel):
        continue
    st = c["_meta"].get("source_text")
    blob = " ".join(filter(None, [
        st if isinstance(st, str) else "",
        c.get("consignes_pro") or "",
        " ".join(cm.get("texte", "") for cm in (c.get("comments") or [])),
    ]))
    if PATIENT_MARKERS.search(blob) and not PRO_MARKERS.search(blob):
        continue                      # preuve explicite « patient » => on laisse
    if c.get("portable") and norm_phone(c["portable"]) != norm_phone(tel):
        c["consignes_pro"] = ((c.get("consignes_pro") or "") +
                              " | Autre mobile carnet : %s" % tel).strip(" |")
    else:
        c["portable"] = tel
    c["tel_secretariat"] = None
    c["_meta"]["mobile_ambigu"] = True     # candidat à repromotion sur preuve web
    demoted += 1
print("mobiles non qualifiés repassés en PRO (défaut prudent) : %d" % demoted)

# ---- blocking + pairing ------------------------------------------------------
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

review = []
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
                review.append((i, j, "même téléphone, noms différents"))
            continue
        if not prenom_compatible(a, b):
            continue
        if shared_phone:
            union(i, j); continue

        if a["type"] == "structure":
            # « Tenon » porte 20 services distincts (allergo, dermato, PASS, uro…).
            # Même nom + spécialités différentes = deux services différents, pas une
            # ambiguïté : on ne fusionne pas et on n'encombre pas la revue humaine.
            same_etab = norm_name(a.get("etablissement")) == norm_name(b.get("etablissement"))
            same_prof = norm_name(a.get("profession")) == norm_name(b.get("profession"))
            if same_prof and same_etab:
                union(i, j)
            continue

        if not prof_compatible(a, b):
            review.append((i, j, "même nom, spécialités incompatibles")); continue
        # Un CP différent ne sépare PAS deux praticiens : ils exercent couramment sur
        # plusieurs sites (Sonia Alperin = ELSAN 75010 ET GOSB 75020). Même nom + même
        # prénom + spécialité compatible => même personne, on fusionne et on conserve
        # les deux adresses (cf. multi_site, traité à la fusion).
        union(i, j)

# ---- passe floue : variantes d'orthographe ----------------------------------
# Ces carnets sont tapés à la main depuis 15 ans : « Belilovsky » / « Belilovski »,
# « Descombe » / « Decombe ». L'égalité stricte ne les voit pas ; on rapproche sur
# une distance d'édition faible, mais SEULEMENT si le prénom et la spécialité
# concordent — sinon on renvoie à l'arbitrage humain plutôt que de fusionner à tort.
by_type = defaultdict(list)
for i, c in enumerate(records):
    if norm_name(c.get("nom")):
        by_type[c["type"]].append(i)

fuzzy = 0
for t, idxs in by_type.items():
    for i, j in itertools.combinations(idxs, 2):
        if find(i) == find(j):
            continue
        a, b = records[i], records[j]
        na, nb = canon_nom(a), canon_nom(b)
        if na == nb or min(len(na), len(nb)) < 5:
            continue
        d = lev(na, nb, cap=2)
        if d > 2 or na[0] != nb[0]:
            continue
        if not (prenom_compatible(a, b) and prof_compatible(a, b)):
            continue
        pa, pb = norm_name(a.get("prenom")), norm_name(b.get("prenom"))
        # distance 1 + prénom réellement présent des deux côtés => quasi certain
        if d == 1 and pa and pb:
            union(i, j); fuzzy += 1
        else:
            review.append((i, j, "orthographes proches (distance %d) — à confirmer" % d))
print("rapprochements flous : %d" % fuzzy)

groups = defaultdict(list)
for i in range(len(records)):
    groups[find(i)].append(i)
print("après dédup : %d fiches uniques (%d groupes fusionnés)"
      % (len(groups), sum(1 for g in groups.values() if len(g) > 1)))

# ---- merge -------------------------------------------------------------------
SCALARS = ["type","sous_type","civilite","nom","prenom","profession","orientation",
           "etablissement","adresse","arrondissement","secteur_conv","tel_secretariat",
           "doctolib","site_web","email_rdv","ligne_directe","bip","portable","fax",
           "email_avis","mssante","consignes_pro","delai","langues","tele_expertise",
           "tarif","rpps"]
CONF = {"high": 3, "medium": 2, "low": 1}

def pick(vals):
    """Valeur la plus informative : la plus longue (utile pour adresse, consignes…)."""
    vals = [v for v in vals if v not in (None, "", [])]
    if not vals:
        return None
    return max(vals, key=lambda v: (len(str(v)), str(v)))

def pick_name(vals):
    """Pour un NOM : vote majoritaire, surtout pas « la plus longue ».

    « Géraud » (3 carnets) vs « Gereaud » (1 coquille) : la longueur élirait la
    coquille. On vote sur la forme normalisée, puis on retient la graphie la mieux
    accentuée parmi les gagnantes (« Géraud » plutôt que « geraud »).
    """
    vals = [v for v in vals if v not in (None, "", [])]
    if not vals:
        return None
    counts = Counter(norm_name(v) for v in vals)
    best_norm, _ = counts.most_common(1)[0]
    cands = [v for v in vals if norm_name(v) == best_norm]
    def accents(v):
        return sum(1 for ch in str(v) if ch != strip_accents(ch))
    # plus d'accents = graphie française correcte ; à égalité, la plus longue
    return max(cands, key=lambda v: (accents(v), len(str(v))))

merged = []
for root, idxs in groups.items():
    cs = sorted((records[i] for i in idxs),
                key=lambda c: -CONF.get(c["_meta"].get("confidence", "medium"), 2))
    NAMEISH = {"nom", "prenom", "civilite", "profession"}
    out = {f: (pick_name if f in NAMEISH else pick)([c.get(f) for c in cs])
           for f in SCALARS}
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
    # graphie arbitrée à la main => à confirmer avant de faire foi
    if any(canon_nom(c) in FORCE_VERIFY for c in cs) and out["statut"] == "actif":
        out["statut"] = "a_verifier"
    comments, seen_txt = [], set()
    for c in cs:
        for cm in (c.get("comments") or []):
            txt = (cm.get("texte") or "").strip()
            if txt and txt.lower() not in seen_txt:
                seen_txt.add(txt.lower())
                comments.append({"type": cm.get("type", "info"), "texte": txt,
                                 "author": c["_meta"]["source_owner"]})

    # Multi-site : la fiche ne porte qu'une adresse, mais un praticien exerce souvent
    # sur plusieurs lieux. On garde les autres en commentaire plutôt que de les perdre.
    sites, seen_site = [], set()
    for c in cs:
        for adr, arr, etab in [(c.get("adresse"), c.get("arrondissement"),
                                c.get("etablissement"))]:
            if not adr and not etab:
                continue
            key = (norm_name(adr), norm_name(etab))
            if key in seen_site:
                continue
            seen_site.add(key)
            sites.append(" — ".join(filter(None, [etab, adr, arr])))
    if len(sites) > 1:
        principal = " — ".join(filter(None, [out.get("etablissement"), out.get("adresse"),
                                             out.get("arrondissement")]))
        autres = [s for s in sites if norm_name(s) != norm_name(principal)]
        if autres:
            comments.append({
                "type": "info",
                "texte": "Autre(s) lieu(x) d'exercice mentionné(s) dans les carnets : "
                         + " ; ".join(autres) + ".",
                "author": cs[0]["_meta"]["source_owner"]})
            out["_meta_multi_site"] = True
    out["comments"] = comments
    owners = [c["_meta"]["source_owner"] for c in cs]
    out["_meta"] = {
        # « mes contacts » = carnets individuels d'origine ; le répertoire partagé
        # n'appartient à personne => jamais dans une liste perso.
        "owners": sorted({o for o in owners if o != "partage"}),
        "from_partage": "partage" in owners,
        "garbled": any(c["_meta"].get("garbled") for c in cs),
        "needs_web": any(c["_meta"].get("needs_web") for c in cs),
        "mobile_ambigu": any(c["_meta"].get("mobile_ambigu") for c in cs),
        "confidence": min((c["_meta"].get("confidence", "medium") for c in cs),
                          key=lambda x: CONF.get(x, 2)),
        "source_text": [c["_meta"].get("source_text") for c in cs
                        if isinstance(c["_meta"].get("source_text"), str)][:4],
        "merged_from": len(cs),
    }
    merged.append(out)

merged.sort(key=lambda c: (c.get("profession") or "zzz", norm_name(c.get("nom"))))
json.dump(merged, open(os.path.join(SCRATCH, "merged.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)

review = [(i, j, w) for i, j, w in review if find(i) != find(j)]
with open(os.path.join(SCRATCH, "review_pairs.txt"), "w", encoding="utf-8") as f:
    for i, j, why in review:
        f.write("== %s\n  A[%s] %s %s %s | %s | %s\n  B[%s] %s %s %s | %s | %s\n\n" % (
            why,
            records[i]["_meta"]["source_owner"], records[i].get("civilite") or "",
            records[i].get("prenom") or "", records[i].get("nom"),
            records[i].get("profession"), records[i].get("arrondissement"),
            records[j]["_meta"]["source_owner"], records[j].get("civilite") or "",
            records[j].get("prenom") or "", records[j].get("nom"),
            records[j].get("profession"), records[j].get("arrondissement")))

# ---- stats -------------------------------------------------------------------
print("\n-- par type")
for t in sorted({c["type"] for c in merged}):
    print("   %-12s %4d" % (t, sum(1 for c in merged if c["type"] == t)))
print("\n-- « mes contacts » (list_entries à créer)")
for s in SOURCES:
    n = sum(1 for c in merged if s in c["_meta"]["owners"])
    if n:
        print("   %-10s %4d" % (s, n))
print("   %-10s %4d" % ("(partagé)", sum(1 for c in merged if c["_meta"]["from_partage"])))
multi = sum(1 for c in merged if len(c["_meta"]["owners"]) > 1)
print("\n   fiches connues de plusieurs membres : %d" % multi)
print("   garbled                : %d" % sum(1 for c in merged if c["_meta"]["garbled"]))
print("   mobiles ambigus (→web) : %d" % sum(1 for c in merged if c["_meta"]["mobile_ambigu"]))
print("   candidates web         : %d" % sum(1 for c in merged if c["_meta"]["needs_web"]))
print("   paires à arbitrer      : %d  (review_pairs.txt)" % len(review))
