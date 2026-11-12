import type { ModelCandidate } from "../domain/types";

function normalizeScientificName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s*\.\s*/g, ".")
    .replace(/\s+/g, " ");
}

export function displayCandidates(
  candidates: readonly ModelCandidate[],
): ModelCandidate[] {
  const seenTaxonIds = new Set<string>();
  const seenNames = new Set<string>();
  const seenClasses = new Set<number>();
  const visible: ModelCandidate[] = [];

  for (const candidate of candidates) {
    if (!Number.isFinite(candidate.modelScore) || candidate.modelScore <= 0) {
      continue;
    }

    const taxonId = candidate.canonicalTaxonId?.trim().toLowerCase();
    const name = normalizeScientificName(candidate.scientificName);
    if (
      seenClasses.has(candidate.modelClassIndex) ||
      (taxonId && seenTaxonIds.has(taxonId)) ||
      (name && seenNames.has(name))
    ) {
      continue;
    }

    seenClasses.add(candidate.modelClassIndex);
    if (taxonId) seenTaxonIds.add(taxonId);
    if (name) seenNames.add(name);
    visible.push(candidate);
  }

  return visible;
}

export function formatModelScore(score: number): string {
  if (score > 0 && score < 0.01) return "<1%";
  return `${Math.round(score * 100)}%`;
}
