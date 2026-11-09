/**
 * Region codes are stored as lowercase slugs (`sulawesi`, `nusa_tenggara`).
 * Displaying them raw leaks storage form into the UI, so map known codes to
 * proper Indonesian names and fall back to a title-cased version for the rest.
 */
const REGION_LABELS: Record<string, string> = {
  java: "Jawa",
  jawa: "Jawa",
  sumatra: "Sumatra",
  sumatera: "Sumatra",
  kalimantan: "Kalimantan",
  sulawesi: "Sulawesi",
  bali: "Bali",
  nusa_tenggara: "Nusa Tenggara",
  papua: "Papua",
  maluku: "Maluku",
};

export function regionLabel(code: string): string {
  const normalized = code.trim().toLowerCase();
  if (REGION_LABELS[normalized]) return REGION_LABELS[normalized];
  return normalized
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Human-readable label for any lowercase storage slug (`peat_swamp_forest`). */
export function codeLabel(code: string): string {
  return code
    .trim()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
