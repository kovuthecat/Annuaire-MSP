# -*- coding: utf-8 -*-
"""Réécriture des commentaires « Fiche identifiée depuis la note d'origine « … » ».

POURQUOI
--------
Arbitrage Thibault (2026-07-17) : **une graphie erronée est remplacée, pas exposée.** Les
commentaires « Graphie d'origine dans le carnet : « X » » ont été retirés — mais cette
famille-ci **citait la note du carnet**, donc réaffichait la graphie fautive par la bande
(« Fiche identifiée depuis la note d'origine « Dr Illias **Amny** endocrinolgue » »). 26 des
45 citations exposaient ainsi un nom mal orthographié — davantage en réalité, les noms
composés et les prénoms échappant au comptage automatique.

On ne les supprime pas pour autant : à la différence des « Graphie d'origine », elles
portent **le raisonnement d'identification**, et ces fiches sont en `a_verifier`
précisément parce que le nom a été corrigé. Sans le pourquoi, le relecteur voit un nom à
confirmer sans savoir sur quoi trancher. On garde donc le raisonnement, on retire la
citation.

CE QUI N'EST PAS PERDU
----------------------
- La note brute du carnet reste dans `_meta.source_text` (trace d'audit, non importée).
- Le contenu **médical** qu'une note portait parfois était déjà, dans les deux cas
  concernés, dupliqué en commentaire propre — vérifié avant réécriture :
    * idx 133 : « Ne pèse pas les patients (phrase interrompue dans la source). » (spec)
    * idx 361 : « Ne prend que les patients autour de leur centre. » (info)
  Retirer les citations ne coûte donc aucune information clinique.

INVARIANT
---------
**Aucun texte ci-dessous ne doit contenir « note d'origine »** : c'est ce qui rend le bloc
de `recombine.py` idempotent (après réécriture, plus aucun commentaire ne matche). Un test
en fin de fichier le vérifie à l'import — il vaut mieux planter que réécrire en boucle.
"""

# idx -> liste des textes de remplacement, dans l'ordre où les commentaires « note
# d'origine » apparaissent sur la fiche (une seule entrée partout, sauf idx 807).
REECRITURES = {
    36: ["Identification : Dr Grégory SCHOUKROUN, cardiologue. Le carnet portait une "
         "graphie approchante du nom ; l'orthographe est confirmée par l'annuaire de "
         "l'Hôpital Paris Saint-Joseph et par le lien Doctolib que le carnet contenait "
         "lui-même. À confirmer."],
    68: ["Identification : Dr Christine DENET, chirurgien viscéral et digestif à "
         "l'Institut Mutualiste Montsouris. Le carnet portait une graphie approchante du "
         "nom ; la spécialité et l'établissement concordent. À confirmer."],
    80: ["Identification : Dr Nicola CORIGLIANO, chirurgien viscéral. L'orthographe exacte "
         "est CORIGLIANO (un seul R). Site officiel, spécialité (chirurgie générale et "
         "digestive, obésité) et établissement (Clinique du Mont-Louis) concordants. "
         "À confirmer."],
    133: ["Identification : Florence SERVAS-TAITHE, diététicienne nutritionniste, dont le "
          "site est le blog « La diet'chocolat »."],
    151: ["Identification : Dr Illias HAMNY, endocrinologue à la Maison de Santé Pelleport "
          "(77 rue Pelleport, 75020). Le carnet portait une graphie approchante du nom. "
          "À confirmer."],
    181: ["Identification : Dr Laetitia FARTOUX, gastro-entérologue et hépatologue à la "
          "Clinique Victor Hugo. Nom corrigé ; à confirmer."],
    220: ["Identification : l'établissement noté en abrégé dans le carnet est l'Hôpital de "
          "la Croix Saint-Simon (site Avron, 125 rue d'Avron 75020), Groupe hospitalier "
          "Diaconesses Croix Saint-Simon. Le Dr Cyril Raiffort y exerce en chirurgie "
          "gynécologique & mammaire et y a ouvert l'unité de prise en charge des femmes "
          "excisées. Il consulte aussi sur le site Reuilly / Diaconesses (12 rue du "
          "Sergent Bauchat 75012)."],
    361: ["Identification : centre de santé communautaire « Le Château en Santé », Parc "
          "Kalliste, Marseille 15e. La restriction notée par le carnet est confirmée par "
          "le site officiel : il s'adresse aux habitants des quartiers de Kalliste, la "
          "Granière, la Solidarité et les Bourrely."],
    376: ["Identification : Dr Ruben Benainous, médecin vasculaire, listé sur le site "
          "officiel de l'IPV (ipv-paris.fr/institut/). Le carnet portait une graphie "
          "approchante du nom. À confirmer."],
    402: ["Identification : la praticienne exerçant comme neurologue au 3 rue Lamblardie "
          "75012 est le Dr AZOULAY-CAYLA Arièle (RPPS 10001488492). Nom et prénom "
          "corrigés ; à confirmer."],
    405: ["Identification : la neurologue exerçant au 27 rue Levert 75020 est le "
          "Dr DEGAEY Isabelle (RPPS 10002252897). Nom corrigé et prénom ajouté ; "
          "à confirmer."],
    436: ["Identification : l'ORL correspondant est le Dr TRAN QUANG Loc (RPPS "
          "10000165315). Nom et prénom réordonnés et corrigés ; à confirmer."],
    437: ["Identification : l'ORL exerçant au 36 quai de Jemmapes 75010 est le "
          "Dr Isabelle SUDRE. Nom corrigé ; à confirmer."],
    452: ["Identification : Hôpital Fondation Adolphe de Rothschild. Orthographe du nom "
          "corrigée ; à confirmer."],
    475: ["Établissement corrigé : le carnet le notait en abrégé et mal orthographié ; il "
          "s'agit de la Clinique des Lilas (41 avenue du Maréchal Juin, 93260 Les Lilas), "
          "confirmée par lemedecin.fr."],
    493: ["Identification : Dr Olivier STIVALET, phlébologue. Le carnet portait une "
          "transposition de deux lettres ; l'orthographe exacte est STIVALET, et le "
          "prénom Olivier. À confirmer."],
    509: ["Identification : Dr Jérôme PINOT, pneumologue (15e). Le nom exact est PINOT. "
          "À confirmer."],
    517: ["Identification : Michel CAILLOIS, podologue. Le nom exact est CAILLOIS, et la "
          "rue est la rue Servan (75011) — le carnet portait une graphie approchante des "
          "deux. À confirmer."],
    524: ["Identification : Dr Valentina LA TORRE, chirurgien général et proctologue. "
          "Orthographe du nom corrigée ; à confirmer."],
    541: ["Identification : Dr Jean-Paul OSTERMEYER, psychiatre, 18 rue Chevreul 75011. "
          "Nom et rue corrigés (le carnet portait une graphie approchante des deux), "
          "prénom ajouté ; à confirmer."],
    549: ["Identification : l'annuaire allo-medecins.fr liste « Ladoucette (de) Olivier — "
          "Psychiatre, 1 rue de Villersexel, 75007 Paris, 01 42 22 25 95 », soit le "
          "téléphone exact du carnet. Nom corrigé, prénom et adresse ajoutés ; "
          "à confirmer."],
    582: ["Identification : David MALINOWSKI, psychologue, 15 rue Belfort 75011 "
          "(ADELI/RPPS 759349111). Graphie corrigée d'après bonpsy.fr. À confirmer."],
    585: ["Identification : « Association parADOxes », « un lieu et un lien pour les 11-25 "
          "ans » — nom exact relevé sur le site officiel. Le carnet le notait sous une "
          "forme abrégée et approchante. À confirmer."],
    586: ["Le web la présente comme PSYCHIATRE et non psychologue (doctoome, page indexée "
          "« psychiatre/paris-20eme » ; mablouseblanche titre « Dr Marina PASSUELLO-MOIX, "
          "Psychiatre »). Le carnet ne portait qu'une abréviation ambiguë : la profession "
          "de la fiche est peut-être à corriger en psychiatre. Non modifié ici, à trancher "
          "par un humain."],
    607: ["Identification : Dr Céline ARRIUBERGÉ. Graphie corrigée (sans « r » final) "
          "d'après sante.fr, qui affiche « Dr Celine Arriuberge » (annuaire sans accents) ; "
          "le titre du profil Doctolib indexé porte « Dr Céline ARRIUBERGÉ ». Accent final "
          "à confirmer par un humain."],
    619: ["Identification : Dr Corinne BORDONNE, radiologue. Prénom corrigé d'après son "
          "site professionnel radiologie-bordonne.fr (« Dr Corinne Bordonné, Médecin, "
          "Radiologue à Paris »). Le patronyme BORDONNE est confirmé ; l'accent final "
          "(Bordonné) est la graphie de son propre site."],
    644: ["Identification : Dr Agathe GRANDJEAN, rhumatologue à l'Hôpital de la Croix "
          "Saint-Simon (125 rue d'Avron, 75020). Le carnet notait l'établissement en "
          "abrégé et le nom sous une graphie approchante. À confirmer."],
    645: ["Identification : Dr Sylvain LA BATIDE ALANORE, rhumatologue, 18 rue Fabre "
          "d'Églantine 75012 Paris. Le carnet ne portait que le début du nom. Exercice "
          "libéral à temps partiel + temps partiel hospitalier. À confirmer."],
    658: ["Identification : la graphie retenue est « Théo LEMOUTON » en un mot, conforme au "
          "site officiel du praticien, au lien Doctolib noté par le carnet "
          "(.../theo-lemouton) et à la seconde graphie du carnet."],
    692: ["Identification : très probablement le Dr Ariane CORTESSE, chirurgien urologue, "
          "1 avenue Claude Vellefaux 75010 Paris — adresse de l'hôpital Saint-Louis "
          "(AP-HP), où elle exerce au sein de l'équipe d'urologie. Elle est par ailleurs "
          "citée par l'Association française de la cystite interstitielle. C'est la seule "
          "urologue nommée Cortesse trouvée à Paris. À confirmer."],
    695: ["Identification : Dr Hanane ADROUCHE (un seul « d »), médecin "
          "radiologue-échographiste au centre Access Échographie Paris 9, 20 boulevard "
          "Poissonnière 75009 Paris — soit bien le quartier des Grands Boulevards noté au "
          "carnet. Elle y exerce avec le Dr J-F Thoron, radiologue. À confirmer."],
    738: ["Identification : le praticien réel est le Dr Mikhael Benjoar, radiologue au "
          "Centre d'Imagerie Médicale Manin Crimée (75019). Deux éléments concordants : "
          "l'établissement et la spécialité (IRM pelvienne). À confirmer par un humain."],
    748: ["Identification : la plaquette officielle du C'JAAD confirme trois éléments "
          "concordants avec le carnet : rattachement GHU Paris / Sainte-Anne (Pavillon G, "
          "1 rue Cabanis 75014), public de 15 à 30 ans, et mission d'évaluation/diagnostic "
          "des troubles psychiques débutants. Le carnet notait le sigle sous une forme "
          "approchante. À confirmer par un humain."],
    796: ["Identification : nom officiel « Clinique du Parc de Belleville », établissement "
          "de santé privé autorisé en SSR, 104 rue des Couronnes 75020. Sante.fr y recense "
          "une hospitalisation complète de réadaptation gériatrique (patients de 65 ans et "
          "plus)."],
    807: ["Fiche renommée : l'intitulé précédent désignait, sous une graphie approchante, "
          "l'Hôpital Fondation Adolphe de Rothschild (ESPIC), 25 rue Manin 75019, et son "
          "Centre d'évaluation et de traitement de la douleur (CETD). Le CETD prend en "
          "charge les douleurs chroniques de plus de 3 mois résistantes aux traitements "
          "habituels, notamment neuropathiques. Prise de RDV via un formulaire en ligne, "
          "pré-admission obligatoire, courrier du médecin adresseur recommandé.",
          "Ne pas confondre avec l'hôpital Rothschild de l'AP-HP (5 rue Santerre, 75012), "
          "qui possède AUSSI un service d'évaluation et traitement de la douleur. Ce sont "
          "deux établissements distincts. La fiche vise bien la Fondation."],
    826: ["Identification : Dr Cécile CHARLOIS, médecin du CLAT de Paris. Rattachement "
          "exact publié par la liste officielle des CLAT (Société de Pneumologie de Langue "
          "Française, édition du 07/11/2024) : « 75 - DASES (Département de Paris), BPD - "
          "Cellule Tuberculose, 15-17 rue Charles Bertheau, 75013 PARIS. Tél : "
          "01 45 82 50 30 FAX : 01.85.34.50.29. Médecins : Dr Cecile CHARLOIS : "
          "cecile.charlois@paris.fr ». Mail commun du service publié dans cette même "
          "liste : DSP-cellule-tuberculose@paris.fr."],
    903: ["Identification : très probablement Eléonore JUILLARD, sage-femme, 2 rue Paul "
          "Saunière 75016. Le carnet portait une graphie approchante du nom. Concordance "
          "sur le prénom exact, l'arrondissement exact (16e) et une profession cohérente "
          "avec la symptothermie. Statut repassé à a_verifier pour que la correction du nom "
          "soit confirmée par un humain."],
    945: ["Identification : Dr Sylvie Meaume, dermatologue et gériatre, unité de Gériatrie "
          "Plaies et Cicatrisation de l'Hôpital Rothschild (AP-HP), citée par la Société "
          "française de plaie chronique. Prénom corrigé. Source : "
          "https://sfgg.org/actualites/plaies-et-cicatrisations-chez-les-personnes-agees-"
          "dapres-une-interview-avec-le-dr-sylvie-meaume-dermatologue-geriatre-a-lunite-de-"
          "geriatrie-plaies-et-cicatrisation-de-lhopital/"],
    955: ["Identification : Dr Anne-Elodie Millischer-Bellaiche, radiologue spécialisée en "
          "imagerie de la femme, fondatrice en mai 2022 de l'Institut de la femme et de "
          "l'endométriose (IFEEN) à Paris 3e. Le carnet portait une graphie approchante du "
          "nom. Sources : https://lemedecin.fr/paris/irm-bachaumont/radiologue/docteur-"
          "millischer-bellaiche-anne-elodie/7d4642ea84858e8ae3779856f65755a5/pro/ et "
          "https://docteurimago.fr/grand-angle/reportage/un-centre-pluridisciplinaire-"
          "pilote-pour-les-maladies-gynecologiques-et-lendometriose/"],
    980: ["Structure identifiée : le Centre de santé Marie-Thérèse est recensé par la "
          "mairie du 20e au 1 bis allée Alquier Debrousse (20e), tél. 01 44 12 87 88. Le "
          "carnet le notait sous une forme approchante. L'activité de pneumologie sur "
          "place n'est pas confirmée par la page : à vérifier. Source : "
          "https://mairie20.paris.fr/pages/centres-de-soins-et-de-sante-13660"],
    985: ["Identification : Dr Anne-Gaëlle Pourcelot, gynécologue-obstétricienne au "
          "Kremlin-Bicêtre, avec l'activité de stérilisation volontaire notée par le "
          "carnet. Prénom corrigé. Source : https://www.sante.fr/gynecologie-obstetrique/"
          "le-kremlin-bicetre/dr-pourcelot-anne-gaelle"],
    997: ["Identification : Dr Sabine ROUX est la seule praticienne nommée ROUX de l'équipe "
          "d'urologie de l'hôpital Cochin - Port-Royal (site officiel du service, "
          "consultations 123 bd de Port-Royal 75014). Concordance spécialité (vasectomie = "
          "urologie) + établissement. À confirmer par un humain."],
    1010: ["Identification : Dr Jean-Yves SEROR (un seul r), radiologue au cabinet Imagerie "
           "Duroc, 5 bd du Montparnasse 75006, secteur 2. Trois éléments concordent : "
           "l'établissement (Duroc), l'orientation imagerie du sein, et la mention « pas "
           "secteur 1 » du carnet, cohérente avec le secteur 2 affiché. À confirmer par un "
           "humain. Source : https://lemedecin.fr/paris/imagerie-duroc/radiologue/docteur-"
           "seror-jean-yves/62c6c27af02e17be90f8f4ae92624bc1/pro/"],
    1022: ["Prénom corrigé : le Dr Bertrand STOS, pédiatre, exerce bien à l'« Unité "
           "d'explorations cardiologiques - cardiopathies congénitales » (UE3C), 31 avenue "
           "de Lowendal 75015 — ce qui confirme le lien avec la mention « Cardioped : "
           "cabinet UE3C Lowendal » notée juste avant dans la source. Secteur 1. Source : "
           "https://lemedecin.fr/paris/unite-dexplorations-cardiologiques-cardiopathies-"
           "congenitales/pediatre/docteur-stos-bertrand/"
           "31889f27d15a09e7b952a37b215ddc89/pro/"],
}

# Cas isolé, hors des deux familles (« Graphie d'origine … » et « note d'origine … ») : un
# commentaire qui exposait la graphie fautive dans une formulation à lui. Débusqué par le
# contrôle n°6 de `audit.py`, qui cherche, sur toute fiche dont le nom a été corrigé, si sa
# graphie d'origine est encore citée entre guillemets quelque part.
# Clé : (idx, préfixe reconnaissable de l'ancien texte) -> nouveau texte.
AUTRES = {
    530: [("Nom orthographié « FREITAG » dans le carnet",
           "Nom corrigé : le carnet portait une graphie approchante ; le web donne "
           "« FRAITAG Delphine », psychiatre à la même adresse (14 rue du "
           "Cloître-Notre-Dame, 75004). Orthographe corrigée, à confirmer.")],
}

# Garde-fou d'idempotence : si un texte de remplacement contenait « note d'origine », le
# bloc de recombine.py le re-matcherait à chaque passage et réécrirait en boucle. Idem si
# un texte de AUTRES contenait son propre préfixe de reconnaissance.
for _idx, _textes in REECRITURES.items():
    for _t in _textes:
        assert "note d'origine" not in _t.lower(), (
            "idx %s : un texte de remplacement contient « note d'origine », "
            "ce qui casse l'idempotence" % _idx)
for _idx, _paires in AUTRES.items():
    for _prefixe, _t in _paires:
        assert _prefixe not in _t, (
            "idx %s : le texte de remplacement contient son propre préfixe de "
            "reconnaissance, ce qui casse l'idempotence" % _idx)
