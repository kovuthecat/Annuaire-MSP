# -*- coding: utf-8 -*-
"""Construit la worklist CSV des NOUVELLES fiches (elena+maylis) après jointure CNAM.

Réutilise la logique de gen_worklist_s2.py (priorité, vague, apport Doctolib, pronostic)
mais :
  - ne garde que les fiches idx >= 1052 (les 181 neuves) ;
  - écrit l'en-tête `id` (comme la « Feuille de calcul sans titre.csv » de Thibault),
    pas `idx`.
Entrées : la base CNAM-enrichie + cnam_etats.json (des 181). Sortie : le CSV worklist.
"""
import os, sys, csv, json
IMP = r"c:\Users\kovu\SynologyDrive\Thibault\Projets\annuaire-msp\supabase\import"
sys.path.insert(0, IMP)
import gen_worklist_s2 as gw   # priorite(), apport_doctolib(), pronostic(), VAGUE, lien_reel()

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.environ["BASE_JSON"]          # base CNAM-enrichie (1233 fiches)
ETATS = os.environ["CNAM_ETATS"]        # cnam_etats.json des 181 neuves
OUT = os.environ.get("OUT_CSV") or os.path.join(HERE, "nouvelles_fiches_worklist.csv")
MIN_IDX = int(os.environ.get("MIN_IDX", "1052"))

etats = {e["idx"]: e for e in json.load(open(ETATS, encoding="utf-8"))}
base = json.load(open(BASE, encoding="utf-8"))
rows = []
for c in base:
    i = c["_meta"]["idx"]
    if i < MIN_IDX:
        continue
    e = etats.get(i, {})
    etat = e.get("etat_jointure", "non traitée")
    motif = e.get("motif", "")
    p = gw.priorite(c, etat, motif)
    rows.append({
        "id": i, "priorite": p, "vague": gw.VAGUE[p], "etat_cnam": etat,
        "motif_non_match": motif,
        "civilite": c.get("civilite") or "", "nom": c.get("nom") or "",
        "prenom": c.get("prenom") or "", "profession": c.get("profession") or "",
        "arrondissement": c.get("arrondissement") or "", "adresse": c.get("adresse") or "",
        "secteur_conv": c.get("secteur_conv") or "",
        "source_secteur": ("CNAM" if c.get("source_type") == "annuaire_sante"
                           and c.get("secteur_conv") else
                           ("carnet" if c.get("secteur_conv") else "")),
        "statut": c.get("statut") or "",
        "apport_doctolib_attendu": gw.apport_doctolib(c, etat, motif),
        "lien_a_verifier": c.get("doctolib") if gw.lien_reel(c) else "",
        "etat": "a_faire", "verdict_lien": "", "doctolib_url_verifiee": "",
        "activite_constatee": "", "mode_rdv": "", "prend_nouveaux": "",
        "motifs_consultation": "", "langues": "", "pmr": "", "tarif": "", "note": ""})

rows.sort(key=lambda r: (r["priorite"], r["arrondissement"] not in gw.PROCHE, r["nom"].lower()))
COLS = ["id", "priorite", "vague", "etat_cnam", "motif_non_match", "civilite", "nom",
        "prenom", "profession", "arrondissement", "adresse", "secteur_conv",
        "source_secteur", "statut", "apport_doctolib_attendu", "lien_a_verifier",
        "etat", "verdict_lien", "doctolib_url_verifiee", "activite_constatee", "mode_rdv",
        "prend_nouveaux", "motifs_consultation", "langues", "pmr", "tarif", "note"]
with open(OUT, "w", encoding="utf-8-sig", newline="") as f:
    w = csv.DictWriter(f, fieldnames=COLS)
    w.writeheader()
    w.writerows(rows)

from collections import Counter
print("worklist neuve : %d lignes -> %s" % (len(rows), OUT))
print("\n--- état de jointure CNAM (181 neuves)")
for k, n in sorted(Counter(r["etat_cnam"] for r in rows).items(), key=lambda x: -x[1]):
    print("   %-58s %4d" % (k, n))
print("\n--- vagues")
for v, n in sorted(Counter(r["vague"] for r in rows).items()):
    print("   %s  %4d" % (v, n))
print("\n--- secteur_conv rempli :", sum(1 for r in rows if r["secteur_conv"]))
