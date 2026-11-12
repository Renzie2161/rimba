import { describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import {
  createPlantNetResNet18Adapter,
  plantNetLabelsSchema,
  rankPlantNetLogits,
  rgbaToNchw,
  sha256Hex,
  type PlantNetLabel,
} from "../../src/features/identification/models/plantnet-resnet18";
import {
  resolveRimbaCandidates,
  resolveTaxonRequestSchema,
  resolveTaxonResponseSchema,
} from "../../src/features/identification/domain/taxon-resolution";
import { plantNetManifest } from "../../src/features/identification/models/plantnet-resnet18.manifest";
vi.mock("onnxruntime-web/wasm", () => ({
  env: { wasm: {} },
  InferenceSession: { create: vi.fn() },
}));

const label = (classIndex: number, scientificName: string): PlantNetLabel => ({
  classIndex,
  plantnetSpeciesId: String(classIndex),
  scientificName,
});

function first<T>(items: readonly T[]): T {
  const value = items[0];
  if (value === undefined) throw new Error("Expected an item");
  return value;
}

describe("PlantNet output interpretation", () => {
  it("returns the five highest model classes without filtering to RIMBA", () => {
    const labels = Array.from({ length: 6 }, (_, index) =>
      index === 5
        ? { ...label(index, `Species ${index}`), canonicalTaxonId: "3190712" }
        : label(index, `Species ${index}`),
    );

    const candidates = rankPlantNetLogits(
      Float32Array.from([1000, 999, 998, 997, 996, 1001]),
      labels,
    );

    expect(candidates.map(({ modelClassIndex }) => modelClassIndex)).toEqual([
      5, 0, 1, 2, 3,
    ]);
    expect(candidates[0]).toMatchObject({
      scientificName: "Species 5",
      canonicalTaxonId: "3190712",
      inEncyclopedia: false,
    });
    expect(
      candidates.every(({ modelScore }) => Number.isFinite(modelScore)),
    ).toBe(true);
  });

  it("rejects logits that cannot be safely paired with labels", () => {
    expect(() => rankPlantNetLogits([1], [])).toThrow();
    expect(() =>
      rankPlantNetLogits([Number.NaN], [label(0, "Species 0")]),
    ).toThrow();
  });

  it("converts RGBA pixels to normalized NCHW RGB values", () => {
    const tensor = rgbaToNchw(
      new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]),
      2,
      1,
    );

    expect(tensor).toHaveLength(6);
    expect(tensor[0]).toBeCloseTo((1 - 0.485) / 0.229, 5);
    expect(tensor[1]).toBeCloseTo((0 - 0.485) / 0.229, 5);
    expect(tensor[2]).toBeCloseTo((0 - 0.456) / 0.224, 5);
    expect(tensor[3]).toBeCloseTo((1 - 0.456) / 0.224, 5);
    expect(tensor[4]).toBeCloseTo((0 - 0.406) / 0.225, 5);
    expect(tensor[5]).toBeCloseTo((0 - 0.406) / 0.225, 5);
  });
});

describe("model artifact integrity", () => {
  it("computes the standard SHA-256 digest", async () => {
    const bytes = new TextEncoder().encode("abc");
    await expect(sha256Hex(bytes)).resolves.toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});

describe("exact RIMBA taxon resolution", () => {
  it("links only candidates with an exact stable taxon key", () => {
    const candidate = first(
      rankPlantNetLogits(
        [1],
        [{ ...label(0, "Nepenthes mirabilis"), canonicalTaxonId: "3190712" }],
      ),
    );
    const response = resolveTaxonResponseSchema.parse({
      species: [
        {
          id: "species-id",
          slug: "nepenthes-mirabilis",
          taxonKey: "3190712",
          commonName: "Kantong semar",
          scientificName: "Nepenthes mirabilis",
          media: {
            url: "/species/nepenthes-mirabilis.jpg",
            alt: "Nepenthes mirabilis",
            positionX: 50,
            positionY: 50,
          },
        },
      ],
    });
    const resolved = first(
      resolveRimbaCandidates([candidate], response.species),
    );

    expect(resolved).toMatchObject({
      inEncyclopedia: true,
      rimbaSpecies: {
        id: "species-id",
        slug: "nepenthes-mirabilis",
        commonName: "Kantong semar",
        scientificName: "Nepenthes mirabilis",
        media: {
          url: "/species/nepenthes-mirabilis.jpg",
          alt: "Nepenthes mirabilis",
        },
      },
    });
  });

  it("links the publisher label for Nephrolepis exaltata to its RIMBA species", () => {
    const mapping = first(
      plantNetManifest.supportedRimbaSpecies.filter(
        ({ modelSpeciesId }) => modelSpeciesId === "1356421",
      ),
    );
    const candidate = first(
      rankPlantNetLogits(
        [1],
        [
          {
            classIndex: mapping.classIndex,
            plantnetSpeciesId: mapping.modelSpeciesId,
            scientificName: mapping.scientificName,
            canonicalTaxonId: mapping.canonicalTaxonId,
          },
        ],
      ),
    );
    const resolved = first(
      resolveRimbaCandidates(
        [candidate],
        [
          {
            id: "nephrolepis-id",
            slug: "pakis-pedang",
            taxonKey: "2650927",
            commonName: "Pakis pedang",
            scientificName: "Nephrolepis exaltata",
            media: null,
          },
        ],
      ),
    );

    expect(mapping).toMatchObject({
      classIndex: 27,
      modelSpeciesId: "1356421",
      scientificName: "Nephrolepis exaltata (L.) Schott",
      canonicalTaxonId: "2650927",
    });
    expect(resolved).toMatchObject({
      inEncyclopedia: true,
      rimbaSpecies: {
        id: "nephrolepis-id",
        slug: "pakis-pedang",
        commonName: "Pakis pedang",
        scientificName: "Nephrolepis exaltata",
        media: null,
      },
    });
  });

  it("does not guess by name or choose among duplicate taxon rows", () => {
    const namedOnly = first(rankPlantNetLogits([1], [label(0, "Species")]));
    const unlinked = first(
      resolveRimbaCandidates(
        [namedOnly],
        [
          {
            id: "species-id",
            slug: "species",
            taxonKey: "1",
            commonName: "Species",
            scientificName: "Species",
            media: null,
          },
        ],
      ),
    );
    expect(unlinked.inEncyclopedia).toBe(false);

    const mappedCandidate = first(
      rankPlantNetLogits(
        [1],
        [{ ...label(0, "Species"), canonicalTaxonId: "1" }],
      ),
    );
    const ambiguous = first(
      resolveRimbaCandidates(
        [mappedCandidate],
        [
          {
            id: "species-1",
            slug: "species-one",
            taxonKey: "1",
            commonName: "Species one",
            scientificName: "Species one",
            media: null,
          },
          {
            id: "species-2",
            slug: "species-two",
            taxonKey: "1",
            commonName: "Species two",
            scientificName: "Species two",
            media: null,
          },
        ],
      ),
    );
    expect(ambiguous.inEncyclopedia).toBe(false);
  });

  it("accepts bounded taxon-only requests and rejects image payloads", () => {
    expect(
      resolveTaxonRequestSchema.safeParse({ taxonKeys: ["3190712"] }).success,
    ).toBe(true);
    expect(
      resolveTaxonRequestSchema.safeParse({
        taxonKeys: ["3190712"],
        image: "data:image/jpeg;base64,...",
      }).success,
    ).toBe(false);
    expect(
      resolveTaxonRequestSchema.safeParse({ taxonKeys: ["not-a-taxon"] })
        .success,
    ).toBe(false);
  });
});

describe("PlantNet label cache", () => {
  it("revalidates cached labels before checking the current taxon mapping", async () => {
    const labels = plantNetLabelsSchema.parse(
      JSON.parse(
        await readFile(
          new URL(
            "../../public/ai/labels/plantnet-resnet18.json",
            import.meta.url,
          ),
          "utf8",
        ),
      ),
    );
    const staleLabels = labels.map((item) => ({
      ...item,
      canonicalTaxonId: undefined,
    }));
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith(plantNetManifest.labelsPath)) {
          const body = init?.cache === "no-cache" ? labels : staleLabels;
          return new Response(JSON.stringify(body), {
            headers: { "content-type": "application/json" },
          });
        }
        if (url.endsWith(plantNetManifest.artifactUrl)) {
          return new Response(null, { status: 404 });
        }
        throw new Error(`Unexpected model asset: ${url}`);
      },
    );
    vi.stubGlobal("window", { location: { origin: "http://localhost" } });
    vi.stubGlobal("fetch", fetchMock);
    const adapter = createPlantNetResNet18Adapter();

    try {
      await expect(adapter.load()).rejects.toThrow("Model file unavailable");
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
        cache: "no-cache",
      });
    } finally {
      await adapter.dispose();
      vi.unstubAllGlobals();
    }
  });
});
