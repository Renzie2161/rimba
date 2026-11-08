-- Bounded, published-only catalog search. Local migration only; hosted apply is separate.
create extension if not exists unaccent with schema public;

create or replace function public.search_published_species(
  p_query text,
  p_status text,
  p_threatened boolean,
  p_taxon text,
  p_region text,
  p_habitat text,
  p_sort text,
  p_page integer,
  p_page_size integer
) returns jsonb
language plpgsql stable security invoker
set search_path = ''
as $function$
declare
  v_query text;
  v_offset bigint;
  v_result jsonb;
begin
  if p_query is null or char_length(p_query) > 100
    or p_threatened is null or p_sort is null
    or p_page is null or p_page_size is null
    or p_sort not in ('name', 'updated')
    or p_page not between 1 and 1000000
    or p_page_size not between 1 and 12
    or (p_status is not null and p_status not in ('EX','EW','CR','EN','VU','NT','LC','DD','NE'))
    or (p_status is not null and p_threatened)
    or (p_taxon is not null and (btrim(p_taxon) = '' or char_length(p_taxon) > 100))
    or (p_region is not null and (btrim(p_region) = '' or char_length(p_region) > 100))
    or (p_habitat is not null and (btrim(p_habitat) = '' or char_length(p_habitat) > 100)) then
    raise exception 'Invalid catalog search arguments' using errcode = '22023';
  end if;
  v_offset := (p_page::bigint - 1) * p_page_size;
  v_query := lower(public.unaccent('public.unaccent'::regdictionary, btrim(p_query)));

  with whitespace as (
    select U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF' as chars
  ),
  eligible as (
    select s.*, t.common_name,
      a.status_code as assessment_status,
      lower(public.unaccent('public.unaccent'::regdictionary, t.common_name)) as sort_name
    from public.species s
    cross join whitespace w
    join public.species_translations t on t.species_id = s.id
      and t.locale = 'id' and t.translation_status = 'published'
      and nullif(btrim(t.common_name, w.chars), '') is not null
      and nullif(btrim(t.summary, w.chars), '') is not null
      and nullif(btrim(t.description, w.chars), '') is not null
      and nullif(btrim(t.distinctive_traits, w.chars), '') is not null
      and nullif(btrim(t.habitat_description, w.chars), '') is not null
      and nullif(btrim(t.threats_description, w.chars), '') is not null
      and nullif(btrim(t.conservation_actions, w.chars), '') is not null
    left join public.conservation_assessments a on a.species_id = s.id and a.is_current
    where s.status = 'published'
      and exists (select 1 from public.species_sources ss where ss.species_id = s.id)
  ),
  matches as (
    select e.* from eligible e
    where (p_status is null or e.assessment_status = p_status)
      and (not p_threatened or e.assessment_status in ('CR','EN','VU'))
      and (p_taxon is null or e.taxon_group = p_taxon)
      and (p_region is null or p_region = any(e.region_codes))
      and (p_habitat is null or p_habitat = any(e.habitat_codes))
      and (v_query = '' or
        strpos(lower(public.unaccent('public.unaccent'::regdictionary, e.scientific_name)), v_query) > 0 or
        strpos(lower(public.unaccent('public.unaccent'::regdictionary, e.common_name)), v_query) > 0 or
        exists (
          select 1 from public.species_translations et
          where et.species_id = e.id and et.translation_status = 'published'
            and strpos(lower(public.unaccent('public.unaccent'::regdictionary, coalesce(et.common_name,''))), v_query) > 0
        ) or exists (
          select 1 from public.species_aliases sa
          where sa.species_id = e.id
            and strpos(lower(public.unaccent('public.unaccent'::regdictionary, sa.name)), v_query) > 0
        ))
  ),

  page_rows as (
    select m.*,
      jsonb_build_object(
        'species', jsonb_build_object(
          'id', m.id, 'slug', m.slug, 'scientific_name', m.scientific_name,
          'taxon_group', m.taxon_group, 'taxon_rank', m.taxon_rank,
          'family', m.family, 'genus', m.genus, 'gbif_taxon_key', m.gbif_taxon_key,
          'iucn_taxon_id', m.iucn_taxon_id, 'region_codes', m.region_codes,
          'habitat_codes', m.habitat_codes, 'featured_rank', m.featured_rank,
          'status', m.status, 'updated_at', m.updated_at
        ),
        'translations', coalesce((select jsonb_agg(jsonb_build_object(
          'species_id', t.species_id, 'locale', t.locale, 'common_name', t.common_name,
          'summary', t.summary, 'description', t.description,
          'distinctive_traits', t.distinctive_traits, 'habitat_description', t.habitat_description,
          'threats_description', t.threats_description, 'conservation_actions', t.conservation_actions,
          'seo_title', t.seo_title, 'seo_description', t.seo_description,
          'translation_status', t.translation_status
        ) order by t.locale) from public.species_translations t where t.species_id=m.id and t.translation_status='published'), '[]'::jsonb),
        'assessment', (select jsonb_build_object(
          'species_id', a.species_id, 'status_code', a.status_code,
          'assessment_year', a.assessment_year, 'assessment_scope', a.assessment_scope,
          'assessed_on', a.assessed_on, 'source_id', a.source_id,
          'population_estimate_min', a.population_estimate_min,
          'population_estimate_max', a.population_estimate_max,
          'population_unit', a.population_unit, 'population_trend', a.population_trend,
          'notes', a.notes, 'is_current', a.is_current
        ) from public.conservation_assessments a where a.species_id=m.id and a.is_current),
        'media', coalesce((select jsonb_agg(jsonb_build_object(
          'id', x.id, 'species_id', x.species_id, 'url', x.url,
          'storage_path', x.storage_path, 'alt_id', x.alt_id, 'alt_en', x.alt_en,
          'photographer', x.photographer, 'source_url', x.source_url,
          'license_code', x.license_code, 'license_url', x.license_url,
          'attribution_text', x.attribution_text, 'position_x', x.position_x,
          'position_y', x.position_y, 'approved', x.approved, 'sort_order', x.sort_order
        ) order by x.sort_order,x.id) from public.species_media x where x.species_id=m.id and x.approved), '[]'::jsonb),
        'links', coalesce((select jsonb_agg(jsonb_build_object(
          'species_id', l.species_id, 'source_id', l.source_id, 'section_key', l.section_key
        ) order by l.source_id,l.section_key) from public.species_sources l where l.species_id=m.id), '[]'::jsonb),
        'sources', coalesce((select jsonb_agg(jsonb_build_object(
          'id', src.id, 'organization', src.organization, 'title', src.title,
          'url', src.url, 'published_on', src.published_on, 'accessed_on', src.accessed_on,
          'license', src.license, 'notes', src.notes
        ) order by src.id) from public.sources src where exists (select 1 from public.species_sources l where l.species_id=m.id and l.source_id=src.id) or exists (select 1 from public.conservation_assessments a where a.species_id=m.id and a.is_current and a.source_id=src.id)), '[]'::jsonb),
        'updatedAt', m.updated_at
      ) as bundle
    from matches m
    order by case when p_sort='name' then m.sort_name end asc nulls last,
      case when p_sort='updated' then m.updated_at end desc nulls last, m.slug asc
    limit p_page_size offset v_offset
  ),
  facets as (
    select jsonb_build_object(
      'statuses', coalesce((select jsonb_agg(x order by x) from (select distinct assessment_status x from eligible where assessment_status is not null) q), '[]'::jsonb),
      'taxonGroups', coalesce((select jsonb_agg(x order by x) from (select distinct taxon_group x from eligible) q), '[]'::jsonb),
      'regions', coalesce((select jsonb_agg(x order by x) from (select distinct unnest(region_codes) x from eligible) q), '[]'::jsonb),
      'habitats', coalesce((select jsonb_agg(x order by x) from (select distinct unnest(habitat_codes) x from eligible) q), '[]'::jsonb)
    ) as value
  )
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(bundle) from page_rows), '[]'::jsonb),
    'total', (select count(*) from matches),
    'page', p_page,
    'pageSize', p_page_size,
    'facets', facets.value
  ) into v_result from facets;
  return v_result;
end;
$function$;

revoke all on function public.search_published_species(text,text,boolean,text,text,text,text,integer,integer) from public;
grant execute on function public.search_published_species(text,text,boolean,text,text,text,text,integer,integer) to anon, authenticated;
