import { z } from "zod";
import type { ModelCandidate } from "./types";

const taxonKeySchema = z.string().regex(/^\d+$/).max(20);
const speciesMediaSchema = z
  .object({
    url: z.string().min(1),
    alt: z.string().min(1),
    positionX: z.number().min(0).max(100).nullable(),
    positionY: z.number().min(0).max(100).nullable(),
  })
  .strict();
const speciesMatchSchema = z
  .object({
    id: z.string().min(1),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    taxonKey: taxonKeySchema,
    commonName: z.string().min(1),
    scientificName: z.string().min(1),
    media: speciesMediaSchema.nullable(),
  })
  .strict();
export const resolveTaxonRequestSchema = z
  .object({ taxonKeys: z.array(taxonKeySchema).max(5) })
  .strict()
  .refine(
    ({ taxonKeys }) => new Set(taxonKeys).size === taxonKeys.length,
    "Taxon keys must be unique",
  );
export const resolveTaxonResponseSchema = z
  .object({ species: z.array(speciesMatchSchema).max(5) })
  .strict();

export type RimbaSpeciesMatch = z.infer<typeof speciesMatchSchema>;

export function resolveRimbaCandidates(
  candidates: readonly ModelCandidate[],
  matches: readonly RimbaSpeciesMatch[],
) {
  const grouped = new Map<string, RimbaSpeciesMatch[]>();
  for (const match of matches) {
    const group = grouped.get(match.taxonKey);
    if (group) group.push(match);
    else grouped.set(match.taxonKey, [match]);
  }

  return candidates.map((candidate) => {
    const group = candidate.canonicalTaxonId
      ? grouped.get(candidate.canonicalTaxonId)
      : undefined;
    const match = group?.length === 1 ? group[0] : undefined;
    return match
      ? {
          ...candidate,
          inEncyclopedia: true,
          rimbaSpecies: match,
        }
      : { ...candidate, inEncyclopedia: false };
  });
}
