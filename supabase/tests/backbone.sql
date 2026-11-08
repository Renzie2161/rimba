-- Synthetic fixtures only; disposable local DB, never hosted or production data.
create function public.test_denied(statement text, expected_state text) returns void
language plpgsql as $$
begin
  begin
    execute statement;
  exception when others then
    if sqlstate = expected_state then return; end if;
    raise;
  end;
  raise exception 'Expected % but statement succeeded: %', expected_state, statement;
end;
$$;
grant execute on function public.test_denied(text,text) to anon, authenticated;

insert into auth.users values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');
insert into public.profiles(user_id,role) values
 ('00000000-0000-0000-0000-000000000001','curator'),
 ('00000000-0000-0000-0000-000000000002','admin');
insert into public.species(id,slug,scientific_name,taxon_group) values
 ('10000000-0000-0000-0000-000000000001','published-fixture','Fixture published','fixture'),
 ('10000000-0000-0000-0000-000000000002','draft-fixture','Fixture draft','fixture');
insert into public.sources(id,title,organization,url,accessed_on) values
 ('20000000-0000-0000-0000-000000000001','Fixture reference','Fixture','https://example.org/public',current_date),
 ('20000000-0000-0000-0000-000000000002','Draft reference','Fixture','https://example.org/draft',current_date);
begin;
insert into public.species_translations(species_id,locale,common_name,summary,description,distinctive_traits,habitat_description,threats_description,conservation_actions,translation_status)
values ('10000000-0000-0000-0000-000000000001','id','Fixture','Fixture summary','Fixture description','Fixture traits','Fixture habitat','Fixture threats','Fixture actions','published');
insert into public.species_sources values ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','',now());
insert into public.species_sources values ('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','',now());
update public.species set status='published' where slug='published-fixture';
commit;

set role anon;
do $$ begin
 if (select count(*) from public.species) <> 1 then raise exception 'Draft species leaked'; end if;
 if (select count(*) from public.species_translations) <> 1 then raise exception 'Translation visibility wrong'; end if;
 if (select count(*) from public.sources) <> 1 then raise exception 'Draft source leaked'; end if;
end $$;
select public.test_denied($q$insert into public.species(slug,scientific_name,taxon_group) values ('anon','Fixture','fixture')$q$, '42501');
reset role;

set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
insert into public.species_translations(species_id,locale,summary) values ('10000000-0000-0000-0000-000000000002','id','Curator draft');
select public.test_denied($q$insert into public.species_translations(species_id,locale,summary) values ('10000000-0000-0000-0000-000000000001','en','Forbidden')$q$, '42501');
select public.test_denied($q$update public.species_translations set species_id='10000000-0000-0000-0000-000000000001' where species_id='10000000-0000-0000-0000-000000000002'$q$, '42501');
select public.test_denied($q$update public.species set status='published' where slug='draft-fixture'$q$, '42501');
select public.test_denied($q$insert into public.campaigns(slug) values ('forbidden-campaign')$q$, '42501');
select public.test_denied($q$insert into public.species_media(species_id,url) values ('10000000-0000-0000-0000-000000000001','https://example.org/image')$q$, '42501');
select public.test_denied($q$insert into public.profiles(user_id,role) values ('00000000-0000-0000-0000-000000000003','admin')$q$, '42501');
-- RLS can silently filter UPDATE: assert original published source survived.
update public.sources set title='Forbidden edit' where id='20000000-0000-0000-0000-000000000001';
do $$ begin
 if not exists (select 1 from public.sources where id='20000000-0000-0000-0000-000000000001' and title='Fixture reference') then raise exception 'Shared source was edited'; end if;
end $$;
reset role;
set request.jwt.claim.sub='';

-- Deferred constraints are forced inside a subtransaction to check rejection.
create function public.test_publication_rejected(statement text) returns void language plpgsql as $$
begin
 begin
  execute statement;
  set constraints all immediate;
 exception when check_violation then return;
 end;
 raise exception 'Incomplete publication accepted';
end $$;
select public.test_publication_rejected($q$update public.species set status='published' where slug='draft-fixture'$q$);
select public.test_publication_rejected($q$delete from public.species_sources where species_id='10000000-0000-0000-0000-000000000001'$q$);
select public.test_publication_rejected($q$update public.species_translations set summary='' where species_id='10000000-0000-0000-0000-000000000001'$q$);
select public.test_denied($q$insert into public.species_media(species_id,url,approved) values ('10000000-0000-0000-0000-000000000001','https://example.org/image',true)$q$, '23514');
select public.test_denied($q$insert into public.conservation_assessments(species_id,status_code) values ('10000000-0000-0000-0000-000000000001','CR')$q$, '23502');

set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
insert into public.campaigns(slug) values ('admin-campaign');
insert into public.species_media(species_id,url,source_url,alt_id,photographer,license_code,attribution_text,approved)
 values ('10000000-0000-0000-0000-000000000001','https://example.org/image','https://example.org/source','Fixture','Fixture author','CC-BY-4.0','Fixture credit',true);
reset role;
set request.jwt.claim.sub='';
set role anon;
do $$ begin
 if (select count(*) from public.species_media) <> 1 then raise exception 'Approved media visibility wrong'; end if;
 if (select count(*) from public.campaigns) <> 0 then raise exception 'Draft campaign leaked'; end if;
end $$;
reset role;
select 'PASS: anon visibility, curator draft-only permissions, admin capabilities, publication and attribution constraints';
