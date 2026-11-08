-- Synthetic catalog fixtures; run only in scripts/test-database.mjs disposable cluster.
create or replace function public.test_catalog_denied(statement text, expected_state text) returns void
language plpgsql as $$
begin
  begin
    execute statement;
  exception when others then
    if sqlstate = expected_state then return; end if;
    raise;
  end;
  raise exception 'Expected % but statement succeeded', expected_state;
end;
$$;
grant execute on function public.test_catalog_denied(text,text) to anon, authenticated;
do $$
declare target regprocedure := 'public.search_published_species(text,text,boolean,text,text,text,text,integer,integer)'::regprocedure;
begin
 if not has_function_privilege('anon', target, 'EXECUTE')
   or not has_function_privilege('authenticated', target, 'EXECUTE') then
   raise exception 'Catalog RPC role grants missing';
 end if;
 if exists (
   select 1 from pg_catalog.pg_proc p
   cross join lateral pg_catalog.aclexplode(p.proacl) acl
   where p.oid = target and acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
 ) then raise exception 'Catalog RPC remains executable by PUBLIC'; end if;
end $$;

insert into public.sources(id,title,organization,url,accessed_on) values
 ('20000000-0000-4000-8000-000000000010','Catalog source A','Fixture','https://example.org/a',current_date),
 ('20000000-0000-4000-8000-000000000011','Catalog source B','Fixture','https://example.org/b',current_date),
 ('20000000-0000-4000-8000-000000000012','Catalog source draft','Fixture','https://example.org/draft',current_date);
insert into public.species(id,slug,scientific_name,taxon_group,region_codes,habitat_codes,updated_at,status) values
 ('10000000-0000-4000-8000-000000000010','catalog-alpha','CatalogFixture Alpha','fixture-mammal',array['fixture-region'],array['fixture-forest'],'2026-01-01T00:00:00Z','draft'),
 ('10000000-0000-4000-8000-000000000011','catalog-beta','CatalogFixture Beta','fixture-bird',array['fixture-region'],array['fixture-wetland'],'2026-01-03T00:00:00Z','draft'),
 ('10000000-0000-4000-8000-000000000012','catalog-gamma','CatalogFixture Gamma','fixture-bird',array['fixture-island'],array['fixture-forest'],'2026-01-02T00:00:00Z','draft'),
 ('10000000-0000-4000-8000-000000000013','catalog-draft','CatalogFixture Draft','fixture-hidden',array['fixture-hidden'],array['fixture-hidden'],'2026-01-04T00:00:00Z','draft');
insert into public.species_translations(species_id,locale,common_name,summary,description,distinctive_traits,habitat_description,threats_description,conservation_actions,translation_status) values
 ('10000000-0000-4000-8000-000000000010','id','Cássowary fixture','s','d','t','h','th','a','published'),
 ('10000000-0000-4000-8000-000000000011','id','Catalog fixture','s','d','t','h','th','a','published'),
 ('10000000-0000-4000-8000-000000000012','id','Catalog fixture','s','d','t','h','th','a','published'),
 ('10000000-0000-4000-8000-000000000013','id','Hidden draft','s','d','t','h','th','a','draft'),
 ('10000000-0000-4000-8000-000000000011','en','CatalogFixture secret','s','d','t','h','th','a','draft');
insert into public.species_sources(species_id,source_id,section_key) values
 ('10000000-0000-4000-8000-000000000010','20000000-0000-4000-8000-000000000010','summary'),
 ('10000000-0000-4000-8000-000000000011','20000000-0000-4000-8000-000000000011','summary'),
 ('10000000-0000-4000-8000-000000000012','20000000-0000-4000-8000-000000000010','summary'),
 ('10000000-0000-4000-8000-000000000013','20000000-0000-4000-8000-000000000012','summary');
insert into public.species_aliases(species_id,locale,name,kind) values
 ('10000000-0000-4000-8000-000000000010','id','literal%_needle','fixture'),
 ('10000000-0000-4000-8000-000000000013','id','literal%_needle hidden','fixture');
insert into public.conservation_assessments(species_id,status_code,assessment_year,assessment_scope,source_id,is_current) values
 ('10000000-0000-4000-8000-000000000010','VU',2024,'fixture','20000000-0000-4000-8000-000000000010',true),
 ('10000000-0000-4000-8000-000000000011','CR',2024,'fixture','20000000-0000-4000-8000-000000000011',true);
begin;
update public.species set status='published' where slug in ('catalog-alpha','catalog-beta','catalog-gamma');
commit;

do $$
declare
 field text;
 original text;
 r jsonb;
 whitespace_only text := U&'\0009\000A\00A0\3000';
begin
 update public.species set taxon_group='qa-whitespace-only' where slug='catalog-alpha';
 foreach field in array array['common_name','summary','description','distinctive_traits','habitat_description','threats_description','conservation_actions'] loop
  execute format('update public.species_translations set %I = $1 where species_id = $2 and locale = $3', field)
    using whitespace_only, '10000000-0000-4000-8000-000000000010'::uuid, 'id';
  r := public.search_published_species('CatalogFixture',null,false,null,null,null,'name',1,12);
  if r->>'total' <> '2' or (r #> '{facets,taxonGroups}') ? 'qa-whitespace-only'
    or exists (select 1 from jsonb_array_elements(r->'rows') item where item->'species'->>'slug'='catalog-alpha') then
    raise exception 'Whitespace-only Indonesian % remained eligible', field;
  end if;
  original := case field
    when 'common_name' then 'Cássowary fixture'
    when 'summary' then 's'
    when 'description' then 'd'
    when 'distinctive_traits' then 't'
    when 'habitat_description' then 'h'
    when 'threats_description' then 'th'
    else 'a'
  end;
  execute format('update public.species_translations set %I = $1 where species_id = $2 and locale = $3', field)
    using original, '10000000-0000-4000-8000-000000000010'::uuid, 'id';
 end loop;
 update public.species_translations set common_name='Écho fixture' where species_id='10000000-0000-4000-8000-000000000010';
 update public.species_translations set common_name='alpha fixture' where species_id='10000000-0000-4000-8000-000000000011';
 update public.species_translations set common_name='zebra fixture' where species_id='10000000-0000-4000-8000-000000000012';
 r := public.search_published_species('',null,false,null,null,null,'name',1,12);
 if r#>>'{rows,0,species,slug}' <> 'catalog-beta'
   or r#>>'{rows,1,species,slug}' <> 'catalog-alpha' then
   raise exception 'C-collation accented sort normalization failed';
 end if;
 update public.species_translations set common_name='Cássowary fixture' where species_id='10000000-0000-4000-8000-000000000010';
 update public.species_translations set common_name='Catalog fixture' where species_id in ('10000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000012');
 update public.species set taxon_group='fixture-mammal' where slug='catalog-alpha';
end $$;

set role anon;
do $$
declare r jsonb; term text;
begin
 r := public.search_published_species('cáss',null,false,null,null,null,'name',1,12);
 if r->>'total' <> '1' or r#>>'{rows,0,species,slug}' <> 'catalog-alpha' then raise exception 'Diacritic search failed'; end if;
 foreach term in array array['cáss','CÁSS','cass','CASS'] loop
  r := public.search_published_species(term,null,false,null,null,null,'name',1,12);
  if r->>'total' <> '1' or r#>>'{rows,0,species,slug}' <> 'catalog-alpha' then
    raise exception 'Case/diacritic search failed for %', term;
  end if;
 end loop;
 r := public.search_published_species('%_',null,false,null,null,null,'name',1,12);
 if r->>'total' <> '1' or r#>>'{rows,0,species,slug}' <> 'catalog-alpha' then raise exception 'Wildcard characters were not literal or draft alias leaked'; end if;
 r := public.search_published_species('secret',null,false,null,null,null,'name',1,12);
 if r->>'total' <> '0' then raise exception 'Draft English/alias search leaked'; end if;
 r := public.search_published_species('CatalogFixture',null,false,null,null,null,'name',1,1);
 if r->>'total' <> '3' or r#>>'{rows,0,species,slug}' <> 'catalog-alpha' or not (r#>'{facets,taxonGroups}' ? 'fixture-bird') then raise exception 'Catalog assertion failed: total=%, first=%, facets=%', r->>'total', r#>>'{rows,0,species,slug}', r#>'{facets,taxonGroups}'; end if;
 r := public.search_published_species('CatalogFixture',null,false,null,'fixture-region',null,'updated',1,12);
 if r->>'total' <> '2' or r#>>'{rows,0,species,slug}' <> 'catalog-beta' then raise exception 'Filter composition or updated sort failed'; end if;
 r := public.search_published_species('CatalogFixture',null,false,'fixture-bird',null,'fixture-wetland','name',1,12);
 if r->>'total' <> '1' or r#>>'{rows,0,species,slug}' <> 'catalog-beta' then raise exception 'Taxon and habitat filters failed'; end if;
 r := public.search_published_species('CatalogFixture',null,true,null,null,null,'name',1,12);
 if r->>'total' <> '2' or r#>>'{rows,0,species,slug}' <> 'catalog-alpha' then raise exception 'Threatened union failed'; end if;
 r := public.search_published_species('CatalogFixture','VU',false,null,null,null,'name',1,12);
 if r->>'total' <> '1' or r#>>'{rows,0,species,slug}' <> 'catalog-alpha' then raise exception 'Exact status filter failed'; end if;
 r := public.search_published_species('CatalogFixture',null,false,null,null,null,'name',2,1);
 if r->>'total' <> '3' or r#>>'{rows,0,species,slug}' <> 'catalog-beta' then raise exception 'Stable page tie ordering failed'; end if;
 r := public.search_published_species('CatalogFixture',null,false,null,null,null,'name',100,12);
 if r->>'total' <> '3' or jsonb_array_length(r->'rows') <> 0 then raise exception 'Out-of-range page contract failed'; end if;
end $$;
select public.test_catalog_denied($q$select public.search_published_species('', 'BOGUS', false, null, null, null, 'name', 1, 12)$q$, '22023');
select public.test_catalog_denied($q$select public.search_published_species('', null, false, null, null, null, 'name', 1, 13)$q$, '22023');
select public.test_catalog_denied($q$select public.search_published_species('', 'CR', true, null, null, null, 'name', 1, 12)$q$, '22023');
select public.test_catalog_denied($q$select public.search_published_species(repeat('x',101), null, false, null, null, null, 'name', 1, 12)$q$, '22023');
select public.test_catalog_denied($q$select public.search_published_species('', null, false, null, null, null, 'name', 1000001, 12)$q$, '22023');
select public.test_catalog_denied($q$select public.search_published_species('', null, false, null, null, null, 'name', 1, null)$q$, '22023');
select public.test_catalog_denied($q$select public.search_published_species('', null, false, null, null, null, 'name', null, 12)$q$, '22023');
reset role;
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$ declare r jsonb; begin
 r := public.search_published_species('CatalogFixture',null,false,null,null,null,'name',1,12);
 if r->>'total' <> '3' or jsonb_array_length(r->'rows') <> 3 then raise exception 'Authenticated invocation escaped explicit published filter'; end if;
end $$;
reset role;
set request.jwt.claim.sub='';
select '__CATALOG_RPC_JSON__' || public.search_published_species(
  'CatalogFixture', null, false, null, null, null, 'name', 1, 12
)::text;
delete from public.species where slug like 'catalog-%';
delete from public.sources where id in (
 '20000000-0000-4000-8000-000000000010',
 '20000000-0000-4000-8000-000000000011',
 '20000000-0000-4000-8000-000000000012'
);
select 'PASS: published-only catalog RPC, anon/auth RLS, literal normalized search, filters, facets, counts, ordering, pages and bounds';
