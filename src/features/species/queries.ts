import type { SupabaseClient } from "@supabase/supabase-js";
import {
  completeSpeciesTranslationSchema,
  localeSchema,
  resolveContentLocale,
  speciesDetailSchema,
  speciesRowSchema,
  type Locale,
  type SpeciesDetail,
  featuredSpeciesResponseSchema,
  speciesCatalogBundleSchema,
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
    kingdom: species.kingdom ?? null,
    taxonOrder: species.order ?? null,
    family: species.family,
    genus: species.genus,
    gbifTaxonKey: species.gbif_taxon_key,
    iucnTaxonId: species.iucn_taxon_id,
    regionCodes: species.region_codes,
    habitatCodes: species.habitat_codes,
    invasiveStatus: species.invasive_status ?? null,
    indonesiaEcologicalStatus: species.indonesia_ecological_status ?? null,
    regulationStatus: species.regulation_status ?? null,
    ecosystemRole: species.ecosystem_role ?? null,
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
  const { data, error } = await client.rpc("get_published_species_detail", {
    p_slug: slug,
  });
  if (error) throw error;
  if (data === null || data === undefined) return null;
  const bundle = speciesCatalogBundleSchema.parse(data);
  if (bundle.species.slug !== slug) {
    throw new Error("Detail bundle returned another species");
  }
  // The deployed detail RPC omits these newer taxonomy columns.
  // Read them once for this published detail, never once per catalog card.
  const { data: taxonomy, error: taxonomyError } = await client
    .from("species")
    .select("kingdom,order")
    .eq("id", bundle.species.id)
    .eq("status", "published")
    .maybeSingle();
  if (taxonomyError) throw taxonomyError;
  if (!taxonomy) return null;
  bundle.species.kingdom = speciesRowSchema.shape.kingdom.parse(
    taxonomy.kingdom,
  );
  bundle.species.order = speciesRowSchema.shape.order.parse(taxonomy.order);
  return assembleSpeciesDetail({
    species: bundle.species,
    locale,
    translations: bundle.translations,
    assessment: bundle.assessment,
    media: bundle.media,
    links: bundle.links,
    sources: bundle.sources,
  });
}

/** Counts across every published species, independent of the carousel limit. */
export type FeaturedSpeciesSummary = {
  total: number;
  flora: number;
  fauna: number;
  attention: number;
};

export type FeaturedSpeciesResult = {
  items: SpeciesDetail[];
  summary: FeaturedSpeciesSummary;
};

export async function getFeaturedSpecies(
  client: SupabaseClient,
  input: { locale: Locale; limit?: number },
): Promise<FeaturedSpeciesResult> {
  const locale = localeSchema.parse(input.locale);
  const requested = input.limit ?? 8;
  if (!Number.isInteger(requested) || requested < 1 || requested > 24) {
    throw new Error("Featured limit must be an integer between 1 and 24");
  }
  const limit = requested;
  const { data, error } = await client.rpc("get_featured_species", {
    p_limit: limit,
  });
  if (error) throw error;
  const response = featuredSpeciesResponseSchema.parse(data);
  if (response.rows.length > limit) {
    throw new Error("Featured species read exceeded its bound");
  }
  if (response.summary.total < response.rows.length) {
    throw new Error("Featured summary is smaller than the returned rows");
  }
  return {
    items: response.rows.map((bundle) => {
      const detail = assembleSpeciesDetail({
        species: bundle.species,
        locale,
        translations: bundle.translations,
        assessment: bundle.assessment,
        media: bundle.media,
        links: bundle.links,
        sources: bundle.sources,
      });
      if (!detail) {
        throw new Error("Eligible featured species has incomplete content");
      }
      return detail;
    }),
    summary: response.summary,
  };
}

export async function getPublishedSpeciesCatalog(
  client: SupabaseClient,
  input: SpeciesCatalogOptions,
): Promise<SpeciesCatalogPage> {
  const options = speciesCatalogOptionsSchema.parse(input);
  // The RPC takes comma lists; an empty facet is passed as null.
  const list = (values: string[]) => (values.length ? values.join(",") : null);
  const { data, error } = await client.rpc("search_published_species", {
    p_query: options.query,
    p_status: list(options.statuses),
    p_threatened: false,
    p_taxon: list(options.taxa),
    p_region: list(options.regions),
    p_habitat: list(options.habitats),
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
