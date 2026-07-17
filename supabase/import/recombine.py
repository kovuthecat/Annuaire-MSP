# -*- coding: utf-8 -*-
"""Recolle les lots enrichis dans merged.json, en re-vérifiant les règles dures.

On ne fait PAS confiance aux lots sur parole : chaque champ modifié est re-contrôlé
ici, indépendamment de l'agent qui l'a produit. Un lot qui viole une règle voit sa
modification rejetée, pas intégrée avec un avertissement.
"""
import json, os, glob, re
from collections import Counter

SCRATCH = os.path.dirname(os.path.abspath(__file__))
# Le jeu de base et la date du run sont paramétrables : la 1re passe partait de
# merged.json, la 2e (open data CNAM) repart du jeu déjà publié. Les règles, elles,
# ne changent pas — c'est tout l'intérêt de repasser par ce fichier.
BASE = os.environ.get("RECOMBINE_BASE") or os.path.join(SCRATCH, "merged.json")
BATCHES = os.environ.get("RECOMBINE_BATCHES") or os.path.join(SCRATCH, "batches")
OUT = os.environ.get("RECOMBINE_OUT") or os.path.join(SCRATCH, "merged_enriched.json")
RUN_DATE = os.environ.get("RECOMBINE_DATE") or "2026-07-16T00:00:00+02:00"
PRO = {"ligne_directe", "bip", "portable", "fax", "email_avis", "mssante", "consignes_pro"}
PATIENT = {"tel_secretariat", "doctolib", "site_web", "email_rdv"}
# Champs que le web a le droit de renseigner (cf. ENRICH_SPEC)
ENRICHABLE = PATIENT | {"adresse", "arrondissement", "secteur_conv", "etablissement",
                        "profession", "civilite", "prenom", "nom", "rpps", "pmr",
                        "langues", "tarif", "delai", "statut", "sous_type", "orientation",
                        "vad", "ame_cmu", "prend_nouveaux"}
PLACEHOLDERS = {"doctolib", "-", ".", "?", "à compléter", "a completer"}
# vad/ame_cmu/pmr sont `not null default false` : `false` est le DÉFAUT DU SCHÉMA,
# pas une affirmation du carnet. Le carnet n'a jamais dit « pas accessible PMR » —
# il n'a rien dit. Le web peut donc les renseigner sur preuve.
BOOLS = {"vad", "ame_cmu", "pmr"}
# Marqueurs d'un doute que le carnet assume lui-même (cf. spec, exception 3).
DOUTE_RE = re.compile(r"à confirmer|a confirmer|à vérifier|a verifier|incohérence|"
                      r"incoherence|douteu|déduite? de la section|deduite? de la section|"
                      r"orthographe|graphie", re.I)

# ---- Amendement P2/S1 : la source DATÉE, et l'incohérence interne --------------
# T-005 (« le carnet fait foi sur le web ») a été calibré contre les SYNTHÈSES de
# moteur de recherche, qui inventent (un téléphone créé de toutes pièces, des numéros
# faux à un chiffre près). C'est une règle de FIABILITÉ DE SOURCE. Elle ne se
# transpose pas à l'open data CNAM : fichier primaire, publié par le producteur de la
# donnée, daté — et sur `secteur_conv` la CNAM n'est pas un témoin, c'est elle qui
# ATTRIBUE le statut. Un carnet ne peut pas avoir raison contre elle ; il peut être
# en retard.
#
# Ce motif n'ouvre rien d'autre :
#   * il ne vaut que pour les champs qui DÉRIVENT DANS LE TEMPS et dont la source est
#     l'autorité. `adresse` n'en est pas : l'adresse déclarée à la caisse peut n'être
#     qu'un des lieux d'exercice. `rpps` non plus : un identifiant ne vieillit pas, un
#     désaccord y est un faux match.
#   * il exige un match SÛR. Sur un match tangent, un désaccord est un signal d'alerte
#     sur le match, pas sur le carnet — et écrire le secteur d'un homonyme est pire que
#     ne rien écrire.
#   * il exige une source datée : sans date, l'argument de fraîcheur n'existe pas.
# Et il ne fait rien perdre : c'est CE bloc qui écrit le verbatim et le commentaire,
# pour qu'aucun lot ne puisse « oublier » de conserver ce qu'un médecin a écrit.
AUTORITE_DATEE = {"secteur_conv"}
MATCH_SUR = {"rpps", "haut", "bas", "adresse"}
# L'incohérence interne, elle, ne demande aucun arbitrage de fraîcheur : une fiche qui
# se contredit elle-même est fausse sur l'un des deux champs, point. Le garde-fou ne
# peut pas vérifier la géographie ; il exige donc que la correction soit sourcée et
# tracée, et c'est ce qu'il contrôle.
INCOHERENCE_OK = {"adresse", "arrondissement"}
LIB = {"1": "secteur 1", "2": "secteur 2", "non_conv": "non conventionné",
       "centre": "centre de santé (pas d'avance de frais)"}

def vide(old, f):
    """Le champ est-il « non renseigné » ?

    Attention aux valeurs par défaut du schéma, qui ne sont PAS des affirmations du
    carnet : `pmr = false` ne dit pas « pas accessible », et `prend_nouveaux = 'inconnu'`
    dit littéralement qu'on ne sait pas. Le web peut donc les renseigner sur preuve.
    """
    v = old.get(f)
    if f in BOOLS:
        return not v
    if f == "prend_nouveaux":
        return v in (None, "", "inconnu")
    return v in (None, "", [])

base = {c["_meta"]["idx"]: c for c in json.load(open(BASE, encoding="utf-8"))}

rejets, applied, lots, a_revoir = [], Counter(), 0, []
for path in sorted(glob.glob(os.path.join(BATCHES, "out_*.json"))):
    lots += 1
    for new in json.load(open(path, encoding="utf-8")):
        idx = new.get("_meta", {}).get("idx")
        if idx is None or idx not in base:
            rejets.append((os.path.basename(path), idx, "_meta.idx absent/inconnu", ""))
            continue
        old = base[idx]
        enriched = new.get("_meta", {}).get("enriched") or {}

        for f, val in list(new.items()):
            if f in ("_meta", "comments", "tags", "source_url", "source_type",
                     "source_checked_at"):
                continue
            if val == old.get(f):
                continue

            # 1. le web n'écrit jamais dans un champ PRO — SAUF vider un mobile lors
            #    d'une requalification documentée : la spec autorise portable ->
            #    tel_secretariat quand le praticien publie lui-même ce numéro. Vider
            #    `portable` fait alors partie de l'opération, ce n'est pas une fuite.
            if f in PRO:
                requal = (f == "portable" and val in (None, "")
                          and enriched.get("tel_secretariat")
                          and re.sub(r"\D", "", str(new.get("tel_secretariat") or "")) ==
                              re.sub(r"\D", "", str(old.get("portable") or "")))
                if not requal:
                    rejets.append((os.path.basename(path), idx,
                                   "écriture champ PRO refusée", f))
                    continue
                # requalification validée : on vide le mobile et on s'arrête là pour ce
                # champ (les contrôles suivants visent les champs enrichissables).
                old[f] = None
                applied["requalif_mobile"] += 1
                continue
            # 2. champ hors périmètre d'enrichissement
            if f not in ENRICHABLE:
                rejets.append((os.path.basename(path), idx, "champ hors périmètre", f))
                continue
            # 3. toute valeur ajoutée doit porter son URL de preuve
            url = enriched.get(f)
            # Repli pour l'identité : plusieurs agents ont corrigé un nom en sourçant la
            # page dans `source_url` sans dupliquer l'URL sous `enriched.nom`. La preuve
            # est là (ex. source_url = .../dr-hamny-illias pour « Amny » -> « HAMNY ») —
            # la règle « pas de preuve, pas de valeur » ne doit pas jeter une preuve
            # simplement mal rangée.
            if not url and f in ("nom", "prenom", "civilite"):
                su = new.get("source_url")
                if su and str(su).startswith("http"):
                    url = su
            if f not in ("statut", "portable") and (not url or not str(url).startswith("http")):
                rejets.append((os.path.basename(path), idx, "valeur sans URL de preuve", f))
                # Une correction de nom argumentée mais non sourcée est probablement
                # juste : on ne l'applique pas (règle « pas de preuve, pas de valeur »),
                # mais on la met sous les yeux d'un humain au lieu de la perdre.
                if f in ("nom", "prenom"):
                    a_revoir.append((idx, f, old.get(f), val,
                                     str(new.get("_meta", {}).get("enrich_note") or "")[:220]))
                continue
            # 4. écrasement d'une valeur du carnet : seulement placeholder / doute assumé
            if not vide(old, f):
                is_ph = str(old.get(f)).strip().lower() in PLACEHOLDERS
                # « Le carnet doute de lui-même » (spec, cas 3) : le doute peut être porté
                # par le statut, le flag garbled, MAIS AUSSI par un commentaire explicite
                # (« orientation pédiatrique à confirmer »). Corriger sur preuve, alors,
                # c'est respecter le carnet — le médecin a écrit qu'il n'était pas sûr.
                notes = " ".join((cm.get("texte") or "") for cm in (old.get("comments") or []))
                doute = (old.get("statut") == "a_verifier"
                         or old.get("_meta", {}).get("garbled")
                         or DOUTE_RE.search(notes))
                # Correction d'identité sourcée : `garbled` n'est pas une condition —
                # il a été posé à l'extraction, sans recherche, et rate les noms faux
                # écrits avec assurance (« Ariel AZOULAY » -> « Arièle AZOULAY-CAYLA »,
                # neurologue à la même adresse). C'est la preuve qui autorise, pas le flag.
                # L'agent doit avoir laissé statut=a_verifier : un humain confirme.
                identite = f in ("nom", "prenom", "civilite") and url
                # Motif « source datée » (cf. en-tête) : autorisé seulement sur un champ
                # qui dérive, un match sûr, et une source portant sa date.
                motif = (new.get("_meta", {}).get("overwrite_motif") or {}).get(f) or {}
                datee = (f in AUTORITE_DATEE
                         and motif.get("type") == "source_datee"
                         and motif.get("match") in MATCH_SUR
                         and re.match(r"^20\d\d-\d\d-\d\d", str(motif.get("date_source") or "")))
                incoh = (f in INCOHERENCE_OK
                         and motif.get("type") == "incoherence_interne"
                         and motif.get("preuve"))
                # RESSERRAGE (P2/S1). Sur les champs où la source datée fait autorité, le
                # doute assumé par le carnet ne suffit PLUS à autoriser un écrasement : il
                # faut le motif. Sans ce verrou, un lot pourrait écraser le `secteur_conv`
                # d'une des 250 fiches `a_verifier` sans laisser la moindre trace — la
                # branche `doute` autorise tout champ enrichissable, et c'est justement ce
                # champ-là que cette passe met en cause systématiquement. Un placeholder
                # reste écrasable sans motif : ce n'est pas une valeur du carnet, il n'y a
                # rien à conserver.
                if f in AUTORITE_DATEE and not is_ph:
                    autorise = datee
                else:
                    autorise = is_ph or doute or identite or datee or incoh or f == "statut"
                if not autorise:
                    rejets.append((os.path.basename(path), idx,
                                   "écrasement d'une donnée du carnet", f))
                    continue
                if datee:
                    # Le carnet n'est pas supprimé, il est ANTIDATÉ : sa valeur reste
                    # dans _meta et dans un commentaire qui porte LES DEUX valeurs.
                    old.setdefault("_meta", {}).setdefault("verbatim_carnet", {})[f] = old[f]
                    old.setdefault("comments", []).append({
                        "type": "alerte",
                        "texte": "Secteur conventionnel mis à jour : le carnet indiquait "
                                 "« %s », %s (fichier du %s) indique « %s ». C'est "
                                 "l'Assurance Maladie qui attribue ce statut, et sa donnée "
                                 "est datée ; la valeur du carnet est conservée ici et dans "
                                 "la trace d'audit. À confirmer. Source : %s"
                                 % (LIB.get(old[f], old[f]), motif.get("source", "la source"),
                                    motif.get("date_source"), LIB.get(val, val), url),
                        "author": None, "origine": "enrichissement_web"})
                    old["statut"] = "a_verifier"
                    applied["écrasement_source_datée"] += 1
                if incoh:
                    old.setdefault("_meta", {}).setdefault("verbatim_carnet", {})[f] = old[f]
                    old["statut"] = "a_verifier"
                    applied["correction_incohérence_interne"] += 1
                if identite and not is_ph:
                    # Une graphie erronée est REMPLACÉE, pas exposée (arbitrage Thibault,
                    # 2026-07-17). Elle n'est pas perdue pour autant : elle reste dans
                    # `_meta.verbatim_carnet` et dans `_meta.source_text` (la ligne brute
                    # du carnet) — la trace d'audit, qui n'est pas importée en base. Ce
                    # qu'un membre voit dans l'app, c'est le nom juste ; ce qu'un
                    # relecteur retrouve dans le JSON, c'est ce que le carnet disait.
                    #
                    # La trace est INCONDITIONNELLE : elle était auparavant conditionnée à
                    # `not doute`, si bien qu'une fiche déjà en `a_verifier` voyait son nom
                    # corrigé sans que la graphie du carnet subsiste nulle part (idx 66
                    # « HANNS », idx 319 « FAOUZIA TOURIA »). Le doute du carnet justifie
                    # qu'on corrige ; il ne justifie pas qu'on efface.
                    old.setdefault("_meta", {}).setdefault("verbatim_carnet", {})[f] = old[f]
                    old["statut"] = "a_verifier"

            old[f] = val
            applied[f] += 1
            old.setdefault("_meta", {}).setdefault("enriched", {})
            if url:
                old["_meta"]["enriched"][f] = url

        # provenance : d'où vient la fiche telle qu'on l'a désormais
        if enriched:
            src = new.get("source_url") or next(
                (u for u in enriched.values() if str(u).startswith("http")), None)
            if src:
                old["source_url"] = src
                old["source_type"] = new.get("source_type") or "autre"
                old["source_checked_at"] = RUN_DATE

        # commentaires ajoutés par le web : sans auteur humain, signés par leur origine
        seen = {(c.get("texte") or "").strip().lower() for c in (old.get("comments") or [])}
        for cm in (new.get("comments") or []):
            txt = (cm.get("texte") or "").strip()
            if not txt or txt.lower() in seen:
                continue
            if cm.get("origine") == "enrichissement_web" or cm.get("author") == "web":
                old.setdefault("comments", []).append({
                    "type": cm.get("type", "info"), "texte": txt,
                    "author": None, "origine": "enrichissement_web"})
                seen.add(txt.lower())
                applied["+comment_web"] += 1

        for k in ("hypotheses", "enrich_note"):
            if not new.get("_meta", {}).get(k):
                continue
            ancien = (old.get("_meta") or {}).get(k)
            # `enrich_note` est LA trace d'audit du jeu (« le JSON est la trace », cf.
            # IMPORT.md) : c'est là, et nulle part ailleurs, qu'on lit pourquoi une
            # valeur a été écrite ou refusée. Une 2e passe qui la REMPLACE efface le
            # raisonnement de la 1re — y compris les refus qu'elle documentait. On
            # empile, on n'écrase pas. (Sur `hypotheses`, une liste, le remplacement
            # reste le bon comportement : le lot renvoie la liste complète.)
            if k == "enrich_note" and ancien and new["_meta"][k] not in ancien:
                old["_meta"][k] = "%s\n— seconde passe (open data CNAM, 2026-07-17) : %s" % (
                    ancien.rstrip(), new["_meta"][k])
            else:
                old.setdefault("_meta", {})[k] = new["_meta"][k]

# ---- correction d'étanchéité arbitrée à la main -----------------------------
# ISM Interprétariat : l'extraction a recopié le numéro du xlsx dans tel_secretariat
# (champ PATIENT) alors que le site officiel le présente comme réservé aux
# professionnels, avec code d'accès (13142, déjà en consignes_pro). C'est un service
# que le SOIGNANT appelle pendant la consultation : un patient qui le composerait
# tomberait sur un serveur exigeant un code. Le numéro reste en ligne_directe (pro).
# Repéré par l'enrichissement web, source : ism-interpretariat.fr.
for c in base.values():
    if (c.get("nom") or "").strip().upper() == "ISM" and c.get("tel_secretariat"):
        c["tel_secretariat"] = None
        c.setdefault("comments", []).append({
            "type": "info",
            "texte": "Numéro retiré des coordonnées patient : le site officiel le réserve "
                     "aux professionnels (code d'accès). Reste accessible en ligne directe pro.",
            "author": None, "origine": "enrichissement_web"})
        print("étanchéité : numéro pro retiré du champ patient sur la fiche ISM")

# Centre de santé Haxo (Croix-Rouge, 89 bis rue Haxo 75020) : FERMÉ — information
# donnée par la MSP. Le web ne la confirme pas : les pages ouvertes (mai 2024) ne
# documentent que la mobilisation CONTRE la fermeture, et la mairie du 20e le
# référence encore. L'enrichissement avait donc refusé de conclure — méthode juste,
# conclusion fausse : l'absence de preuve n'est pas une preuve d'absence, et le web
# est en retard sur le terrain. D'où l'origine `signalement_msp`.
# La fiche vise une PRATICIENNE dont l'établissement était Haxo : elle n'a pas cessé
# d'exercer, elle n'est plus là => a_verifier (et non ne_prend_plus).
# ---- une graphie erronée est remplacée, pas exposée --------------------------
# Arbitrage Thibault (2026-07-17). La 1re passe publiait la graphie fautive du carnet en
# commentaire `info` visible dans l'app (« Graphie d'origine dans le carnet : « X » »).
# On la retire de l'affichage et on la range dans `_meta.verbatim_carnet` : le membre voit
# le nom juste, le relecteur retrouve dans le JSON ce que le carnet disait. Rien n'est
# perdu — la ligne brute du carnet est de toute façon conservée en `_meta.source_text`.
#
# ⚠️ Ne PAS confondre avec les commentaires « Fiche identifiée depuis la note d'origine
# « … » » : ceux-là portent la note ENTIÈRE et le raisonnement d'identification, pas une
# graphie. C'est ce qui permet au médecin de reconnaître la fiche qu'il a écrite — ils
# restent.
GRAPHIE_RE = re.compile(r"^Graphie d'origine dans le carnet : « (.+?) »\.")
_retires = 0
for c in base.values():
    garde = []
    for cm in c.get("comments") or []:
        m = GRAPHIE_RE.match((cm.get("texte") or "").strip())
        if m:
            c.setdefault("_meta", {}).setdefault("verbatim_carnet", {}).setdefault(
                "nom", m.group(1))
            _retires += 1
            continue
        garde.append(cm)
    c["comments"] = garde
if _retires:
    print("graphies d'origine retirées de l'affichage (conservées en _meta) : %d" % _retires)

# Même arbitrage, appliqué à la famille « Fiche identifiée depuis la note d'origine « … » » :
# en citant la note du carnet, elle réaffichait la graphie fautive par la bande. On garde le
# RAISONNEMENT (ces fiches sont en `a_verifier` parce que le nom a été corrigé : sans le
# pourquoi, le relecteur n'a rien pour trancher) et on retire la citation. Textes réécrits à
# la main dans `notes_origine.py`, qui documente aussi ce qui a été vérifié avant.
# Idempotent : aucun texte de remplacement ne contient « note d'origine », donc rien ne
# matche au second passage (invariant testé à l'import de notes_origine).
NOTE_ORIG_RE = re.compile(r"note d'origine", re.I)
try:
    from notes_origine import REECRITURES, AUTRES
except ImportError:
    REECRITURES, AUTRES = {}, {}
_reecrits, _manques = 0, []
for c in base.values():
    idx_c = c["_meta"]["idx"]
    cibles = [k for k, cm in enumerate(c.get("comments") or [])
              if NOTE_ORIG_RE.search(cm.get("texte") or "")]
    if not cibles:
        continue
    textes = REECRITURES.get(idx_c)
    if not textes or len(textes) != len(cibles):
        _manques.append((idx_c, len(cibles), len(textes or [])))
        continue
    for k, t in zip(cibles, textes):
        c["comments"][k]["texte"] = t
        _reecrits += 1
for c in base.values():
    for _prefixe, _neuf in AUTRES.get(c["_meta"]["idx"], []):
        for cm in c.get("comments") or []:
            if (cm.get("texte") or "").startswith(_prefixe):
                cm["texte"] = _neuf
                _reecrits += 1
if _reecrits:
    print("commentaires « note d'origine » réécrits sans la citation : %d" % _reecrits)
# On plante bruyamment plutôt que de laisser une graphie fautive à l'affichage : un
# commentaire non réécrit est un trou dans la règle, pas un détail.
if _manques:
    raise SystemExit(
        "ERREUR : %d fiche(s) portent un commentaire « note d'origine » sans réécriture "
        "correspondante dans notes_origine.py — (idx, commentaires, réécritures) : %s"
        % (len(_manques), _manques))

HAXO = ("Le centre de santé Haxo (Croix-Rouge, 89 bis rue Haxo 75020) a fermé. "
        "Praticienne à relocaliser : son lieu d'exercice actuel est inconnu. "
        "Piste à confirmer : reprise du site par la MSP Paris Lilas.")
for c in base.values():
    if "haxo" in (c.get("etablissement") or "").lower():
        c["statut"] = "a_verifier"
        # IDEMPOTENCE (corrigé en P2/S1) : ce bloc ajoutait son commentaire à CHAQUE
        # exécution. Anodin tant que le script ne tournait qu'une fois ; la 2e passe, qui
        # enchaîne plusieurs étages de recombinaison, l'a dupliqué 5 fois sur la fiche
        # Moustin. Le seed aurait importé 5 alertes identiques (`comments` n'a pas de
        # contrainte d'unicité — c'est le script qui doit être sûr).
        if any(x.get("texte") == HAXO for x in c.get("comments") or []):
            continue
        c.setdefault("comments", []).append({
            "type": "alerte", "texte": HAXO,
            "author": None, "origine": "signalement_msp"})
        print("signalement MSP appliqué : fermeture du centre Haxo (fiche %s)" % c.get("nom"))

out = sorted(base.values(), key=lambda c: c["_meta"]["idx"])
json.dump(out, open(OUT, "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)

print("lots recombinés : %d" % lots)
print("champs appliqués :")
for f, n in applied.most_common():
    print("   %-18s %4d" % (f, n))
print("\nfiches avec au moins un champ web : %d / %d"
      % (sum(1 for c in out if c["_meta"].get("enriched")), len(out)))
print("fiches avec source_url            : %d" % sum(1 for c in out if c.get("source_url")))
# Corrections de nom argumentées mais non sourcées : pas appliquées (règle « pas de
# preuve, pas de valeur »), mais surtout pas perdues — un humain tranche.
with open(os.path.join(os.path.dirname(OUT), "noms_a_revoir.txt"), "w",
          encoding="utf-8") as fh:
    fh.write("Corrections de nom proposées par l'enrichissement web, NON appliquées\n")
    fh.write("faute d'URL de preuve enregistrée. À trancher à la main.\n\n")
    for idx, champ, avant, apres, note in a_revoir:
        fh.write("idx=%s  %s : %r -> %r\n    %s\n\n" % (idx, champ, avant, apres, note))
print("\ncorrections de nom mises en revue humaine : %d  (noms_a_revoir.txt)" % len(a_revoir))

print("\nREJETS (modifs refusées au contrôle) : %d" % len(rejets))
for r in rejets[:25]:
    print("   %-14s idx=%-5s %-32s %s" % r)
if len(rejets) > 25:
    print("   … et %d autres" % (len(rejets) - 25))
