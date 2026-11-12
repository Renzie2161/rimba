import { createHash } from "node:crypto";

import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  parseINaturalistTaxonomyCsv,
  rankINaturalistScores,
} from "../../src/features/identification/models/inaturalist-small";
import { iNaturalistSmallManifest } from "../../src/features/identification/models/inaturalist-small.manifest";

const csvHeader =
  "parent_taxon_id,taxon_id,rank_level,leaf_class_id,iconic_class_id,spatial_class_id,spatial_threshold,name";

function taxonomyCsv(rows: string[]) {
  return [csvHeader, ...rows].join("\n");
}

describe("iNaturalist taxonomy labels", () => {
  it("checks the checkpoint and taxonomy against pinned digests", async () => {
    const [model, taxonomy] = await Promise.all([
      readFile(
        new URL(
          "../../public/ai/models/inaturalist-small/v25.01.15/model.tflite",
          import.meta.url,
        ),
      ),
      readFile(
        new URL(
          "../../public/ai/labels/inaturalist-small/v25.01.15/taxonomy.csv",
          import.meta.url,
        ),
      ),
    ]);

    expect(model.byteLength).toBe(iNaturalistSmallManifest.byteSize);
    expect(createHash("sha256").update(model).digest("hex")).toBe(
      iNaturalistSmallManifest.sha256,
    );
    expect(createHash("sha256").update(taxonomy).digest("hex")).toBe(
      iNaturalistSmallManifest.labelSourceSha256,
    );
  });

  it("pairs all 507 output classes with their published leaf IDs", async () => {
    const source = await readFile(
      new URL(
        "../../public/ai/labels/inaturalist-small/v25.01.15/taxonomy.csv",
        import.meta.url,
      ),
      "utf8",
    );
    const labels = parseINaturalistTaxonomyCsv(source);

    expect(labels).toHaveLength(507);
    expect(labels[0]).toMatchObject({
      classIndex: 0,
      taxonId: "50931",
      scientificName: "Strymon melinus",
    });
    expect(labels[506]).toMatchObject({
      classIndex: 506,
      taxonId: "9100",
      scientificName: "Melospiza melodia",
    });
    expect(labels.every((label, index) => label.classIndex === index)).toBe(
      true,
    );
  });

  it("uses leaf_class_id rather than taxonomy row order", () => {
    const labels = parseINaturalistTaxonomyCsv(
      taxonomyCsv([
        ",1,70,,,,,Animalia",
        "1,22,10,1,1,,,Taxon B",
        "1,11,10,0,1,,,Taxon A",
      ]),
      2,
    );

    expect(
      labels.map(({ classIndex, taxonId, scientificName }) => ({
        classIndex,
        taxonId,
        scientificName,
      })),
    ).toEqual([
      { classIndex: 0, taxonId: "11", scientificName: "Taxon A" },
      { classIndex: 1, taxonId: "22", scientificName: "Taxon B" },
    ]);
  });

  it("rejects duplicate or missing output class IDs", () => {
    expect(() =>
      parseINaturalistTaxonomyCsv(
        taxonomyCsv(["1,11,10,0,1,,,Taxon A", "1,22,10,0,1,,,Taxon B"]),
        2,
      ),
    ).toThrow();
    expect(() =>
      parseINaturalistTaxonomyCsv(taxonomyCsv(["1,11,10,0,1,,,Taxon A"]), 2),
    ).toThrow();
  });
});

describe("iNaturalist model scores", () => {
  it("ranks output classes without treating iNaturalist IDs as RIMBA taxon keys", () => {
    const labels = parseINaturalistTaxonomyCsv(
      taxonomyCsv([
        "1,11,10,0,1,,,Taxon A",
        "1,22,10,1,1,,,Taxon B",
        "1,33,10,2,1,,,Taxon C",
      ]),
      3,
    );

    const candidates = rankINaturalistScores([0.1, 0.95, 0.3], labels);

    expect(candidates.map(({ modelClassIndex }) => modelClassIndex)).toEqual([
      1, 2, 0,
    ]);
    expect(candidates[0]).toMatchObject({
      scientificName: "Taxon B",
      modelScore: 0.95,
      inEncyclopedia: false,
    });
    expect(candidates[0]).not.toHaveProperty("canonicalTaxonId");
  });

  it("rejects non-finite or out-of-range scores", () => {
    const labels = parseINaturalistTaxonomyCsv(
      taxonomyCsv(["1,11,10,0,1,,,Taxon A"]),
      1,
    );

    expect(() => rankINaturalistScores([Number.NaN], labels)).toThrow();
    expect(() => rankINaturalistScores([1.1], labels)).toThrow();
  });
});
