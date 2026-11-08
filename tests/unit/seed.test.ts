import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import fixtures from "../../supabase/tests/seed.json";

const entry = fixtures[0];
if (!entry) throw new Error("Missing synthetic import fixture");
const source = entry.sources[0];
if (!source) throw new Error("Missing synthetic source fixture");
const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

function runCli(input: unknown, raw = false, mode = "--sql") {
  const directory = mkdtempSync(join(tmpdir(), "rimba-seed-test-"));
  directories.push(directory);
  const inputPath = join(directory, "draft.json");
  writeFileSync(inputPath, raw ? String(input) : JSON.stringify(input));
  const guardPath = join(directory, "offline-only.mjs");
  writeFileSync(
    guardPath,
    `
import net from "node:net";
import http from "node:http";
import https from "node:https";
import childProcess from "node:child_process";
import fs from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
const reject = () => { throw new Error("Hosted side effect forbidden"); };
net.Socket.prototype.connect = reject;
http.request = http.get = https.request = https.get = reject;
globalThis.fetch = reject;
for (const key of ["exec", "execSync", "execFile", "execFileSync", "spawn", "spawnSync", "fork"]) childProcess[key] = reject;
const readFile = fs.readFile;
fs.readFile = (path, ...args) => {
  if (String(path).includes(".env")) reject();
  return readFile(path, ...args);
};
syncBuiltinESMExports();
`,
  );
  return spawnSync(
    process.execPath,
    [
      "--import",
      pathToFileURL(guardPath).href,
      resolve("scripts/seed-species.mjs"),
      mode,
      inputPath,
    ],
    {
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
      timeout: 10000,
      env: {
        ...process.env,
        SUPABASE_SERVICE_ROLE_KEY: "fixture-secret-must-not-leak",
      },
    },
  );
}

describe("offline draft validation", () => {
  it("validates explicit unknown assessment without media or hosted side effects", () => {
    const result = runCli([entry], false, "--validate");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("1 draft entr(ies)");
    expect(result.stderr).toBe("");
  });

  const invalidCases: Array<[string, unknown]> = [
    ["out-of-range featured rank", [{ ...entry, featured_rank: 2147483648 }]],
    [
      "unsupported assessment year",
      [
        {
          ...entry,
          status_code: "CR",
          assessment_year: 1499,
          assessment_source_url: source.url,
        },
      ],
    ],
    [
      "inexact population integer",
      [
        {
          ...entry,
          status_code: "CR",
          assessment_year: 2025,
          assessment_source_url: source.url,
          population_estimate_min: "9007199254740992",
          population_unit: "synthetic individuals",
          assessment_notes: "Synthetic fixture",
        },
      ],
    ],
    ["empty batch", []],
    ["duplicate slugs", [entry, entry]],
    ["missing sources", [{ ...entry, sources: [] }]],
    ["invalid calendar date", [{ ...entry, reviewed_at: "2026-02-30" }]],
    ["missing research reviewer", [{ ...entry, reviewed_by: "" }]],
    ["published state input", [{ ...entry, status: "published" }]],
    ["unknown assessment with a year", [{ ...entry, assessment_year: 2025 }]],
    [
      "assessment without citation",
      [{ ...entry, status_code: "CR", assessment_year: 2025 }],
    ],
    [
      "assessment citing unlinked source",
      [
        {
          ...entry,
          status_code: "CR",
          assessment_year: 2025,
          assessment_source_url: "https://example.org/unlinked",
        },
      ],
    ],
    [
      "credential-bearing source URL",
      [
        {
          ...entry,
          sources: [
            { ...source, url: "https://user:secret@example.org/source" },
          ],
        },
      ],
    ],
    [
      "script source URL",
      [{ ...entry, sources: [{ ...source, url: "javascript:alert(1)" }] }],
    ],
    [
      "unlicensed media",
      [{ ...entry, media: [{ url: "https://example.org/photo.jpg" }] }],
    ],
    [
      "backwards population range",
      [
        {
          ...entry,
          status_code: "CR",
          assessment_year: 2025,
          assessment_source_url: source.url,
          population_estimate_min: "3",
          population_estimate_max: "2",
          population_unit: "fixture",
          assessment_notes: "Synthetic fixture",
        },
      ],
    ],
    [
      "two current assessments",
      [
        {
          ...entry,
          status_code: "CR",
          assessment_year: 2025,
          assessment_source_url: source.url,
          assessments: [
            {
              status_code: "DD",
              assessment_year: 2025,
              source_url: source.url,
              is_current: true,
            },
          ],
        },
      ],
    ],
  ];
  it.each(invalidCases)("rejects %s before generating SQL", (_name, input) => {
    const result = runCli(input);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toMatch(
      /^Seed gate failed: unreadable or invalid draft JSON/,
    );
    expect(result.stderr).not.toContain("fixture-secret-must-not-leak");
  });

  it("does not echo credentials from malformed JSON", () => {
    const result = runCli(
      '{"token":"fixture-secret-must-not-leak" broken',
      true,
    );
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).not.toContain("fixture-secret-must-not-leak");
  });
});
