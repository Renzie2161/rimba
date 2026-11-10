-- Synthetic detail-RPC fixtures; run only in scripts/test-database.mjs disposable cluster.
-- Reuses the catalog fixtures' shape and asserts the single round trip returns
-- exactly what the six sequential reads used to return.

create or replace function public.test_detail_denied(statement text, expected_state text) returns void
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
grant execute on function public.test_detail_denied(text,text) to anon, authenticated;

do $$
declare target regprocedure := 'public.get_published_species_detail(text)'::regprocedure;
begin
 if not has_function_privilege('anon', target, 'EXECUTE')
   or not has_function_privilege('authenticated', target, 'EXECUTE') then
   raise exception 'Detail RPC role grants missing';
 end if;
 if exists (
   select 1 from pg_catalog.pg_proc p
   cross join lateral pg_catalog.aclexplode(p.proacl) acl
   where p.oid = target and acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
 ) then raise exception 'Detail RPC remains executable by PUBLIC'; end if;
end $$;

insert into public.sources(id,title,organization,url,accessed_on) values
 ('30000000-0000-4000-8000-000000000010','Detail source A','Fixture','https://example.org/da',current_date),
 ('30000000-0000-4000-8000-000000000011','Detail source B','Fixture','https://example.org/db',current_date),
 ('30000000-0000-4000-8000-000000000012','Detail source C','Fixture','https://example.org/dc',current_date);
insert into public.species(id,slug,scientific_name,taxon_group,region_codes,habitat_codes,featured_rank,updated_at,status,kingdom,"order") values
 ('30000000-0000-4000-8000-000000000001','detail-alpha','DetailFixture Alpha','fixture-mammal',array['fixture-region'],array['fixture-forest'],1,'2026-02-01T00:00:00Z','draft','Animalia','Marsupialia'),
 ('30000000-0000-4000-8000-000000000002','detail-draft','DetailFixture Draft','fixture-bird',array['fixture-region'],array['fixture-forest'],null,'2026-02-02T00:00:00Z','draft',null,null),
 ('30000000-0000-4000-8000-000000000003','detail-nosource','DetailFixture NoSource','fixture-bird',array['fixture-region'],array['fixture-forest'],null,'2026-02-03T00:00:00Z','draft',null,null),
 ('30000000-0000-4000-8000-000000000004','detail-null-taxonomy','DetailFixture Null','fixture-plant',array['fixture-region'],array['fixture-forest'],null,'2026-02-04T00:00:00Z','draft',null,null);
insert into public.species_translations(species_id,locale,common_name,summary,description,distinctive_traits,habitat_description,threats_description,conservation_actions,seo_title,seo_description,translation_status) values
 ('30000000-0000-4000-8000-000000000001','id','Detail fixture','s','d','t','h','th','a','seo','desc','published'),
 ('30000000-0000-4000-8000-000000000002','id','Detail draft','s','d','t','h','th','a',null,null,'published'),
 ('30000000-0000-4000-8000-000000000003','id','Detail orphan','s','d','t','h','th','a',null,null,'published'),
 ('30000000-0000-4000-8000-000000000004','id','Detail null taxonomy','s','d','t','h','th','a',null,null,'published');
insert into public.species_sources(species_id,source_id,section_key) values
 ('30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000010','summary'),
 ('30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000011','description'),
 ('30000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000010','summary'),
 ('30000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000012','summary');
insert into public.conservation_assessments(species_id,status_code,assessment_year,assessment_scope,source_id,is_current) values
 ('30000000-0000-4000-8000-000000000001','EN',2025,'fixture','30000000-0000-4000-8000-000000000010',true);
insert into public.species_media(species_id,url,alt_id,attribution_text,photographer,source_url,license_code,sort_order,approved) values
 ('30000000-0000-4000-8000-000000000001','https://example.org/a.jpg','Alt A','Fixture A','Fixture Photographer','https://example.org/source-a','CC0',2,true),
 ('30000000-0000-4000-8000-000000000001','https://example.org/b.jpg','Alt B','Fixture B','Fixture Photographer','https://example.org/source-b','CC0',1,true),
 ('30000000-0000-4000-8000-000000000001','https://example.org/c.jpg','Alt C','Fixture C','Fixture Photographer','https://example.org/source-c','CC0',0,false);
begin;
update public.species set status='published' where slug = 'detail-alpha';
update public.species set status='published' where slug='detail-null-taxonomy';
commit;

do $$
declare r jsonb;
begin
 -- 1. published species with sources returns the full bundle.
 r := public.get_published_species_detail('detail-alpha');
 if r is null then raise exception 'Detail bundle missing for published species'; end if;
 if r#>>'{species,slug}' <> 'detail-alpha' then raise exception 'Detail slug mismatch'; end if;
 if r#>>'{species,featured_rank}' <> '1' then raise exception 'Detail omitted featured_rank'; end if;
 if jsonb_array_length(r->'translations') <> 1 then raise exception 'Detail translation count wrong'; end if;
 if r#>>'{assessment,status_code}' <> 'EN' then raise exception 'Detail assessment missing'; end if;
 if r#>>'{species,kingdom}' <> 'Animalia'
   or r#>>'{species,order}' <> 'Marsupialia' then
   raise exception 'Detail RPC taxonomy values missing';
 end if;

 -- 2. Unapproved media must not leak; approved media ordered by sort_order.
 if jsonb_array_length(r->'media') <> 2 then raise exception 'Detail media leaked unapproved rows'; end if;
 if r#>>'{media,0,url}' <> 'https://example.org/b.jpg' then raise exception 'Detail media sort order wrong'; end if;

 -- 3. Sources span section links AND the assessment source, deduplicated.
 if jsonb_array_length(r->'sources') <> 2 then raise exception 'Detail sources not deduplicated by provenance'; end if;
 if jsonb_array_length(r->'links') <> 2 then raise exception 'Detail source links missing'; end if;

 -- 4. Draft species is invisible even though its translation is published.
 if public.get_published_species_detail('detail-draft') is not null then
   raise exception 'Detail RPC exposed a draft species';
 end if;

 -- 5. A species with no source link cannot be published at all (the deferred
 -- publication trigger enforces it), so it must never surface here.
 if public.get_published_species_detail('detail-nosource') is not null then
   raise exception 'Detail RPC exposed a species with no provenance';
 end if;

 -- 6. Unknown and malformed slugs return null / raise, never leak.
 if public.get_published_species_detail('no-such-slug') is not null then
   raise exception 'Detail RPC returned a bundle for an unknown slug';
 end if;
 -- Nullable taxonomy stays null rather than being inferred.
 r := public.get_published_species_detail('detail-null-taxonomy');
 if r#>'{species,kingdom}' <> 'null'::jsonb
   or r#>'{species,order}' <> 'null'::jsonb then
   raise exception 'Detail RPC did not preserve null taxonomy';
 end if;
end $$;

select public.test_detail_denied($q$select public.get_published_species_detail('')$q$, '22023');
select public.test_detail_denied($q$select public.get_published_species_detail(null)$q$, '22023');
select public.test_detail_denied($q$select public.get_published_species_detail(repeat('x',201))$q$, '22023');

reset role;
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$ declare r jsonb; begin
 r := public.get_published_species_detail('detail-alpha');
 if r is null then raise exception 'Authenticated detail read failed'; end if;
 if public.get_published_species_detail('detail-draft') is not null then
   raise exception 'Authenticated detail read escaped published filter';
 end if;
end $$;
reset role;
set request.jwt.claim.sub='';

delete from public.species where slug like 'detail-%';
delete from public.sources where id in (
 '30000000-0000-4000-8000-000000000010',
 '30000000-0000-4000-8000-000000000011',
 '30000000-0000-4000-8000-000000000012'
);
