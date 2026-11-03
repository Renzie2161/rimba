import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnvironment } from "@/lib/env";

export function createSupabaseServerClient() {
  const { url, anonKey } = getSupabaseEnvironment();

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
