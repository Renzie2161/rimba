import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase/auth-server";

function getPublicOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const protocol = request.headers.get("x-forwarded-proto") ?? "https";
    return `${protocol}://${forwardedHost}`;
  }
  return request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const origin = getPublicOrigin(request);
  const client = await createAuthClient();

  if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await client.auth.getUser();
      if (user?.app_metadata.provider === "google") {
        const { data, error: profileError } = await client.rpc(
          "ensure_my_account_profile",
        );
        const target =
          profileError || !data?.username ? "/id/onboarding" : "/id/profile";
        return NextResponse.redirect(new URL(target, origin), {
          headers: { "Cache-Control": "private, no-store" },
        });
      }
      await client.auth.signOut();
    }
  }

  return NextResponse.redirect(new URL("/id/login?error=callback", origin));
}
