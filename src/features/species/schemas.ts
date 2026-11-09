import { z } from "zod";

export const localeSchema = z.enum(["id", "en"]);
export type Locale = z.infer<typeof localeSchema>;

export const conservationStatusSchema = z.enum([
  "EX",
  "EW",
  "CR",
  "EN",
  "VU",
  "NT",
  "LC",
  "DD",
  "NE",
]);
export type ConservationStatus = z.infer<typeof conservationStatusSchema>;

// Ecological status is separate from IUCN threat status: a species can be
// LC and invasive at once, so these are never merged into one badge.
export const invasiveStatusSchema = z.enum([
  "native",
  "introduced",
  "invasive",
]);
export type InvasiveStatus = z.infer<typeof invasiveStatusSchema>;

const textSchema = z.string().regex(/\S/, "Must not be blank");
const httpUrlSchema = z.url({ protocol: /^https?$/ });
// Lead media may be served from the app itself, so a root-relative path is allowed.
const mediaUrlSchema = z.union([
  httpUrlSchema,
  z.string().regex(/^\/images\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.[a-z]+$/),
]);
const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const yearSchema = z.int().min(1).max(9999);
const populationSchema = z.int().nonnegative();
const taxonRankSchema = z.enum(["species", "subspecies"]);
const populationTrendSchema = z.enum([
  "increasing",
  "decreasing",
  "stable",
  "unknown",
]);

export const speciesRowSchema = z.object({
  id: z.uuid(),
  slug: slugSchema,
  scientific_name: textSchema,
  taxon_group: textSchema,
  taxon_rank: taxonRankSchema,
  family: textSchema.nullable(),
  genus: textSchema.nullable(),
  gbif_taxon_key: z.string().regex(/^\d+$/).nullable(),
  iucn_taxon_id: z.string().regex(/^\d+$/).nullable(),
  region_codes: z.array(textSchema),
  habitat_codes: z.array(textSchema),
  featured_rank: z.int().nullable(),
  invasive_status: invasiveStatusSchema.nullish(),
  indonesia_ecological_status: invasiveStatusSchema.nullish(),
  regulation_status: z.string().nullish(),
  ecosystem_role: z.string().nullish(),
  status: z.literal("published"),
});
export type SpeciesRow = z.infer<typeof speciesRowSchema>;

export const speciesTranslationRowSchema = z.object({
  species_id: z.uuid(),
  locale: localeSchema,
  common_name: z.string().nullable(),
  summary: z.string().nullable(),
  description: z.string().nullable(),
  distinctive_traits: z.string().nullable(),
  habitat_description: z.string().nullable(),
  threats_description: z.string().nullable(),
  conservation_actions: z.string().nullable(),
  seo_title: z.string().nullable(),
  seo_description: z.string().nullable(),
  translation_status: z.literal("published"),
});
export type SpeciesTranslationRow = z.infer<typeof speciesTranslationRowSchema>;

// Completeness applies to whole prose entries; SEO remains optional.
export const completeSpeciesTranslationSchema =
  speciesTranslationRowSchema.extend({
    common_name: textSchema,
    summary: textSchema,
    description: textSchema,
    distinctive_traits: textSchema,
    habitat_description: textSchema,
    threats_description: textSchema,
    conservation_actions: textSchema,
  });

export const assessmentRowSchema = z
  .object({
    species_id: z.uuid(),
    status_code: conservationStatusSchema,
    assessment_year: yearSchema.nullable(),
    assessment_scope: textSchema,
    assessed_on: z.iso.date().nullable(),
    source_id: z.uuid(),
    population_estimate_min: populationSchema.nullable(),
    population_estimate_max: populationSchema.nullable(),
    population_unit: textSchema.nullable(),
    population_trend: populationTrendSchema.nullable(),
    notes: z.string().nullable(),
    is_current: z.literal(true),
  })
  .refine(
    (row) =>
      row.population_estimate_min === null ||
      row.population_estimate_max === null ||
      row.population_estimate_min <= row.population_estimate_max,
    "Population minimum exceeds maximum",
  );
export type AssessmentRow = z.infer<typeof assessmentRowSchema>;

// Approved media is rejected if incomplete; zero media uses typographic fallback.
export const mediaRowSchema = z.object({
  id: z.uuid(),
  species_id: z.uuid(),
  url: mediaUrlSchema,
  storage_path: textSchema.nullable(),
  alt_id: textSchema,
  alt_en: z.string().nullable(),
  photographer: textSchema,
  source_url: httpUrlSchema,
  license_code: textSchema,
  license_url: httpUrlSchema.nullable(),
  attribution_text: textSchema,
  position_x: z.number().min(0).max(100).nullable(),
  position_y: z.number().min(0).max(100).nullable(),
  approved: z.literal(true),
  sort_order: z.int(),
});
export type MediaRow = z.infer<typeof mediaRowSchema>;

export const sourceRowSchema = z.object({
  id: z.uuid(),
  organization: textSchema,
  title: textSchema,
  url: httpUrlSchema,
  published_on: z.iso.date().nullable(),
  accessed_on: z.iso.date(),
  license: textSchema.nullable(),
  notes: z.string().nullable(),
});
export type SourceRow = z.infer<typeof sourceRowSchema>;

export const speciesSourceRowSchema = z.object({
  species_id: z.uuid(),
  source_id: z.uuid(),
  section_key: z.string(),
});
export type SpeciesSourceRow = z.infer<typeof speciesSourceRowSchema>;

export const speciesDetailSchema = z.object({
  id: z.uuid(),
  slug: slugSchema,
  scientificName: textSchema,
  taxonGroup: textSchema,
  taxonRank: taxonRankSchema,
  family: textSchema.nullable(),
  genus: textSchema.nullable(),
  gbifTaxonKey: z.string().nullable(),
  iucnTaxonId: z.string().nullable(),
  regionCodes: z.array(textSchema),
  habitatCodes: z.array(textSchema),
  invasiveStatus: invasiveStatusSchema.nullable(),
  indonesiaEcologicalStatus: invasiveStatusSchema.nullable(),
  regulationStatus: z.string().nullable(),
  ecosystemRole: z.string().nullable(),
  requestedLocale: localeSchema,
  locale: localeSchema,
  isFallback: z.boolean(),
  commonName: textSchema,
  summary: textSchema,
  description: textSchema,
  distinctiveTraits: textSchema,
  habitatDescription: textSchema,
  threatsDescription: textSchema,
  conservationActions: textSchema,
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
  status: conservationStatusSchema.nullable(),
  assessmentYear: yearSchema.nullable(),
  assessmentScope: textSchema.nullable(),
  assessedOn: z.iso.date().nullable(),
  assessmentSourceId: z.uuid().nullable(),
  assessmentNotes: z.string().nullable(),
  populationEstimateMin: populationSchema.nullable(),
  populationEstimateMax: populationSchema.nullable(),
  populationUnit: textSchema.nullable(),
  populationTrend: populationTrendSchema.nullable(),
  media: z.array(
    z.object({
      id: z.uuid(),
      url: mediaUrlSchema,
      storagePath: textSchema.nullable(),
      alt: textSchema,
      photographer: textSchema,
      sourceUrl: httpUrlSchema,
      license: textSchema,
      licenseUrl: httpUrlSchema.nullable(),
      attributionText: textSchema,
      positionX: z.number().min(0).max(100).nullable(),
      positionY: z.number().min(0).max(100).nullable(),
    }),
  ),
  sources: z
    .array(
      z.object({
        id: z.uuid(),
        title: textSchema,
        url: httpUrlSchema,
        organization: textSchema,
        publishedOn: z.iso.date().nullable(),
        accessedOn: z.iso.date(),
        license: textSchema.nullable(),
        notes: z.string().nullable(),
        sectionKeys: z.array(z.string()),
      }),
    )
    .min(1),
});
export type SpeciesDetail = z.infer<typeof speciesDetailSchema>;

export const catalogSortSchema = z.enum(["name", "updated"]);
export type CatalogSort = z.infer<typeof catalogSortSchema>;

const catalogTextSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/\S/u, "Must not be blank");
export const speciesCatalogOptionsSchema = z
  .object({
    locale: localeSchema,
    query: z.string(),
    statuses: conservationStatusSchema.array().max(9),
    taxa: catalogTextSchema.array().max(32),
    regions: catalogTextSchema.array().max(32),
    habitats: catalogTextSchema.array().max(32),
    sort: catalogSortSchema,
    page: z.int().min(1).max(1_000_000),
    pageSize: z.literal(12),
  })
  .refine(
    (value) => Array.from(value.query).length <= 100,
    "Search query is too long",
  );
export type SpeciesCatalogOptions = z.infer<typeof speciesCatalogOptionsSchema>;

export const speciesCatalogFacetsSchema = z
  .object({
    statuses: conservationStatusSchema.array(),
    taxonGroups: textSchema.array(),
    regions: textSchema.array(),
    habitats: textSchema.array(),
  })
  .strict();
export type SpeciesCatalogFacets = z.infer<typeof speciesCatalogFacetsSchema>;

export const speciesCatalogBundleSchema = z
  .object({
    species: speciesRowSchema.extend({
      updated_at: z.iso.datetime({ offset: true }),
    }),
    translations: speciesTranslationRowSchema.array(),
    assessment: assessmentRowSchema.nullable(),
    media: mediaRowSchema.array(),
    links: speciesSourceRowSchema.array(),
    sources: sourceRowSchema.array(),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .strict();
export type SpeciesCatalogBundle = z.infer<typeof speciesCatalogBundleSchema>;

export const speciesCatalogResponseSchema = z
  .object({
    rows: speciesCatalogBundleSchema.array().max(12),
    total: z.int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    page: z.int().min(1).max(1_000_000),
    pageSize: z.literal(12),
    facets: speciesCatalogFacetsSchema,
  })
  .strict();

export const featuredSpeciesSummarySchema = z
  .object({
    total: z.int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    flora: z.int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    fauna: z.int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    attention: z.int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  })
  .strict();

export const featuredSpeciesResponseSchema = z
  .object({
    rows: speciesCatalogBundleSchema.array().max(24),
    summary: featuredSpeciesSummarySchema,
  })
  .strict();

export type SpeciesCatalogPage = {
  items: SpeciesDetail[];
  total: number;
  page: number;
  pageSize: 12;
  facets: SpeciesCatalogFacets;
};

// Callers supply complete published locales, including media alt text.
export function resolveContentLocale(
  requestedLocale: Locale,
  completePublishedLocales: Set<Locale>,
): { locale: Locale; isFallback: boolean } {
  if (!completePublishedLocales.has("id")) {
    throw new Error("No complete published Indonesian entry available");
  }
  if (completePublishedLocales.has(requestedLocale)) {
    return { locale: requestedLocale, isFallback: false };
  }
  return { locale: "id", isFallback: requestedLocale !== "id" };
}
