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
