import { z } from "zod";

export const profileInputSchema = z.object({
  username: z
    .string()
    .trim()
    .regex(
      /^[a-z][a-z0-9_]{2,23}$/,
      "Gunakan 3–24 huruf kecil, angka, atau garis bawah. Awali dengan huruf.",
    ),
  display_name: z.string().trim().min(1, "Nama wajib diisi.").max(80),
  location: z.string().trim().max(120),
  bio: z.string().trim().max(300),
});
export const profileSchema = z.object({
  id: z.uuid(),
  username: z.string().nullable(),
  display_name: z.string(),
  location: z.string(),
  bio: z.string(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
  username_created_at: z.iso.datetime({ offset: true }).nullable(),
  username_changed_at: z.iso.datetime({ offset: true }).nullable(),
});
export const accountActivityRowSchema = z
  .object({
    id: z.uuid(),
    activity_type: z.enum(["identified", "viewed"]),
    occurred_at: z.iso.datetime({ offset: true }),
    species_slug: z.string().min(1),
    species_common_name: z.string().min(1),
    species_scientific_name: z.string().min(1),
  })
  .strict();
export const accountActivitiesSchema = z
  .array(accountActivityRowSchema)
  .max(20)
  .transform((rows) =>
    rows.map((row) => ({
      id: row.id,
      type: row.activity_type,
      occurredAt: row.occurred_at,
      speciesSlug: row.species_slug,
      speciesCommonName: row.species_common_name,
      speciesScientificName: row.species_scientific_name,
    })),
  );
export const speciesActivityInputSchema = z
  .object({
    speciesId: z.uuid(),
    activityType: z.enum(["identified", "viewed"]),
  })
  .strict();
export type AccountActivity = z.output<typeof accountActivitiesSchema>[number];

export type Profile = z.infer<typeof profileSchema>;
export type AccountSummary = {
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
};
export const USERNAME_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
export function usernameUnlockAt(changedAt: string | null) {
  return changedAt
    ? new Date(Date.parse(changedAt) + USERNAME_COOLDOWN_MS)
    : null;
}
