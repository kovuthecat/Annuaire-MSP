# -*- coding: utf-8 -*-
"""Classe C — rendre visibles les valeurs que le web a contredites, et que la 1re passe
a documentées uniquement en prose libre.

LE PROBLÈME
-----------
Quand une source contredisait le carnet, la 1re passe conservait la valeur du carnet (la
règle d'alors) et écrivait le désaccord dans `_meta.enrich_note`. Or **`_meta` n'est pas
importé en base** : le JSON est la trace, le seed est la donnée. Un membre qui ouvre
l'app voit donc la valeur du carnet **sans le moindre indice qu'une source l'a
contredite**. Ce n'est pas un arbitrage discutable, c'est un trou de traçabilité.

CE QUE FAIT CE SCRIPT — ET CE QU'IL NE FAIT PAS
-----------------------------------------------
Il ne change **aucune valeur** (à une exception près, ci-dessous) : il passe la fiche en
`a_verifier` et écrit un commentaire qui dit ce que la source disait. Le risque est donc
asymétrique et assumé : un `a_verifier` de trop coûte un coup d'œil, une contradiction
invisible envoie un patient à une adresse fausse.

CE QUI N'EST PAS DE LA CLASSE C — le piège de la session
--------------------------------------------------------
**Le carnet plus précis n'est pas le carnet périmé.** Ont été écartés après lecture :
  * `idx 38` (Ibrahim) et `idx 964` (Rothschild) : le web affiche un AUTRE numéro. Ce
    sont deux canaux distincts, pas une contradiction.
  * `idx 259` (Le Parco) : la source écrit 75116 là où le carnet écrit 75016 — c'est le
    même arrondissement.
  * `idx 294`, `idx 298`, `idx 318`, `idx 340`, `idx 204` : la source donne le numéro de
    voie que le carnet omettait. C'est une précision, le carnet n'est pas contredit.
  * `idx 543`, `idx 578`, `idx 584`, `idx 600` : l'identification elle-même a échoué. Une
    divergence avec quelqu'un qui n'est peut-être pas la bonne personne ne contredit
    rien.
  * `idx 830` (Delahaye) : l'adresse du carnet n'est pas confirmée — ce n'est pas la même
    chose qu'être contredite.

Ces fiches ne sont pas des oublis : ce sont des décisions, et elles sont listées ici pour
que la prochaine passe ne les « rattrape » pas par erreur.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.environ.get("OUT_DIR") or HERE
CNAM = "https://www.data.gouv.fr/datasets/annuaire-sante-ameli"

# idx -> (type de commentaire, texte). Chaque texte dit CE QUE LA SOURCE DISAIT, avec sa
# provenance ; il est tiré de la note d'audit de la 1re passe, qui avait ouvert la page.
CONTREDITES = {
    11: ("alerte",
         "Adresse à vérifier : la fiche annuaire santé de la Dr Begon-Bagdassarian liste "
         "cinq lieux d'exercice (75003, 75009, 75010, 75012 et 93210) et AUCUN au 145 rue "
         "de Belleville. L'adresse du carnet est peut-être un site fermé ou non déclaré. "
         "Source : sante.fr, vérifié le 2026-07-16."),
    27: ("alerte",
         "Adresse à vérifier : sante.fr situe l'UCASAR au 47 bd de l'Hôpital 75013, tandis "
         "que la page action-groupe.org la situe « au rez-de-chaussée de l'Institut de "
         "Cardiologie, 52 bd Vincent Auriol 75013 ». Les deux sont sur le site de la "
         "Pitié-Salpêtrière ; seul l'arrondissement est certain."),
    48: ("alerte",
         "Adresse mail à vérifier avant tout envoi : le carnet donne « amandiers@fjfj.org », "
         "or le domaine de la Fondation Jeunesse Feu Vert semble être fjfv.org (contact du "
         "service parisien : prev75@fjfv.org). « fjfj » est probablement une coquille pour "
         "« fjfv » — un mail envoyé à la mauvaise adresse partirait dans le vide."),
    67: ("alerte",
         "Adresse à vérifier : la fiche annuaire santé du Dr Hugo Tran ne liste qu'un site "
         "(21 rue Marguerite de Rochechouart 75009) et ne mentionne pas le 12 rue Dieu "
         "75010 du carnet. D'autres sources le donnent multi-sites. Source : sante.fr, "
         "vérifié le 2026-07-16."),
    153: ("alerte",
          "Lieu d'exercice à vérifier : le carnet situe la Dr Bessiene à la MSP Pelleport "
          "(77 rue Pelleport 75020), mais la page « Endocrinologue » du site officiel de la "
          "MSP ne la liste pas, et le web l'associe au GHU AP-HP Cochin - Port-Royal (14e). "
          "Aucune preuve d'un départ n'a été trouvée : la valeur du carnet est conservée."),
    299: ("alerte",
          "Adresse à vérifier : les profils publics d'Elsa Bernard (sante.fr, IPPP) donnent "
          "une adresse dans le 75001, là où le carnet indique rue d'Enghien (75010). "
          "L'adresse du carnet est conservée."),
    311: ("alerte",
          "Adresse à vérifier : le carnet situe Marina Cremel à Pelleport (20e), les sources "
          "publiques la situent dans le 11e — déménagement probable. L'adresse du carnet est "
          "conservée."),
    326: ("alerte",
          "Arrondissement à vérifier : toutes les sources publiques (Doctolib, annuaire "
          "santé, keldoc) situent Isabelle Gontard au 5 passage Charles Dallery 75011, "
          "alors que la fiche porte 75012."),
    409: ("alerte",
          "Adresse à vérifier : la seule adresse publiée pour la Dr Anne Lazar est le 162 "
          "rue de Belleville 75020, pas le 27 rue Levert du carnet. Attention, il existe "
          "une homonyme neurologue à Redon (35)."),
    478: ("alerte",
          "Lieu d'exercice à vérifier : le carnet situe Célia Assedou dans le 17e, mais "
          "aucune page ouverte ne confirme d'adresse parisienne — une source la donne à "
          "Livry-Gargan (93190), une autre dans le 12e, et son site celiaassedou.fr ne "
          "résout plus."),
    601: ("alerte",
          "Adresse à vérifier : la page publique d'Aude Dagonneau donne « 129 rue de "
          "Bagnolet 75020 » et « Le Vésinet (78110) », et ne mentionne pas le 24 rue Py du "
          "carnet. Source : lemedecin.fr, vérifié le 2026-07-16."),
    655: ("alerte",
          "Localisation à vérifier : le carnet situe Caroline Garell dans le 15e, la seule "
          "page ouverte la donne à Issy-les-Moulineaux (92130). L'arrondissement du carnet "
          "est conservé."),
    739: ("alerte",
          "Numéro à vérifier : la page contact du site officiel de Biomnis n'affiche pas le "
          "01 44 12 59 35 du carnet, et renvoie l'anatomo-pathologie vers "
          "eurofins-pathologie.com. Le numéro du carnet est conservé."),
}

# Arbitrage manuel — la seule incohérence adresse/arrondissement que l'index d'adresses de
# la CNAM ne peut pas trancher, parce que la praticienne n'est pas dans le fichier
# (exercice en clinique privée ELSAN, hors périmètre de l'Annuaire santé).
# La preuve est ailleurs, et elle est solide : sa fiche sante.fr — déjà la `source_url` de
# la fiche — liste les DEUX sites du carnet, et les commentaires de la fiche elle-même
# portent « 36 quai de Jemmapes, 75010 » et « 27 rue Levert, 75020 ». Le champ `adresse`
# tient le site ELSAN, le champ `arrondissement` tenait celui du GOSB : la paire affichée
# désigne un lieu qui n'existe pas. On aligne l'arrondissement sur l'adresse ; le second
# site reste documenté en commentaire, et rien n'est perdu.
ALPERIN = {
    "_meta": {"idx": 31, "enriched": {"arrondissement": "https://www.sante.fr/cardiologie/paris/dr-alperin-sonia"},
              "overwrite_motif": {"arrondissement": {
                  "type": "incoherence_interne",
                  "verbatim": "75020",
                  "preuve": "La fiche portait « 36 quai de Jemmapes » avec l'arrondissement "
                            "75020 : la paire désigne un lieu inexistant. sante.fr (déjà "
                            "source_url de la fiche) liste les deux sites réels — ELSAN, 36 "
                            "quai de Jemmapes 75010, et GOSB, 27 rue Levert 75020 — et les "
                            "commentaires de la fiche les portent déjà tous les deux. "
                            "L'Annuaire santé Ameli place par ailleurs un centre de santé au "
                            "36 quai de Jemmapes, au 75010."}},
              "enrich_note": "Classe E (P2/S1), arbitrage manuel : arrondissement aligné sur "
                             "l'adresse (75010, site ELSAN). Le second site (27 rue Levert "
                             "75020) reste documenté en commentaire. La praticienne est "
                             "absente de l'open data CNAM, ce qui est attendu pour un "
                             "exercice en clinique privée."},
    "arrondissement": "75010",
    "source_url": "https://www.sante.fr/cardiologie/paris/dr-alperin-sonia",
    "source_type": "annuaire_sante",
    "comments": [{"type": "info", "origine": "enrichissement_web",
                  "texte": "Incohérence interne corrigée : la fiche portait l'adresse « 36 "
                           "quai de Jemmapes » avec l'arrondissement 75020, or le quai de "
                           "Jemmapes est dans le 75010 — le 75020 correspond au second site "
                           "(GOSB / Centre Belleville, 27 rue Levert), documenté par ailleurs. "
                           "L'arrondissement a été aligné sur l'adresse ; l'adresse est "
                           "inchangée. Source : sante.fr."}],
}

def main():
    props = []
    for idx, (typ, texte) in sorted(CONTREDITES.items()):
        props.append({
            "_meta": {"idx": idx, "enriched": {},
                      "enrich_note": "Classe C (P2/S1) : valeur contredite par une source, "
                                     "restée visible nulle part ailleurs que dans cette trace "
                                     "d'audit. Fiche passée en a_verifier et désaccord porté "
                                     "en commentaire. Aucune valeur n'a été modifiée."},
            "statut": "a_verifier",
            "comments": [{"type": typ, "texte": texte, "origine": "enrichissement_web"}]})
    props.append(ALPERIN)
    os.makedirs(os.path.join(OUT_DIR, "batches_c"), exist_ok=True)
    json.dump(props, open(os.path.join(OUT_DIR, "batches_c", "out_classe_c.json"), "w",
                          encoding="utf-8"), ensure_ascii=False, indent=1)
    print("Classe C — %d fiches à valeur contredite rendues visibles :" % len(CONTREDITES))
    print("   " + ", ".join(str(i) for i in sorted(CONTREDITES)))
    print("\nClasse E — 1 arbitrage manuel : idx 31 (Alperin), arrondissement 75020 -> 75010")

if __name__ == "__main__":
    main()
