-- SEED 00 — garde-fou : refuse de tourner si un compte membre manque.
do $$
declare manquants text;
begin
  select string_agg(e, ', ') into manquants from (values
    ('annekammerer.sf@gmail.com'),
    ('charly.lemet@gmail.com'),
    ('aurelien.descarpentries@gmail.com'),
    ('amathieu@mspmenilmontant.fr'),
    ('elena.nasreddine@gmail.com'),
    ('mbayleorthophoniste@gmail.com')
  ) as t(e) where not exists (select 1 from public.members m where m.email = t.e);
  if manquants is not null then
    raise exception 'Comptes membres introuvables : %. Crée-les (Auth -> Users) avant le seed.', manquants;
  end if;
end $$;
