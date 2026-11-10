import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ cookies: new Map<string, string>() }));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () =>
      Array.from(state.cookies, ([name, value]) => ({ name, value })),
    set: (name: string, value: string, options?: { maxAge?: number }) => {
      if (options?.maxAge === 0) state.cookies.delete(name);
      else state.cookies.set(name, value);
    },
  }),
}));
vi.mock("@/lib/env", () => ({
  getSupabaseEnvironment: () => ({
    url: "https://example.supabase.co",
    anonKey: "test-anon-key",
  }),
}));

import { createAuthClient } from "../../src/lib/supabase/auth-server";

const largeMetadata = "cookie-size-regression-".repeat(600);
const user = {
  id: "test-user",
  aud: "authenticated",
  role: "authenticated",
  email: "explorer@example.com",
  app_metadata: { provider: "google", providers: ["google"] },
  user_metadata: { profile_description: largeMetadata },
  created_at: "2026-01-01T00:00:00.000Z",
};

function accessToken() {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      aud: "authenticated",
      role: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    }),
  ).toString("base64url");
  return `${header}.${payload}.sig12345`;
}

describe("Supabase auth cookies", () => {
  beforeEach(() => state.cookies.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("keeps large user metadata out of request cookies while getUser remains usable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = input instanceof Request ? input.url : String(input);
        if (url.endsWith("/auth/v1/user"))
          return Response.json(user, { status: 200 });
        throw new Error(`Unexpected Supabase request: ${url}`);
      }),
    );

    const client = await createAuthClient();
    const { error: signInError } = await client.auth.setSession({
      access_token: accessToken(),
      refresh_token: "test-refresh-token",
    });
    expect(signInError).toBeNull();

    const cookieHeader = Array.from(
      state.cookies,
      ([name, value]) => `${name}=${value}`,
    ).join("; ");
    expect(Buffer.byteLength(cookieHeader)).toBeLessThan(16 * 1024);

    const nextRequestClient = await createAuthClient();
    const { data, error } = await nextRequestClient.auth.getUser();
    expect(error).toBeNull();
    expect(data.user?.id).toBe(user.id);
  });
});
