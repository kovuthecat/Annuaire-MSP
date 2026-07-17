# -*- coding: utf-8 -*-
"""Jointure des 1 052 fiches avec l'open data « Annuaire santé Ameli » (CNAM).

POURQUOI CE SCRIPT
------------------
`secteur_conv` était le gisement le plus évident d'une seconde passe (cf. IMPORT.md),
et `annuairesante.ameli.fr` est inaccessible aux robots. Mais la CNAM **publie** le
contenu de cet annuaire en open data (Licence Ouverte 2.0) : on prend la donnée à la
source au lieu de la gratter à travers un anti-bot.

COMMENT LE REJOUER SUR UN FICHIER PLUS RÉCENT
---------------------------------------------
Le fichier est rafraîchi **chaque semaine, dans la nuit du dimanche au lundi**. Les URL
portent un horodatage : ne pas les coder en dur, les redemander à l'API data.gouv.fr.

    curl -s "https://www.data.gouv.fr/api/1/datasets/68e51e04c4258097a201a3cc/" | \
        python -c "import json,sys; [print(r['format'], r['url']) for r in json.load(sys.stdin)['resources']]"

Puis télécharger `liste-ps-*.csv` (~147 Mo) et `liste-cds-*.csv` (~3 Mo) dans un dossier
de travail HORS DÉPÔT, et pointer CNAM_DIR dessus :

    CNAM_DIR=/chemin/scratch/cnam python cnam_join.py

⚠️ Ne pas confondre avec le jeu « Annuaire santé de la Cnam (déprécié) », figé depuis
janvier 2026.

CE QUE LE FICHIER CONTIENT — ET SURTOUT CE QU'IL NE CONTIENT PAS
-----------------------------------------------------------------
Le plan de session tablait sur une jointure par RPPS. **Il n'y a pas de RPPS dans
l'export PS** : ses 24 colonnes (conformes au PDF de descriptif) portent nom, prénom,
civilité H/F, spécialité, téléphone, adresse, secteur conventionnel, option tarifaire
et nature d'exercice — aucun identifiant. Conséquences :

  * pas de jointure exacte, donc pas de jeu de contrôle « à match certain » gratuit :
    on le reconstruit ici avec le palier HAUT (nom+prénom+CP+n° de voie+spécialité) ;
  * `rpps` n'est pas renseignable depuis cette source ;
  * `ps_activite_civilite` vaut H/F : c'est le **genre**, pas le titre. Écrire « M. »
    par-dessus le « Dr » d'un carnet serait une régression de précision — cf. CIVILITE_OK.

LES PALIERS DE MATCH
--------------------
  haut  : nom + prénom exact + CP + n° de voie concordants, spécialité compatible.
          C'est le jeu de contrôle : un désaccord n'y est PAS explicable par un
          mauvais appariement, donc il mesure le vieillissement des carnets.
  bas   : nom + prénom + CP concordants (critère d'acceptation du plan).
  adresse : nom + prénom + adresse concordants, quand le carnet n'a pas de CP.
  Jamais de match sur le nom seul : le jeu est plein d'homonymes à la même adresse
  (Moisson-Meer / Moisson, les deux Alice gynécologues, Julie Pariente / Dr Pariente).

Un match qui reste ambigu après filtrage (plusieurs prénoms distincts, ou plusieurs
secteurs distincts) n'est PAS un match : il part en `_meta.hypotheses`.
"""
import csv, io, json, os, re, sys, unicodedata
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
CNAM_DIR = os.environ.get("CNAM_DIR") or os.path.join(HERE, "cnam")
BASE_JSON = os.environ.get("BASE_JSON") or os.path.join(
    os.path.dirname(HERE), "annuaire_donnees.json")
OUT_DIR = os.environ.get("OUT_DIR") or HERE

DATASET_URL = "https://www.data.gouv.fr/datasets/annuaire-sante-ameli"
FICHIER_MAJ = "2026-07-13"          # date de mise à jour du jeu utilisé
RUN_DATE = "2026-07-17T00:00:00+02:00"

# ---------------------------------------------------------------------------
# Normalisation
# ---------------------------------------------------------------------------
def strip_accents(s):
    return "".join(ch for ch in unicodedata.normalize("NFD", s)
                   if unicodedata.category(ch) != "Mn")

def norm(s):
    """Casse, accents, tirets, ponctuation, titres. « Dr Machin » -> « MACHIN »."""
    if not s:
        return ""
    s = strip_accents(str(s)).upper()
    s = re.sub(r"\b(DR|PR|DOCTEUR|PROFESSEUR|MME|MLLE|MR|M)\b\.?", " ", s)
    s = re.sub(r"[^A-Z0-9]+", " ", s)
    return " ".join(s.split())

TYPES_VOIE = {"RUE", "AVENUE", "AV", "BOULEVARD", "BD", "PLACE", "PL", "ALLEE",
              "IMPASSE", "QUAI", "PASSAGE", "SQUARE", "VILLA", "COURS", "CHEMIN",
              "ROUTE", "RESIDENCE", "BIS", "TER", "CITE", "SENTIER", "ESPLANADE",
              "PARVIS", "GALERIE", "DE", "DU", "DES", "LA", "LE", "LES", "D", "L"}

def adr_parts(s):
    """(numéro, tokens significatifs) — « 77 rue Alexandre Dumas » -> (77, {ALEXANDRE, DUMAS})."""
    n = norm(s)
    if not n:
        return None, set()
    m = re.match(r"^(\d+)\b", n)
    num = int(m.group(1)) if m else None
    toks = {t for t in n.split() if t not in TYPES_VOIE and not t.isdigit()}
    return num, toks

def adr_compat(a, b):
    """« exact » (même n° + même voie), « voie » (voie seule), None (rien/incompatible)."""
    na, ta = adr_parts(a)
    nb, tb = adr_parts(b)
    if not ta or not tb:
        return None
    inter = ta & tb
    if not inter or len(inter) < min(len(ta), len(tb), 2) and len(inter) < 2:
        # au moins 2 tokens communs, ou tous ceux du plus court (voies à 1 mot)
        if not (inter and min(len(ta), len(tb)) == 1):
            return None
    if na is not None and nb is not None:
        return "exact" if na == nb else None      # numéros différents => autre lieu
    return "voie"

# ---------------------------------------------------------------------------
# Familles de spécialité — pont entre la prose des carnets et les libellés CNAM
# ---------------------------------------------------------------------------
# Le carnet écrit « ORL », « Gynéco médicale », « Kiné » ; la CNAM écrit
# « Oto-Rhino-Laryngologue (ORL) et chirurgien cervico-facial ». On ramène les deux
# à une famille. Une famille None (inconnue des deux côtés) ne vaut PAS veto : elle
# ne dit rien. Deux familles connues et différentes, en revanche, disent « pas la
# même personne » (Julie Pariente gynéco vs Dr Pariente rhumato).
FAMILLES = [
    ("kine",        r"KINESI|MASSEUR"),
    ("sagefemme",   r"SAGE FEMME|MAIEUTIC"),
    ("gyneco",      r"GYNECO|OBSTETRIC"),
    ("dermato",     r"DERMATO|VENEROLOG"),
    ("endocrino",   r"ENDOCRINO|DIABETO"),
    ("orl",         r"\bORL\b|OTO RHINO|LARYNGOLOG"),
    ("radiologue",  r"RADIOLOG|IMAGERIE"),
    ("radiotherap", r"RADIOTHERAP"),
    ("rhumato",     r"RHUMATO"),
    ("gastro",      r"GASTRO|HEPATO|PROCTO"),
    ("pneumo",      r"PNEUMO"),
    ("cardio",      r"CARDIO"),
    ("neurochir",   r"NEUROCHIR"),
    ("neurologue",  r"NEUROLOG"),
    ("neuropsy",    r"NEUROPSYCHIATRE"),
    ("psychiatre",  r"PSYCHIATR|PEDOPSY"),
    ("orthophon",   r"ORTHOPHON"),
    ("orthoptiste", r"ORTHOPTIST"),
    ("ophtalmo",    r"OPHTALMO"),
    ("pediatre",    r"PEDIATR"),
    ("geriatre",    r"GERIATR|GERONTO"),
    ("nephro",      r"NEPHROLOG"),
    ("urologue",    r"UROLOG"),
    ("interne",     r"MEDECINE INTERNE"),
    ("infectio",    r"INFECTIOLOG|MALADIES INFECTIEUSES|TROPICAL"),
    ("allergo",     r"ALLERGOLOG"),
    ("vasculaire",  r"VASCULAIRE|ANGIOLOG|PHLEBOLOG"),
    ("anapath",     r"ANATOMO|CYTO PATHOLOG"),
    ("anesth",      r"ANESTHESI|REANIMAT"),
    ("mpr",         r"MEDECINE PHYSIQUE|READAPTATION|\bMPR\b"),
    ("nucleaire",   r"MEDECINE NUCLEAIRE"),
    ("hemato",      r"HEMATOLOG"),
    ("onco",        r"CANCEROLOG|ONCOLOG"),
    ("genetique",   r"GENETIC|GENETIQUE"),
    ("santepub",    r"SANTE PUBLIQUE"),
    ("legale",      r"MEDECINE LEGALE|EXPERTISE"),
    ("urgence",     r"MEDECINE D URGENCE|URGENTISTE"),
    ("chir_ortho",  r"ORTHOPEDISTE ET TRAUMATO|CHIRURGIEN ORTHOPED|TRAUMATOLOG"),
    ("chir_plast",  r"PLASTICIEN|PLASTIQUE|ESTHETIQUE"),
    ("chir_maxillo", r"MAXILLO|STOMATOLOG"),
    ("chir_visc",   r"VISCERAL|DIGESTIF"),
    ("chir_thorax", r"THORACIQUE"),
    ("chir_infant", r"CHIRURGIEN INFANTILE|CHIRURGIE INFANTILE|CHIRURGIEN PEDIATR"),
    ("chir_oral",   r"CHIRURGIEN ORAL|CHIRURGIE ORALE"),
    ("chir_gen",    r"CHIRURGIEN GENERAL"),
    ("dentiste",    r"DENTISTE|ODONTOLOG|ORTHODONT"),
    ("pharmacien",  r"PHARMACIEN|PHARMACIE"),
    ("labo",        r"LABORATOIRE|BIOLOGISTE|BIOLOGIE"),
    ("podologue",   r"PODOLOG|PEDICURE|PODO ORTHES"),
    ("opticien",    r"OPTICIEN|OPTIQUE"),
    ("audio",       r"AUDIOPROTHESIST"),
    ("ambulance",   r"TRANSPORT SANITAIRE|AMBULANC|VEHICULE SANITAIRE"),
    ("orthopediste", r"ORTHOPEDISTE ORTHESIST|ORTHOPROTHESIST|OCULARISTE|EPITHESIST"),
    ("fournisseur", r"FOURNISSEUR|PRESTATAIRE|MATERIEL MEDICAL"),
    ("infirmier",   r"INFIRMIER|\bIDE\b|IPA\b|PRATIQUE AVANCEE"),
    # généraliste en dernier : « Médecin » nu tombe ici, et « Médecin vasculaire »
    # a déjà été capté par `vasculaire` au-dessus.
    ("generaliste", r"GENERALISTE|\bMEDECIN\b|\bMG\b|ACUPUNCT|HOMEOPATH|THERMALIST|"
                    r"ECHOGRAPH|PHONIATRE|MEDECINE APPLIQUEE AUX SPORTS"),
]

# Professions que la CNAM ne référence PAS (cf. PDF §« Qui est référencé ») : leur
# absence du fichier est un résultat attendu, pas un échec de jointure.
HORS_ANNUAIRE = re.compile(
    r"PSYCHOLOG|PSYCHOTHERAP|OSTEOPATH|DOULA|DIETETIC|NUTRITIONNIST|PSYCHOMOTRIC|"
    r"SEXOLOG|SOPHROLOG|ETHIOPATH|CHIROPRACT|NATUROPATH|HYPNO|ART THERAP|"
    r"MUSICOTHERAP|ASSISTANT|EDUCATEUR|CONSEILLER|SAGE FEMME ECHOGRAPHISTE|"
    r"TABACOLOG|ADDICTOLOG|ACCOMPAGNANT|MEDIATEUR|INTERPRET|JURISTE|AVOCAT")

def famille(txt):
    if not txt:
        return None
    n = norm(txt)
    for fam, pat in FAMILLES:
        if re.search(pat, n):
            return fam
    return None

def spe_compat(a, b):
    """True si compatibles ou si l'un est inconnu ; False si deux familles distinctes."""
    fa, fb = famille(a), famille(b)
    if fa is None or fb is None:
        return True
    if fa == fb:
        return True
    # familles réellement proches : la CNAM range parfois ailleurs que le carnet
    PROCHES = [{"generaliste", "urgence"}, {"gyneco", "chir_gen"},
               {"chir_maxillo", "dentiste"}, {"chir_maxillo", "orl"},
               {"neurologue", "neuropsy"}, {"psychiatre", "neuropsy"},
               {"onco", "radiotherap"}, {"onco", "hemato"},
               {"chir_ortho", "mpr"}, {"labo", "anapath"},
               {"vasculaire", "cardio"}, {"interne", "generaliste"},
               {"allergo", "pneumo"}, {"allergo", "generaliste"},
               {"podologue", "orthopediste"}]
    return {fa, fb} in PROCHES

# ---------------------------------------------------------------------------
# Le fichier CNAM
# ---------------------------------------------------------------------------
# Annexe E du descriptif. Le code 2 « Conventionné Dépassement Permanent » est un
# statut historique (droit permanent à dépassement) : ce n'est NI le secteur 1 NI le
# secteur 2, et notre enum ne le porte pas. On ne le mappe donc pas — on préfère ne
# rien écrire plutôt que d'écrire une approximation dans un champ qui sert à annoncer
# un reste à charge au patient.
SECTEUR = {"0": "non_conv", "1": "1", "3": "2"}
SECTEUR_LIB = {"0": "non conventionné", "1": "secteur 1", "2": "conventionné dépassement permanent",
               "3": "secteur 2"}

# Professions où « Dr » est l'usage : la civilité H/F de la CNAM y serait moins
# précise que le carnet. On ne renseigne la civilité que pour les autres.
CIVILITE_OK = {"kine", "sagefemme", "infirmier", "orthophon", "orthoptiste",
               "podologue", "opticien", "audio", "orthopediste"}

class Ligne(object):
    __slots__ = ("nom", "prenom", "civilite", "spe", "tel", "voie", "cp", "ville",
                 "secteur_code", "optam", "nature_code", "nature", "raison")

def cle_adresse(s):
    """« 36 quai de Jemmapes » -> « 36|JEMMAPES » (clé d'adresse exacte)."""
    num, toks = adr_parts(s)
    if num is None or not toks:
        return None
    return "%d|%s" % (num, " ".join(sorted(toks)))

def charger_ps(noms_utiles):
    """Ne garde que les lignes dont le nom apparaît dans nos carnets (550 587 -> ~18 000).

    Construit AU PASSAGE un index adresse exacte -> codes postaux observés, sur Paris
    et la petite couronne, à partir de TOUTES les lignes (pas seulement nos noms) :
    550 000 déclarations d'adresse professionnelle font un référentiel utilisable pour
    arbitrer les incohérences adresse/arrondissement de nos fiches (cf. classe E).
    """
    path = None
    for f in sorted(os.listdir(CNAM_DIR)):
        if f.startswith("liste-ps") and f.endswith(".csv") or f == "ps.csv":
            path = os.path.join(CNAM_DIR, f)
    if not path:
        sys.exit("fichier PS introuvable dans %s — cf. l'en-tête du script" % CNAM_DIR)
    idx = defaultdict(list)
    idx_adr = defaultdict(lambda: defaultdict(set))
    total = 0
    with io.open(path, encoding="utf-8-sig", newline="") as fh:
        for row in csv.DictReader(fh, delimiter=";"):
            total += 1
            cp = row["coordonnees_code_postal"]
            if cp[:2] in ("75", "92", "93", "94"):
                k = cle_adresse(row["coordonnees_voie"])
                if k:
                    # On compte des DÉCLARANTS DISTINCTS, pas des lignes : un même
                    # professionnel produit une ligne par spécialité, et un centre de
                    # santé une ligne par profession exercée. Compter les lignes ferait
                    # atteindre le seuil de 3 à un seul déclarant — le seuil ne voudrait
                    # alors plus rien dire.
                    idx_adr[k][cp].add((norm(row["ps_activite_nom"]),
                                        norm(row["ps_activite_prenom"])))
            nn = norm(row["ps_activite_nom"])
            if not nn or nn not in noms_utiles:
                continue
            l = Ligne()
            l.nom, l.prenom = nn, norm(row["ps_activite_prenom"])
            l.civilite = row["ps_activite_civilite"]
            l.spe = row["specialite_libelle"]
            l.tel = row["coordonnees_num_tel"]
            l.voie = " ".join(filter(None, [row["coordonnees_voie"],
                                            row["coordonnees_complement"]]))
            l.cp, l.ville = row["coordonnees_code_postal"], row["coordonnees_ville"]
            l.secteur_code = row["secteur_conventionnel_code"]
            l.optam = row["option_tarifaire_libelle"]
            l.nature_code = (row["nature_exercice_code"] or "").lstrip("0") or "0"
            l.nature = row["nature_exercice_libelle"]
            l.raison = row["ps_activite_raison_sociale"]
            idx[nn].append(l)
    return idx, total, idx_adr

# ---------------------------------------------------------------------------
# Classe E — cohérence interne adresse <-> arrondissement
# ---------------------------------------------------------------------------
# Une fiche dont l'adresse et l'arrondissement se contredisent est fausse sur l'un des
# deux, sans qu'aucun arbitrage de fraîcheur soit nécessaire. Encore faut-il le PROUVER
# sans se tromper : trois filtres, écrits contre des faux positifs réellement observés.
#
#  1. CEDEX et CP alternatifs. « 26 av. du Dr Arnold Netter » est déclaré 75571 par la
#     CNAM (Paris CEDEX 12) alors que le carnet dit 75012 : le carnet a RAISON. Idem
#     75016/75116 (16e), ou 94805 (Villejuif CEDEX) vs 94140. On n'examine donc que les
#     paires où les deux CP sont des arrondissements parisiens standard, 75001-75020.
#  2. Index creux. Une seule déclaration à une adresse ne prouve rien : « 3 place
#     Gambetta » existe à Bois-Colombes (92270) ET dans le 20e. Seuil : >= 3 déclarations.
#  3. Voie sans numéro : autorisée, mais SEULEMENT massivement attestée. Une première
#     version à « un seul CP observé » était fausse — les rues à cheval sur deux
#     arrondissements (rue Saint-Maur, 10e et 11e, vue 5 fois) la piégeaient, et les
#     « adresses » qui sont en fait des repères (« Père Lachaise », « Vitry ») la
#     rendaient absurde. Une voie réellement à cheval se TRAHIT en portant deux CP dès
#     qu'on l'observe assez : on exige donc un seul CP parisien, >= 10 déclarations ET
#     >= 5 numéros distincts. Sur les 1 052 fiches, ce critère ne remonte qu'un cas
#     (idx 296, « 125 rue de la Glacière » donné en 75014 : la CNAM place cette rue 52
#     fois, sur 17 numéros, toujours au 75013 et jamais au 75014) et aucun faux positif.
CP_PARIS = re.compile(r"^750(0[1-9]|1[0-9]|20)$")
SEUIL_ADR = 3
SEUIL_VOIE_DECL = 10
SEUIL_VOIE_NUMS = 5

def index_voies(idx_adr):
    """voie -> {cp: (déclarants distincts, numéros distincts)}, dérivé de l'index d'adresses."""
    voies = defaultdict(lambda: defaultdict(lambda: [set(), set()]))
    for k, cps in idx_adr.items():
        num, v = k.split("|", 1)
        for cp, decl in cps.items():
            voies[v][cp][0] |= decl
            voies[v][cp][1].add(num)
    return voies

def incoherence_cp(c, idx_adr, voies):
    """(cp_reel, preuve) si l'adresse de la fiche est attestée ailleurs, sinon None."""
    arr = (c.get("arrondissement") or "").strip()
    if not CP_PARIS.match(arr):
        return None
    k = cle_adresse(c.get("adresse"))
    # --- critère 1 : l'adresse EXACTE (n° + voie) est attestée à un autre CP
    if k:
        cps = idx_adr.get(k)
        if cps and arr not in cps:
            std = {cp: len(decl) for cp, decl in cps.items()
                   if CP_PARIS.match(cp) and len(decl) >= SEUIL_ADR}
            if len(std) == 1:
                cp, n = list(std.items())[0]
                return cp, ("%d professionnels distincts déclarent l'adresse « %s » au "
                            "code postal %s" % (n, c.get("adresse"), cp))
        if cps:
            return None            # adresse connue et cohérente, ou ambiguë : on s'arrête
    # --- critère 2 : la VOIE entière n'existe à Paris qu'à un seul CP, massivement
    num, toks = adr_parts(c.get("adresse"))
    if not toks:
        return None
    v = " ".join(sorted(toks))
    cps = voies.get(v)
    if not cps:
        return None
    par = {cp: val for cp, val in cps.items() if CP_PARIS.match(cp)}
    if arr in par or len(par) != 1:
        return None
    cp, (decl, nums) = list(par.items())[0]
    if len(decl) < SEUIL_VOIE_DECL or len(nums) < SEUIL_VOIE_NUMS:
        return None
    return cp, ("%d professionnels distincts, répartis sur %d numéros différents de la "
                "voie « %s », la déclarent au code postal %s — et aucun au %s"
                % (len(decl), len(nums), c.get("adresse"), cp, arr))

def charger_cds():
    path = None
    for f in sorted(os.listdir(CNAM_DIR)):
        if f.startswith("liste-cds") and f.endswith(".csv") or f == "cds.csv":
            path = os.path.join(CNAM_DIR, f)
    if not path:
        sys.exit("fichier CDS introuvable dans %s" % CNAM_DIR)
    etabs = {}
    with io.open(path, encoding="utf-8-sig", newline="") as fh:
        for row in csv.DictReader(fh, delimiter=";"):
            k = row["etab_finess"]
            e = etabs.setdefault(k, {"finess": k, "nom": row["etab_raison_sociale"],
                                     "nom_norm": norm(row["etab_raison_sociale"]),
                                     "type": row["type_etab_libelle"],
                                     "tel": row["coordonnees_num_tel"],
                                     "voie": " ".join(filter(None, [row["coordonnees_voie"],
                                                                    row["coordonnees_complement"]])),
                                     "cp": row["coordonnees_code_postal"],
                                     "ville": row["coordonnees_ville"], "spes": set()})
            e["spes"].add(row["specialite_libelle"])
    return etabs

# ---------------------------------------------------------------------------
# Appariement
# ---------------------------------------------------------------------------
def prenom_match(a, b):
    """« exact », « token » (1er prénom commun : Anne vs Anne Marie), ou None."""
    if not a or not b:
        return None
    if a == b:
        return "exact"
    ta, tb = a.split(), b.split()
    if ta and tb and ta[0] == tb[0]:
        return "token"
    return None

def apparier(c, idx_ps):
    """Renvoie (palier, lignes, motif_de_rejet)."""
    nn = norm(c.get("nom"))
    cands = idx_ps.get(nn) or []
    if not cands:
        return None, [], "nom absent du fichier"
    pn = norm(c.get("prenom"))
    if not pn:
        # Le carnet n'a pas de prénom. On n'apparie PAS sur le nom seul ; on
        # n'accepte que si l'adresse exacte + la spécialité désignent une personne
        # et une seule (un seul prénom distinct dans le fichier).
        exact = [l for l in cands
                 if adr_compat(c.get("adresse"), l.voie) == "exact"
                 and (not c.get("arrondissement") or c["arrondissement"] == l.cp)
                 and spe_compat(c.get("profession"), l.spe)]
        prenoms = {l.prenom for l in exact}
        if len(prenoms) == 1 and exact:
            return "adresse_sans_prenom", exact, None
        if len(prenoms) > 1:
            return None, [], "prénom absent du carnet, %d personnes à cette adresse" % len(prenoms)
        return None, [], "prénom absent du carnet, pas d'adresse concordante"

    par_prenom = [(prenom_match(pn, l.prenom), l) for l in cands]
    exacts = [l for m, l in par_prenom if m == "exact"]
    tokens = [l for m, l in par_prenom if m == "token"]
    lot = exacts or tokens
    if not lot:
        return None, [], "nom présent, prénom différent (%s)" % ", ".join(
            sorted({l.prenom for l in cands})[:3])
    if not exacts and len({l.prenom for l in tokens}) > 1:
        return None, [], "prénom partiel ambigu (%s)" % ", ".join(
            sorted({l.prenom for l in tokens})[:3])

    arr = (c.get("arrondissement") or "").strip()
    if arr:
        meme_cp = [l for l in lot if l.cp == arr]
        if meme_cp:
            haut = [l for l in meme_cp
                    if adr_compat(c.get("adresse"), l.voie) == "exact"
                    and spe_compat(c.get("profession"), l.spe)]
            if haut:
                return "haut", haut, None
            return "bas", meme_cp, None
        # CP du carnet non retrouvé : l'adresse peut quand même trancher
        par_adr = [l for l in lot if adr_compat(c.get("adresse"), l.voie) == "exact"]
        if par_adr:
            return "bas", par_adr, None
        return None, [], "nom+prénom trouvés, mais à d'autres CP (%s)" % ", ".join(
            sorted({l.cp for l in lot})[:4])
    par_adr = [l for l in lot if adr_compat(c.get("adresse"), l.voie)]
    if par_adr:
        return "adresse", par_adr, None
    return None, [], "nom+prénom trouvés, ni CP ni adresse au carnet pour trancher"

def secteur_des(lignes):
    """La valeur CNAM, si les lignes retenues n'en portent qu'une."""
    vals = {SECTEUR.get(l.secteur_code) for l in lignes if l.secteur_code in SECTEUR}
    dp = any(l.secteur_code == "2" for l in lignes)
    if dp:
        return None, "dépassement permanent (hors enum)"
    vals.discard(None)
    if len(vals) == 1:
        return vals.pop(), None
    if len(vals) > 1:
        return None, "secteurs contradictoires dans le fichier (%s)" % ", ".join(sorted(vals))
    return None, None

def apparier_cds(c, etabs):
    """Structures : la raison sociale est bien plus discriminante qu'un patronyme.
    On exige quand même deux critères : nom (exact, ou inclus avec >= 2 mots) + CP."""
    nn = norm(c.get("nom"))
    if not nn:
        return None, []
    arr = (c.get("arrondissement") or "").strip()
    toks = set(nn.split())
    out = []
    for e in etabs.values():
        if arr and e["cp"] != arr:
            continue
        if not arr and adr_compat(c.get("adresse"), e["voie"]) != "exact":
            continue
        et = set(e["nom_norm"].split())
        if e["nom_norm"] == nn:
            out.append(("exact", e))
        elif len(toks & et) >= 2 and (toks <= et or et <= toks):
            out.append(("inclus", e))
    if not out:
        return None, []
    if any(m == "exact" for m, _ in out):
        out = [(m, e) for m, e in out if m == "exact"]
    if len({e["finess"] for _, e in out}) > 1:
        return None, []                      # plusieurs centres candidats : on ne tranche pas
    return ("cds_exact" if out[0][0] == "exact" else "cds_inclus"), [e for _, e in out]

def titre(s):
    """« 60 AVENUE DE JASSERON » -> « 60 Avenue de Jasseron ». La CNAM écrit en
    capitales ; le carnet ne le fait pas, et le champ est affiché tel quel aux membres."""
    petits = {"de", "du", "des", "la", "le", "les", "d", "l", "et", "à", "au", "aux", "sur"}
    mots = str(s or "").strip().lower().split()
    out = []
    for i, m in enumerate(mots):
        out.append(m if (i and m in petits) else
                   "-".join(p.capitalize() for p in m.split("-")))
    return " ".join(out)

def tel_fr(t):
    """« 0140213040 » -> « 01 40 21 30 40 » (format des carnets)."""
    d = re.sub(r"\D", "", str(t or ""))
    if len(d) != 10:
        return None
    return " ".join(d[i:i + 2] for i in range(0, 10, 2))

# ---------------------------------------------------------------------------
# Programme principal
# ---------------------------------------------------------------------------
def main():
    base = json.load(open(BASE_JSON, encoding="utf-8"))
    noms = {norm(c.get("nom")) for c in base if c.get("nom")}
    noms.discard("")
    idx_ps, total_ps, idx_adr = charger_ps(noms)
    etabs = charger_cds()
    print("fichier PS : %d lignes, %d retenues sur %d patronymes de nos carnets"
          % (total_ps, sum(len(v) for v in idx_ps.values()), len(idx_ps)))
    print("fichier CDS : %d centres de santé" % len(etabs))
    print("index adresse -> CP : %d adresses exactes (Paris + petite couronne)" % len(idx_adr))

    props, etats, calib, classe_e = [], [], [], []
    prop_par_idx = {}
    stats = Counter()

    for c in base:
        i = c["_meta"]["idx"]
        palier, lignes, motif = apparier(c, idx_ps) if c["type"] == "praticien" \
            else (None, [], "fiche non-praticien")
        if not lignes and c["type"] in ("structure", "labo"):
            palier, lignes_cds = apparier_cds(c, etabs)
            if palier:
                lignes = lignes_cds

        etat = {"idx": i, "nom": c.get("nom") or "", "prenom": c.get("prenom") or "",
                "type": c["type"], "profession": c.get("profession") or "",
                "arrondissement": c.get("arrondissement") or "",
                "palier": palier or "", "motif": motif or "",
                "secteur_carnet": c.get("secteur_conv") or "", "secteur_cnam": "",
                "desaccord": "", "cnam_nom": "", "cnam_adresse": "", "cnam_spe": ""}

        if not palier:
            etat["etat_jointure"] = etat_absence(c)
            etats.append(etat)
            stats[etat["etat_jointure"]] += 1
            continue

        stats["match:" + palier] += 1
        p = {"_meta": {"idx": i, "enriched": {}},
             "source_url": DATASET_URL, "source_type": "annuaire_sante",
             "comments": []}
        note = []

        if palier.startswith("cds"):
            e = lignes[0]
            etat.update(cnam_nom=e["nom"], cnam_adresse="%s %s %s" % (e["voie"], e["cp"], e["ville"]),
                        cnam_spe=", ".join(sorted(e["spes"]))[:80])
            etat["etat_jointure"] = "matchée (centre de santé)"
            # Être dans le fichier CDS, c'est ÊTRE un centre de santé : pas d'avance de
            # frais. C'est la définition de `secteur_conv = "centre"` dans ENRICH_SPEC.
            sect, sect_note = "centre", None
            cnam_tel, cnam_voie, cnam_cp = e["tel"], e["voie"], e["cp"]
            cnam_civ, natures = None, set()
            note.append("Centre de santé identifié dans le fichier CDS de l'Annuaire santé "
                        "(FINESS %s, « %s »)." % (e["finess"], e["nom"]))
        else:
            l0 = lignes[0]
            etat.update(cnam_nom="%s %s" % (l0.nom, l0.prenom),
                        cnam_adresse="%s %s %s" % (l0.voie, l0.cp, l0.ville),
                        cnam_spe=", ".join(sorted({l.spe for l in lignes}))[:80])
            etat["etat_jointure"] = "matchée (%s)" % {
                "haut": "nom+prénom+CP+voie", "bas": "nom+prénom+CP",
                "adresse": "nom+prénom+adresse",
                "adresse_sans_prenom": "nom+adresse+spécialité"}[palier]
            sect, sect_note = secteur_des(lignes)
            cnam_tel, cnam_voie, cnam_cp = l0.tel, l0.voie, l0.cp
            cnam_civ = {"M": "M.", "F": "Mme"}.get(l0.civilite)
            natures = {l.nature_code for l in lignes}
            if len(lignes) > 1:
                note.append("%d lignes CNAM pour ce praticien (plusieurs spécialités ou "
                            "sites) : %s." % (len(lignes), "; ".join(
                                sorted({"%s / %s" % (l.spe, l.cp) for l in lignes}))[:200]))

        etat["secteur_cnam"] = sect or ""
        if sect_note:
            note.append("Secteur non repris : %s." % sect_note)

        # ---- secteur_conv ---------------------------------------------------
        vieux = c.get("secteur_conv")
        if sect:
            if not vieux:
                p["secteur_conv"] = sect
                p["_meta"]["enriched"]["secteur_conv"] = DATASET_URL
                stats["secteur:rempli"] += 1
            elif vieux == sect:
                stats["secteur:confirmé"] += 1
                etat["desaccord"] = "non"
            else:
                etat["desaccord"] = "oui"
                stats["secteur:désaccord"] += 1
                stats["secteur:désaccord:" + palier] += 1
                # L'écrasement n'est autorisé que sur un match sûr, c.-à-d. appuyé sur
                # un prénom. `adresse_sans_prenom` ne l'est pas : un désaccord y est
                # d'abord un signal d'alerte sur le match (cf. « piège de la session »).
                if palier in ("haut", "bas", "adresse"):
                    p["secteur_conv"] = sect
                    p["_meta"]["enriched"]["secteur_conv"] = DATASET_URL
                    p["_meta"]["overwrite_motif"] = {
                        "secteur_conv": {"type": "source_datee", "match": palier,
                                         "source": "CNAM / Annuaire santé Ameli",
                                         "date_source": FICHIER_MAJ,
                                         "verbatim": vieux}}
                    stats["secteur:écrasé"] += 1
                else:
                    note.append("Désaccord de secteur (carnet « %s » / CNAM « %s ») NON "
                                "appliqué : match sans prénom, un désaccord y signale "
                                "d'abord un appariement douteux." % (vieux, sect))
                    p["comments"].append({
                        "type": "alerte", "origine": "enrichissement_web",
                        "texte": "Secteur conventionnel à vérifier : le carnet indique « %s », "
                                 "l'Annuaire santé Ameli (CNAM, fichier du %s) indique « %s » "
                                 "pour ce nom à cette adresse. L'identification n'étant pas "
                                 "certaine (prénom absent du carnet), aucune valeur n'a été "
                                 "modifiée. Source : %s"
                                 % (vieux, FICHIER_MAJ, sect, DATASET_URL)})
                    p["statut"] = "a_verifier"
            if palier in ("haut", "bas") and vieux:
                calib.append((palier, vieux, sect, i, c.get("nom")))

        # ---- adresse / CP : on remplit les trous, on n'écrase pas -------------
        # L'adresse CNAM est celle DÉCLARÉE À LA CAISSE : elle peut n'être qu'un des
        # lieux d'exercice, pas celui où le médecin adresse réellement.
        if cnam_voie and not c.get("adresse"):
            p["adresse"] = titre(cnam_voie)
            p["_meta"]["enriched"]["adresse"] = DATASET_URL
            stats["adresse:remplie"] += 1
        elif cnam_voie and c.get("adresse") and adr_compat(c["adresse"], cnam_voie) is None:
            p["comments"].append({
                "type": "info", "origine": "enrichissement_web",
                "texte": "Adresse déclarée à l'Assurance Maladie (fichier du %s) : %s %s %s. "
                         "Différente de celle du carnet — un praticien peut exercer sur "
                         "plusieurs sites, l'adresse du carnet n'a pas été modifiée. "
                         "Source : %s" % (FICHIER_MAJ, titre(cnam_voie), cnam_cp,
                                          titre(lignes[0].ville if not palier.startswith("cds")
                                                else lignes[0]["ville"]), DATASET_URL)})
            p["statut"] = "a_verifier"
            stats["adresse:divergente (signalée)"] += 1
        if cnam_cp and not c.get("arrondissement"):
            p["arrondissement"] = cnam_cp
            p["_meta"]["enriched"]["arrondissement"] = DATASET_URL
            stats["arrondissement:rempli"] += 1

        # ---- téléphone : la CNAM ne publie que le numéro public du cabinet ----
        t = tel_fr(cnam_tel)
        if t and not c.get("tel_secretariat"):
            p["tel_secretariat"] = t
            p["_meta"]["enriched"]["tel_secretariat"] = DATASET_URL
            stats["tel_secretariat:rempli"] += 1

        # ---- civilité : H/F, donc moins précis que « Dr » --------------------
        if cnam_civ and not c.get("civilite") and famille(c.get("profession")) in CIVILITE_OK:
            p["civilite"] = cnam_civ
            p["_meta"]["enriched"]["civilite"] = DATASET_URL
            stats["civilite:remplie"] += 1

        # ---- ce que la CNAM affirme et qui mérite un signalement -------------
        if "0" in natures and len(natures) == 1:
            p["comments"].append({
                "type": "alerte", "origine": "enrichissement_web",
                "texte": "L'Annuaire santé Ameli (CNAM, fichier du %s) indique que ce "
                         "professionnel n'exerce pas actuellement. À confirmer avant "
                         "d'adresser un patient. Source : %s" % (FICHIER_MAJ, DATASET_URL)})
            p["statut"] = "a_verifier"
            stats["n'exerce pas actuellement"] += 1
        optam = {l.optam for l in lignes if not palier.startswith("cds") and l.optam}
        if sect == "2" and optam:
            p["comments"].append({
                "type": "info", "origine": "enrichissement_web",
                "texte": "Secteur 2 adhérent %s : dépassements d'honoraires maîtrisés "
                         "(source : Annuaire santé Ameli, CNAM, fichier du %s)."
                         % ("/".join(sorted(optam)), FICHIER_MAJ)})
            stats["optam signalé"] += 1

        if note:
            p["_meta"]["enrich_note"] = " ".join(note)
        if len(p) > 4 or p["comments"]:
            prop_par_idx[i] = p
        etats.append(etat)

    # ---- Classe E : sur les 1 052, y compris les fiches sans match ------------
    # L'incohérence interne ne dépend pas de l'appariement : elle se lit dans la fiche,
    # et c'est l'index d'adresses (et non une identification de personne) qui l'arbitre.
    voies = index_voies(idx_adr)
    for c in base:
        r = incoherence_cp(c, idx_adr, voies)
        if not r:
            continue
        cp, preuve = r
        i = c["_meta"]["idx"]
        classe_e.append((i, c.get("nom"), c.get("adresse"), c.get("arrondissement"), cp, preuve))
        p = prop_par_idx.setdefault(i, {"_meta": {"idx": i, "enriched": {}},
                                        "source_url": DATASET_URL,
                                        "source_type": "annuaire_sante", "comments": []})
        p["arrondissement"] = cp
        p["_meta"]["enriched"]["arrondissement"] = DATASET_URL
        p["_meta"].setdefault("overwrite_motif", {})["arrondissement"] = {
            "type": "incoherence_interne", "verbatim": c.get("arrondissement"),
            "preuve": "%s (Annuaire santé Ameli, CNAM, fichier du %s)" % (preuve, FICHIER_MAJ)}
        p["comments"].append({
            "type": "info", "origine": "enrichissement_web",
            "texte": "Incohérence interne corrigée : la fiche portait l'adresse « %s » "
                     "avec l'arrondissement %s, qui se contredisent. %s, dans l'Annuaire "
                     "santé Ameli (CNAM, fichier du %s). L'arrondissement a été corrigé ; "
                     "l'adresse est inchangée. Source : %s"
                     % (c.get("adresse"), c.get("arrondissement"), preuve[0].upper() + preuve[1:],
                        FICHIER_MAJ, DATASET_URL)})
        stats["classe E : arrondissement corrigé"] += 1

    props = [prop_par_idx[k] for k in sorted(prop_par_idx)]
    os.makedirs(os.path.join(OUT_DIR, "batches"), exist_ok=True)
    json.dump(props, open(os.path.join(OUT_DIR, "batches", "out_cnam.json"), "w",
                          encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump(etats, open(os.path.join(OUT_DIR, "cnam_etats.json"), "w",
                          encoding="utf-8"), ensure_ascii=False, indent=1)

    print("\npropositions écrites : %d fiches (batches/out_cnam.json)" % len(props))
    print("\n--- appariement")
    for k, n in sorted(stats.items()):
        print("   %-40s %4d" % (k, n))

    print("\n--- CALIBRAGE : désaccord sur secteur_conv, par palier")
    print("    (le palier HAUT remplace le jeu de contrôle RPPS : nom+prénom+CP+n° de")
    print("     voie+spécialité concordants. Un désaccord n'y vient pas d'un faux match.)")
    for pal in ("haut", "bas"):
        tot = sum(1 for p, v, s, _, _ in calib if p == pal)
        des = sum(1 for p, v, s, _, _ in calib if p == pal and v != s)
        print("   %-6s  %3d comparables, %3d désaccords  %s"
              % (pal, tot, des, "(%.1f %%)" % (100.0 * des / tot) if tot else ""))
    for pal, v, s, i, nom in calib:
        if v != s:
            print("   -> désaccord [%s] idx=%s %s : carnet « %s » / CNAM « %s »"
                  % (pal, i, nom, v, s))

    print("\n--- CLASSE E : incohérences adresse <-> arrondissement")
    for i, nom, adr, arr, cp, preuve in classe_e:
        print("   idx=%-5s %-22s %-30s carnet %s -> CNAM %s" % (i, (nom or "")[:22],
                                                                (adr or "")[:30], arr, cp))
        print("           preuve : %s" % preuve)
    return stats, calib, classe_e

HOSPITALIER = re.compile(r"CHEF DE (SERVICE|CLINIQUE)|PRATICIEN HOSPITALIER|\bPH\b|"
                         r"\bINTERNE\b|ASSISTANT|\bCCA\b|\bPU PH\b")

def etat_absence(c):
    """Distinguer l'absence ATTENDUE (hors périmètre de l'annuaire) de la non-résolution
    (le praticien devrait y être et on ne l'a pas trouvé) — c'est ça qui intéresse S2.

    Le périmètre est défini par le descriptif CNAM : sont référencés les PS exerçant une
    activité LIBÉRALE, en cabinet ou en centre de santé. Sont explicitement exclus « les
    professionnels de santé salariés qui exercent uniquement en établissement de soins
    (hôpital, clinique…) », les remplaçants, et SOS Médecins. Un praticien hospitalier de
    nos carnets qu'on ne trouve pas n'est donc pas un échec de jointure : c'est le
    fonctionnement normal du fichier.
    """
    if c["type"] in ("autre",):
        return "absente du fichier (ressource / association)"
    if c["type"] == "labo":
        return "absente du fichier (labo)"
    if c["type"] == "structure":
        return "absente du fichier (structure hors centre de santé)"
    prof = c.get("profession") or ""
    if HORS_ANNUAIRE.search(norm(prof)):
        return "absente du fichier (profession non référencée par la CNAM)"
    if not c.get("nom"):
        return "non résolue (fiche sans nom)"
    if c.get("etablissement") or HOSPITALIER.search(norm(prof)):
        return "absente du fichier (exercice hospitalier — hors périmètre CNAM)"
    return "non résolue (praticien qui devrait figurer au fichier)"

if __name__ == "__main__":
    main()
