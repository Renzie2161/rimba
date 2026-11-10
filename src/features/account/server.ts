import "server-only";
import { cache } from "react";
import { createAuthClient } from "@/lib/supabase/auth-server";
import { profileSchema } from "./schemas";
import { getSupabaseEnvironment } from "@/lib/env";

export const getAccount = cache(async () => {
  try {
    getSupabaseEnvironment();
  } catch {
    return null;
  }
  const client = await createAuthClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user || user.app_metadata.provider !== "google") return null;
  const { data, error } = await client
    .from("account_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return {
    user,
    profile: data ? profileSchema.parse(data) : null,
    unavailable: Boolean(error),
    checkedAt: Date.now(),
  };
});
