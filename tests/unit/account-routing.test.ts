import { describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import proxy from "../../src/proxy";

const state = vi.hoisted(() => ({
  user: null as null | { id: string; app_metadata: { provider: string } },
  profile: null as null | { username: string | null },
  error: null as null | { message: string },
}));
vi.mock("next-intl/middleware", () => ({
  default: () => () => NextResponse.next(),
}));
vi.mock("@/lib/env", () => ({
  getSupabaseEnvironment: () => ({
    url: "https://example.supabase.co",
    anonKey: "test-key",
  }),
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: state.profile,
            error: state.error,
          }),
        }),
      }),
    }),
  }),
}));
const google = { id: "test-user", app_metadata: { provider: "google" } };

describe("account route guards", () => {
  it("requires username onboarding and sends returning users to their profile", async () => {
    Object.assign(state, { user: google, profile: null, error: null });
    const first = await proxy(
      new NextRequest("http://localhost:3000/id/species"),
    );
    expect(first.headers.get("location")).toBe(
      "http://localhost:3000/id/onboarding",
    );
    state.profile = { username: "penjelajah" };
    const returning = await proxy(
      new NextRequest("http://localhost:3000/id/login"),
    );
    expect(returning.headers.get("location")).toBe(
      "http://localhost:3000/id/profile",
    );
    expect(returning.headers.get("cache-control")).toContain("no-store");
  });
  it("does not mistake a database failure for a first login", async () => {
    Object.assign(state, {
      user: google,
      profile: null,
      error: { message: "unavailable" },
    });
    const response = await proxy(
      new NextRequest("http://localhost:3000/id/profile"),
    );
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("rejects signed-out and non-Google sessions on account routes", async () => {
    for (const user of [
      null,
      { id: "test-user", app_metadata: { provider: "email" } },
    ]) {
      Object.assign(state, { user, profile: null, error: null });
      const response = await proxy(
        new NextRequest("http://localhost:3000/id/profile/edit"),
      );
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/id/login",
      );
    }
  });
});
