import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assessmentRowSchema,
  completeSpeciesTranslationSchema,
  localeSchema,
  mediaRowSchema,
  resolveContentLocale,
  sourceRowSchema,
  speciesDetailSchema,
  speciesRowSchema,
  speciesSourceRowSchema,
  speciesTranslationRowSchema,
  type Locale,
  type SpeciesDetail,
  speciesCatalogResponseSchema,
  speciesCatalogOptionsSchema,
  type SpeciesCatalogOptions,
  type SpeciesCatalogPage,
  type SpeciesRow,
  type SpeciesTranslationRow,
  type AssessmentRow,
  type MediaRow,
  type SpeciesSourceRow,
  type SourceRow,
} from "./schemas";

type SpeciesQueryOptions = {
  slug: string;
  locale: Locale;
};

function assembleSpeciesDetail({
  species,
  locale,
  translations,
  assessment,
  media,
  links,
  sources,
}: {
  species: SpeciesRow;
  locale: Locale;
  translations: SpeciesTranslationRow[];
  assessment: AssessmentRow | null;
  media: MediaRow[];
  links: SpeciesSourceRow[];
  sources: SourceRow[];
}): SpeciesDetail | null {
  if (translations.some((row) => row.species_id !== species.id))
    throw new Error("Translation belongs to another species");
  if (
    new Set(translations.map((row) => row.locale)).size !== translations.length
  )
    throw new Error("Duplicate published translation locale");
  const indonesian = completeSpeciesTranslationSchema.safeParse(
    translations.find((row) => row.locale === "id"),
  );
  if (!indonesian.success) return null;
  const english = completeSpeciesTranslationSchema.safeParse(
    translations.find((row) => row.locale === "en"),
  );
  if (assessment && assessment.species_id !== species.id)
    throw new Error("Assessment belongs to another species");
  if (media.some((row) => row.species_id !== species.id))
    throw new Error("Media belongs to another species");
  if (new Set(media.map((row) => row.id)).size !== media.length)
    throw new Error("Duplicate approved media row");
  if (links.some((row) => row.species_id !== species.id))
    throw new Error("Source link belongs to another species");
  if (
    new Set(
      links.map((row) =>
        JSON.stringify([row.species_id, row.source_id, row.section_key]),
      ),
    ).size !== links.length
  )
    throw new Error("Duplicate species source link");
  const sourceIds = new Set(links.map((link) => link.source_id));
  if (assessment) sourceIds.add(assessment.source_id);
  if (
    links.length === 0 ||
    sources.length !== sourceIds.size ||
    sources.some((row) => !sourceIds.has(row.id)) ||
    new Set(sources.map((row) => row.id)).size !== sourceIds.size
  )
    throw new Error("Published source provenance is missing or inconsistent");
  const completeLocales = new Set<Locale>(["id"]);
  if (english.success && media.every((row) => row.alt_en?.trim()))
    completeLocales.add("en");
  const resolved = resolveContentLocale(locale, completeLocales);
  const translation =
    resolved.locale === "en" && english.success
      ? english.data
      : indonesian.data;
  return speciesDetailSchema.parse({
    id: species.id,
    slug: species.slug,
    scientificName: species.scientific_name,
    taxonGroup: species.taxon_group,
    taxonRank: species.taxon_rank,
    family: species.family,
    genus: species.genus,
    gbifTaxonKey: species.gbif_taxon_key,
    iucnTaxonId: species.iucn_taxon_id,
    regionCodes: species.region_codes,
    habitatCodes: species.habitat_codes,
    requestedLocale: locale,
    ...resolved,
    commonName: translation.common_name,
    summary: translation.summary,
    description: translation.description,
    distinctiveTraits: translation.distinctive_traits,
    habitatDescription: translation.habitat_description,
    threatsDescription: translation.threats_description,
    conservationActions: translation.conservation_actions,
    seoTitle: translation.seo_title,
    seoDescription: translation.seo_description,
    status: assessment?.status_code ?? null,
    assessmentYear: assessment?.assessment_year ?? null,
    assessmentScope: assessment?.assessment_scope ?? null,
    assessedOn: assessment?.assessed_on ?? null,
    assessmentSourceId: assessment?.source_id ?? null,
    assessmentNotes: assessment?.notes ?? null,
    populationEstimateMin: assessment?.population_estimate_min ?? null,
    populationEstimateMax: assessment?.population_estimate_max ?? null,
    populationUnit: assessment?.population_unit ?? null,
    populationTrend: assessment?.population_trend ?? null,
    media: media.map((row) => ({
      id: row.id,
      url: row.url,
      storagePath: row.storage_path,
      alt: resolved.locale === "en" ? row.alt_en : row.alt_id,
      photographer: row.photographer,
      sourceUrl: row.source_url,
      license: row.license_code,
      licenseUrl: row.license_url,
      attributionText: row.attribution_text,
      positionX: row.position_x,
      positionY: row.position_y,
    })),
    sources: sources.map((row) => ({
      id: row.id,
      title: row.title,
      url: row.url,
      organization: row.organization,
      publishedOn: row.published_on,
      accessedOn: row.accessed_on,
      license: row.license,
      notes: row.notes,
      sectionKeys: links
        .filter((link) => link.source_id === row.id)
        .map((link) => link.section_key),
    })),
  });
}

// Published-only read; incomplete English (including alt text) falls back as a unit.
export async function getPublishedSpeciesDetail(
  client: SupabaseClient,
  options: SpeciesQueryOptions,
): Promise<SpeciesDetail | null> {
  const locale = localeSchema.parse(options.locale);
  const slug = speciesRowSchema.shape.slug.parse(options.slug);
  const speciesResult = await client
    .from("species")
    .select(
      "id,slug,scientific_name,taxon_group,taxon_rank,family,genus,gbif_taxon_key,iucn_taxon_id,region_codes,habitat_codes,featured_rank,status",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (speciesResult.error) throw speciesResult.error;
  if (!speciesResult.data) return null;
  const species = speciesRowSchema.parse(speciesResult.data);

  const translationsResult = await client
    .from("species_translations")
    .select(
      "species_id,locale,common_name,summary,description,distinctive_traits,habitat_description,threats_description,conservation_actions,seo_title,seo_description,translation_status",
    )
    .eq("species_id", species.id)
    .eq("translation_status", "published");
  if (translationsResult.error) throw translationsResult.error;
  const translations = speciesTranslationRowSchema
    .array()
    .parse(translationsResult.data);
  if (translations.some((row) => row.species_id !== species.id)) {
    throw new Error("Translation belongs to another species");
  }
  if (
    new Set(translations.map((row) => row.locale)).size !== translations.length
  ) {
    throw new Error("Duplicate published translation locale");
  }
  const indonesian = completeSpeciesTranslationSchema.safeParse(
    translations.find((row) => row.locale === "id"),
  );
  if (!indonesian.success) return null;

  const assessmentResult = await client
    .from("conservation_assessments")
    .select(
      "species_id,status_code,assessment_year,assessment_scope,assessed_on,source_id,population_estimate_min,population_estimate_max,population_unit,population_trend,notes,is_current",
    )
    .eq("species_id", species.id)
    .eq("is_current", true)
    .maybeSingle();
  if (assessmentResult.error) throw assessmentResult.error;
  const assessment = assessmentResult.data
    ? assessmentRowSchema.parse(assessmentResult.data)
    : null;
  if (assessment && assessment.species_id !== species.id) {
    throw new Error("Assessment belongs to another species");
  }

  const mediaResult = await client
    .from("species_media")
    .select(
      "id,species_id,url,storage_path,alt_id,alt_en,photographer,source_url,license_code,license_url,attribution_text,position_x,position_y,approved,sort_order",
    )
    .eq("species_id", species.id)
    .eq("approved", true)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  if (mediaResult.error) throw mediaResult.error;
  const mediaRows = mediaRowSchema.array().parse(mediaResult.data);
  if (mediaRows.some((row) => row.species_id !== species.id)) {
    throw new Error("Media belongs to another species");
  }

  const linksResult = await client
    .from("species_sources")
    .select("species_id,source_id,section_key")
    .eq("species_id", species.id);
  if (linksResult.error) throw linksResult.error;
  const links = speciesSourceRowSchema.array().min(1).parse(linksResult.data);
  if (links.some((row) => row.species_id !== species.id)) {
    throw new Error("Source link belongs to another species");
  }
  const sourceIds = new Set(links.map((link) => link.source_id));
  if (assessment) sourceIds.add(assessment.source_id);
  const sourcesResult = await client
    .from("sources")
    .select("id,organization,title,url,published_on,accessed_on,license,notes")
    .in("id", [...sourceIds])
    .order("id", { ascending: true });
  if (sourcesResult.error) throw sourcesResult.error;
  const sources = sourceRowSchema.array().parse(sourcesResult.data);
  if (
    sources.length !== sourceIds.size ||
    sources.some((row) => !sourceIds.has(row.id)) ||
    new Set(sources.map((row) => row.id)).size !== sourceIds.size
  ) {
    throw new Error("Published source provenance is missing or inconsistent");
  }

  return assembleSpeciesDetail({
    species,
    locale,
    translations,
    assessment,
    media: mediaRows,
    links,
    sources,
  });
}

export async function getPublishedSpeciesCatalog(
  client: SupabaseClient,
  input: SpeciesCatalogOptions,
): Promise<SpeciesCatalogPage> {
  const options = speciesCatalogOptionsSchema.parse(input);
  const { data, error } = await client.rpc("search_published_species", {
    p_query: options.query,
    p_status: options.status,
    p_threatened: options.threatened,
    p_taxon: options.taxon,
    p_region: options.region,
    p_habitat: options.habitat,
    p_sort: options.sort,
    p_page: options.page,
    p_page_size: options.pageSize,
  });
  if (error) throw error;
  const response = speciesCatalogResponseSchema.parse(data);
  if (
    response.page !== options.page ||
    response.pageSize !== options.pageSize ||
    response.rows.length !==
      Math.min(
        options.pageSize,
        Math.max(0, response.total - (options.page - 1) * options.pageSize),
      )
  )
    throw new Error("Catalog page metadata does not match its rows");
  const ids = new Set<string>();
  const items = response.rows.map((bundle) => {
    if (ids.has(bundle.species.id))
      throw new Error("Duplicate species in catalog page");
    ids.add(bundle.species.id);
    if (Date.parse(bundle.updatedAt) !== Date.parse(bundle.species.updated_at))
      throw new Error("Catalog update timestamp is inconsistent");
    const detail = assembleSpeciesDetail({
      species: bundle.species,
      locale: options.locale,
      translations: bundle.translations,
      assessment: bundle.assessment,
      media: bundle.media,
      links: bundle.links,
      sources: bundle.sources,
    });
    if (!detail)
      throw new Error(
        "Eligible catalog species has incomplete Indonesian content",
      );
    return detail;
  });
  return {
    items,
    total: response.total,
    page: response.page,
    pageSize: 12,
    facets: response.facets,
  };
}
