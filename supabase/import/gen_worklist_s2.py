# -*- coding: utf-8 -*-
"""Liste de travail de S2 : l'état de chacune des 1 052 fiches vis-à-vis de la CNAM.

À quoi ça sert : S2 travaille sur Doctolib (via Claude in Chrome, qui n'a pas le disque —
sa persistance, c'est la feuille elle-même). Cette liste dit, fiche par fiche, ce que
l'open data a déjà réglé et ce qu'il ne réglera JAMAIS — parce que ce n'est pas dans son
périmètre. Ce sont ces dernières qui font le travail de S2.

Les quatre états, et pourquoi la distinction compte :
  * `matchée (…)`      — la CNAM a tranché. Reste ce qu'elle ignore : modalités de RDV,
                         motifs, langues, PMR. C'est là que Doctolib apporte.
  * `absente du fichier` — ATTENDU, ce n'est pas un échec : l'Annuaire santé ne référence
                         que l'exercice LIBÉRAL.
  * `non résolue`      — le praticien DEVRAIT y figurer et on ne l'a pas trouvé. C'est le
                         seul état qui signale un travail à faire côté identification.

⚠️ « Absente de la CNAM » ne veut PAS dire « inutile de chercher sur Doctolib ». Les deux
sources ont des couvertures COMPLÉMENTAIRES, pas emboîtées :
  * la CNAM référence l'exercice libéral CONVENTIONNÉ ;
  * Doctolib référence QUI PREND DES RDV EN LIGNE — y compris tout le paramédical non
    conventionné (psychologues, ostéopathes, diététiciennes…), les centres de santé et
    les services hospitaliers.
Les 80 « professions non référencées » sont donc le MEILLEUR gisement Doctolib du jeu :
la CNAM ne pourra jamais rien pour elles, Doctolib est leur seule source. Leur absence du
fichier est un argument POUR les ouvrir. (Une version antérieure de cette docstring disait
« ne pas les rechercher une seconde fois » : c'était faux, et ça reléguait 51 fiches en
queue de liste.)

Priorités : on ne trie pas par confort mais par risque, puis par unicité de la source.
Un lien faux en base est un risque ACTIF (un patient clique) ; une fiche vide n'est
qu'incomplète ; une fiche que SEUL Doctolib peut renseigner ne sera renseignée nulle part
ailleurs.

Entrée : `cnam_etats.json`, produit par `cnam_join.py`. Il est VERSIONNÉ dans ce dossier —
sans lui, il faudrait re-télécharger les 147 Mo du fichier CNAM pour rejouer la worklist.

    CNAM_ETATS=/chemin/cnam_etats.json python gen_worklist_s2.py
"""
import csv, json, os
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
ETATS = os.environ.get("CNAM_ETATS") or os.path.join(HERE, "cnam_etats.json")
BASE = os.environ.get("BASE_JSON") or os.path.join(os.path.dirname(HERE),
                                                   "annuaire_donnees.json")
OUT = os.environ.get("OUT_CSV") or os.path.join(HERE, "s2_worklist.csv")
OUT_PROTO = os.environ.get("OUT_PROTO") or os.path.join(HERE, "s2_protocole.csv")

PROCHE = {"75020", "75011", "75012", "75019", "93100", "93260", "93170", "93500"}

# Le protocole vit DANS le classeur, pas dans le dépôt : Claude in Chrome n'a pas le
# système de fichiers — il ne peut pas lire plans/P2/S2.md. Sa seule mémoire durable est
# la feuille. Les consignes doivent donc être à côté des données, sinon elles n'atteignent
# jamais leur exécutant. Un CSV n'a pas d'onglets → second fichier, importé en 2e feuille.
PROTOCOLE = [
    ("But", "Ouvrir des fiches Doctolib une par une pour (1) vérifier des liens déjà en "
            "base qui n'ont JAMAIS été ouverts, (2) retrouver des liens manquants, "
            "(3) relever ce que seul Doctolib possède."),
    ("Boucle", "1. Filtrer etat = a_faire, trier par priorite. 2. Prendre les 20 "
               "premières. 3. Pour chacune : ouvrir la page, trancher, ÉCRIRE LA LIGNE "
               "ET PASSER etat, puis passer à la suivante. 4. À la 20e : ARRÊT NET, "
               "bilan de 5 lignes, rendre la main."),
    ("Sauvegarde", "Écrire dans la feuille APRÈS CHAQUE FICHE — pas tous les 5. Si la "
                   "session est perdue, tout ce qui n'est pas dans la feuille est perdu "
                   "avec elle. La feuille est la seule mémoire."),
    ("Arrêt", "20 fiches maximum puis STOP, même si tout va bien, même s'il « reste de "
              "la place ». La limite ne prévient pas. Si le contexte grossit vite, "
              "descendre à 10-15. JAMAIS monter."),
    ("Identité — la règle n°1",
     "Avant toute écriture : confirmer NOM + SPÉCIALITÉ + ADRESSE contre la ligne. Les "
     "homonymes parisiens sont fréquents et déjà constatés : deux « Alice » gynécologues "
     "à la même adresse, « Moisson-Meer » ≠ « Moisson » à la même adresse, « Julie "
     "Pariente » ≠ « Dr Pariente ». DOUTE → etat = reportee. JAMAIS une supposition."),
    ("Écriture — tu n'écrases RIEN",
     "Tu ne modifies jamais une valeur existante. Tu remplis les colonnes de saisie. Si "
     "la page contredit la fiche, tu l'écris en `note` — un humain tranchera. Raison : "
     "les carnets se sont révélés d'accord avec le fichier officiel de la CNAM 118 fois "
     "sur 119. Ils sont fiables ; une page Doctolib est déclarative et non datée."),
    ("Interdit — coordonnées pro",
     "Ne JAMAIS écrire une coordonnée professionnelle (ligne directe, bip, portable "
     "perso, mail d'avis, consignes pro). Tout ce qui vient de Doctolib est PUBLIC donc "
     "PATIENT. Les colonnes de saisie sont toutes patient."),
    ("Interdit — avis de patients",
     "Doctolib affiche des avis de patients : ne rien en tirer, ne pas les citer, ne pas "
     "les résumer. Aucune donnée de patient, jamais."),
    ("mode_rdv", "Relever COMMENT on prend RDV : en_ligne | telephone | patients_adresses "
                 "| teleconsultation (cumulables, séparés par ;). Beaucoup de praticiens "
                 "sont référencés SANS prise de RDV en ligne : c'est une information, pas "
                 "un manque. « N'accepte que les patients adressés » est l'info la plus "
                 "précieuse de la page pour cette MSP — la relever systématiquement."),
    ("motifs_consultation — trier",
     "GARDER le clinique : « Pose de stérilet », « Bilan d'infertilité », « Suivi de "
     "grossesse ». JETER l'administratif : « Première consultation », « Consultation de "
     "suivi », « Patient déjà venu ». Si 400 fiches portent le même tag, il ne distingue "
     "plus rien et DÉGRADE la recherche. Minuscules, sans accent, tirets."),
    ("verdict_lien (priorité 1)",
     "Ouvrir le lien de `lien_a_verifier` : concordant → confirme. Mauvaise personne → "
     "faux (déjà constaté : un bouton « Prendre RDV » pointait vers le profil d'un "
     "confrère — un patient aurait pris RDV au mauvais endroit). Page morte → "
     "page_morte, MAIS un 404 n'est pas une preuve que le praticien a cessé : ne rien "
     "conclure sur lui."),
    ("Budget", "1 page par fiche. Si elle ne charge pas ou si l'identité ne concorde "
               "pas : note, etat = reportee ou absente_doctolib, fiche suivante. Ne "
               "jamais s'acharner — c'est ce qui remplit le contexte et fait perdre la "
               "session."),
    ("Ne pas toucher", "secteur_conv a déjà été tranché à la source officielle (CNAM). "
                       "Si Doctolib affiche autre chose : le mettre en `note`, rien de "
                       "plus."),
    ("idx", "Ne JAMAIS modifier la colonne idx : c'est elle qui recolle la ligne à la "
            "base."),
]

def ecrire_protocole():
    with open(OUT_PROTO, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["section", "consigne"])
        w.writerows(PROTOCOLE)

def lien_reel(c):
    v = str(c.get("doctolib") or "")
    return v.startswith("http") or "doctolib.fr/" in v

def placeholder(c):
    return bool(c.get("doctolib")) and not lien_reel(c)

# Doctolib référence QUI PREND DES RDV, pas qui est conventionné. Les structures de SOINS
# y sont largement (Thibault, 2026-07-17 : « les centres de santé et les services
# hospitaliers y sont souvent référencés aussi ») ; les structures qui ne délivrent pas de
# consultation, non. Ce n'est qu'un PRONOSTIC affiché à l'opérateur — jamais une exclusion :
# on ne retire aucune fiche de la liste sur cette base.
SOIGNE = {"hôpital", "service hospitalier", "imagerie", "centre de santé", "clinique",
          "centre médical", "cabinet", "hôpital de jour", "planning"}
SANS_RDV = {"association", "réseau", "CSAPA", "ambulance", "PMI", "PASS", "appareillage",
            "institution", "centre social", "administratif", "service social",
            "prestataire de santé à domicile", "annuaire en ligne", "CPTS", "protocole"}

CONTACT = ["tel_secretariat", "doctolib", "site_web", "email_rdv", "ligne_directe", "bip",
           "portable", "email_avis", "mssante", "fax", "adresse"]

def introuvable(c):
    """Nom seul : ni spécialité, ni contact, ni adresse. 4 fiches, toutes d'Antonin.

    Aucune recherche ne peut les identifier — « Dr UDRE » face à 550 587 professionnels,
    ce n'est pas un point de départ. Elles ne sont PAS supprimées : elles appartiennent au
    carnet de quelqu'un, qui sait probablement de qui il s'agit. C'est une question à leur
    auteur, pas une tâche pour Doctolib.

    ⚠️ Ne pas confondre avec les fiches sans contact qui portent un SAVOIR (tags,
    commentaires, orientation) : celles-là sont la raison d'être de l'annuaire. La
    recherche est côté client sur tout le jeu, commentaires et tags inclus (DECISIONS.md,
    2026-07-16) — un membre qui cherche « stérilisation volontaire » trouve Geguaden.
    Et une fiche d'alerte (idx 931) n'a pas de coordonnées PAR DESIGN : on ne veut pas le
    contacter, on veut être prévenu.
    """
    return (c.get("type") == "praticien"
            and not (c.get("profession") or "").strip()
            and not any(c.get(k) for k in CONTACT)
            and not (c.get("comments") or c.get("orientation") or c.get("tags")))

def hors_idf(c):
    """Recentrage Paris (Thibault, 2026-07-17) : la MSP adresse dans Paris et sa bordure.

    Chercher un praticien à Marseille ou en Seine-et-Marne coûte une séance et ne sert
    personne. On ne supprime pas ces fiches — on les met en queue.
    """
    a = (c.get("arrondissement") or "").strip()
    return bool(a) and not a.startswith(("75", "92", "93", "94"))

def pronostic(c, etat):
    """Ce qu'on peut raisonnablement espérer trouver sur Doctolib. Advisory, pas normatif."""
    st = (c.get("sous_type") or "").strip()
    if introuvable(c):
        return ("IDENTIFICATION IMPOSSIBLE : nom seul, sans spécialité ni contact — "
                "à demander à l'auteur du carnet (%s), pas à chercher"
                % (", ".join(c["_meta"].get("owners") or []) or "?"))
    if hors_idf(c):
        return "hors Paris (%s) : hors du territoire d'adressage" % c.get("arrondissement")
    if "profession non référencée" in etat:
        return "SEULE SOURCE : la CNAM ne référence pas cette profession"
    if etat.startswith("non résolue"):
        # 52 des 140 n'ont ni adresse ni arrondissement. Chercher dans Paris est un pari
        # raisonnable (la MSP est dans le 20e) — mais introuvable dans Paris ne prouve
        # rien : `reportee`, JAMAIS `absente_doctolib`.
        if not (c.get("adresse") or c.get("arrondissement")):
            return ("identification difficile : ni adresse ni arrondissement — chercher "
                    "dans Paris ; si rien : reportee, pas absente_doctolib")
        return "identification : introuvable au fichier CNAM alors qu'il devrait y être"
    if st in SANS_RDV:
        return "⚠ probablement absent de Doctolib (%s)" % st
    if st in SOIGNE:
        return "structure de soins : souvent référencée"
    return ""

def apport_doctolib(c, etat):
    """Ce que Doctolib apporterait ET que la CNAM ne porte pas.

    Le fichier CNAM ne contient NI motif de consultation, NI langue, NI accès PMR, NI
    modalité de RDV. Sur une fiche déjà matchée, c'est exactement ça qui reste.

    `delai` est volontairement absent : « prochaine dispo dans 3 semaines » est vrai le
    jour du relevé et faux le mois suivant, sans que personne ne le sache. Une base
    statique ne doit pas porter la donnée la plus périssable de la page (cf. S2 §T2).
    """
    manque = []
    if lien_reel(c):
        manque.append("VÉRIFIER le lien en base")
    elif placeholder(c):
        manque.append("TROUVER le lien (le carnet affirme qu'il existe)")
    manque.append("mode de prise de RDV")
    if c.get("prend_nouveaux") in (None, "", "inconnu"):
        manque.append("prend de nouveaux patients")
    if not c.get("langues"):
        manque.append("langues")
    if not c.get("pmr"):
        manque.append("PMR")
    if not c.get("tarif"):
        manque.append("tarif")
    p = pronostic(c, etat)
    return " ; ".join(manque) + (" — %s" % p if p else "")

def priorite(c, etat):
    arr = (c.get("arrondissement") or "").strip()
    # Un nom seul n'est pas un point de départ : ni recherche, ni Doctolib. C'est une
    # question à l'auteur du carnet. 4 fiches, toutes d'Antonin. Jamais supprimées.
    if introuvable(c):
        return 8
    if lien_reel(c):
        return 1      # risque ACTIF : le lien est en base, il peut être faux
    if placeholder(c):
        return 2      # gain sûr : le carnet affirme que le lien existe
    # Recentrage Paris : un praticien à Marseille coûte une séance et ne sert personne.
    # En queue, pas supprimé.
    if hors_idf(c):
        return 7
    # p3 — LÀ OÙ DOCTOLIB EST LA SEULE SOURCE POSSIBLE.
    # `non résolue` : introuvable au fichier alors qu'il devrait y être → seule
    #   l'identification au navigateur peut trancher (Doctolib est un MOTEUR DE RECHERCHE,
    #   là où la CNAM n'était qu'une jointure : un humain retrouve « Machin kiné 20e » là
    #   où aucune clé n'existait).
    # `profession non référencée` : psychologues, ostéopathes, doulas… La CNAM ne pourra
    #   JAMAIS rien pour elles. Leur absence du fichier est un argument POUR les ouvrir,
    #   pas contre — c'était l'erreur de la version précédente, qui les reléguait en p4-p7.
    if etat.startswith("non résolue") or "profession non référencée" in etat:
        return 3
    if arr in PROCHE:
        return 4      # là où la MSP adresse réellement
    if c.get("statut") == "a_verifier":
        return 5
    if arr.startswith("75") or not arr:
        return 6
    return 7          # hors territoire

LIBELLE = {1: "VÉRIFIER un lien Doctolib (risque actif en base)",
           2: "TROUVER un lien Doctolib (gain sûr)",
           3: "IDENTIFIER / seule source possible (non résolues + professions hors CNAM)",
           4: "20e + limitrophes", 5: "fiches a_verifier",
           6: "reste de Paris", 7: "hors Paris — ne pas chercher",
           8: "nom seul : à demander à l'auteur du carnet, pas à chercher"}

VAGUE = {1: "A", 2: "A", 3: "B", 4: "C", 5: "C", 6: "C", 7: "—", 8: "—"}

COLS = ["idx", "priorite", "vague", "etat_cnam", "motif_non_match", "civilite", "nom",
        "prenom", "profession", "arrondissement", "adresse", "secteur_conv",
        "source_secteur", "statut", "apport_doctolib_attendu", "lien_a_verifier",
        # --- SAISIE S2 --- (pas de `delai` : cf. apport_doctolib ; pas de
        # `creneaux_visibles` : la règle qui s'en servait a été annulée, cf. S2 §T3)
        "etat", "verdict_lien", "doctolib_url_verifiee", "mode_rdv", "prend_nouveaux",
        "motifs_consultation", "langues", "pmr", "tarif", "note"]

def main():
    etats = {e["idx"]: e for e in json.load(open(ETATS, encoding="utf-8"))}
    base = json.load(open(BASE, encoding="utf-8"))
    rows = []
    for c in base:
        i = c["_meta"]["idx"]
        e = etats.get(i, {})
        etat = e.get("etat_jointure", "non traitée")
        p = priorite(c, etat)
        rows.append({
            "idx": i, "priorite": p, "vague": VAGUE[p], "etat_cnam": etat,
            "motif_non_match": e.get("motif", ""),
            "civilite": c.get("civilite") or "", "nom": c.get("nom") or "",
            "prenom": c.get("prenom") or "", "profession": c.get("profession") or "",
            "arrondissement": c.get("arrondissement") or "",
            "adresse": c.get("adresse") or "",
            "secteur_conv": c.get("secteur_conv") or "",
            "source_secteur": ("CNAM" if c.get("source_type") == "annuaire_sante"
                               and c.get("secteur_conv") else
                               ("carnet" if c.get("secteur_conv") else "")),
            "statut": c.get("statut") or "",
            "apport_doctolib_attendu": apport_doctolib(c, etat),
            "lien_a_verifier": c.get("doctolib") if lien_reel(c) else "",
            "etat": "a_faire", "verdict_lien": "", "doctolib_url_verifiee": "",
            "mode_rdv": "", "prend_nouveaux": "", "motifs_consultation": "", "langues": "",
            "pmr": "", "tarif": "", "note": ""})
    rows.sort(key=lambda r: (r["priorite"], r["nom"].lower()))
    # utf-8-sig : Google Sheets et Excel lisent les accents correctement à l'import
    with open(OUT, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=COLS)
        w.writeheader()
        w.writerows(rows)
    ecrire_protocole()

    print("écrit : %s — %d lignes (les 1 052 fiches)" % (os.path.basename(OUT), len(rows)))
    print("écrit : %s — l'onglet Protocole" % os.path.basename(OUT_PROTO))
    print("\n--- état de jointure CNAM des 1 052 fiches")
    for k, n in sorted(Counter(r["etat_cnam"] for r in rows).items(),
                       key=lambda x: -x[1]):
        print("   %-58s %4d" % (k, n))
    print("\n--- ordre de travail S2")
    for p, n in sorted(Counter(r["priorite"] for r in rows).items()):
        print("   %d  [vague %s]  %-46s %4d   (%2d séances de 20)"
              % (p, VAGUE[p], LIBELLE[p], n, -(-n // 20)))
    print("\n--- vagues")
    for v, n in sorted(Counter(r["vague"] for r in rows).items()):
        print("   %s  %4d fiches   (%2d séances de 20)" % (v, n, -(-n // 20)))

if __name__ == "__main__":
    main()
