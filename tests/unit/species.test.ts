import { createClient } from "@supabase/supabase-js";
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
function responses(): Record<string, unknown> {
  return {
    species: [species],
    species_translations: [translation("id"), translation("en")],
    conservation_assessments: [assessment],
    species_media: [media],
    species_sources: [
      { species_id: speciesId, source_id: sourceId, section_key: "habitat" },
      { species_id: speciesId, source_id: sourceId, section_key: "threats" },
    ],
    sources: [source],
  };
}
function httpClient(payloads = responses(), errorTable?: string) {
  const requests: Request[] = [];
  const fetchStub: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    requests.push(request);
    const table = new URL(request.url).pathname.split("/").at(-1) ?? "";
    if (!(table in payloads))
      throw new Error(`Unexpected HTTP request: ${table}`);
    return new Response(
      JSON.stringify(
        table === errorTable
          ? {
              message: "Database read denied",
              code: "42501",
              details: null,
              hint: null,
            }
          : payloads[table],
      ),
      {
        status: table === errorTable ? 403 : 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  };
  return {
    client: createClient("https://fixture.supabase.co", "fixture-anon-key", {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: { fetch: fetchStub },
    }),
    requests,
  };
}
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
      rpc(name: string, args: Record<string, unknown>) {
        calls.push({ name, args });
        return Promise.resolve({ data: payload, error: error ?? null });
      },
    } as never,
  };
}
const catalogOptions = {
  locale: "id",
  query: "",
  status: null,
  threatened: false,
  taxon: null,
  region: null,
  habitat: null,
  sort: "name",
  page: 1,
  pageSize: 12,
} as const;
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

describe("published species HTTP query", () => {
  it("returns complete profile, assessment, media, provenance through GET-only requests", async () => {
    const { client, requests } = httpClient();
    const detail = await getPublishedSpeciesDetail(client, options);
    expect(detail).toMatchObject({
      id: speciesId,
      slug: species.slug,
      scientificName: species.scientific_name,
      taxonGroup: "mammal",
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
    const urls = requests.map((request) => new URL(request.url));
    expect(urls.map((url) => url.pathname)).toEqual([
      "/rest/v1/species",
      "/rest/v1/species_translations",
      "/rest/v1/conservation_assessments",
      "/rest/v1/species_media",
      "/rest/v1/species_sources",
      "/rest/v1/sources",
    ]);
    expect(requests.every((request) => request.method === "GET")).toBe(true);
    expect(urls[0]?.searchParams.get("slug")).toBe("eq.fixture-species");
    expect(urls[0]?.searchParams.get("status")).toBe("eq.published");
    expect(urls[1]?.searchParams.get("translation_status")).toBe(
      "eq.published",
    );
    expect(urls[2]?.searchParams.get("is_current")).toBe("eq.true");
    expect(urls[3]?.searchParams.get("approved")).toBe("eq.true");
    expect(urls[3]?.searchParams.get("order")).toBe("sort_order.asc,id.asc");
    for (const url of urls.slice(1, 5))
      expect(url.searchParams.get("species_id")).toBe(`eq.${speciesId}`);
    expect(urls[5]?.searchParams.get("id")).toBe(`in.(${sourceId})`);
  });

  it.each(
    proseFields.flatMap((field) =>
      [null, "", " \n "].map((value) => ({ field, value })),
    ),
  )(
    "falls back as whole entry for incomplete English $field ($value)",
    async ({ field, value }) => {
      const payloads = responses();
      payloads.species_translations = [
        translation("id"),
        { ...translation("en"), [field]: value },
      ];
      const fallback = await getPublishedSpeciesDetail(
        httpClient(payloads).client,
        options,
      );
      const idDetail = await getPublishedSpeciesDetail(httpClient().client, {
        ...options,
        locale: "id",
      });
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
      const payloads = responses();
      payloads.species_media = [{ ...media, alt_en: alt }];
      expect(
        await getPublishedSpeciesDetail(httpClient(payloads).client, options),
      ).toMatchObject({
        locale: "id",
        isFallback: true,
        commonName: "id name",
        media: [{ alt: "id image description" }],
      });
    },
  );
  it("returns null for incomplete Indonesian or missing species", async () => {
    for (const field of proseFields) {
      const payloads = responses();
      payloads.species_translations = [
        { ...translation("id"), [field]: " " },
        translation("en"),
      ];
      await expect(
        getPublishedSpeciesDetail(httpClient(payloads).client, options),
      ).resolves.toBeNull();
    }
    const payloads = responses();
    payloads.species = [];
    const { client, requests } = httpClient(payloads);
    await expect(
      getPublishedSpeciesDetail(client, options),
    ).resolves.toBeNull();
    expect(requests).toHaveLength(1);
  });
  it("preserves missing assessments/media and separate assessment provenance", async () => {
    const payloads = responses();
    payloads.conservation_assessments = [];
    payloads.species_media = [];
    expect(
      await getPublishedSpeciesDetail(httpClient(payloads).client, options),
    ).toMatchObject({ status: null, assessmentYear: null, media: [] });
    const assessmentPayloads = responses();
    assessmentPayloads.conservation_assessments = [
      { ...assessment, source_id: assessmentSourceId },
    ];
    assessmentPayloads.sources = [
      source,
      { ...source, id: assessmentSourceId, title: "Assessment reference" },
    ];
    expect(
      await getPublishedSpeciesDetail(
        httpClient(assessmentPayloads).client,
        options,
      ),
    ).toMatchObject({
      assessmentSourceId,
      sources: [{ id: sourceId }, { id: assessmentSourceId, sectionKeys: [] }],
    });
  });
  it.each([
    "species",
    "species_translations",
    "conservation_assessments",
    "species_media",
    "species_sources",
    "sources",
  ])("propagates database errors from %s", async (table) => {
    await expect(
      getPublishedSpeciesDetail(httpClient(responses(), table).client, options),
    ).rejects.toMatchObject({ message: "Database read denied", code: "42501" });
  });
  it.each([
    ["species", [{ ...species, id: "not-a-uuid" }]],
    ["species", [{ ...species, status: "draft" }]],
    [
      "species_translations",
      [translation("id"), { ...translation("en"), summary: 123 }],
    ],
    [
      "species_translations",
      [{ ...translation("id"), translation_status: "draft" }],
    ],
    ["species_translations", [translation("id"), translation("id")]],
    ["species_translations", [{ ...translation("id"), species_id: sourceId }]],
    ["species_media", [{ ...media, url: "javascript:alert(1)" }]],
    ["species_media", [{ ...media, source_url: "not-a-url" }]],
    ["species_media", [{ ...media, license_url: "ftp://example.org/license" }]],
    ["species_media", [{ ...media, alt_id: " " }]],
    ["species_media", [{ ...media, photographer: null }]],
    ["species_media", [{ ...media, license_code: "" }]],
    ["species_media", [{ ...media, attribution_text: null }]],
    ["species_media", [{ ...media, approved: false }]],
    ["species_media", [{ ...media, species_id: sourceId }]],
    ["conservation_assessments", [{ ...assessment, source_id: null }]],
    ["conservation_assessments", [{ ...assessment, assessment_year: 2024.5 }]],
    [
      "conservation_assessments",
      [{ ...assessment, assessed_on: "2023-02-29" }],
    ],
    [
      "conservation_assessments",
      [
        {
          ...assessment,
          population_estimate_min: 10,
          population_estimate_max: 1,
        },
      ],
    ],
    [
      "species_sources",
      [{ species_id: speciesId, source_id: 123, section_key: "" }],
    ],
    ["species_sources", []],
    ["sources", [{ ...source, url: "file:///reference" }]],
    ["sources", [{ ...source, accessed_on: "2026-02-30" }]],
    ["sources", []],
  ] as Array<[string, unknown]>)(
    "rejects malformed %s rows",
    async (table, rows) => {
      const payloads = responses();
      payloads[table] = rows;
      await expect(
        getPublishedSpeciesDetail(httpClient(payloads).client, options),
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
        "q=CatalogFixture&status=&taxon=&region=&habitat=&sort=name&threatened=&page=1&view=grid",
      ),
    );
    const normalized = parseCatalogSearchParams(nativeForm);
    expect(normalized).toMatchObject({
      ok: true,
      value: {
        query: "CatalogFixture",
        status: null,
        threatened: false,
        taxon: null,
        region: null,
        habitat: null,
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
    for (const key of ["taxon", "region", "habitat"]) {
      const params = Object.fromEntries(
        new URLSearchParams(`${key}=%20%C2%A0`),
      );
      expect(parseCatalogSearchParams(params).ok).toBe(false);
    }
  });
  it.each([
    { status: ["CR", "EN"] },
    { surprise: "1" },
    { status: "CR", threatened: "1" },
    { page: "01" },
    { q: "x".repeat(101) },
    { sort: "random" },
    { threatened: "true" },
  ])("rejects invalid URL input %#", (params) =>
    expect(parseCatalogSearchParams(params).ok).toBe(false),
  );
});
