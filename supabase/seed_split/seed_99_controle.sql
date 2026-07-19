-- SEED 99 — contrôle (à lire après import).
select 'contacts' as t, count(*) from public.contacts
union all select 'comments', count(*) from public.comments
union all select 'list_entries', count(*) from public.list_entries
union all select 'grisées', count(*) from public.contacts where grise_reason is not null;
