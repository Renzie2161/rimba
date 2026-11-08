import { spawnSync } from "node:child_process";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { randomInt } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verifyConcurrentMutations } from "./test-concurrency.mjs";

// Disposable loopback cluster only; app credentials and existing databases stay untouched.
const directory = mkdtempSync(join(tmpdir(), "rimba-postgres-"));
const cluster = join(directory, "cluster");
const port = String(randomInt(20000, 50000));
const environment = { ...process.env };
for (const key of Object.keys(environment))
  if (key.startsWith("PG")) delete environment[key];
environment.PGCONNECT_TIMEOUT = "10";
environment.PGSSLMODE = "disable";
function command(binary, args) {
  const result = spawnSync(binary, args, {
    stdio: binary === "pg_ctl" ? "ignore" : ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    env: environment,
    timeout: 120000,
  });
  if (result.error || result.status !== 0)
    throw new Error(
      result.stderr || result.error?.message || `${binary} failed`,
    );
  return result.stdout ?? "";
}
function psql(sql) {
  const sqlPath = join(directory, "query.sql");
  writeFileSync(sqlPath, sql);
  return command("psql", [
    "-X",
    "-w",
    "-h",
    "::1",
    "-p",
    port,
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
    "-At",
    "-f",
    sqlPath,
  ]);
}
function seedSql(entries) {
  const inputPath = join(directory, "seeds.json");
  writeFileSync(inputPath, JSON.stringify(entries));
  return command(process.execPath, [
    "scripts/seed-species.mjs",
    "--sql",
    inputPath,
  ]);
}
let started = false;
try {
  console.log("Starting disposable PostgreSQL cluster");
  command("initdb", [
    "-D",
    cluster,
    "-U",
    "postgres",
    "--auth=trust",
    "--encoding=UTF8",
    "--no-locale",
  ]);
  started = true;
  command("pg_ctl", [
    "-D",
    cluster,
    "-l",
    join(directory, "postgres.log"),
    "-o",
    `-p ${port} -h ::1 -F`,
    "-w",
    "start",
  ]);
  psql(`create role anon nologin; create role authenticated nologin;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$; grant usage on schema auth to anon, authenticated;`);
  psql(
    readFileSync(
      new URL(
        "../supabase/migrations/0001_biodiversity_backbone.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  console.log(
    psql(
      readFileSync(
        new URL("../supabase/tests/backbone.sql", import.meta.url),
        "utf8",
      ),
    ),
  );
  psql(
    readFileSync(
      new URL(
        "../supabase/migrations/0002_species_catalog.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  psql(
    readFileSync(
      new URL("../supabase/migrations/0003_journal_demo.sql", import.meta.url),
      "utf8",
    ),
  );
  if (psql("select count(*) from public.journal_demo_entries;").trim() !== "0")
    throw new Error("Journal migration inserted demo rows by default");
  const catalogOutput = psql(
    readFileSync(
      new URL("../supabase/tests/catalog.sql", import.meta.url),
      "utf8",
    ),
  );
  const catalogMarker = "__CATALOG_RPC_JSON__";
  const serializedCatalog = catalogOutput
    .split(/\r?\n/)
    .find((line) => line.startsWith(catalogMarker))
    ?.slice(catalogMarker.length);
  if (!serializedCatalog)
    throw new Error("Disposable catalog RPC JSON was not emitted");
  environment.RIMBA_CATALOG_RPC_JSON = serializedCatalog;
  console.log(
    catalogOutput
      .split(/\r?\n/)
      .filter((line) => !line.startsWith(catalogMarker))
      .join("\n"),
  );
  console.log(
    command(process.execPath, [
      "node_modules/vitest/vitest.mjs",
      "run",
      "tests/unit/species.test.ts",
      "-t",
      "validates actual disposable SQL catalog response",
    ]),
  );
  const journalSeed = readFileSync(
    new URL("../supabase/seeds/journal-demo.sql", import.meta.url),
    "utf8",
  );
  psql(journalSeed);
  const journalOutput = psql(
    readFileSync(
      new URL("../supabase/tests/journal-demo.sql", import.meta.url),
      "utf8",
    ),
  );
  const journalMarker = "__JOURNAL_DEMO_JSON__";
  const serializedJournal = journalOutput
    .split(/\r?\n/)
    .find((line) => line.startsWith(journalMarker))
    ?.slice(journalMarker.length);
  if (!serializedJournal) throw new Error("Journal SQL payload is missing");
  environment.RIMBA_JOURNAL_DEMO_JSON = serializedJournal;
  console.log(
    journalOutput
      .split(/\r?\n/)
      .filter((line) => !line.startsWith(journalMarker))
      .join("\n"),
  );
  psql(`begin;
    update public.journal_demo_entries
      set region_label = 'Demo · Preservation check'
      where id = 'd3000000-0000-4000-8000-000000000001';
    insert into public.journal_demo_entries (
      id, common_name, scientific_name, entry_group, observed_at,
      region_label, image_path, image_alt
    ) values (
      'd3000000-0000-4000-8000-000000000099', 'Existing row',
      'Existing taxon', 'flora', '2026-01-01T08:00:00+07:00',
      'Demo · Existing', '/images/journal-demo/existing.jpg',
      'Gambar demo existing'
    );
    ${journalSeed}
    do $$ begin
      if (select count(*) from public.journal_demo_entries) <> 7
        or not exists (
          select 1 from public.journal_demo_entries
          where id = 'd3000000-0000-4000-8000-000000000001'
            and region_label = 'Demo · Preservation check'
        )
        or not exists (
          select 1 from public.journal_demo_entries
          where id = 'd3000000-0000-4000-8000-000000000099'
            and common_name = 'Existing row'
        ) then
        raise exception 'Journal seed altered or removed existing rows';
      end if;
    end $$;
    rollback;`);
  console.log(
    command(process.execPath, [
      "node_modules/vitest/vitest.mjs",
      "run",
      "tests/unit/journal.test.ts",
    ]),
  );
  delete environment.RIMBA_JOURNAL_DEMO_JSON;

  delete environment.RIMBA_CATALOG_RPC_JSON;
  await verifyConcurrentMutations(port, environment, psql);
  const fixture = JSON.parse(
    readFileSync(
      new URL("../supabase/tests/seed.json", import.meta.url),
      "utf8",
    ),
  );
  const attack = "Fixture'); DROP TABLE public.species; --\\\n\\! whoami\n$$";
  fixture[0].summary_id = attack;
  fixture[0].aliases = [
    { locale: "id", name: "Synthetic alias", kind: "test" },
  ];
  fixture[0].status_code = "LC";
  fixture[0].assessment_year = 2025;
  fixture[0].assessment_source_url = fixture[0].sources[0].url;
  fixture[0].assessment_scope = "Synthetic fixture scope";
  fixture[0].media = [
    {
      url: "https://example.org/synthetic.jpg",
      source_url: fixture[0].sources[0].url,
      license_url: "https://creativecommons.org/licenses/by/4.0/",
      license_code: "CC-BY-4.0",
      photographer: "Synthetic fixture author",
      attribution_text: "Synthetic test attribution, not a wildlife image",
      alt_id: "Fixture sintetis",
      taxon_scientific_name: fixture[0].scientific_name,
    },
  ];
  const draftSql = seedSql(fixture);
  psql(draftSql);
  psql(`do $$ declare target uuid;
    begin
      select id into strict target from public.species where slug='offline-import-fixture' and status='draft';
      if (select count(*) from public.species_aliases where species_id=target) <> 1
        or (select count(*) from public.conservation_assessments where species_id=target and assessment_scope='Synthetic fixture scope') <> 1
        or (select count(*) from public.species_media where species_id=target and not approved) <> 1
      then raise exception 'Seed relations were not imported as draft supporting data'; end if;
    end $$;`);
  const stored = psql(
    "select encode(convert_to(summary,'UTF8'),'hex') from public.species_translations where species_id in (select id from public.species where slug='offline-import-fixture');",
  ).trim();
  if (stored !== Buffer.from(attack).toString("hex"))
    throw new Error("SQL text did not round-trip safely");
  psql(
    "update public.species_translations set summary='Editorial change' where species_id in (select id from public.species where slug='offline-import-fixture');",
  );
  psql(draftSql);
  psql(`do $$ begin
    if (select count(*) from public.species where slug='offline-import-fixture') <> 1
      or not exists (select 1 from public.species_translations where summary='Editorial change')
      then raise exception 'Seed rerun overwrote content or duplicated species'; end if;
    end $$; create unique index test_source_collision on public.sources(title);`);
  let rejected = false;
  try {
    psql(seedSql([{ ...fixture[0], slug: "must-rollback-fixture" }]));
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !error.message.includes("test_source_collision")
    )
      throw error;
    rejected = true;
  }
  if (!rejected) throw new Error("Expected seed transaction conflict");
  psql(`do $$ begin
    if exists (select 1 from public.species where slug='must-rollback-fixture') then
      raise exception 'Seed conflict left partially imported species'; end if;
    end $$;`);
  psql("drop index public.test_source_collision;");
  const researchDrafts = JSON.parse(
    readFileSync(
      new URL("../supabase/seeds/species-drafts.json", import.meta.url),
      "utf8",
    ),
  );
  psql(seedSql(researchDrafts));
  const importedDraftCount = psql(
    "select count(*) from public.species where status='draft' and slug not in ('draft-fixture','offline-import-fixture');",
  ).trim();
  if (Number(importedDraftCount) !== researchDrafts.length)
    throw new Error("Research draft batch did not import completely");
  console.log(
    `PASS: ${importedDraftCount} researched profiles imported as drafts in disposable cluster only`,
  );
  console.log(
    "PASS: migration, RLS, publication, safe SQL round-trip, draft import, preserving rerun, atomic rollback",
  );
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Database verification failed",
  );
  process.exitCode = 1;
} finally {
  if (started) command("pg_ctl", ["-D", cluster, "-m", "fast", "-w", "stop"]);
  rmSync(directory, { recursive: true, force: true });
}
