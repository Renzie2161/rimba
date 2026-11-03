import { describe, expect, it } from "vitest";
import en from "../../src/messages/en.json";
import id from "../../src/messages/id.json";

const messageGroups = [
  "metadata",
  "navigation",
  "home",
  "footer",
  "states",
] as const;

describe("localized messages", () => {
  it("keeps Indonesian and English message keys in sync", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(id).sort());

    for (const group of messageGroups) {
      expect(Object.keys(en[group]).sort()).toEqual(
        Object.keys(id[group]).sort(),
      );
    }
  });
});
