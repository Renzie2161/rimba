import {
  catalogSortSchema,
  conservationStatusSchema,
  speciesCatalogOptionsSchema,
  type SpeciesCatalogOptions,
} from "./schemas";

export type CatalogView = "grid" | "list";
export type CatalogSearchValue = Omit<SpeciesCatalogOptions, "locale"> & {
  view: CatalogView;
};
type CatalogParams = Record<string, string | string[] | undefined>;

const allowed: Record<string, true> = {
  q: true,
  status: true,
  threatened: true,
  taxon: true,
  region: true,
  habitat: true,
  sort: true,
  page: true,
  view: true,
};

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
  const statusValue = get("status") || undefined;
  const status = statusValue
    ? conservationStatusSchema.safeParse(statusValue)
    : null;
  if (status && !status.success) issues.push("Invalid status");
  const threatenedValue = get("threatened");
  if (
    threatenedValue !== undefined &&
    threatenedValue !== "" &&
    threatenedValue !== "1"
  )
    issues.push("Invalid threatened filter");
  const sortValue = get("sort") ?? "name";
  const sort = catalogSortSchema.safeParse(sortValue);
  if (!sort.success) issues.push("Invalid sort");
  const viewValue = get("view") ?? "grid";
  if (viewValue !== "grid" && viewValue !== "list") issues.push("Invalid view");
  const pageValue = get("page") ?? "1";
  if (!/^[1-9]\d*$/.test(pageValue) || Number(pageValue) > 1_000_000)
    issues.push("Invalid page");
  if (Array.from(query).length > 100) issues.push("Search query is too long");
  const value: CatalogSearchValue = {
    query,
    status: status?.success ? status.data : null,
    threatened: threatenedValue === "1",
    taxon: get("taxon") || null,
    region: get("region") || null,
    habitat: get("habitat") || null,
    sort: sort.success ? sort.data : "name",
    page:
      /^[1-9]\d*$/.test(pageValue) && Number(pageValue) <= 1_000_000
        ? Number(pageValue)
        : 1,
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
  if (value.status) params.set("status", value.status);
  if (value.threatened) params.set("threatened", "1");
  if (value.taxon) params.set("taxon", value.taxon);
  if (value.region) params.set("region", value.region);
  if (value.habitat) params.set("habitat", value.habitat);
  if (value.sort !== "name") params.set("sort", value.sort);
  if (value.page !== 1) params.set("page", String(value.page));
  if (value.view !== "grid") params.set("view", value.view);
  return params.toString();
}
