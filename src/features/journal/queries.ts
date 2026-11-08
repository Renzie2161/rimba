import type { SupabaseClient } from "@supabase/supabase-js";
import {
  journalDemoRowsSchema,
  MAX_JOURNAL_DEMO_ENTRIES,
  type JournalDemoEntry,
} from "./schemas";

export async function getJournalDemoEntries(
  client: SupabaseClient,
): Promise<JournalDemoEntry[]> {
  const { data, error, count } = await client
    .from("journal_demo_entries")
    .select(
      "id,common_name,scientific_name,entry_group,observed_at,region_label,image_path,image_alt,needs_review,is_demo",
      { count: "exact" },
    )
    .order("observed_at", { ascending: false })
    .order("id", { ascending: true })
    .limit(MAX_JOURNAL_DEMO_ENTRIES);
  if (error) throw error;
  if (
    data === null ||
    count === null ||
    count !== data.length ||
    count > MAX_JOURNAL_DEMO_ENTRIES
  )
    throw new Error("Journal demo result exceeds its exact bounded read");
  return journalDemoRowsSchema.parse(data);
}
