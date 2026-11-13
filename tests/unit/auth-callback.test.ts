import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../../src/app/auth/callback/route";

const mocks = vi.hoisted(() => ({ createAuthClient: vi.fn() }));
vi.mock("@/lib/supabase/auth-server", () => ({
  createAuthClient: mocks.createAuthClient,
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

describe("OAuth callback redirect origin", () => {
  it.each([
    { username: "penjelajah", path: "/id/profile" },
    { username: null, path: "/id/onboarding" },
  ])("uses configured origin for $path", async ({ username, path }) => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://rimbakita.my.id/");
    mocks.createAuthClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn().mockResolvedValue({
          data: { user: { app_metadata: { provider: "google" } } },
        }),
      },
      rpc: vi.fn().mockResolvedValue({ data: { username }, error: null }),
    });
    const response = await GET(
      new NextRequest("http://0.0.0.0:3000/auth/callback?code=valid", {
        headers: {
          "x-forwarded-host": "attacker.example",
          "x-forwarded-proto": "http",
        },
      }),
    );
    expect(response.headers.get("location")).toBe(
      `https://rimbakita.my.id${path}`,
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it.each([
    { site: "https://rimbakita.my.id", origin: "https://rimbakita.my.id" },
    { site: "", origin: "http://localhost:3000" },
  ])("redirects failures using $origin", async ({ site, origin }) => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", site);
    mocks.createAuthClient.mockResolvedValue({});
    const response = await GET(
      new NextRequest("http://localhost:3000/auth/callback", {
        headers: { "x-forwarded-host": "attacker.example" },
      }),
    );
    expect(response.headers.get("location")).toBe(
      `${origin}/id/login?error=callback`,
    );
  });
});
