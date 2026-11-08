import { describe, expect, it } from "vitest";
import en from "../../src/messages/en.json";
import id from "../../src/messages/id.json";

function messageKeyPaths(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return [path, ...messageKeyPaths(child, path)];
  });
}

function dottedKeys(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value).flatMap(([key, child]) => [
    ...(key.includes(".") ? [key] : []),
    ...dottedKeys(child),
  ]);
}

describe("localized messages", () => {
  it("keeps Indonesian and English nested message keys in sync", () => {
    expect(messageKeyPaths(en).sort()).toEqual(messageKeyPaths(id).sort());
  });
  it("rejects dotted keys that next-intl interprets as nested paths", () => {
    expect([...dottedKeys(id), ...dottedKeys(en)]).toEqual([]);
  });
});
