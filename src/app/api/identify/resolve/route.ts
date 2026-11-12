import { z } from "zod";
import { resolveTaxonRequestSchema } from "@/features/identification/domain/taxon-resolution";
import { plantNetManifest } from "@/features/identification/models/plantnet-resnet18.manifest";
import { getPublishedSpeciesDetail } from "@/features/species/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const speciesRowSchema = z
  .object({
    id: z.uuid(),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    gbif_taxon_key: z.string().regex(/^\d+$/),
  })
  .strict();
const supportedTaxonKeys = new Set(
  plantNetManifest.supportedRimbaSpecies.map(
    ({ canonicalTaxonId }) => canonicalTaxonId,
  ),
);

type BoundedJsonBody =
  { kind: "ok"; value: unknown } | { kind: "invalid" } | { kind: "too-large" };

async function readBoundedJsonBody(
  request: Request,
  maxBytes: number,
): Promise<BoundedJsonBody> {
  if (!request.body) return { kind: "invalid" };
  try {
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let byteLength = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > maxBytes) {
        void reader.cancel().catch(() => undefined);
        return { kind: "too-large" };
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(byteLength);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { kind: "ok", value: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { kind: "invalid" };
  }
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > 1024) {
    return Response.json({ error: "request_too_large" }, { status: 413 });
  }

  const bodyResult = await readBoundedJsonBody(request, 1024);
  if (bodyResult.kind === "too-large") {
    return Response.json({ error: "request_too_large" }, { status: 413 });
  }
  const parsed = resolveTaxonRequestSchema.safeParse(
    bodyResult.kind === "ok" ? bodyResult.value : null,
  );
  if (!parsed.success) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const taxonKeys = parsed.data.taxonKeys.filter((key) =>
    supportedTaxonKeys.has(key),
  );
  if (taxonKeys.length === 0) return Response.json({ species: [] });

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from("species")
      .select("id,slug,gbif_taxon_key")
      .eq("status", "published")
      .eq("taxon_group", "flora")
      .in("gbif_taxon_key", taxonKeys);
    if (error)
      return Response.json({ error: "lookup_unavailable" }, { status: 503 });

    const rows = z.array(speciesRowSchema).safeParse(data ?? []);
    if (!rows.success) {
      return Response.json({ error: "lookup_unavailable" }, { status: 503 });
    }

    const matches = await Promise.all(
      rows.data.map(async ({ id, slug, gbif_taxon_key }) => {
        const detail = await getPublishedSpeciesDetail(client, {
          slug,
          locale: "id",
        });
        if (!detail) return null;
        if (detail.id !== id || detail.gbifTaxonKey !== gbif_taxon_key) {
          throw new Error("Species detail did not match taxon row");
        }
        const media = detail.media[0];
        return {
          id,
          slug,
          taxonKey: gbif_taxon_key,
          commonName: detail.commonName,
          scientificName: detail.scientificName,
          media: media
            ? {
                url: media.url,
                alt: media.alt,
                positionX: media.positionX,
                positionY: media.positionY,
              }
            : null,
        };
      }),
    );
    return Response.json({
      species: matches.filter((match) => match !== null),
    });
  } catch {
    return Response.json({ error: "lookup_unavailable" }, { status: 503 });
  }
}
