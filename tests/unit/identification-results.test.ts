import { describe, expect, it } from "vitest";
import type { ModelCandidate } from "../../src/features/identification/domain/types";
import {
  displayCandidates,
  formatModelScore,
} from "../../src/features/identification/presentation/result-candidates";

function candidate(overrides: Partial<ModelCandidate> = {}): ModelCandidate {
  return {
    modelClassIndex: 0,
    scientificName: "Nephrolepis exaltata",
    modelScore: 0.75,
    inEncyclopedia: false,
    ...overrides,
  };
}

describe("identification result candidates", () => {
  it("keeps ranked unique candidates and hides zero or invalid scores", () => {
    const visible = displayCandidates([
      candidate({ modelClassIndex: 2, canonicalTaxonId: "taxon-a" }),
      candidate({
        modelClassIndex: 3,
        canonicalTaxonId: "taxon-a",
        modelScore: 0.2,
      }),
      candidate({
        modelClassIndex: 4,
        scientificName: "Pteris vittata",
        modelScore: 0.3,
      }),
      candidate({
        modelClassIndex: 5,
        scientificName: "pteris vittata",
        modelScore: 0.1,
      }),
      candidate({ modelClassIndex: 6, modelScore: 0 }),
      candidate({ modelClassIndex: 7, modelScore: Number.NaN }),
    ]);

    expect(visible.map(({ modelClassIndex }) => modelClassIndex)).toEqual([
      2, 4,
    ]);
    expect(visible[0]?.modelScore).toBe(0.75);
  });

  it("deduplicates scientific-name variants across taxon ids", () => {
    const visible = displayCandidates([
      candidate({
        modelClassIndex: 8,
        scientificName: "Nephrolepis cordifolia (L.) C. Presl",
        canonicalTaxonId: "taxon-a",
        modelScore: 0.2,
      }),
      candidate({
        modelClassIndex: 9,
        scientificName: "Nephrolepis cordifolia (L.) C.Presl",
        canonicalTaxonId: "taxon-b",
        modelScore: 0.009,
      }),
    ]);

    expect(visible).toHaveLength(1);
    expect(visible[0]).toMatchObject({
      modelClassIndex: 8,
      modelScore: 0.2,
    });
  });

  it("shows small positive scores without rounding them to zero", () => {
    expect(formatModelScore(0.009)).toBe("<1%");
    expect(formatModelScore(0.01)).toBe("1%");
    expect(formatModelScore(0.428)).toBe("43%");
  });
});
