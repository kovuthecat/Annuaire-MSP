# -*- coding: utf-8 -*-
"""Audit final avant import — vérifie les invariants non négociables du projet.

Ne fait confiance à aucune étape amont : relit le jeu final et cherche activement
les violations. Sortie non vide = ne pas importer.

Invariants (CLAUDE.md) :
  1. Étanchéité patient/pro : aucune coordonnée marquée pro dans un champ patient.
  2. Aucune donnée de patient (noms cités dans les carnets).
  3. Conformité au schéma (enums, NOT NULL, longueurs).
  4. Provenance : tout champ enrichi porte son URL.
"""
import json, os, re, unicodedata
from collections import Counter

SCRATCH = os.path.dirname(os.path.abspath(__file__))
# Paramétrable : la 2e passe (open data CNAM) audite un jeu produit hors du dépôt.
PATH = os.environ.get("AUDIT_PATH")
if not PATH:
    PATH = os.path.join(SCRATCH, "merged_enriched.json")
    if not os.path.exists(PATH):
        PATH = os.path.join(SCRATCH, "merged.json")
data = json.load(open(PATH, encoding="utf-8"))
print("audit de : %s  (%d fiches)\n" % (os.path.basename(PATH), len(data)))

PRO = ["ligne_directe", "bip", "portable", "fax", "email_avis", "mssante", "consignes_pro"]
PATIENT = ["tel_secretariat", "doctolib", "site_web", "email_rdv"]
pbs = Counter()
detail = []

def add(cat, c, msg):
    pbs[cat] += 1
    if len(detail) < 400:
        detail.append((cat, c.get("nom"), msg))

# --- 1. étanchéité : marqueur pro dans un champ patient ----------------------
MARQ_PRO = re.compile(r"\bbip\b|\bdect\b|\bperso\b|de ma part|r[ée]serv[ée] aux professionnels|"
                      r"ligne m[ée]decins|num[ée]ro pro\b", re.I)
for c in data:
    for f in PATIENT:
        v = c.get(f)
        if v and MARQ_PRO.search(str(v)):
            add("1. marqueur pro dans un champ patient", c, "%s = %r" % (f, v))

# --- 2. noms de patients ------------------------------------------------------
# Les carnets citaient des patients ; l'extraction devait les retirer. On revérifie
# sur le texte final (comments + consignes), en cherchant les motifs d'attribution
# nominative encore présents.
NOMS_PATIENTS = re.compile(
    r"\b(?:mme|m\.|mr|monsieur|madame)\s+[A-ZÉÈÀÇ][a-zéèêàçï]{2,}",  # « Mme Loiseau »
    re.I)
CITES = ["bouayad", "happe", "loiseau", "salinas", "delfolie", "douchaina", "judith",
         "geraldine", "géraldine"]
for c in data:
    blob = " ".join(filter(None, [
        c.get("consignes_pro") or "",
        " ".join((cm.get("texte") or "") for cm in (c.get("comments") or []))]))
    low = unicodedata.normalize("NFD", blob.lower())
    low = "".join(ch for ch in low if unicodedata.category(ch) != "Mn")
    for n in CITES:
        n2 = "".join(ch for ch in unicodedata.normalize("NFD", n)
                     if unicodedata.category(ch) != "Mn")
        if re.search(r"\b%s\b" % re.escape(n2), low):
            add("2. nom de patient cité", c, "« %s » dans : %s" % (n, blob[:90]))
    for m in NOMS_PATIENTS.finditer(blob):
        add("2b. civilité + nom à vérifier", c, m.group(0) + " -> " + blob[:80])

# --- 3. conformité schéma -----------------------------------------------------
ENUMS = {
    "type": {"praticien", "structure", "labo", "autre"},
    "secteur_conv": {"1", "2", "centre", "non_conv", None},
    "prend_nouveaux": {"oui", "non", "liste_attente", "inconnu"},
    "statut": {"actif", "a_verifier", "ne_prend_plus"},
    "source_type": {"doctolib", "annuaire_sante", "site_officiel", "carnet_membre",
                    "autre", None},
}
for c in data:
    for f, ok in ENUMS.items():
        v = c.get(f)
        if v not in ok:
            add("3. valeur hors enum", c, "%s = %r" % (f, v))
    if not c.get("nom") or not str(c.get("nom")).strip():
        add("3. nom manquant (NOT NULL)", c, repr(c.get("nom")))
    if not c.get("type"):
        add("3. type manquant (NOT NULL)", c, "")
    for cm in (c.get("comments") or []):
        if cm.get("type") not in {"reco", "alerte", "spec", "info"}:
            add("3. type de comment invalide", c, repr(cm.get("type")))
        if not (cm.get("texte") or "").strip():
            add("3. comment vide (NOT NULL)", c, "")
        # contrainte comments_auteur_ou_origine
        if not cm.get("author") and not cm.get("origine"):
            add("3. comment sans auteur ni origine", c, (cm.get("texte") or "")[:60])

# --- 4. provenance ------------------------------------------------------------
for c in data:
    enr = c.get("_meta", {}).get("enriched") or {}
    for f, u in enr.items():
        if not str(u).startswith("http"):
            add("4. preuve non-URL", c, "%s <- %r" % (f, u))
    if enr and not c.get("source_url"):
        add("4. enrichi sans source_url", c, ", ".join(enr)[:60])

# --- 5. cohérence adresse / code postal parisien ------------------------------
for c in data:
    arr, adr = c.get("arrondissement"), c.get("adresse") or ""
    m = re.search(r"\b(75\d{3})\b", adr)
    if m and arr and m.group(1) != arr:
        add("5. CP de l'adresse != arrondissement", c, "%s vs %s | %s" % (m.group(1), arr, adr[:44]))

# --- 6. une graphie erronée est remplacée, pas exposée -------------------------
# Arbitrage Thibault (2026-07-17). Quand le nom d'une fiche a été corrigé, la graphie du
# carnet est rangée dans `_meta.verbatim_carnet` (trace d'audit, non importée) : elle ne
# doit PAS réapparaître entre guillemets dans un commentaire, qui lui EST importé.
# Ce contrôle a débusqué 3 formulations différentes, la 3e isolée (idx 530) — d'où
# l'invariant plutôt qu'un nettoyage ponctuel : la prochaine passe en inventera une 4e.
# On ne cherche QUE la citation exacte entre « » : un nom du carnet simplement plus court
# (« AZOULAY » pour AZOULAY-CAYLA, « La Batide » pour LA BATIDE ALANORE) n'est pas une
# graphie fautive, et sa présence dans un commentaire est légitime.
def _sk(s):
    return "".join(ch for ch in unicodedata.normalize("NFD", str(s or "").lower())
                   if unicodedata.category(ch) != "Mn")

for c in data:
    vb = (c.get("_meta", {}).get("verbatim_carnet") or {}).get("nom")
    if not vb:
        continue
    for cm in (c.get("comments") or []):
        for cite in re.findall(r"«\s*(.+?)\s*»", cm.get("texte") or ""):
            if _sk(cite) == _sk(vb):
                add("6. graphie erronée du carnet exposée en commentaire", c,
                    "« %s » cité alors que le nom a été corrigé en « %s »"
                    % (cite, c.get("nom")))

# --- rapport ------------------------------------------------------------------
if not pbs:
    print("AUCUNE VIOLATION — le jeu est importable.")
else:
    print("VIOLATIONS :")
    for k, n in sorted(pbs.items()):
        print("   %-42s %4d" % (k, n))
    print("\ndétail (200 premiers) :")
    for cat, nom, msg in detail[:200]:
        print("   [%s] %s — %s" % (cat[:34], (nom or "?")[:26], msg[:96]))

print("\n--- volumétrie")
print("   fiches            : %d" % len(data))
print("   commentaires      : %d" % sum(len(c.get("comments") or []) for c in data))
print("   avec source_url   : %d" % sum(1 for c in data if c.get("source_url")))
print("   a_verifier        : %d" % sum(1 for c in data if c.get("statut") == "a_verifier"))
for f in PATIENT + PRO:
    print("   %-18s: %d" % (f, sum(1 for c in data if c.get(f))))
