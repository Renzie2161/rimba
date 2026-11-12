import { describe, expect, it, vi } from "vitest";
import { POST } from "../../src/app/api/identify/resolve/route";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getPublishedSpeciesDetail: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));
vi.mock("@/features/species/queries", () => ({
  getPublishedSpeciesDetail: mocks.getPublishedSpeciesDetail,
}));

describe("identify taxon resolution request bounds", () => {
  it("rejects an oversized body even without Content-Length", async () => {
    const request = new Request("http://localhost/api/identify/resolve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        taxonKeys: ["3190712"],
        padding: "x".repeat(2048),
      }),
    });
    expect(request.headers.has("content-length")).toBe(false);

    const response = await POST(request);

    expect(response.status).toBe(413);
  });
});

describe("identify species card lookup", () => {
  it("returns verified published species names and lead media", async () => {
    const id = "6f9a6326-3d9c-462e-a05c-e5d23ddae111";
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [{ id, slug: "pakis-pedang", gbif_taxon_key: "2650927" }],
        error: null,
      }),
    };
    const client = { from: vi.fn(() => query) };
    mocks.createSupabaseServerClient.mockReturnValue(client);
    mocks.getPublishedSpeciesDetail.mockResolvedValue({
      id,
      slug: "pakis-pedang",
      gbifTaxonKey: "2650927",
      commonName: "Pakis pedang",
      scientificName: "Nephrolepis exaltata",
      media: [
        {
          url: "/media/pakis-pedang.jpg",
          alt: "Pakis pedang",
          positionX: 50,
          positionY: 45,
        },
      ],
    });

    const response = await POST(
      new Request("http://localhost/api/identify/resolve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taxonKeys: ["2650927"] }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      species: [
        {
          id,
          slug: "pakis-pedang",
          taxonKey: "2650927",
          commonName: "Pakis pedang",
          scientificName: "Nephrolepis exaltata",
          media: {
            url: "/media/pakis-pedang.jpg",
            alt: "Pakis pedang",
            positionX: 50,
            positionY: 45,
          },
        },
      ],
    });
  });
});
