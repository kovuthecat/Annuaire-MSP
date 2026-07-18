-- Renseigne le prénom de chaque membre.
-- Le titre de la carte Membres = memberDisplayName = « Prénom Nom » ; le nom est laissé
-- vide → le titre affiche donc JUSTE le prénom, l'email reste en sous-titre (identifiant).
-- À exécuter dans Supabase → SQL Editor (rôle service, bypass RLS). Idempotent (ré-exécutable).
-- Mapping confirmé avec Thibault le 2026-07-18.

update public.members set prenom = 'Thibault' where email = 'ipamspmenilmontant@tuta.com';
update public.members set prenom = 'Aurélien' where email = 'aurelien.descarpentries@gmail.com';
update public.members set prenom = 'Charlène' where email = 'charly.lemet@gmail.com';
update public.members set prenom = 'Antonin'  where email = 'amathieu@mspmenilmontant.fr';
update public.members set prenom = 'Estelle'  where email = 'gregoreestelle@gmail.com';
update public.members set prenom = 'Adèle'    where email = 'adele.labbe.le.picard@gmail.com';
update public.members set prenom = 'Cécile'   where email = 'cecilegatter@gmail.com';
update public.members set prenom = 'Elena'    where email = 'elena.nasreddine@gmail.com';
update public.members set prenom = 'Maylis'   where email = 'mbayleorthophoniste@gmail.com';
update public.members set prenom = 'Anne'     where email = 'annekammerer.sf@gmail.com';
