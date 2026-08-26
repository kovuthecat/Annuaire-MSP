-- ============================================================================
-- Annuaire MSP -- seed incremental : integration du carnet de Clara (2026-08-10)
-- 7 fiches nouvelles + 13 fiches existantes enrichies (owner clara + champs/commentaires).
-- A executer dans Supabase -> SQL Editor, sur la base de PRODUCTION.
-- Idempotent (id deterministes, on conflict do nothing / not exists) : rejouable sans
-- doublon si interrompu ou relance. Ne touche AUCUNE autre fiche que celles listees ici.
-- ============================================================================

create temp table seed_owner_map (slug text primary key, email text not null);
insert into seed_owner_map (slug, email) values
  ('anne',     'annekammerer.sf@gmail.com'),
  ('charlene', 'charly.lemet@gmail.com'),
  ('aurelien', 'aurelien.descarpentries@gmail.com'),
  ('antonin',  'amathieu@mspmenilmontant.fr'),
  ('elena',    'elena.nasreddine@gmail.com'),
  ('maylis',   'mbayleorthophoniste@gmail.com'),
  ('clara',    'clara.douchaine@gmail.com');

do $$
declare manquants text;
begin
  select string_agg(o.slug || ' -> ' || o.email, ', ') into manquants
  from seed_owner_map o
  where not exists (select 1 from public.members m where m.email = o.email);
  if manquants is not null then
    raise exception 'Comptes introuvables dans public.members : %.', manquants;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1. NOUVEAUX CONTACTS (7 fiches, idx 1233-1239)
-- ---------------------------------------------------------------------------
create temp table seed_contacts (id uuid primary key, creator_slug text);

insert into public.contacts (id,type,sous_type,civilite,nom,prenom,profession,orientation,etablissement,adresse,arrondissement,secteur_conv,tel_secretariat,doctolib,site_web,email_rdv,ligne_directe,bip,portable,fax,email_avis,mssante,consignes_pro,prend_nouveaux,delai,vad,ame_cmu,pmr,langues,tele_expertise,tarif,tags,statut,categorie,grise_reason,grise_alerte,rpps,source_url,source_type,source_checked_at,latitude,longitude,geocode_score,geocoded_at) values
  ('d28f1e2f-b333-5d7a-9c98-1e375fa4d8d6'::uuid, 'praticien',null,'Dr','MOISAN','Delphine','Psychiatre addictologue','Addictologie / alcoologie','Hopital Beaujon (AP-HP) - UTAMA (Unite de Traitement Ambulatoire des Maladies Addictives)','100 Boulevard du General Leclerc, 92110 Clichy','92110',null,'01 40 87 58 84',null,null,null,null,null,null,null,null,null,null,'inconnu',null,false,false,false,null,null,null,array['addictologie','alcoologie','psychiatrie']::text[],'actif','Praticien',null,null,null,'https://www.aphp.fr/beaujon/service-de-psychiatrie-et-addictologie','site_etablissement','2026-08-10T00:00:00+02:00',48.908509,2.30778,0.975,'2026-08-10T00:00:00+02:00'),
  ('3235e848-595c-503d-a040-e198a8b39444'::uuid, 'structure','consultation sans rendez-vous',null,'UMCG - Peupliers (Unite Medico-Chirurgicale de Garde)',null,null,null,'Hopital Prive des Peupliers','24 rue des Peupliers, 75013 Paris','75013',null,null,null,null,null,null,null,null,null,null,null,null,'inconnu',null,false,false,false,null,null,null,array['urgences','sans rendez-vous','traumatologie']::text[],'actif','Structure de soins',null,null,null,'https://hopital-prive-des-peupliers-paris.ramsaysante.fr/','site_etablissement','2026-08-10T00:00:00+02:00',48.823136,2.352951,0.9779,'2026-08-10T00:00:00+02:00'),
  ('89285a68-3b21-519e-88c7-43b53a7616ea'::uuid, 'praticien',null,'Dr','PANA-KATATALI','Heloise','Pneumologue',null,null,'74 rue Saint-Blaise, 75020 Paris','75020','2','03 81 60 34 01','https://www.doctolib.fr/pneumologue/paris/heloise-pana-katatali',null,'pneumologue.paris20@gmail.com',null,null,null,null,null,null,null,'inconnu',null,false,false,false,'allemand, anglais, francais',null,null,array['pneumologie','medecine du sommeil','apnee du sommeil','apnee du sommeil de l''enfant','asthmologie','cancerologie thoracique','polygraphie ventilatoire','ronflements','troubles du sommeil']::text[],'actif','Praticien',null,null,null,'http://www.pneumoparisbesancon.fr/','site_etablissement','2026-08-10T00:00:00+02:00',48.856913,2.408699,0.9799,'2026-08-10T00:00:00+02:00'),
  ('313da631-d4de-51e2-b3bb-f7190fb827a7'::uuid, 'praticien',null,'Dr','MORVAN','Erwan','Neurologue','ENMG (electromyogramme), potentiels evoques',null,'28 rue Ligner, 75020 Paris','75020','2','07 81 82 91 24','https://www.doctolib.fr/neurologue/paris/erwan-morvan',null,null,null,null,null,null,null,null,null,'inconnu',null,false,false,false,null,null,null,array['neurologie','enmg','electromyogramme','potentiels evoques']::text[],'a_verifier','Praticien',null,null,'10101084274','https://www.sante.fr/neurologie/paris/dr-morvan-erwan','annuaire_sante','2026-08-10T00:00:00+02:00',48.857573,2.398077,0.9756,'2026-08-10T00:00:00+02:00'),
  ('5da2c3bf-c8eb-5f6c-a66c-46a9e2e17de1'::uuid, 'autre',null,null,'IAPR - Institut d''Accompagnement Psychologique et de Ressources',null,'Soutien psychologique (salaries, via l''employeur)',null,null,null,null,null,null,null,'https://www.iapr.fr/',null,null,null,null,null,null,null,null,'inconnu',null,false,false,false,null,null,null,array['psychologie','soutien','en ligne','salaries']::text[],'a_verifier','Ressource',null,null,null,null,'carnet_membre',null,null,null,null,null),
  ('bdc9f46f-c75b-5a6c-9647-8f7f237dca8f'::uuid, 'structure',null,null,'Maison des femmes Hotel-Dieu',null,null,null,'Hotel-Dieu (AP-HP)','1 Place du Parvis Notre-Dame, 75004 Paris','75004',null,'01 42 34 82 00',null,null,'maisondesfemmes.hoteldieu@aphp.fr',null,null,null,null,null,null,null,'inconnu',null,false,false,false,null,null,null,array['violence','maison des femmes','sante des femmes']::text[],'actif','Structure de soins',null,null,null,'https://www.sante.fr/maison-des-femmes-aphp-hotel-dieu','annuaire_sante','2026-08-10T00:00:00+02:00',48.853928,2.348347,0.6167,'2026-08-10T00:00:00+02:00'),
  ('b9db78ef-c2cf-576f-aae0-954e75d74aeb'::uuid, 'structure',null,null,'Maison des femmes Pitie-Salpetriere',null,null,null,'Hopital Pitie-Salpetriere (AP-HP)','47-83 boulevard de l''Hopital, 75013 Paris','75013',null,'01 42 17 76 97',null,null,'maisondesfemmes.pitiesalpetriere@aphp.fr',null,null,null,null,null,null,null,'inconnu',null,false,false,false,null,null,null,array['violence','maison des femmes','sante des femmes']::text[],'actif','Structure de soins',null,null,null,'https://www.sante.fr/maison-des-femmes-aphp-pitie-salpetriere','annuaire_sante','2026-08-10T00:00:00+02:00',48.838609,2.361165,0.827,'2026-08-10T00:00:00+02:00')
on conflict (id) do nothing;

insert into seed_contacts (id, creator_slug) values
  ('d28f1e2f-b333-5d7a-9c98-1e375fa4d8d6'::uuid, 'clara'),
  ('3235e848-595c-503d-a040-e198a8b39444'::uuid, 'clara'),
  ('89285a68-3b21-519e-88c7-43b53a7616ea'::uuid, 'clara'),
  ('313da631-d4de-51e2-b3bb-f7190fb827a7'::uuid, 'clara'),
  ('5da2c3bf-c8eb-5f6c-a66c-46a9e2e17de1'::uuid, 'clara'),
  ('bdc9f46f-c75b-5a6c-9647-8f7f237dca8f'::uuid, 'clara'),
  ('b9db78ef-c2cf-576f-aae0-954e75d74aeb'::uuid, 'clara')
on conflict (id) do nothing;

update public.contacts c set created_by = m.id
from seed_contacts s
  join seed_owner_map o on o.slug = s.creator_slug
  join public.members m on m.email = o.email
where c.id = s.id and c.created_by is null;

-- ---------------------------------------------------------------------------
-- 2. COMMENTAIRES (38) -- fiches nouvelles + fiches existantes enrichies.
-- Dedoublonnage sur (contact_id, texte, author) : les commentaires deja presents
-- (deja importes lors du seed initial) sont ignores, seuls les nouveaux s'ajoutent.
-- ---------------------------------------------------------------------------
create temp table seed_comments (contact_id uuid, slug text, origine text,
                                  type text, texte text);
insert into seed_comments (contact_id, slug, origine, type, texte) values
  ('d28f1e2f-b333-5d7a-9c98-1e375fa4d8d6'::uuid, 'clara', null, 'info', 'Egalement joignable via le service de psychiatrie et addictologie de l''Hopital Bichat (meme GHU Paris Nord) : 01 40 25 82 63.'),
  ('d28f1e2f-b333-5d7a-9c98-1e375fa4d8d6'::uuid, null, 'enrichissement_web', 'info', 'Identite et fonction confirmees : Dr Delphine Moisan, psychiatre-addictologue, responsable de l''UTAMA a l''Hopital Beaujon, AP-HP. (Source : https://www.aphp.fr/beaujon/service-de-psychiatrie-et-addictologie - enrichissement web 2026-08-10, confiance haute).'),
  ('3235e848-595c-503d-a040-e198a8b39444'::uuid, 'clara', null, 'info', 'Consultation sans rendez-vous, tous les jours de 8h a 20h (horaires reduits 8h-18h en aout). Prend en charge traumatologie, plaies, brulures, infections cutanees, medecine generale et urgences de la main.'),
  ('3235e848-595c-503d-a040-e198a8b39444'::uuid, null, 'enrichissement_web', 'info', 'Adresse et horaires confirmes sur la page officielle de l''etablissement. Aucun numero de telephone dedie trouve. (Source : https://hopital-prive-des-peupliers-paris.ramsaysante.fr/ - enrichissement web 2026-08-10, confiance haute).'),
  ('89285a68-3b21-519e-88c7-43b53a7616ea'::uuid, 'clara', null, 'info', 'Secteur 2 OPTAM (depassements maitrises).'),
  ('89285a68-3b21-519e-88c7-43b53a7616ea'::uuid, null, 'enrichissement_web', 'info', 'Le numero 03 81 60 34 01 est le secretariat commun des deux cabinets (Paris 75020 et Besancon) : verifie sur le site officiel, ce n''est pas une erreur de saisie malgre l''indicatif non-parisien. (Source : http://www.pneumoparisbesancon.fr/ - enrichissement web 2026-08-10, confiance haute).'),
  ('89285a68-3b21-519e-88c7-43b53a7616ea'::uuid, null, 'enrichissement_web', 'info', 'Actes/competences (page Doctolib ouverte et identite confirmee sur place, donnees structurees schema.org) : apnee du sommeil (adulte et enfant), asthmologie, cancerologie thoracique, polygraphie ventilatoire, ronflements, troubles du sommeil. Suit les patients a partir de 3 ans. Langues : allemand, anglais, francais. (Source : https://www.doctolib.fr/pneumologue/paris/heloise-pana-katatali - enrichissement web 2026-08-10, confiance haute).'),
  ('313da631-d4de-51e2-b3bb-f7190fb827a7'::uuid, null, 'enrichissement_web', 'info', 'Neurologue oriente neurophysiologie : realise EMG/ENMG, potentiels evoques moteurs et sensitifs. Ne fait pas de consultation de neurologie generale ni de suivi enfant de moins de 14 ans. Aucune coordonnee n''etait donnee par le carnet ; adresse, telephone et RPPS confirmes sur sante.fr. (Source : https://www.sante.fr/neurologie/paris/dr-morvan-erwan - enrichissement web 2026-08-10, confiance haute).'),
  ('313da631-d4de-51e2-b3bb-f7190fb827a7'::uuid, null, 'enrichissement_web', 'alerte', 'Desaccord de telephone entre 2 sources ouvertes : sante.fr indique 07 81 82 91 24 (retenu ici, sante.fr etant la reference du projet pour ce champ) ; la page Doctolib du praticien (texte libre de sa bio, pas le champ telephone structure qui est vide) indique un autre numero, 09 78 27 12 01. Le cabinet est aussi note « Centre de sante Angels » sur Doctolib, avec des remplacants les lundi (Dr Javeri) et jeudi (Dr Fela Fouzia) -- possible changement recent de secretariat qui expliquerait l''ecart. A confirmer avant tout appel. Ne fait pas de consultation de neurologie generale, pas d''EMG du perineum/face, pas d''enfant de moins de 14 ans.'),
  ('5da2c3bf-c8eb-5f6c-a66c-46a9e2e17de1'::uuid, 'clara', null, 'info', 'Note du carnet : « IAPR : en ligne », sans autre precision.'),
  ('5da2c3bf-c8eb-5f6c-a66c-46a9e2e17de1'::uuid, null, 'enrichissement_web', 'info', 'IAPR est un prestataire de soutien psychologique en contexte professionnel (risques psychosociaux, sante mentale au travail) : reseau de plus de 950 psychologues, accessible par telephone/numerique/presentiel, parfois avec une ligne 24/7 si l''employeur y a souscrit. Cible principalement les salaries d''entreprises clientes, pas un service de consultation patient classique - pertinence pour l''annuaire a confirmer avec Clara (ressource pour les patients, ou pour l''equipe de la MSP elle-meme ?). (Source : https://www.iapr.fr/ - enrichissement web 2026-08-10, confiance moyenne).'),
  ('bdc9f46f-c75b-5a6c-9647-8f7f237dca8f'::uuid, null, 'enrichissement_web', 'info', 'Accueil des femmes victimes de violences (physiques, psychologiques, sexuelles, conjugales, intrafamiliales) : suivi medical, psychologique et social pluridisciplinaire, depot de plainte possible sur place. Accueil du lundi au vendredi 9h-17h sur rendez-vous ; entree 1 place du Parvis Notre-Dame puis batiment A3, 4e etage. (Source : https://www.sante.fr/maison-des-femmes-aphp-hotel-dieu - enrichissement web 2026-08-10, confiance haute).'),
  ('b9db78ef-c2cf-576f-aae0-954e75d74aeb'::uuid, null, 'enrichissement_web', 'info', 'Meme reseau AP-HP que les Maisons des femmes de Bichat et de l''Hotel-Dieu : accueil des femmes victimes de violences, accompagnement medical/social/judiciaire. Accueil du lundi au vendredi 9h-17h sur rendez-vous. Adresse et email confirmes sur sante.fr (email non fourni par le carnet). (Source : https://www.sante.fr/maison-des-femmes-aphp-pitie-salpetriere - enrichissement web 2026-08-10, confiance haute).'),
  ('9015c0b7-896b-5f74-aeb5-2614007d40c9'::uuid, 'antonin', null, 'info', 'Consultations de cardiologie non programmées à la Pitié : prise en charge cardiologique complète en une journée.'),
  ('9015c0b7-896b-5f74-aeb5-2614007d40c9'::uuid, null, 'enrichissement_web', 'alerte', 'Adresse à vérifier : sante.fr situe l''UCASAR au 47 bd de l''Hôpital 75013, tandis que la page action-groupe.org la situe « au rez-de-chaussée de l''Institut de Cardiologie, 52 bd Vincent Auriol 75013 ». Les deux sont sur le site de la Pitié-Salpêtrière ; seul l''arrondissement est certain.'),
  ('9015c0b7-896b-5f74-aeb5-2614007d40c9'::uuid, 'clara', null, 'info', 'Ligne « urgence cardiologie » indiquee par le carnet de Clara : 01 42 16 22 11 (distincte du numero standard UCASAR 01 42 16 29 29 deja enregistre).'),
  ('706534db-0caf-5778-b81f-2c84613acae5'::uuid, null, 'enrichissement_web', 'info', 'Secteur 2 adhérent OPTAM : dépassements d''honoraires maîtrisés (source : Annuaire santé Ameli, CNAM, fichier du 2026-07-13).'),
  ('7be405c5-eded-5b8b-b288-04d721672150'::uuid, 'clara', null, 'info', 'Consultations sans rendez-vous le mardi et le mercredi.'),
  ('d6308dd1-3a53-5281-9e33-88555336cab5'::uuid, 'anne', null, 'reco', 'Reco par Zina.'),
  ('d6308dd1-3a53-5281-9e33-88555336cab5'::uuid, 'anne', null, 'alerte', 'Secteur 2, 100 €.'),
  ('d6308dd1-3a53-5281-9e33-88555336cab5'::uuid, null, 'enrichissement_web', 'info', 'Exerce au 4b rue de l''Hôpital Saint-Louis 75010 — même cabinet que le Dr Estelle Hau, l''autre dermatologue du carnet notée « Colonel Fabien (ils sont 3) ».'),
  ('d6308dd1-3a53-5281-9e33-88555336cab5'::uuid, null, 'enrichissement_web', 'info', 'Également praticienne au service de dermatologie de l''hôpital Saint-Louis (AP-HP), 1 av Claude Vellefaux 75010 (consultation de dermatologie, sante.fr).'),
  ('d6308dd1-3a53-5281-9e33-88555336cab5'::uuid, null, 'enrichissement_web', 'info', 'Secteur 2 adhérent OPTAM : dépassements d''honoraires maîtrisés (source : Annuaire santé Ameli, CNAM, fichier du 2026-07-13).'),
  ('d6308dd1-3a53-5281-9e33-88555336cab5'::uuid, 'clara', null, 'info', 'Accepte les nouveaux patients.'),
  ('ad360413-9115-5b98-9108-e1292132efc8'::uuid, 'clara', null, 'info', 'Oriente aussi pour la chirurgie du dos / neurochirurgie (avec la Pitie-Salpetriere en alternative).'),
  ('49ec18bb-e822-528a-ba7c-cef13e0504b2'::uuid, 'clara', null, 'info', 'Si ascite peu abondante : envoyer au prealable un courrier avec serologies hepatiques + imagerie.'),
  ('1811f87c-5cc6-529d-9905-46bba7c9fbb7'::uuid, 'antonin', null, 'info', 'Prénom orthographié « santoch » à un endroit de la source.'),
  ('c11d8b27-c4f9-53e1-a207-2c938e66cfde'::uuid, 'antonin', null, 'reco', 'Très bon retour (« ++ »).'),
  ('c11d8b27-c4f9-53e1-a207-2c938e66cfde'::uuid, 'antonin', null, 'info', 'A des créneaux réservés aux praticiens.'),
  ('c11d8b27-c4f9-53e1-a207-2c938e66cfde'::uuid, 'charlene', null, 'info', 'Autre(s) lieu(x) d''exercice mentionné(s) dans les carnets : Nation.'),
  ('c11d8b27-c4f9-53e1-a207-2c938e66cfde'::uuid, null, 'enrichissement_web', 'info', 'Autre site d''exercice trouve sur le web : 5 bis avenue de Saint-Mande, 75012 Paris (tel. 01 43 46 62 23), cabinet partage avec le Dr Ariane Do. Egalement cite a l''Institut Mutualiste Montsouris (42 bd Jourdan, 75014).'),
  ('c11d8b27-c4f9-53e1-a207-2c938e66cfde'::uuid, null, 'enrichissement_web', 'info', 'Adresse déclarée à l''Assurance Maladie (fichier du 2026-07-13) : 5b Avenue de Saint Mande 75012 Paris. Différente de celle du carnet — un praticien peut exercer sur plusieurs sites, l''adresse du carnet n''a pas été modifiée. Source : https://www.data.gouv.fr/datasets/annuaire-sante-ameli'),
  ('41c15b3b-94b0-571f-899a-29925bc92680'::uuid, 'aurelien', null, 'info', 'Le numéro est suivi d''un « r » parasite dans la source ; les 10 chiffres sont complets.'),
  ('41c15b3b-94b0-571f-899a-29925bc92680'::uuid, null, 'enrichissement_web', 'info', 'Le site officiel d''Ambulance Pelleport (23 rue Pelleport, 75020) publie le numéro 01 42 54 54 54, différent de celui du carnet (01 42 54 89 21). Le numéro du carnet a été conservé tel quel : les deux peuvent coexister. « Montaigne » n''est pas mentionné sur le site.'),
  ('41c15b3b-94b0-571f-899a-29925bc92680'::uuid, null, 'enrichissement_web', 'info', 'Le site officiel (ambulances-pelleport.fr) indique le numero 01 42 54 54 54, different de celui deja enregistre (01 42 54 89 21) a la meme adresse (23 rue Pelleport) - les deux sont conserves, a confirmer lequel est actuellement actif.'),
  ('731a71d0-f99c-5493-9fea-6e64e7782778'::uuid, 'aurelien', null, 'info', 'Accompagnement du deuil, 8 séances.'),
  ('731a71d0-f99c-5493-9fea-6e64e7782778'::uuid, null, 'enrichissement_web', 'info', 'Reseau de sante / Dispositif d''appui a la coordination (DAC) de l''Est parisien (11e-12e-20e) : geriatrie, oncologie, soins palliatifs, accompagnement fin de vie et deuil. — Siege dans le 12e mais dessert le 20e (arrondissement de la MSP). Email contact@humanest-m2a.paris. Rattache a la Maison des Aines et des Aidants (M2A) Paris Est. (Source : https://www.corpalif.org/structures-soins-palliatifs/75/DAC/m2a--dac-humanest--11e-12e-et-20e-arrondissements.html — enrichissement web 2026-07-19, confiance haute).'),
  ('2e929165-70de-59c6-82e1-292880e16875'::uuid, 'clara', null, 'info', 'Le carnet de Clara indique l''adresse mail « maisondesfemmes.bichat@aphp.fr », legerement differente de celle deja enregistree (« maisondesfemmes.bch@aphp.fr ») - les deux alias sont probablement valides (meme boite AP-HP), conservee a titre indicatif.');

insert into public.comments (contact_id, author_id, origine, type, texte)
select s.contact_id, m.id, s.origine, s.type, s.texte
from seed_comments s
  left join seed_owner_map o on o.slug = s.slug
  left join public.members m on m.email = o.email
where not exists (
  select 1 from public.comments x
  where x.contact_id = s.contact_id and x.texte = s.texte
    and x.author_id is not distinct from m.id
);

-- ---------------------------------------------------------------------------
-- 3. « MES CONTACTS » (20 entrees) -- ajoute Clara comme proprietaire des
-- fiches deja existantes qu'elle a confirmees, + les proprietaires des 7 fiches neuves.
-- ---------------------------------------------------------------------------
create temp table seed_list (contact_id uuid, slug text);
insert into seed_list (contact_id, slug) values
  ('d28f1e2f-b333-5d7a-9c98-1e375fa4d8d6'::uuid, 'clara'),
  ('3235e848-595c-503d-a040-e198a8b39444'::uuid, 'clara'),
  ('89285a68-3b21-519e-88c7-43b53a7616ea'::uuid, 'clara'),
  ('313da631-d4de-51e2-b3bb-f7190fb827a7'::uuid, 'clara'),
  ('5da2c3bf-c8eb-5f6c-a66c-46a9e2e17de1'::uuid, 'clara'),
  ('bdc9f46f-c75b-5a6c-9647-8f7f237dca8f'::uuid, 'clara'),
  ('b9db78ef-c2cf-576f-aae0-954e75d74aeb'::uuid, 'clara'),
  ('9015c0b7-896b-5f74-aeb5-2614007d40c9'::uuid, 'clara'),
  ('706534db-0caf-5778-b81f-2c84613acae5'::uuid, 'clara'),
  ('e7ab05f5-4566-58da-9cad-7599b0513064'::uuid, 'clara'),
  ('7be405c5-eded-5b8b-b288-04d721672150'::uuid, 'clara'),
  ('d6308dd1-3a53-5281-9e33-88555336cab5'::uuid, 'clara'),
  ('ad360413-9115-5b98-9108-e1292132efc8'::uuid, 'clara'),
  ('49ec18bb-e822-528a-ba7c-cef13e0504b2'::uuid, 'clara'),
  ('1811f87c-5cc6-529d-9905-46bba7c9fbb7'::uuid, 'clara'),
  ('c11d8b27-c4f9-53e1-a207-2c938e66cfde'::uuid, 'clara'),
  ('41c15b3b-94b0-571f-899a-29925bc92680'::uuid, 'clara'),
  ('731a71d0-f99c-5493-9fea-6e64e7782778'::uuid, 'clara'),
  ('2e929165-70de-59c6-82e1-292880e16875'::uuid, 'clara'),
  ('346f26fd-0441-5db9-92ef-cc75ccd913fc'::uuid, 'clara');

insert into public.list_entries (member_id, contact_id)
select m.id, s.contact_id
from seed_list s
  join seed_owner_map o on o.slug = s.slug
  join public.members m on m.email = o.email
on conflict (member_id, contact_id) do nothing;

-- ---------------------------------------------------------------------------
-- 4. CHAMPS COMPLETES sur 2 fiches existantes -- UNIQUEMENT si encore vides en base
-- (coalesce : ne peut pas ecraser une valeur saisie depuis par un membre dans l'app).
-- ---------------------------------------------------------------------------
update public.contacts set
  tel_secretariat = coalesce(tel_secretariat, '01 77 37 57 30'),
  prend_nouveaux  = case when prend_nouveaux = 'inconnu' then 'oui' else prend_nouveaux end
where id = 'd6308dd1-3a53-5281-9e33-88555336cab5'::uuid;  -- idx 112, Lepelletier-Beaufond Clemence

update public.contacts set
  email_rdv = coalesce(email_rdv, 'consultation.hepatogast@aphp.fr')
where id = '49ec18bb-e822-528a-ba7c-cef13e0504b2'::uuid;  -- idx 273, Hepato-Gastro-Enterologie Tenon

-- ---------------------------------------------------------------------------
-- 5. CONTROLE
-- ---------------------------------------------------------------------------
select 'contacts total' as label, count(*)::text from public.contacts
union all select 'nouvelles fiches Clara presentes', count(*)::text from public.contacts
  where id in ('d28f1e2f-b333-5d7a-9c98-1e375fa4d8d6'::uuid,'3235e848-595c-503d-a040-e198a8b39444'::uuid,'89285a68-3b21-519e-88c7-43b53a7616ea'::uuid,'313da631-d4de-51e2-b3bb-f7190fb827a7'::uuid,'5da2c3bf-c8eb-5f6c-a66c-46a9e2e17de1'::uuid,'bdc9f46f-c75b-5a6c-9647-8f7f237dca8f'::uuid,'b9db78ef-c2cf-576f-aae0-954e75d74aeb'::uuid)
union all select 'fiches Clara dans mes contacts', count(*)::text from public.list_entries le
  join public.members m on m.id = le.member_id and m.email = 'clara.douchaine@gmail.com';
