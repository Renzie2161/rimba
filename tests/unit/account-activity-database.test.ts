import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const first = "10000000-0000-4000-8000-000000000001";
const second = "10000000-0000-4000-8000-000000000002";
const publishedSpecies = "20000000-0000-4000-8000-000000000001";
const unpublishedSpecies = "20000000-0000-4000-8000-000000000002";
const speciesIds = Array.from(
  { length: 21 },
  (_, index) =>
    `30000000-0000-4000-8000-${(index + 1).toString(16).padStart(12, "0")}`,
);
let db: PGlite;

async function asUser(id: string, provider: string | null = "google") {
  await db.exec("reset role");
  await db.query(
    "select set_config('app.uid', $1, false), set_config('app.jwt', $2, false)",
    [id, JSON.stringify({ app_metadata: { provider } })],
  );
  await db.exec("set role authenticated");
}

async function record(speciesId: string, activityType: string) {
  return db.query("select public.record_my_species_activity($1, $2)", [
    speciesId,
    activityType,
  ]);
}

async function getMyActivity() {
  return db.query<{
    activity_type: string;
    species_slug: string;
    species_common_name: string;
    species_scientific_name: string;
  }>("select * from public.get_my_species_activity()");
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as
      $$ select coalesce(nullif(current_setting('app.jwt', true), ''), '{}')::jsonb $$;
    grant usage on schema auth to authenticated, anon;
    create table public.species(
      id uuid primary key,
      slug text not null unique,
      scientific_name text not null,
      status text not null
    );
    create table public.species_translations(
      species_id uuid not null references public.species(id),
      locale text not null,
      common_name text not null,
      translation_status text not null,
      unique(species_id, locale)
    );
    create function public.is_published_species(target uuid) returns boolean
      language sql stable security definer set search_path = '' as $$
        select exists (
          select 1 from public.species where id = target and status = 'published'
        );
      $$;
    insert into auth.users values ('${first}'), ('${second}');
    insert into public.species values
      ('${publishedSpecies}', 'harimau-sumatra', 'Panthera tigris sumatrae', 'published'),
      ('${unpublishedSpecies}', 'draft-species', 'Species draft', 'draft');
    insert into public.species_translations values
      ('${publishedSpecies}', 'id', 'Harimau Sumatra', 'published');
  `);

  for (const [index, id] of speciesIds.entries()) {
    await db.query(
      "insert into public.species values ($1, $2, $3, 'published')",
      [id, `species-${index}`, `Species ${index}`],
    );
    await db.query(
      "insert into public.species_translations values ($1, 'id', $2, 'published')",
      [id, `Spesies ${index}`],
    );
  }

  await db.exec(
    readFileSync(
      new URL(
        "../../supabase/migrations/0015_account_species_activity.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
}, 30000);

beforeEach(async () => {
  await db.exec("reset role");
  await db.query(
    "select set_config('app.uid', '', false), set_config('app.jwt', '{}', false)",
  );
  await db.exec("truncate public.account_species_activity");
});

afterAll(async () => {
  await db?.close();
});

describe("private profile species activity", () => {
  it("account_activity_viewed_is_recorded", async () => {
    await asUser(first);
    await record(publishedSpecies, "viewed");

    const result = await getMyActivity();
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      activity_type: "viewed",
      species_slug: "harimau-sumatra",
      species_common_name: "Harimau Sumatra",
      species_scientific_name: "Panthera tigris sumatrae",
    });
  });

  it("account_activity_identification_and_published_species_rules", async () => {
    await asUser(first);
    await record(publishedSpecies, "identified");
    await record(unpublishedSpecies, "viewed");
    await expect(record(publishedSpecies, "other")).rejects.toThrow(
      "INVALID_ACTIVITY_TYPE",
    );

    const result = await getMyActivity();
    expect(result.rows.map(({ activity_type }) => activity_type)).toEqual([
      "identified",
    ]);
  });

  it("does_not_record_activity_without_google_provider", async () => {
    await asUser(first, null);
    await record(publishedSpecies, "viewed");
    await db.exec("reset role");
    const result = await db.query<{ count: string }>(
      "select count(*)::text as count from public.account_species_activity where account_id = $1",
      [first],
    );

    expect(result.rows[0]?.count).toBe("0");
  });

  it("limits_account_activity_to_20_recent_events", async () => {
    for (const [index, speciesId] of speciesIds.entries()) {
      await db.query(
        "insert into public.account_species_activity (account_id, species_id, activity_type, occurred_at) values ($1, $2, 'viewed', $3)",
        [first, speciesId, new Date(Date.UTC(2026, 0, 1, index)).toISOString()],
      );
    }
    await asUser(first);
    const result = await getMyActivity();

    expect(result.rows).toHaveLength(20);
    expect(result.rows[0]?.species_slug).toBe("species-20");
    expect(
      result.rows.some(({ species_slug }) => species_slug === "species-0"),
    ).toBe(false);
  });

  it("account_activity_owner_isolation_and_anon_denial", async () => {
    await asUser(first);
    await record(publishedSpecies, "viewed");

    await asUser(second);
    expect((await getMyActivity()).rows).toEqual([]);

    await db.exec("reset role; set role anon");
    await expect(getMyActivity()).rejects.toMatchObject({ code: "42501" });
    await expect(
      db.query("select * from public.account_species_activity"),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(record(publishedSpecies, "viewed")).rejects.toMatchObject({
      code: "42501",
    });
  });
});
