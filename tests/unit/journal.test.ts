import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { getJournalDemoEntries } from "@/features/journal/queries";

function demoRow(index: number) {
  return {
    id: `d3000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    common_name: `Demo taxon ${index + 1}`,
    scientific_name: `Genus species ${index + 1}`,
    entry_group: index < 3 ? "flora" : "fauna",
    observed_at: `2026-10-${String(30 - index).padStart(2, "0")}T08:00:00+07:00`,
    region_label: `Demo · Region ${index + 1}`,
    image_path: `/images/journal-demo/demo-${index + 1}.jpg`,
    image_alt: `Gambar demo ${index + 1}`,
    needs_review: index < 2,
    is_demo: true,
  };
}

const rows = Array.from({ length: 7 }, (_, index) => demoRow(index));

function httpClient(payload: unknown, status = 200, count?: number) {
  const requests: Request[] = [];
  const fetchStub: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    requests.push(request);
    const rowCount = Array.isArray(payload) ? payload.length : 0;
    const responseCount = count ?? rowCount;
    const contentRange =
      rowCount === 0
        ? `*/${responseCount}`
        : `0-${rowCount - 1}/${responseCount}`;
    return new Response(
      JSON.stringify(
        status === 200
          ? payload
          : {
              message: "Database read denied",
              code: "42501",
              details: null,
              hint: null,
            },
      ),
      {
        status,
        headers: {
          "Content-Type": "application/json",
          "Content-Range": contentRange,
        },
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

describe("journal demo HTTP query", () => {
  it("returns validated demo rows in stable order with one bounded read", async () => {
    const { client, requests } = httpClient(rows);

    const entries = await getJournalDemoEntries(client);

    expect(entries).toHaveLength(7);
    expect(entries.every((entry) => entry.isDemo)).toBe(true);
    expect(
      entries.every(
        (entry) =>
          entry.regionLabel.startsWith("Demo · ") &&
          entry.imagePath.startsWith("/images/journal-demo/"),
      ),
    ).toBe(true);
    expect(new Set(entries.map((entry) => entry.group))).toEqual(
      new Set(["flora", "fauna"]),
    );
    expect(entries.some((entry) => entry.needsReview)).toBe(true);
    expect(entries.some((entry) => !entry.needsReview)).toBe(true);
    const observedTimes = entries.map((entry) => Date.parse(entry.observedAt));
    expect(observedTimes).toEqual(
      [...observedTimes].sort((earlier, later) => later - earlier),
    );
    expect(requests).toHaveLength(1);
    const request = requests[0];
    if (!request) throw new Error("Journal query did not make an HTTP request");
    const params = new URL(request.url).searchParams;
    expect(params.get("order")).toBe("observed_at.desc,id.asc");
    expect(params.get("limit")).toBe("100");
  });

  it.each([0, 1, 6, 7])(
    "returns an exact database row count of %i",
    async (count) => {
      const { client } = httpClient(rows.slice(0, count), 200, count);

      const entries = await getJournalDemoEntries(client);

      expect(entries).toHaveLength(count);
      expect(entries.every((entry) => entry.isDemo)).toBe(true);
    },
  );

  it("rejects a truncated response count", async () => {
    const { client } = httpClient(rows.slice(0, 6), 200, 7);

    await expect(getJournalDemoEntries(client)).rejects.toThrow(
      "Journal demo result exceeds its exact bounded read",
    );
  });

  it("rejects responses over the fixed read cap", async () => {
    const overCapRows = Array.from({ length: 100 }, (_, index) =>
      demoRow(index),
    );
    const { client } = httpClient(overCapRows, 200, 101);

    await expect(getJournalDemoEntries(client)).rejects.toThrow(
      "Journal demo result exceeds its exact bounded read",
    );
  });

  it.skipIf(!process.env.RIMBA_JOURNAL_DEMO_JSON)(
    "validates the actual disposable SQL rows through the HTTP consumer",
    async () => {
      const serializedRows = process.env.RIMBA_JOURNAL_DEMO_JSON;
      if (!serializedRows)
        throw new Error("Disposable journal rows were not provided");
      const rawRows: unknown[] = JSON.parse(serializedRows);
      const { client } = httpClient(rawRows);

      const entries = await getJournalDemoEntries(client);

      expect(entries).toHaveLength(rawRows.length);
      expect(
        entries.every(
          (entry) =>
            entry.isDemo &&
            entry.regionLabel.startsWith("Demo · ") &&
            entry.imagePath.startsWith("/images/journal-demo/"),
        ),
      ).toBe(true);
      const observedTimes = entries.map((entry) =>
        Date.parse(entry.observedAt),
      );
      expect(observedTimes).toEqual(
        [...observedTimes].sort((earlier, later) => later - earlier),
      );
    },
  );

  it.each([
    ["an offset-less timestamp", { observed_at: "2026-10-30T08:00:00" }],
    ["a malformed timestamp", { observed_at: "not-a-timestamp" }],
    ["a non-local image URL", { image_path: "https://example.org/photo.jpg" }],
    ["a non-demo row", { is_demo: false }],
  ])(
    "rejects %s instead of returning an invalid entry",
    async (_label, change) => {
      const { client } = httpClient(
        rows.map((row, index) => (index === 0 ? { ...row, ...change } : row)),
      );

      await expect(getJournalDemoEntries(client)).rejects.toThrow();
    },
  );

  it("propagates database read errors", async () => {
    const { client } = httpClient(null, 403);

    await expect(getJournalDemoEntries(client)).rejects.toMatchObject({
      code: "42501",
    });
  });
});
