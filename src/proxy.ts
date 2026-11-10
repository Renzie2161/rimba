import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseEnvironment } from "@/lib/env";

const intl = createMiddleware(routing);
export default async function proxy(request: NextRequest) {
  let env;
  try {
    env = getSupabaseEnvironment();
  } catch {
    return intl(request);
  }
  const pending: Array<{
    name: string;
    value: string;
    options: CookieOptions;
  }> = [];
  const client = createServerClient(env.url, env.anonKey, {
    cookies: {
      encode: "tokens-only",
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach((cookie) => {
          request.cookies.set(cookie.name, cookie.value);
          pending.push(cookie);
        });
      },
    },
  });
  const {
    data: { user },
  } = await client.auth.getUser();
  const path = request.nextUrl.pathname;
  let target: string | null = null;
  if (user?.app_metadata.provider === "google") {
    const { data, error } = await client
      .from("account_profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    if (!error && !data?.username && path !== "/id/onboarding")
      target = "/id/onboarding";
    else if (
      !error &&
      data?.username &&
      ["/id/login", "/id/onboarding"].includes(path)
    )
      target = "/id/profile";
  } else if (path.startsWith("/id/profile") || path === "/id/onboarding") {
    target = "/id/login";
  }
  const response = target
    ? NextResponse.redirect(new URL(target, request.url))
    : intl(request);
  pending.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options),
  );
  if (user || pending.length)
    response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: "/((?!api|auth/|trpc|_next|_vercel|.*\\..*).*)",
};
