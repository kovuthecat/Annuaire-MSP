# -*- coding: utf-8 -*-
"""Classe D — les noms laissés faux au nom d'une règle qui n'existe pas.

LE PROBLÈME
-----------
`ENRICH_SPEC.md` §« Noms erronés » (l. 165-173) dit noir sur blanc : **« `garbled` n'est
PAS une condition d'entrée »** — ce flag signale « note prise à la volée », pas « nom
faux », et il a été posé à l'extraction, sans aucune recherche. Le critère réel est
**deux éléments concordants** (spécialité + localisation, spécialité + établissement,
un binôme nommé confirmé…).

La première passe a pourtant refusé de corriger plusieurs noms avec pour motif explicite
« `_meta.garbled = false`, la spec réserve la correction aux fiches garbled ». Le détail
qui tranche : **la spec cite `SHAAN`→S**C**HAAN comme l'un de ses deux exemples** de nom
à corriger malgré `garbled: false`. La passe a refusé le cas que la spec avait écrit pour
elle.

CE QUI TRANCHE ICI
------------------
L'open data CNAM apporte le deuxième critère, et il est primaire : la graphie fautive est
**absente du fichier national**, la graphie corrigée y figure **avec la spécialité et
l'adresse de la fiche**. Ce n'est plus une ressemblance phonétique, c'est une concordance.

CE QUI NE CHANGE PAS
--------------------
« Pas de preuve, pas de valeur ». Une ressemblance sans point d'ancrage reste refusée —
la spec l'interdit et elle a raison (cf. REFUS_CONFIRMES). Le garde-fou de `recombine.py`
revérifie tout : il exige l'URL, écrit lui-même le commentaire donnant la graphie
d'origine, et laisse `a_verifier` — c'est un humain qui confirme, pas ce script.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.environ.get("OUT_DIR") or HERE
URL = "https://www.data.gouv.fr/datasets/annuaire-sante-ameli"

# Chaque entrée : idx, champs corrigés, et les critères concordants qui l'autorisent.
CORRECTIONS = [
    dict(idx=23, nom="Echegut",
         # Carnet : « Etchegut Perrine », angiologue, 93200, orientation « syndrome de
         # congestion pelvienne », binôme Dr Sénéchal (radiologue interventionnel).
         # CNAM : ECHEGUT PERRINE, Médecine vasculaire (= angiologue), 93200,
         #        32 avenue des Moulins Gémeaux (= Centre Cardiologique du Nord).
         # « ETCHEGUT » est absent du fichier national.
         criteres="prénom + spécialité + code postal + adresse (Centre Cardiologique "
                  "du Nord, 32 av. des Moulins Gémeaux 93200)"),
    dict(idx=42, nom="SCHAAN",
         # Carnet : « SHAAN Xavier », cardiologue, sans adresse.
         # CNAM : SCHAAN XAVIER, Cardiologue, 60 rue des Couronnes 75020 — soit
         #        exactement l'adresse de la fiche idx 30 (Dr Abou Chakra, cardiologue),
         #        que la note d'origine désignait comme son cabinet. « SHAAN » est
         #        absent du fichier national. C'est l'un des deux exemples de la spec.
         criteres="prénom + spécialité + adresse du cabinet partagé avec la Dr Abou "
                  "Chakra (60 rue des Couronnes 75020, fiche idx 30)"),
    dict(idx=66, nom="HANSS",
         # Carnet : « HANNS Julien », ORL, 75012, cabinet partagé avec la Dr Daval.
         # CNAM : HANSS JULIEN, ORL et chirurgien cervico-facial, 228 rue de Charenton
         #        75012 ET Clinique de Bercy 94220 — les DEUX sites que la note avait
         #        relevés. « HANNS » est absent du fichier national. La `source_url`
         #        déjà présente sur la fiche (sante.fr/orl/paris/dr-hanss-julien) porte
         #        elle-même la graphie corrigée.
         criteres="prénom + spécialité + arrondissement + les deux lieux d'exercice "
                  "(228 rue de Charenton 75012 et Clinique de Bercy 94220)"),
    dict(idx=319, nom="FAOUZI", prenom="Touria",
         # Carnet : nom « FAOUZIA TOURIA » (nom et prénom collés), prénom vide, kiné,
         #          39 bis av. Gambetta 75020.
         # CNAM : FAOUZI TOURIA, Masseur-kinésithérapeute, 39B avenue Gambetta 75020.
         criteres="spécialité + adresse exacte + code postal (39 bis av. Gambetta 75020) ; "
                  "le carnet avait collé le nom et le prénom"),
]

# Refus MAINTENUS — ce ne sont pas des oublis, c'est la règle.
# Le motif n'est plus `garbled`, c'est l'absence de point d'ancrage : la spec interdit de
# corriger un nom sur une simple ressemblance phonétique, et une lettre sépare parfois
# deux entités réelles.
REFUS_CONFIRMES = {
    33: "Besnenou, cardiologue, sans prénom ni adresse ni téléphone. La CNAM connaît un "
        "BESNAINOU FRANCK cardiologue (75011), mais la fiche n'offre AUCUN point "
        "d'ancrage à faire concorder : un seul critère (la spécialité). Ressemblance "
        "phonétique seule => refus, conformément à la spec.",
    78: "Turpin, chirurgien orthopédiste, Clinique du Mont-Louis. Aucun chirurgien "
        "orthopédiste nommé Turpin dans le fichier national (les Turpin de Paris sont "
        "orthophoniste et psychiatre). Le fichier confirme le constat de la 1re passe.",
    97: "ALAIN Marion, dentiste pédiatrique. Aucune concordance ; « ALLAIN-MOTTIER » "
        "n'est pas « ALAIN » et la spécialité contredit la fiche.",
    186: "Viano, gastro-entérologue. Le fichier national ne contient aucun VIANO "
         "gastro-entérologue (un psychiatre à Lyon, une infirmière). Refus maintenu.",
    # Cas particulier, à ne pas confondre avec les précédents :
    72: "Boursounian -> Pr Levon DOURSOUNIAN (chirurgien orthopédiste, Saint-Antoine). "
        "L'hypothèse est celle de la spec elle-même, et l'argumentation de la 1re passe "
        "est solide (5 points de concordance, dont le binôme Maigne -> chirurgien du "
        "coccyx). Mais elle n'est PAS sourçable dans cette session : DOURSOUNIAN est "
        "absent de l'open data CNAM — ce qui est ATTENDU pour un PU-PH hospitalier, que "
        "l'Annuaire santé ne référence pas — et aphp.fr est protégé anti-robot. Le refus "
        "ne tient donc plus à `garbled` mais à « pas d'URL de preuve, pas de valeur », "
        "règle inchangée. À reprendre en S2 sur le web. Hypothèse conservée dans "
        "_meta.hypotheses, fiche déjà en a_verifier.",
}

def main():
    props = []
    for c in CORRECTIONS:
        p = {"_meta": {"idx": c["idx"], "enriched": {}},
             "source_url": URL, "source_type": "annuaire_sante",
             "_commentaire_arbitrage": c["criteres"]}
        for champ in ("nom", "prenom"):
            if c.get(champ):
                p[champ] = c[champ]
                p["_meta"]["enriched"][champ] = URL
        p["_meta"]["enrich_note"] = (
            "Classe D (P2/S1) : nom corrigé au critère réel de la spec — deux éléments "
            "concordants, `garbled` n'entrant pas dans la décision. Concordance : %s. "
            "Source : open data « Annuaire santé Ameli » (CNAM), fichier du 2026-07-13."
            % c["criteres"])
        props.append(p)
    # `_commentaire_arbitrage` n'est pas un champ de contact : le garde-fou le rejetterait
    # (« champ hors périmètre »). Il n'a servi qu'à documenter ci-dessus.
    for p in props:
        p.pop("_commentaire_arbitrage")
    os.makedirs(os.path.join(OUT_DIR, "batches_noms"), exist_ok=True)
    path = os.path.join(OUT_DIR, "batches_noms", "out_noms.json")
    json.dump(props, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("Classe D — %d corrections de nom proposées :" % len(props))
    for c in CORRECTIONS:
        print("   idx=%-5s -> %-10s %s" % (c["idx"], c["nom"], c["criteres"][:60]))
    print("\nRefus MAINTENUS (pas de point d'ancrage, ou pas d'URL) : %d"
          % len(REFUS_CONFIRMES))
    for i, motif in sorted(REFUS_CONFIRMES.items()):
        print("   idx=%-5s %s" % (i, motif[:96]))

if __name__ == "__main__":
    main()
