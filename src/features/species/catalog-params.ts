import {
  catalogSortSchema,
  conservationStatusSchema,
  speciesCatalogOptionsSchema,
  type ConservationStatus,
  type SpeciesCatalogOptions,
} from "./schemas";

export type CatalogView = "grid" | "list";
export type CatalogSearchValue = Omit<SpeciesCatalogOptions, "locale"> & {
  view: CatalogView;
};
type CatalogParams = Record<string, string | string[] | undefined>;

const allowed: Record<string, true> = {
  q: true,
  statuses: true,
  taxa: true,
  regions: true,
  habitats: true,
  sort: true,
  page: true,
  view: true,
};

/** A facet list is a comma-separated set; order is irrelevant and blanks drop. */
function readList(
  raw: string | undefined,
  issues: string[],
  label: string,
): string[] {
  if (!raw) return [];
  const items = raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  if (items.length === 0) issues.push(`Empty ${label} filter`);
  if (items.length > 32) issues.push(`Too many ${label} filters`);
  const unique = [...new Set(items)];
  if (unique.length !== items.length) issues.push(`Duplicate ${label} filter`);
  return unique;
}

export function parseCatalogSearchParams(
  params: CatalogParams,
): { ok: true; value: CatalogSearchValue } | { ok: false; issues: string[] } {
  const issues: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (!Object.hasOwn(allowed, key)) issues.push(`Unknown parameter: ${key}`);
    if (Array.isArray(value)) issues.push(`Repeated parameter: ${key}`);
  }
  if (issues.length) return { ok: false, issues };
  const get = (key: string) => params[key] as string | undefined;
  const query = (get("q") ?? "").trim().replace(/\s+/gu, " ");

  const statusValues = readList(get("statuses"), issues, "status");
  const statuses: ConservationStatus[] = [];
  for (const status of statusValues) {
    const parsedStatus = conservationStatusSchema.safeParse(status);
    if (parsedStatus.success) statuses.push(parsedStatus.data);
    else issues.push("Invalid status");
  }

  const sort = catalogSortSchema.safeParse(get("sort") ?? "name");
  if (!sort.success) issues.push("Invalid sort");

  const viewValue = get("view") ?? "grid";
  if (viewValue !== "grid" && viewValue !== "list") issues.push("Invalid view");

  const pageValue = get("page") ?? "1";
  const pageValid =
    /^[1-9]\d*$/.test(pageValue) && Number(pageValue) <= 1_000_000;
  if (!pageValid) issues.push("Invalid page");
  if (Array.from(query).length > 100) issues.push("Search query is too long");

  const value: CatalogSearchValue = {
    query,
    statuses,
    taxa: readList(get("taxa"), issues, "taxon"),
    regions: readList(get("regions"), issues, "region"),
    habitats: readList(get("habitats"), issues, "habitat"),
    sort: sort.success ? sort.data : "name",
    page: pageValid ? Number(pageValue) : 1,
    pageSize: 12,
    view: viewValue === "list" ? "list" : "grid",
  };

  const parsed = speciesCatalogOptionsSchema.safeParse({
    ...value,
    locale: "id",
  });
  if (!parsed.success)
    issues.push(...parsed.error.issues.map((issue) => issue.message));
  if (issues.length) return { ok: false, issues: [...new Set(issues)] };
  return { ok: true, value };
}

export function serializeCatalogSearchParams(
  value: CatalogSearchValue,
): string {
  const params = new URLSearchParams();
  if (value.query) params.set("q", value.query);
  if (value.statuses.length) params.set("statuses", value.statuses.join(","));
  if (value.taxa.length) params.set("taxa", value.taxa.join(","));
  if (value.regions.length) params.set("regions", value.regions.join(","));
  if (value.habitats.length) params.set("habitats", value.habitats.join(","));
  if (value.sort !== "name") params.set("sort", value.sort);
  if (value.page !== 1) params.set("page", String(value.page));
  if (value.view !== "grid") params.set("view", value.view);
  return params.toString();
}
