-- Synthetic journal data only; run in scripts/test-database.mjs disposable cluster.
do $$
begin
  if (select count(*) from public.journal_demo_entries) <> 6
    or (select count(*) from public.journal_demo_entries where entry_group = 'flora') <> 3
    or (select count(*) from public.journal_demo_entries where entry_group = 'fauna') <> 3
    or (select count(*) from public.journal_demo_entries where is_demo is true) <> 6
    or (select count(*) from public.journal_demo_entries where needs_review) <> 2 then
    raise exception 'Journal demo seed counts or markers are incorrect';
  end if;

  if (select count(distinct id) from public.journal_demo_entries) <> 6
    or (select count(distinct image_path) from public.journal_demo_entries) <> 6
    or exists (
      select 1 from public.journal_demo_entries
      where left(region_label, 7) <> 'Demo · '
        or image_path !~ '^/images/journal-demo/[a-z0-9]+(-[a-z0-9]+)*[.]jpg$'
    ) then
    raise exception 'Journal demo rows have unsafe or non-demo values';
  end if;


  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'journal_demo_entries'
      and column_name in (
        'user_id', 'latitude', 'longitude', 'gps', 'email', 'customer_id'
      )
  ) then
    raise exception 'Journal demo table contains identity or precise-location fields';
  end if;

  if not (
    select relrowsecurity from pg_catalog.pg_class
    where oid = 'public.journal_demo_entries'::regclass
  ) then
    raise exception 'Journal demo RLS is disabled';
  end if;

  if not has_table_privilege('anon', 'public.journal_demo_entries', 'SELECT')
    or not has_table_privilege('authenticated', 'public.journal_demo_entries', 'SELECT')
    or has_table_privilege('anon', 'public.journal_demo_entries', 'INSERT')
    or has_table_privilege('anon', 'public.journal_demo_entries', 'UPDATE')
    or has_table_privilege('anon', 'public.journal_demo_entries', 'DELETE')
    or has_table_privilege('anon', 'public.journal_demo_entries', 'TRUNCATE')
    or has_table_privilege('authenticated', 'public.journal_demo_entries', 'INSERT')
    or has_table_privilege('authenticated', 'public.journal_demo_entries', 'UPDATE')
    or has_table_privilege('authenticated', 'public.journal_demo_entries', 'DELETE')
    or has_table_privilege('authenticated', 'public.journal_demo_entries', 'TRUNCATE') then
    raise exception 'Journal demo table grants are not read-only';
  end if;
end $$;

select public.test_denied($q$
  insert into public.journal_demo_entries (
    id, common_name, scientific_name, entry_group, observed_at,
    region_label, image_path, image_alt, needs_review, is_demo
  ) values (
    '00000000-0000-4000-8000-000000000092', 'Test', 'Test taxon', 'flora',
    '2026-01-01T08:00:00+07:00', 'Demo · Test',
    'https://example.org/test.jpg', 'Gambar demo test', false, true
  )
$q$, '23514');
select public.test_denied($q$
  insert into public.journal_demo_entries (
    id, common_name, scientific_name, entry_group, observed_at,
    region_label, image_path, image_alt, needs_review, is_demo
  ) values (
    '00000000-0000-4000-8000-000000000093', 'Test', 'Test taxon', 'flora',
    '2026-01-01T08:00:00+07:00', 'Test region',
    '/images/journal-demo/test.jpg', 'Gambar demo test', false, true
  )
$q$, '23514');
select public.test_denied($q$
  insert into public.journal_demo_entries (
    id, common_name, scientific_name, entry_group, observed_at,
    region_label, image_path, image_alt, needs_review, is_demo
  ) values (
    '00000000-0000-4000-8000-000000000094', 'Test', 'Test taxon', 'unknown',
    '2026-01-01T08:00:00+07:00', 'Demo · Test',
    '/images/journal-demo/test.jpg', 'Gambar demo test', false, true
  )
$q$, '23514');
select public.test_denied($q$
  insert into public.journal_demo_entries (
    id, common_name, scientific_name, entry_group, observed_at,
    region_label, image_path, image_alt, needs_review, is_demo
  ) values (
    '00000000-0000-4000-8000-000000000095', 'Test', 'Test taxon', 'flora',
    '2026-01-01T08:00:00+07:00', 'Demo · Test',
    '/images/journal-demo/test.jpg', 'Gambar demo test', false, false
  )
$q$, '23514');

insert into public.journal_demo_entries (
  id, common_name, scientific_name, entry_group, observed_at,
  region_label, image_path, image_alt, needs_review
) values (
  '00000000-0000-4000-8000-000000000096', 'Test', 'Test taxon', 'flora',
  '2026-01-01T08:00:00+07:00', 'Demo · Test',
  '/images/journal-demo/test.jpg', 'Gambar demo test', false
);
do $$
begin
  if not exists (
    select 1 from public.journal_demo_entries
    where id = '00000000-0000-4000-8000-000000000096' and is_demo is true
  ) then
    raise exception 'Journal demo default marker is not true';
  end if;
end $$;
delete from public.journal_demo_entries
where id = '00000000-0000-4000-8000-000000000096';

set role anon;
do $$
begin
  if (select count(*) from public.journal_demo_entries) <> 6 then
    raise exception 'Anonymous journal demo visibility is incorrect';
  end if;
end $$;
select public.test_denied($q$insert into public.journal_demo_entries (id,common_name,scientific_name,entry_group,observed_at,region_label,image_path,image_alt) values ('00000000-0000-4000-8000-000000000097','Test','Test taxon','flora','2026-01-01T08:00:00+07:00','Demo · Test','/images/journal-demo/test.jpg','Gambar demo test')$q$, '42501');
select public.test_denied($q$update public.journal_demo_entries set region_label='Demo · Edited' where id='d3000000-0000-4000-8000-000000000001'$q$, '42501');
select public.test_denied($q$delete from public.journal_demo_entries where id='d3000000-0000-4000-8000-000000000001'$q$, '42501');
reset role;

set role authenticated;
do $$
begin
  if (select count(*) from public.journal_demo_entries) <> 6 then
    raise exception 'Authenticated journal demo visibility is incorrect';
  end if;
end $$;
select public.test_denied($q$insert into public.journal_demo_entries (id,common_name,scientific_name,entry_group,observed_at,region_label,image_path,image_alt) values ('00000000-0000-4000-8000-000000000098','Test','Test taxon','flora','2026-01-01T08:00:00+07:00','Demo · Test','/images/journal-demo/test.jpg','Gambar demo test')$q$, '42501');
select public.test_denied($q$update public.journal_demo_entries set region_label='Demo · Edited' where id='d3000000-0000-4000-8000-000000000001'$q$, '42501');
select public.test_denied($q$delete from public.journal_demo_entries where id='d3000000-0000-4000-8000-000000000001'$q$, '42501');
reset role;

select 'PASS: journal demo row constraints, explicit seed shape, anon/auth read-only RLS';
set role anon;
select '__JOURNAL_DEMO_JSON__' || coalesce(
  json_agg(to_jsonb(entry) order by entry.observed_at desc, entry.id asc)::text,
  '[]'
)
from public.journal_demo_entries as entry;
reset role;
