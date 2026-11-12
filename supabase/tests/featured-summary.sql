-- The journal count covers published IUCN-threatened species, not invasives or drafts.
begin;
do $$
declare
  target_id uuid;
  source_id uuid;
begin
  select s.id, ss.source_id into strict target_id, source_id
  from public.species s
  join public.species_sources ss on ss.species_id = s.id
  where s.slug = 'maleo' and s.status = 'published'
  order by ss.source_id
  limit 1;

  update public.conservation_assessments
  set status_code = 'LC'
  where species_id = target_id and is_current;
  if not found then
    raise exception 'Published Maleo fixture has no current assessment';
  end if;

  update public.species
  set invasive_status = 'invasive', invasive_source_id = source_id
  where id = target_id;
end $$;

do $$
declare
  response jsonb;
  expected bigint;
begin
  select count(*) into expected
  from public.species s
  where s.status = 'published'
    and exists (
      select 1 from public.species_sources ss where ss.species_id = s.id
    )
    and exists (
      select 1 from public.species_translations t
      where t.species_id = s.id and t.locale = 'id'
        and t.translation_status = 'published'
        and nullif(btrim(t.common_name), '') is not null
        and nullif(btrim(t.summary), '') is not null
        and nullif(btrim(t.description), '') is not null
        and nullif(btrim(t.distinctive_traits), '') is not null
        and nullif(btrim(t.habitat_description), '') is not null
        and nullif(btrim(t.threats_description), '') is not null
        and nullif(btrim(t.conservation_actions), '') is not null
    )
    and exists (
      select 1 from public.conservation_assessments a
      where a.species_id = s.id and a.is_current
        and a.status_code in ('CR', 'EN', 'VU')
    );

  response := public.get_featured_species(1);
  if (response->'summary'->>'attention')::bigint <> expected then
    raise exception 'Journal metric must count only published IUCN-threatened species';
  end if;
end $$;
rollback;
select 'PASS: journal threatened-species count excludes invasive-only records';
