import { z } from "zod";
export const MAX_JOURNAL_DEMO_ENTRIES = 100;

const journalDemoRowSchema = z
  .object({
    id: z.uuid(),
    common_name: z.string().trim().min(1).max(100),
    scientific_name: z.string().trim().min(1).max(150),
    entry_group: z.enum(["flora", "fauna"]),
    observed_at: z.iso.datetime({ offset: true }),
    region_label: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .regex(/^Demo · \S/u),
    image_path: z
      .string()
      .regex(/^\/images\/journal-demo\/[a-z0-9]+(?:-[a-z0-9]+)*\.jpg$/),
    image_alt: z.string().trim().min(1).max(240),
    needs_review: z.boolean(),
    is_demo: z.literal(true),
  })
  .strict()
  .transform((row) => ({
    id: row.id,
    commonName: row.common_name,
    scientificName: row.scientific_name,
    group: row.entry_group,
    observedAt: row.observed_at,
    regionLabel: row.region_label,
    imagePath: row.image_path,
    imageAlt: row.image_alt,
    needsReview: row.needs_review,
    isDemo: row.is_demo,
  }));

export const journalDemoRowsSchema = z
  .array(journalDemoRowSchema)
  .max(MAX_JOURNAL_DEMO_ENTRIES);
export type JournalDemoEntry = z.output<typeof journalDemoRowSchema>;
