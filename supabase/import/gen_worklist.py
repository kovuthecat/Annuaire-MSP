# -*- coding: utf-8 -*-
"""Génère la feuille de travail Doctolib (CSV -> Google Sheets).

Claude in Chrome vit dans le navigateur : il n'a pas le disque. Sa persistance, c'est
la feuille elle-même — il y écrit après CHAQUE fiche. Une session perdue au compactage
ne coûte alors rien : tout est déjà dans le Sheet.

Colonnes CONTEXTE = lecture seule (elles viennent des carnets, elles font foi).
Colonnes SAISIE  = ce que la session remplit.
"""
import json, os, csv

SCRATCH = os.path.dirname(os.path.abspath(__file__))
d = json.load(open(os.path.join(SCRATCH, "merged_enriched.json"), encoding="utf-8"))

PROCHE = {"75020", "75011", "75012", "75019", "93100", "93260", "93170", "93500"}

def dans_perimetre(c):
    """Qui est plausiblement sur Doctolib ? Ni un canal d'avis hospitalier, ni une
    association, ni une ressource en ligne, ni un labo."""
    if c.get("doctolib"):
        return True                      # lien à vérifier => dans tous les cas
    if c["type"] == "praticien":
        return True
    if c["type"] == "structure":
        blob = " ".join(filter(None, [c.get("sous_type"), c.get("nom"),
                                      c.get("etablissement")])).lower()
        return any(k in blob for k in
                   ["centre", "clinique", "cabinet", "maison de sant", "msp", "institut"])
    return False

def lien_reel(c):
    """Une vraie URL, ou juste le placeholder « Doctolib » du carnet ?"""
    v = str(c.get("doctolib") or "")
    return v.startswith("http") or "doctolib.fr/" in v

def placeholder(c):
    """Le carnet dit « réservable sur Doctolib » sans donner l'URL. Le lien EXISTE
    (un médecin l'affirme), il est juste à retrouver. Tâche différente de « vérifier »."""
    return bool(c.get("doctolib")) and not lien_reel(c)

def priorite(c):
    arr = (c.get("arrondissement") or "").strip()
    if lien_reel(c):
        return 1     # 141 liens jamais ouverts : risque ACTIF en base (lien peut être faux)
    if placeholder(c):
        return 2     # 59 liens à trouver : gain certain, le carnet affirme qu'ils existent
    if arr in PROCHE:
        return 3     # là où la MSP adresse réellement
    if c.get("statut") == "a_verifier":
        return 4
    if arr.startswith("75") or not arr:
        return 5     # reste de Paris (arrondissement inconnu => probablement Paris)
    return 6         # hors territoire (Marseille, Versailles, Cognac…)

COLS = [
    # --- CONTEXTE — NE PAS MODIFIER -----------------------------------------
    "idx", "priorite", "civilite", "nom", "prenom", "profession",
    "arrondissement", "adresse_carnet", "secteur_carnet", "consigne",
    "lien_a_verifier", "statut_actuel",
    # --- SAISIE -------------------------------------------------------------
    "etat", "verdict_lien", "doctolib_url_verifiee", "prend_nouveaux", "delai",
    "motifs_consultation", "langues", "pmr", "tarif", "adresse_doctolib",
    "secteur_doctolib", "note",
]

rows = []
for c in d:
    if not dans_perimetre(c):
        continue
    rows.append({
        "idx": c["_meta"]["idx"],
        "priorite": priorite(c),
        "civilite": c.get("civilite") or "",
        "nom": c.get("nom") or "",
        "prenom": c.get("prenom") or "",
        "profession": c.get("profession") or "",
        "arrondissement": c.get("arrondissement") or "",
        "adresse_carnet": c.get("adresse") or "",
        "secteur_carnet": c.get("secteur_conv") or "",
        # un placeholder n'est pas un lien : on ne le donne pas à vérifier, on
        # demande de le TROUVER (cf. colonne `consigne`). Une URL amputée de son
        # schéma est réparée ici — c'est du formatage, pas une supposition.
        "lien_a_verifier": (("https://" + str(c["doctolib"]).lstrip("/"))
                            if (c.get("doctolib") and not str(c["doctolib"]).startswith("http")
                                and "doctolib.fr/" in str(c["doctolib"]))
                            else (c.get("doctolib") if lien_reel(c) else "")),
        "consigne": ("VERIFIER le lien ci-contre" if lien_reel(c)
                     else "TROUVER le lien : le carnet indique « Doctolib » sans URL"
                     if placeholder(c) else "chercher la fiche"),
        "statut_actuel": c.get("statut") or "",
        "etat": "a_faire",
        "verdict_lien": "", "doctolib_url_verifiee": "", "prend_nouveaux": "",
        "delai": "", "motifs_consultation": "", "langues": "", "pmr": "",
        "tarif": "", "adresse_doctolib": "", "secteur_doctolib": "", "note": "",
    })

rows.sort(key=lambda r: (r["priorite"], r["nom"].lower()))

path = os.path.join(SCRATCH, "doctolib_worklist.csv")
# utf-8-sig : Google Sheets et Excel lisent les accents correctement à l'import
with open(path, "w", encoding="utf-8-sig", newline="") as f:
    w = csv.DictWriter(f, fieldnames=COLS)
    w.writeheader()
    w.writerows(rows)

from collections import Counter
print("écrit : doctolib_worklist.csv — %d lignes" % len(rows))
print("\npar priorité :")
libelle = {1: "VERIFIER un lien (risque actif)", 2: "TROUVER un lien (gain sûr)",
           3: "20e + limitrophes", 4: "fiches a_verifier",
           5: "reste de Paris", 6: "hors territoire"}
for p, n in sorted(Counter(r["priorite"] for r in rows).items()):
    print("   %d  %-32s %4d   (%2d sessions de 20)" % (p, libelle.get(p, "?"), n,
                                                       -(-n // 20)))
print("\n   TOTAL %d lignes -> %d sessions de 20 fiches" % (len(rows), -(-len(rows) // 20)))
