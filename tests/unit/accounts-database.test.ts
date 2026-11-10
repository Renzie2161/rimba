import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const first = "10000000-0000-4000-8000-000000000001";
const second = "10000000-0000-4000-8000-000000000002";
let db: PGlite;
async function asUser(id: string, provider = "google") {
  await db.exec("reset role");
  await db.query(
    "select set_config('app.uid', $1, false), set_config('app.jwt', $2, false)",
    [id, JSON.stringify({ app_metadata: { provider } })],
  );
  await db.exec("set role authenticated");
}
async function save(username: string, name = "Penjelajah") {
  return db.query<{
    username: string;
    username_changed_at: Date;
    username_created_at: Date;
    display_name: string;
  }>("select * from public.save_my_account_profile($1, $2, '', '')", [
    username,
    name,
  ]);
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as
      $$ select coalesce(nullif(current_setting('app.jwt', true), ''), '{}')::jsonb $$;
    grant usage on schema auth to authenticated, anon;
    insert into auth.users values
      ('${first}', '{"full_name":"Penjelajah Satu"}'), ('${second}', '{}');
  `);
  await db.exec(
    readFileSync(
      new URL("../../supabase/migrations/0012_accounts.sql", import.meta.url),
      "utf8",
    ),
  );
}, 30000);
beforeEach(async () => {
  await db.exec("reset role");
  await db.query(
    "select set_config('app.uid', '', false), set_config('app.jwt', '{}', false)",
  );
  await db.exec("truncate public.account_profiles");
});

afterAll(async () => {
  await db?.close();
});

describe("profile database authorization and username cooldown", () => {
  it("creates a private Google profile before username onboarding", async () => {
    await asUser(first);
    const result = await db.query<{
      id: string;
      username: string | null;
      username_created_at: null;
    }>("select * from public.ensure_my_account_profile()");
    expect(result.rows[0]).toMatchObject({
      id: first,
      username: null,
      username_created_at: null,
    });
  });
  it("timestamps the initial username and locks subsequent changes", async () => {
    await asUser(first);
    const initial = (await save("penjelajah_satu")).rows[0]!;
    expect(initial.username_created_at).toEqual(initial.username_changed_at);
    expect(initial.username_created_at).toBeTruthy();
    await expect(save("username_baru")).rejects.toThrow("USERNAME_LOCKED");
    const updated = (await save("penjelajah_satu", "Nama Baru")).rows[0]!;
    expect(updated.display_name).toBe("Nama Baru");
    expect(updated.username_changed_at).toEqual(initial.username_changed_at);
  });
  it("prevents duplicate usernames and hides another user's profile", async () => {
    await asUser(first);
    await save("penjelajah_satu");
    await asUser(second);
    await db.query("select public.ensure_my_account_profile()");
    await expect(save("penjelajah_satu")).rejects.toMatchObject({
      code: "23505",
    });
    const rows = await db.query<{ id: string }>(
      "select id from public.account_profiles",
    );
    expect(rows.rows).toEqual([{ id: second }]);
  });
  it("rejects non-Google and unauthenticated profile writes", async () => {
    await asUser(second, "email");
    await expect(save("pengguna_email")).rejects.toThrow("GOOGLE_REQUIRED");
    expect(
      (await db.query("select * from public.account_profiles")).rows,
    ).toEqual([]);
    await db.exec("reset role; set role anon");
    await expect(
      db.query("select public.ensure_my_account_profile()"),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      db.query("select * from public.account_profiles"),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("blocks direct API writes and forged cooldown timestamps", async () => {
    await asUser(first);
    await expect(
      db.query(
        "update public.account_profiles set username_changed_at = now() - interval '8 days' where id = $1",
        [first],
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      db.query("insert into public.account_profiles(id) values($1)", [second]),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("allows a username change after seven days, preserving its creation time", async () => {
    await asUser(first);
    await save("penjelajah_lama");
    await db.exec("reset role");
    try {
      await db.exec(
        "alter table public.account_profiles disable trigger guard_account_username",
      );
      await db.query(
        "update public.account_profiles set username_created_at = now() - interval '8 days', username_changed_at = now() - interval '7 days' where id = $1",
        [first],
      );
    } finally {
      await db.exec(
        "alter table public.account_profiles enable trigger guard_account_username",
      );
    }
    await asUser(first);
    const updated = (await save("username_baru")).rows[0]!;
    expect(updated.username).toBe("username_baru");
    expect(new Date(updated.username_changed_at).getTime()).toBeGreaterThan(
      new Date(updated.username_created_at).getTime(),
    );
    await expect(save("username_lagi")).rejects.toThrow("USERNAME_LOCKED");
    await expect(save("Username_Besar")).rejects.toThrow("INVALID_PROFILE");
  });
});
