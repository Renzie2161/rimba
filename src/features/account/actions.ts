"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAuthClient } from "@/lib/supabase/auth-server";
import { profileInputSchema, speciesActivityInputSchema } from "./schemas";

export async function signInWithGoogle() {
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL || (await headers()).get("origin");
  if (!origin) redirect("/id/login?error=config");
  const client = await createAuthClient();
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: new URL("/auth/callback", origin).href },
  });
  if (error || !data.url) redirect("/id/login?error=google");
  redirect(data.url);
}

export async function signOut() {
  const client = await createAuthClient();
  const { error } = await client.auth.signOut();
  if (error) redirect("/id/profile?error=logout");
  revalidatePath("/", "layout");
  redirect("/id/login");
}

export async function recordSpeciesActivity(
  speciesId: string,
  activityType: string,
) {
  const parsed = speciesActivityInputSchema.safeParse({
    speciesId,
    activityType,
  });
  if (!parsed.success) throw new Error("Invalid species activity.");
  const client = await createAuthClient();
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();
  if (authError) throw new Error("Unable to verify account.");
  if (!user || user.app_metadata.provider !== "google") return;
  const { error } = await client.rpc("record_my_species_activity", {
    p_species_id: parsed.data.speciesId,
    p_activity_type: parsed.data.activityType,
  });
  if (error) throw new Error("Unable to record species activity.");
  revalidatePath("/id/profile");
}

export type ProfileFormState = { error: string };
export async function saveProfile(
  _previous: ProfileFormState,
  form: FormData,
): Promise<ProfileFormState> {
  const parsed = profileInputSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      error: parsed.error.issues[0]?.message || "Periksa kembali isian profil.",
    };
  const client = await createAuthClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user || user.app_metadata.provider !== "google") redirect("/id/login");
  const profile = parsed.data;
  const { error } = await client.rpc("save_my_account_profile", {
    p_username: profile.username,
    p_display_name: profile.display_name,
    p_location: profile.location,
    p_bio: profile.bio,
  });
  if (error) {
    if (error.code === "23505")
      return { error: "Username sudah digunakan. Pilih username lain." };
    if (error.message.includes("USERNAME_LOCKED"))
      return {
        error:
          "Username masih terkunci. Tunggu 7 hari sejak pengaturan terakhir.",
      };
    return {
      error:
        "Profil belum dapat disimpan. Coba lagi atau hubungi pengelola Rimba.",
    };
  }
  revalidatePath("/", "layout");
  redirect("/id/profile?saved=1");
}
