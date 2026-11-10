-- Keep dossier taxonomy in the existing published detail RPC response.
create or replace function public.get_published_species_detail(
  p_slug text
) returns jsonb
language plpgsql stable security invoker
set search_path = ''
as $function$
declare
  v_result jsonb;
begin
  if p_slug is null or btrim(p_slug) = '' or char_length(p_slug) > 200 then
    raise exception 'Invalid species slug argument' using errcode = '22023';
  end if;

  with eligible as (
    select s.*
    from public.species s
    where s.slug = btrim(p_slug)
      and s.status = 'published'
      and exists (
        select 1
        from public.species_translations t
        where t.species_id = s.id
          and t.locale = 'id'
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
        select 1 from public.species_sources ss where ss.species_id = s.id
      )
  )
  select jsonb_build_object(
    'species', jsonb_build_object(
      'id', m.id, 'slug', m.slug, 'scientific_name', m.scientific_name,
      'taxon_group', m.taxon_group, 'taxon_rank', m.taxon_rank,
      'kingdom', m.kingdom, 'order', m."order",
      'family', m.family, 'genus', m.genus, 'gbif_taxon_key', m.gbif_taxon_key,
      'iucn_taxon_id', m.iucn_taxon_id, 'region_codes', m.region_codes,
      'habitat_codes', m.habitat_codes, 'featured_rank', m.featured_rank,
      'invasive_status', m.invasive_status,
      'indonesia_ecological_status', m.indonesia_ecological_status,
      'regulation_status', m.regulation_status,
      'ecosystem_role', m.ecosystem_role,
      'status', m.status, 'updated_at', m.updated_at
    ),
    'translations', coalesce((select jsonb_agg(jsonb_build_object(
      'species_id', t.species_id, 'locale', t.locale, 'common_name', t.common_name,
      'summary', t.summary, 'description', t.description,
      'distinctive_traits', t.distinctive_traits, 'habitat_description', t.habitat_description,
      'threats_description', t.threats_description, 'conservation_actions', t.conservation_actions,
      'seo_title', t.seo_title, 'seo_description', t.seo_description,
      'translation_status', t.translation_status
    ) order by t.locale) from public.species_translations t
      where t.species_id = m.id and t.translation_status = 'published'), '[]'::jsonb),
    'assessment', (select jsonb_build_object(
      'species_id', a.species_id, 'status_code', a.status_code,
      'assessment_year', a.assessment_year, 'assessment_scope', a.assessment_scope,
      'assessed_on', a.assessed_on, 'source_id', a.source_id,
      'population_estimate_min', a.population_estimate_min,
      'population_estimate_max', a.population_estimate_max,
      'population_unit', a.population_unit, 'population_trend', a.population_trend,
      'notes', a.notes, 'is_current', a.is_current
    ) from public.conservation_assessments a
      where a.species_id = m.id and a.is_current),
    'media', coalesce((select jsonb_agg(jsonb_build_object(
      'id', x.id, 'species_id', x.species_id, 'url', x.url,
      'storage_path', x.storage_path, 'alt_id', x.alt_id, 'alt_en', x.alt_en,
      'photographer', x.photographer, 'source_url', x.source_url,
      'license_code', x.license_code, 'license_url', x.license_url,
      'attribution_text', x.attribution_text, 'position_x', x.position_x,
      'position_y', x.position_y, 'approved', x.approved, 'sort_order', x.sort_order
    ) order by x.sort_order, x.id) from public.species_media x
      where x.species_id = m.id and x.approved), '[]'::jsonb),
    'links', coalesce((select jsonb_agg(jsonb_build_object(
      'species_id', l.species_id, 'source_id', l.source_id, 'section_key', l.section_key
    ) order by l.source_id, l.section_key) from public.species_sources l
      where l.species_id = m.id), '[]'::jsonb),
    'sources', coalesce((select jsonb_agg(jsonb_build_object(
      'id', src.id, 'organization', src.organization, 'title', src.title,
      'url', src.url, 'published_on', src.published_on, 'accessed_on', src.accessed_on,
      'license', src.license, 'notes', src.notes
    ) order by src.id) from public.sources src
      where exists (
        select 1 from public.species_sources l
        where l.species_id = m.id and l.source_id = src.id
      ) or exists (
        select 1 from public.conservation_assessments a
        where a.species_id = m.id and a.is_current and a.source_id = src.id
      ) or src.id in (
        m.invasive_source_id, m.ecological_source_id,
        m.regulation_source_id, m.ecosystem_source_id
      )), '[]'::jsonb),
    'updatedAt', m.updated_at
  ) into v_result
  from eligible m;

  return v_result;
end;
$function$;

revoke all on function public.get_published_species_detail(text) from public;
grant execute on function public.get_published_species_detail(text) to anon, authenticated;
