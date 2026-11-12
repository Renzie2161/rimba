-- Count only IUCN-threatened species in the journal metric; invasive status is ecological, not extinction risk.

create or replace function public.get_featured_species(
  p_limit integer
) returns jsonb
language plpgsql stable security invoker
set search_path = ''
as $function$
declare
  v_result jsonb;
begin
  if p_limit is null or p_limit not between 1 and 24 then
    raise exception 'Invalid featured limit' using errcode = '22023';
  end if;

  with eligible as (
    select s.*, t.common_name
    from public.species s
    join public.species_translations t on t.species_id = s.id
      and t.locale = 'id' and t.translation_status = 'published'
      and nullif(btrim(t.common_name), '') is not null
      and nullif(btrim(t.summary), '') is not null
      and nullif(btrim(t.description), '') is not null
      and nullif(btrim(t.distinctive_traits), '') is not null
      and nullif(btrim(t.habitat_description), '') is not null
      and nullif(btrim(t.threats_description), '') is not null
      and nullif(btrim(t.conservation_actions), '') is not null
    where s.status = 'published'
      and exists (select 1 from public.species_sources ss where ss.species_id = s.id)
  ),
  page_rows as (
    select
      row_number() over (
        order by e.featured_rank nulls last, e.updated_at desc, e.slug asc
      ) as position,
      jsonb_build_object(
        'species', jsonb_build_object(
          'id', e.id, 'slug', e.slug, 'scientific_name', e.scientific_name,
          'taxon_group', e.taxon_group, 'taxon_rank', e.taxon_rank,
          'family', e.family, 'genus', e.genus, 'gbif_taxon_key', e.gbif_taxon_key,
          'iucn_taxon_id', e.iucn_taxon_id, 'region_codes', e.region_codes,
          'habitat_codes', e.habitat_codes, 'featured_rank', e.featured_rank,
          'invasive_status', e.invasive_status,
          'status', e.status, 'updated_at', e.updated_at
        ),
        'translations', coalesce((select jsonb_agg(jsonb_build_object(
          'species_id', t.species_id, 'locale', t.locale, 'common_name', t.common_name,
          'summary', t.summary, 'description', t.description,
          'distinctive_traits', t.distinctive_traits, 'habitat_description', t.habitat_description,
          'threats_description', t.threats_description, 'conservation_actions', t.conservation_actions,
          'seo_title', t.seo_title, 'seo_description', t.seo_description,
          'translation_status', t.translation_status
        ) order by t.locale) from public.species_translations t
          where t.species_id = e.id and t.translation_status = 'published'), '[]'::jsonb),
        'assessment', (select jsonb_build_object(
          'species_id', a.species_id, 'status_code', a.status_code,
          'assessment_year', a.assessment_year, 'assessment_scope', a.assessment_scope,
          'assessed_on', a.assessed_on, 'source_id', a.source_id,
          'population_estimate_min', a.population_estimate_min,
          'population_estimate_max', a.population_estimate_max,
          'population_unit', a.population_unit, 'population_trend', a.population_trend,
          'notes', a.notes, 'is_current', a.is_current
        ) from public.conservation_assessments a
          where a.species_id = e.id and a.is_current),
        'media', coalesce((select jsonb_agg(jsonb_build_object(
          'id', x.id, 'species_id', x.species_id, 'url', x.url,
          'storage_path', x.storage_path, 'alt_id', x.alt_id, 'alt_en', x.alt_en,
          'photographer', x.photographer, 'source_url', x.source_url,
          'license_code', x.license_code, 'license_url', x.license_url,
          'attribution_text', x.attribution_text, 'position_x', x.position_x,
          'position_y', x.position_y, 'approved', x.approved, 'sort_order', x.sort_order
        ) order by x.sort_order, x.id) from public.species_media x
          where x.species_id = e.id and x.approved), '[]'::jsonb),
        'links', coalesce((select jsonb_agg(jsonb_build_object(
          'species_id', l.species_id, 'source_id', l.source_id, 'section_key', l.section_key
        ) order by l.source_id, l.section_key) from public.species_sources l
          where l.species_id = e.id), '[]'::jsonb),
        'sources', coalesce((select jsonb_agg(jsonb_build_object(
          'id', src.id, 'organization', src.organization, 'title', src.title,
          'url', src.url, 'published_on', src.published_on, 'accessed_on', src.accessed_on,
          'license', src.license, 'notes', src.notes
        ) order by src.id) from public.sources src
          where exists (
            select 1 from public.species_sources l
            where l.species_id = e.id and l.source_id = src.id
          ) or exists (
            select 1 from public.conservation_assessments a
            where a.species_id = e.id and a.is_current and a.source_id = src.id
          ) or src.id in (
            e.invasive_source_id, e.ecological_source_id,
            e.regulation_source_id, e.ecosystem_source_id
          )), '[]'::jsonb),
        'updatedAt', e.updated_at
      ) as bundle
    from eligible e
    order by e.featured_rank nulls last, e.updated_at desc, e.slug asc
    limit p_limit
  )
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(bundle order by position) from page_rows), '[]'::jsonb),
    'summary', jsonb_build_object(
      'total', (select count(*) from eligible),
      'flora', (
        select count(*) from eligible
        where lower(taxon_group) in ('plant', 'flora', 'tree', 'shrub', 'herb', 'fern')
      ),
      'fauna', (
        select count(*) from eligible
        where lower(taxon_group) not in ('plant', 'flora', 'tree', 'shrub', 'herb', 'fern')
      ),
      'attention', (
        select count(*) from eligible e
        where exists (
          select 1 from public.conservation_assessments a
          where a.species_id = e.id and a.is_current
            and a.status_code in ('CR', 'EN', 'VU')
        )
      )
    )
  ) into v_result;

  return v_result;
end;
$function$;

revoke all on function public.get_featured_species(integer) from public;
grant execute on function public.get_featured_species(integer) to anon, authenticated;
