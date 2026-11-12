import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { z } from "zod";

const text = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !value.includes("\0"));
const optionalText = text.nullish();
const date = z.iso.date();
const pastDate = date.refine(
  (value) => value <= new Date().toISOString().slice(0, 10),
);
const webUrl = z
  .url({ protocol: /^https?$/ })
  .refine((value) => /^https?:\/\/[^/@\\\s]+(?:[/?#]|$)/i.test(value));
const mediaUrl = z.union([
  webUrl,
  z.string().regex(/^\/images\/species\/[a-z0-9-]+\.jpg$/),
]);
const status = z.enum(["EX", "EW", "CR", "EN", "VU", "NT", "LC", "DD", "NE"]);
const year = z
  .number()
  .int()
  .min(1500)
  .max(Math.min(new Date().getUTCFullYear(), 2100));
const population = z
  .union([
    z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    z.string().regex(/^(0|[1-9]\d*)$/),
  ])
  .refine((value) => BigInt(value) <= BigInt(Number.MAX_SAFE_INTEGER))
  .nullish();
const assessmentFields = {
  status_code: status,
  assessment_year: year.nullable(),
  source_url: webUrl,
  assessment_scope: text.default("global"),
  assessed_on: date.nullish(),
  population_estimate_min: population,
  population_estimate_max: population,
  population_unit: optionalText,
  population_trend: z
    .enum(["increasing", "decreasing", "stable", "unknown"])
    .nullish(),
  notes: optionalText,
  is_current: z.boolean(),
};
const proseFields = [
  "common_name",
  "summary",
  "description",
  "distinctive_traits",
  "habitat_description",
  "threats_description",
  "conservation_actions",
  "seo_title",
  "seo_description",
];
const translationFields = Object.fromEntries(
  ["id", "en"].flatMap((locale) =>
    proseFields.map((field) => [`${field}_${locale}`, optionalText]),
  ),
);
const sourceSchema = z
  .strictObject({
    title: text,
    url: webUrl,
    organization: text,
    accessed_on: pastDate,
    published_on: date.nullish(),
    license: optionalText,
    notes: optionalText,
    section_key: z.union([z.literal(""), text]).default(""),
  })
  .refine(
    (source) =>
      !source.published_on || source.published_on <= source.accessed_on,
  );
const mediaSchema = z.strictObject({
  url: mediaUrl,
  storage_path: optionalText,
  alt_id: text,
  alt_en: optionalText,
  photographer: text,
  source_url: webUrl,
  license_code: text,
  license_url: webUrl,
  attribution_text: text,
  taxon_scientific_name: text,
  position_x: z.number().min(0).max(100).nullish(),
  position_y: z.number().min(0).max(100).nullish(),
  sort_order: z.number().int().nonnegative().max(2147483647).default(0),
});
const entrySchema = z
  .strictObject({
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    scientific_name: text,
    taxon_group: text,
    taxon_rank: z.enum(["species", "subspecies"]).default("species"),
    domain: optionalText,
    kingdom: optionalText,
    phylum: optionalText,
    subphylum: optionalText,
    class: optionalText,
    order: optionalText,
    family: optionalText,
    genus: optionalText,
    specific_epithet: optionalText,
    gbif_taxon_key: z.string().regex(/^\d+$/).nullish(),
    iucn_taxon_id: z.string().regex(/^\d+$/).nullish(),
    region_codes: z.array(text).default([]),
    habitat_codes: z.array(text).default([]),
    featured_rank: z.number().int().nonnegative().max(2147483647).nullish(),
    ...translationFields,
    common_name_id: text,
    summary_id: text,
    description_id: text,
    status_code: status.nullable(),
    assessment_year: year.nullable(),
    assessment_source_url: webUrl.nullish(),
    assessment_scope: text.default("global"),
    assessed_on: date.nullish(),
    population_estimate_min: population,
    population_estimate_max: population,
    population_unit: optionalText,
    population_trend: assessmentFields.population_trend,
    assessment_notes: optionalText,
    indonesia_ecological_status: z
      .enum(["native", "introduced", "invasive", "unknown"])
      .nullish(),
    ecological_source_url: webUrl.nullish(),
    regulation_status: optionalText,
    regulation_source_url: webUrl.nullish(),
    ecosystem_role: optionalText,
    ecosystem_source_url: webUrl.nullish(),
    assessments: z.array(z.strictObject(assessmentFields)).default([]),
    aliases: z
      .array(
        z.strictObject({
          locale: z.enum(["id", "en"]),
          name: text,
          kind: optionalText,
        }),
      )
      .default([]),
    sources: z.array(sourceSchema).min(1),
    media: z.array(mediaSchema),
    reviewed_by: text,
    reviewed_at: pastDate,
  })
  .superRefine((entry, context) => {
    const reject = (path) =>
      context.addIssue({
        code: "custom",
        path,
        message: "Invalid draft provenance",
      });
    const sourceUrls = new Set(entry.sources.map((source) => source.url));
    if (entry.taxon_group === "flora") {
      if (
        [
          "domain",
          "kingdom",
          "phylum",
          "subphylum",
          "class",
          "order",
          "family",
          "genus",
          "specific_epithet",
        ].some((field) => !entry[field]) ||
        entry.media.length === 0 ||
        entry.scientific_name.trim().split(/\s+/)[1] !== entry.specific_epithet
      )
        reject(["taxon_group"]);
    }
    if (sourceUrls.size !== entry.sources.length) reject(["sources"]);
    if (entry.status_code === null) {
      if (
        entry.assessment_year !== null ||
        entry.assessment_source_url != null ||
        entry.assessed_on != null ||
        entry.population_estimate_min != null ||
        entry.population_estimate_max != null ||
        entry.population_unit != null ||
        entry.population_trend != null ||
        entry.assessment_notes != null
      )
        reject(["status_code"]);
    } else if (!entry.assessment_source_url) {
      reject(["assessment_source_url"]);
    }
    for (const [value, url, path] of [
      [
        entry.indonesia_ecological_status,
        entry.ecological_source_url,
        "ecological_source_url",
      ],
      [
        entry.regulation_status,
        entry.regulation_source_url,
        "regulation_source_url",
      ],
      [
        entry.ecosystem_role,
        entry.ecosystem_source_url,
        "ecosystem_source_url",
      ],
    ])
      if (value != null && !sourceUrls.has(url)) reject([path]);
    const assessments = getAssessments(entry);
    if (assessments.filter((assessment) => assessment.is_current).length > 1)
      reject(["assessments"]);
    for (const assessment of assessments) {
      const source = entry.sources.find(
        (item) => item.url === assessment.source_url,
      );
      if (
        !source ||
        (assessment.status_code !== "NE" &&
          assessment.assessment_year === null &&
          !assessment.assessed_on)
      )
        reject(["assessments"]);
      if (
        assessment.assessed_on &&
        (assessment.assessed_on > (source?.accessed_on ?? "") ||
          (assessment.assessment_year !== null &&
            Number(assessment.assessed_on.slice(0, 4)) !==
              assessment.assessment_year))
      )
        reject(["assessments"]);
      const minimum = assessment.population_estimate_min;
      const maximum = assessment.population_estimate_max;
      if (
        (minimum != null || maximum != null) &&
        (!assessment.population_unit || !assessment.notes)
      )
        reject(["assessments"]);
      if (
        minimum != null &&
        maximum != null &&
        BigInt(minimum) > BigInt(maximum)
      )
        reject(["assessments"]);
    }
    for (const media of entry.media) {
      if (
        media.taxon_scientific_name !== entry.scientific_name ||
        !sourceUrls.has(media.source_url)
      )
        reject(["media"]);
    }
    const aliasKeys = entry.aliases.map((alias) =>
      JSON.stringify([alias.locale, alias.name, alias.kind ?? null]),
    );
    if (new Set(aliasKeys).size !== aliasKeys.length) reject(["aliases"]);
    if (
      new Set(entry.media.map((media) => media.url)).size !== entry.media.length
    )
      reject(["media"]);
  });
const entriesSchema = z
  .array(entrySchema)
  .min(1)
  .refine(
    (entries) =>
      new Set(entries.map((entry) => entry.slug)).size === entries.length,
  );

function getAssessments(entry) {
  if (entry.status_code === null) return entry.assessments;
  return [
    {
      status_code: entry.status_code,
      assessment_year: entry.assessment_year,
      source_url: entry.assessment_source_url,
      assessment_scope: entry.assessment_scope,
      assessed_on: entry.assessed_on,
      population_estimate_min: entry.population_estimate_min,
      population_estimate_max: entry.population_estimate_max,
      population_unit: entry.population_unit,
      population_trend: entry.population_trend,
      notes: entry.assessment_notes,
      is_current: true,
    },
    ...entry.assessments,
  ];
}

function deterministicId(...parts) {
  const hash = createHash("sha256")
    .update(JSON.stringify(["rimba-draft-seed-v1", ...parts]))
    .digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-8${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function sqlValue(value) {
  if (value == null) return "NULL";
  if (Array.isArray(value))
    return `ARRAY[${value.map(sqlValue).join(", ")}]::text[]`;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return `E'${value.replaceAll("\\", "\\\\").replaceAll("'", "''").replaceAll("\r", "\\r").replaceAll("\n", "\\n")}'`;
}

function buildSql(entries) {
  const statements = [
    "\\set ON_ERROR_STOP on",
    "-- Draft research only. Owner review and explicit admin publication still required.",
    "-- Existing slugs skipped wholesale. Any other conflict aborts this entire import.",
    "BEGIN;",
    "CREATE TEMP TABLE rimba_seed_new_species (id uuid PRIMARY KEY) ON COMMIT DROP;",
  ];
  for (const entry of entries) {
    const speciesId = deterministicId("species", entry.slug);
    const species = {
      id: speciesId,
      ...Object.fromEntries(
        [
          "slug",
          "scientific_name",
          "taxon_group",
          "taxon_rank",
          "domain",
          "kingdom",
          "phylum",
          "subphylum",
          "class",
          "order",
          "family",
          "genus",
          "gbif_taxon_key",
          "iucn_taxon_id",
          "region_codes",
          "habitat_codes",
          "featured_rank",
        ].map((field) => [field, entry[field]]),
      ),
      status: "draft",
      published_at: null,
    };
    statements.push(
      `WITH inserted AS (INSERT INTO public.species (${Object.keys(species)
        .map((column) => `"${column}"`)
        .join(
          ", ",
        )}) VALUES (${Object.values(species).map(sqlValue).join(", ")}) ON CONFLICT (slug) DO NOTHING RETURNING id) INSERT INTO pg_temp.rimba_seed_new_species SELECT id FROM inserted;`,
    );
    const insert = (table, row) =>
      statements.push(
        `INSERT INTO public.${table} (${Object.keys(row)
          .map((column) => `"${column}"`)
          .join(
            ", ",
          )}) SELECT ${Object.values(row).map(sqlValue).join(", ")} WHERE EXISTS (SELECT 1 FROM pg_temp.rimba_seed_new_species WHERE id = ${sqlValue(speciesId)}::uuid);`,
      );
    for (const locale of ["id", "en"]) {
      if (!proseFields.some((field) => entry[`${field}_${locale}`] != null))
        continue;
      insert("species_translations", {
        id: deterministicId("translation", entry.slug, locale),
        species_id: speciesId,
        locale,
        ...Object.fromEntries(
          proseFields.map((field) => [field, entry[`${field}_${locale}`]]),
        ),
        translation_status: "draft",
      });
    }
    for (const alias of entry.aliases) {
      insert("species_aliases", {
        id: deterministicId(
          "alias",
          entry.slug,
          alias.locale,
          alias.name,
          alias.kind ?? null,
        ),
        species_id: speciesId,
        ...alias,
      });
    }
    for (const source of entry.sources) {
      const sourceId = deterministicId("source", entry.slug, source.url);
      const { section_key: sectionKey, ...sourceFields } = source;
      insert("sources", {
        id: sourceId,
        ...sourceFields,
        notes: [
          source.notes,
          `Draft research review only: ${entry.reviewed_by}; ${entry.reviewed_at}. Owner approval pending.`,
        ]
          .filter(Boolean)
          .join("\n"),
      });
      insert("species_sources", {
        species_id: speciesId,
        source_id: sourceId,
        section_key: sectionKey,
      });
    }
    const ecologyFields = [
      ["indonesia_ecological_status", entry.indonesia_ecological_status],
      ["ecological_source_id", entry.ecological_source_url],
      ["regulation_status", entry.regulation_status],
      ["regulation_source_id", entry.regulation_source_url],
      ["ecosystem_role", entry.ecosystem_role],
      ["ecosystem_source_id", entry.ecosystem_source_url],
    ].filter(([, value]) => value != null);
    if (ecologyFields.length > 0)
      statements.push(
        `UPDATE public.species SET ${ecologyFields
          .map(
            ([column, value]) =>
              `${column} = ${
                column.endsWith("_source_id")
                  ? `${sqlValue(deterministicId("source", entry.slug, value))}::uuid`
                  : sqlValue(value)
              }`,
          )
          .join(", ")} WHERE slug = ${sqlValue(entry.slug)};`,
      );
    for (const assessment of getAssessments(entry)) {
      const { source_url: sourceUrl, ...assessmentFields } = assessment;
      insert("conservation_assessments", {
        id: deterministicId(
          "assessment",
          entry.slug,
          sourceUrl,
          assessment.assessment_scope,
          assessment.assessed_on ?? assessment.assessment_year,
          assessment.status_code,
        ),
        species_id: speciesId,
        source_id: deterministicId("source", entry.slug, sourceUrl),
        ...assessmentFields,
      });
    }
    for (const media of entry.media) {
      const { taxon_scientific_name: taxonName, ...mediaFields } = media;
      insert("species_media", {
        id: deterministicId("media", entry.slug, taxonName, media.url),
        species_id: speciesId,
        ...mediaFields,
        approved: false,
      });
    }
  }
  statements.push("COMMIT;", "");
  return statements.join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0]?.startsWith("--") ? args.shift() : "--validate";
  const [inputPath] = args;
  if (
    !["--validate", "--sql"].includes(mode) ||
    args.length !== 1 ||
    !inputPath
  ) {
    console.error(
      "Usage: node scripts/seed-species.mjs [--validate|--sql] <draft-seeds.json>",
    );
    process.exitCode = 1;
    return;
  }
  let entries;
  try {
    entries = entriesSchema.parse(
      JSON.parse(await readFile(inputPath, "utf8")),
    );
  } catch (error) {
    const issues =
      error instanceof z.ZodError ? ` (${error.issues.length} issue(s))` : "";
    console.error(
      `Seed gate failed: unreadable or invalid draft JSON${issues}.`,
    );
    process.exitCode = 1;
    return;
  }
  if (mode === "--sql") {
    process.stdout.write(buildSql(entries));
  } else {
    console.log(
      `Seed gate passed: ${entries.length} draft entr(ies). Owner publication review pending; no database writes.`,
    );
  }
}

await main();
