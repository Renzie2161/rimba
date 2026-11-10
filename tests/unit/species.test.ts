import { describe, expect, it } from "vitest";
import {
  getPublishedSpeciesCatalog,
  getPublishedSpeciesDetail,
} from "@/features/species/queries";
import {
  parseCatalogSearchParams,
  serializeCatalogSearchParams,
} from "@/features/species/catalog-params";
import { resolveContentLocale } from "@/features/species/schemas";
import type { SpeciesCatalogOptions } from "@/features/species/schemas";

const speciesId = "11111111-1111-4111-8111-111111111111";
const sourceId = "22222222-2222-4222-8222-222222222222";
const mediaId = "33333333-3333-4333-8333-333333333333";
const assessmentSourceId = "44444444-4444-4444-8444-444444444444";
const species = {
  id: speciesId,
  slug: "fixture-species",
  scientific_name: "Fixture taxon",
  taxon_group: "mammal",
  taxon_rank: "subspecies",
  family: "Fixture family",
  genus: "Fixture genus",
  gbif_taxon_key: "123",
  iucn_taxon_id: "456",
  region_codes: ["ID-SM"],
  habitat_codes: ["forest"],
  featured_rank: null,
  status: "published",
};
function translation(locale: "id" | "en") {
  return {
    species_id: speciesId,
    locale,
    common_name: `${locale} name`,
    summary: `${locale} summary`,
    description: `${locale} description`,
    distinctive_traits: `${locale} traits`,
    habitat_description: `${locale} habitat`,
    threats_description: `${locale} threats`,
    conservation_actions: `${locale} actions`,
    seo_title: `${locale} SEO title`,
    seo_description: `${locale} SEO description`,
    translation_status: "published",
  };
}
const assessment = {
  species_id: speciesId,
  status_code: "DD",
  assessment_year: 2024,
  assessment_scope: "Fixture regional assessment",
  assessed_on: "2024-02-29",
  source_id: sourceId,
  population_estimate_min: null,
  population_estimate_max: null,
  population_unit: null,
  population_trend: "unknown",
  notes: "Synthetic assessment notes",
  is_current: true,
};
const media = {
  id: mediaId,
  species_id: speciesId,
  url: "https://example.org/fixture.jpg",
  storage_path: null,
  alt_id: "id image description",
  alt_en: "en image description",
  photographer: "Fixture photographer",
  source_url: "https://example.org/media-source",
  license_code: "CC-BY-4.0",
  license_url: "https://creativecommons.org/licenses/by/4.0/",
  attribution_text: "Fixture attribution",
  position_x: 30,
  position_y: 60,
  approved: true,
  sort_order: 0,
};
const source = {
  id: sourceId,
  organization: "Fixture organization",
  title: "Fixture reference",
  url: "https://example.org/reference",
  published_on: "2024-03-01",
  accessed_on: "2026-11-03",
  license: "Fixture reuse terms",
  notes: "Fixture provenance",
};
const options = { slug: "fixture-species", locale: "en" } as const;
const proseFields = [
  "common_name",
  "summary",
  "description",
  "distinctive_traits",
  "habitat_description",
  "threats_description",
  "conservation_actions",
];

function rpcClient(payload: unknown, error?: unknown) {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  return {
    calls,
    client: {
      from(table: string) {
        expect(table).toBe("species");
        const query = {
          select(columns: string) {
            expect(columns).toBe("kingdom,order");
            return query;
          },
          eq(column: string, value: string) {
            expect({ id: speciesId, status: "published" }[column]).toBe(value);
            return query;
          },
          maybeSingle() {
            return Promise.resolve({
              data: { kingdom: "Animalia", order: "Primates" },
              error: null,
            });
          },
        };
        return query;
      },
      rpc(name: string, args: Record<string, unknown>) {
        calls.push({ name, args });
        return Promise.resolve({ data: payload, error: error ?? null });
      },
    } as never,
  };
}
const catalogOptions: SpeciesCatalogOptions = {
  locale: "id",
  query: "",
  statuses: [],
  taxa: [],
  regions: [],
  habitats: [],
  sort: "name",
  page: 1,
  pageSize: 12,
};
function catalogBundle() {
  return {
    species: { ...species, updated_at: "2026-01-02T03:04:05+00:00" },
    translations: [translation("id")],
    assessment,
    media: [media],
    links: [
      { species_id: speciesId, source_id: sourceId, section_key: "habitat" },
      { species_id: speciesId, source_id: sourceId, section_key: "threats" },
    ],
    sources: [source],
    updatedAt: "2026-01-02T03:04:05+00:00",
  };
}

describe("species content locale", () => {
  it("requires complete published Indonesian and falls back as a whole entry", () => {
    expect(() => resolveContentLocale("en", new Set(["en"]))).toThrow(
      "No complete published Indonesian entry available",
    );
    expect(resolveContentLocale("en", new Set(["id"]))).toEqual({
      locale: "id",
      isFallback: true,
    });
    expect(resolveContentLocale("en", new Set(["id", "en"]))).toEqual({
      locale: "en",
      isFallback: false,
    });
  });
});

describe("published species detail RPC", () => {
  type LooseBundle = {
    species: Record<string, unknown>;
    translations: Array<Record<string, unknown>>;
    assessment: Record<string, unknown> | null;
    media: Array<Record<string, unknown>>;
    links: Array<Record<string, unknown>>;
    sources: Array<Record<string, unknown>>;
    updatedAt: string;
  };
  const bundle = (): LooseBundle => ({
    ...catalogBundle(),
    translations: [translation("id"), translation("en")],
  });
  it("maps one RPC bundle into a complete localized profile", async () => {
    const { client, calls } = rpcClient(bundle());
    const detail = await getPublishedSpeciesDetail(client, options);
    expect(detail).toMatchObject({
      id: speciesId,
      slug: species.slug,
      scientificName: species.scientific_name,
      taxonGroup: "mammal",
      kingdom: "Animalia",
      taxonOrder: "Primates",
      taxonRank: "subspecies",
      requestedLocale: "en",
      locale: "en",
      isFallback: false,
      commonName: "en name",
      status: "DD",
      assessmentYear: 2024,
      assessmentScope: "Fixture regional assessment",
      assessmentSourceId: sourceId,
      media: [{ id: mediaId, alt: "en image description" }],
      sources: [{ id: sourceId, sectionKeys: ["habitat", "threats"] }],
    });
    expect(calls).toEqual([
      { name: "get_published_species_detail", args: { p_slug: species.slug } },
    ]);
  });
  it("rejects a bundle describing a different species", async () => {
    const payload = bundle();
    payload.species = { ...payload.species, slug: "another-species" };
    await expect(
      getPublishedSpeciesDetail(rpcClient(payload).client, options),
    ).rejects.toThrow("Detail bundle returned another species");
  });
  it("returns null when the RPC reports no published record", async () => {
    for (const empty of [null, undefined]) {
      await expect(
        getPublishedSpeciesDetail(rpcClient(empty).client, options),
      ).resolves.toBeNull();
    }
  });
  it("propagates the RPC error instead of rendering an empty profile", async () => {
    const failure = { message: "Database read denied", code: "42501" };
    await expect(
      getPublishedSpeciesDetail(rpcClient(null, failure).client, options),
    ).rejects.toMatchObject({ message: "Database read denied", code: "42501" });
  });
  it.each(
    proseFields.flatMap((field) =>
      [null, "", " \n "].map((value) => ({ field, value })),
    ),
  )(
    "falls back as whole entry for incomplete English $field ($value)",
    async ({ field, value }) => {
      const payload = bundle();
      payload.translations = [
        translation("id"),
        { ...translation("en"), [field]: value },
      ];
      const fallback = await getPublishedSpeciesDetail(
        rpcClient(payload).client,
        options,
      );
      const idDetail = await getPublishedSpeciesDetail(
        rpcClient(bundle()).client,
        { ...options, locale: "id" },
      );
      expect(fallback).toEqual({
        ...idDetail,
        requestedLocale: "en",
        isFallback: true,
      });
      expect(fallback?.media[0]?.alt).toBe("id image description");
    },
  );
  it.each([null, "", " "])(
    "falls back when English media alt is %s",
    async (alt) => {
      const payload = bundle();
      payload.media = [{ ...media, alt_en: alt }];
      expect(
        await getPublishedSpeciesDetail(rpcClient(payload).client, options),
      ).toMatchObject({
        locale: "id",
        isFallback: true,
        commonName: "id name",
        media: [{ alt: "id image description" }],
      });
    },
  );
  it.each(proseFields)(
    "returns null when Indonesian %s is blank",
    async (field) => {
      const payload = bundle();
      payload.translations = [
        { ...translation("id"), [field]: " " },
        translation("en"),
      ];
      await expect(
        getPublishedSpeciesDetail(rpcClient(payload).client, options),
      ).resolves.toBeNull();
    },
  );
  it("preserves missing assessments and media", async () => {
    const payload = bundle();
    payload.assessment = null;
    payload.media = [];
    expect(
      await getPublishedSpeciesDetail(rpcClient(payload).client, options),
    ).toMatchObject({ status: null, assessmentYear: null, media: [] });
  });
  it("keeps assessment provenance separate from section sources", async () => {
    const payload = bundle();
    payload.assessment = { ...assessment, source_id: assessmentSourceId };
    payload.sources = [
      source,
      { ...source, id: assessmentSourceId, title: "Assessment reference" },
    ];
    expect(
      await getPublishedSpeciesDetail(rpcClient(payload).client, options),
    ).toMatchObject({
      assessmentSourceId,
      sources: [{ id: sourceId }, { id: assessmentSourceId, sectionKeys: [] }],
    });
  });
  it.each([
    [
      "species",
      (b: LooseBundle) => {
        b.species = { ...b.species, id: "not-a-uuid" };
      },
    ],
    [
      "species status",
      (b: LooseBundle) => {
        b.species = { ...b.species, status: "draft" };
      },
    ],
    [
      "translation type",
      (b: LooseBundle) => {
        b.translations = [
          translation("id"),
          { ...translation("en"), summary: 123 },
        ];
      },
    ],
    [
      "duplicate locale",
      (b: LooseBundle) => {
        b.translations = [translation("id"), translation("id")];
      },
    ],
    [
      "foreign translation",
      (b: LooseBundle) => {
        b.translations = [{ ...translation("id"), species_id: sourceId }];
      },
    ],
    [
      "javascript media url",
      (b: LooseBundle) => {
        b.media = [{ ...media, url: "javascript:alert(1)" }];
      },
    ],
    [
      "relative media source",
      (b: LooseBundle) => {
        b.media = [{ ...media, source_url: "not-a-url" }];
      },
    ],
    [
      "ftp license url",
      (b: LooseBundle) => {
        b.media = [{ ...media, license_url: "ftp://example.org/license" }];
      },
    ],
    [
      "blank media alt",
      (b: LooseBundle) => {
        b.media = [{ ...media, alt_id: " " }];
      },
    ],
    [
      "missing photographer",
      (b: LooseBundle) => {
        b.media = [{ ...media, photographer: null }];
      },
    ],
    [
      "blank license",
      (b: LooseBundle) => {
        b.media = [{ ...media, license_code: "" }];
      },
    ],
    [
      "missing attribution",
      (b: LooseBundle) => {
        b.media = [{ ...media, attribution_text: null }];
      },
    ],
    [
      "foreign media",
      (b: LooseBundle) => {
        b.media = [{ ...media, species_id: sourceId }];
      },
    ],
    [
      "null assessment source",
      (b: LooseBundle) => {
        b.assessment = { ...assessment, source_id: null };
      },
    ],
    [
      "fractional year",
      (b: LooseBundle) => {
        b.assessment = { ...assessment, assessment_year: 2024.5 };
      },
    ],
    [
      "impossible date",
      (b: LooseBundle) => {
        b.assessment = { ...assessment, assessed_on: "2023-02-29" };
      },
    ],
    [
      "inverted population",
      (b: LooseBundle) => {
        b.assessment = {
          ...assessment,
          population_estimate_min: 10,
          population_estimate_max: 1,
        };
      },
    ],
    [
      "numeric section key",
      (b: LooseBundle) => {
        b.links = [
          { species_id: speciesId, source_id: sourceId, section_key: 123 },
        ];
      },
    ],
    [
      "no source links",
      (b: LooseBundle) => {
        b.links = [];
      },
    ],
    [
      "file reference url",
      (b: LooseBundle) => {
        b.sources = [{ ...source, url: "file:///reference" }];
      },
    ],
    [
      "impossible access date",
      (b: LooseBundle) => {
        b.sources = [{ ...source, accessed_on: "2026-02-30" }];
      },
    ],
    [
      "no sources",
      (b: LooseBundle) => {
        b.sources = [];
      },
    ],
  ] as Array<[string, (b: LooseBundle) => void]>)(
    "rejects malformed bundle: %s",
    async (_label, mutate) => {
      const payload = bundle();
      mutate(payload);
      await expect(
        getPublishedSpeciesDetail(rpcClient(payload).client, options),
      ).rejects.toThrow();
    },
  );
});

describe("published species catalog RPC", () => {
  const envelope = (rows: unknown[], total = rows.length, page = 1) => ({
    rows,
    total,
    page,
    pageSize: 12,
    facets: {
      statuses: ["DD"],
      taxonGroups: ["mammal"],
      regions: ["ID-SM"],
      habitats: ["forest"],
    },
  });
  it("validates full public bundle and passes bounded exact args once", async () => {
    const { client, calls } = rpcClient(envelope([catalogBundle()]));
    const result = await getPublishedSpeciesCatalog(client, catalogOptions);
    expect(result.items[0]).toMatchObject({
      commonName: "id name",
      status: "DD",
      media: [{ alt: "id image description" }],
      sources: [{ id: sourceId, sectionKeys: ["habitat", "threats"] }],
    });
    expect(result.total).toBe(1);
    expect(calls).toEqual([
      {
        name: "search_published_species",
        args: {
          p_query: "",
          p_status: null,
          p_threatened: false,
          p_taxon: null,
          p_region: null,
          p_habitat: null,
          p_sort: "name",
          p_page: 1,
          p_page_size: 12,
        },
      },
    ]);
  });
  it.skipIf(!process.env.RIMBA_CATALOG_RPC_JSON)(
    "validates actual disposable SQL catalog response",
    async () => {
      const payload = process.env.RIMBA_CATALOG_RPC_JSON;
      if (!payload) throw new Error("Disposable SQL response was not provided");
      const result = await getPublishedSpeciesCatalog(
        rpcClient(JSON.parse(payload)).client,
        catalogOptions,
      );
      expect(result.items).toHaveLength(3);
      expect(result.items[0]).toMatchObject({
        slug: "catalog-alpha",
        commonName: "Cássowary fixture",
      });
      expect(result.facets.taxonGroups).toContain("fixture-bird");
    },
  );
  it("preserves whole-entry fallback, including media alt", async () => {
    const base = catalogBundle();
    const bundle = {
      ...base,
      translations: [
        ...base.translations,
        { ...translation("en"), summary: "" },
      ],
      media: [{ ...media, alt_en: null }],
    };
    const { client } = rpcClient(envelope([bundle]));
    expect(
      await getPublishedSpeciesCatalog(client, {
        ...catalogOptions,
        locale: "en",
      }),
    ).toMatchObject({
      items: [
        {
          requestedLocale: "en",
          locale: "id",
          isFallback: true,
          commonName: "id name",
          media: [{ alt: "id image description" }],
        },
      ],
    });
  });
  it("rejects malformed rows, missing provenance, and inconsistent totals", async () => {
    const bundle = catalogBundle();
    for (const payload of [
      envelope([
        {
          ...bundle,
          species: {
            ...species,
            updated_at: bundle.updatedAt,
            status: "draft",
          },
        },
      ]),
      envelope([{ ...bundle, links: [] }]),
      envelope([{ ...bundle, links: [...bundle.links, ...bundle.links] }]),
      envelope([{ ...bundle, media: [...bundle.media, ...bundle.media] }]),
      envelope([bundle], 2),
      envelope([{ ...bundle, updatedAt: "2026-02-30T03:04:05+00:00" }]),
      envelope([
        {
          ...bundle,
          species: {
            ...bundle.species,
            updated_at: "2026-02-30T03:04:05+00:00",
          },
        },
      ]),
    ])
      await expect(
        getPublishedSpeciesCatalog(rpcClient(payload).client, catalogOptions),
      ).rejects.toThrow();
  });
  it("propagates RPC errors and permits genuine empty out-of-range pages", async () => {
    await expect(
      getPublishedSpeciesCatalog(
        rpcClient(null, { code: "42501" }).client,
        catalogOptions,
      ),
    ).rejects.toMatchObject({ code: "42501" });
    const { client } = rpcClient(envelope([], 1, 2));
    await expect(
      getPublishedSpeciesCatalog(client, { ...catalogOptions, page: 2 }),
    ).resolves.toMatchObject({ items: [], total: 1, page: 2 });
  });
});

describe("catalog URL parser", () => {
  it("normalizes query and serializes non-default keys in canonical order", () => {
    const result = parseCatalogSearchParams({
      q: "  CÁSS  \t t ",
      page: "2",
      view: "list",
    });
    expect(result).toMatchObject({
      ok: true,
      value: { query: "CÁSS t", page: 2, view: "list" },
    });
    if (!result.ok) throw new Error("Expected valid URL params");
    expect(serializeCatalogSearchParams(result.value)).toBe(
      "q=C%C3%81SS+t&page=2&view=list",
    );
    expect(parseCatalogSearchParams({ q: "😀".repeat(100) }).ok).toBe(true);
    const nativeForm = Object.fromEntries(
      new URLSearchParams(
        "q=CatalogFixture&statuses=&taxa=&regions=&habitats=&sort=name&page=1&view=grid",
      ),
    );
    const normalized = parseCatalogSearchParams(nativeForm);
    expect(normalized).toMatchObject({
      ok: true,
      value: {
        query: "CatalogFixture",
        statuses: [],
        taxa: [],
        regions: [],
        habitats: [],
        sort: "name",
        page: 1,
        view: "grid",
      },
    });
    if (!normalized.ok)
      throw new Error("Expected native defaults to normalize");
    expect(serializeCatalogSearchParams(normalized.value)).toBe(
      "q=CatalogFixture",
    );
    // Multiple values serialize as one comma list, order preserved.
    const multi = parseCatalogSearchParams({
      statuses: "CR,EN",
      regions: "sumatra,java",
    });
    expect(multi.ok).toBe(true);
    if (!multi.ok) throw new Error("Expected multi-select to parse");
    expect(multi.value.statuses).toEqual(["CR", "EN"]);
    expect(multi.value.regions).toEqual(["sumatra", "java"]);
    expect(serializeCatalogSearchParams(multi.value)).toBe(
      "statuses=CR%2CEN&regions=sumatra%2Cjava",
    );
    for (const key of ["taxa", "regions", "habitats"]) {
      const params = Object.fromEntries(
        new URLSearchParams(`${key}=%20%C2%A0`),
      );
      expect(parseCatalogSearchParams(params).ok).toBe(false);
    }
  });
  it.each([
    { status: ["CR", "EN"] },
    { surprise: "1" },
    { statuses: "CR,BOGUS" },
    { statuses: "CR,CR" },
    { page: "01" },
    { q: "x".repeat(101) },
    { sort: "random" },
  ])("rejects invalid URL input %#", (params) =>
    expect(parseCatalogSearchParams(params).ok).toBe(false),
  );
});
