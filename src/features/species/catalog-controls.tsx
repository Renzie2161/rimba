"use client";

import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useRouter, usePathname, Link } from "@/i18n/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  serializeCatalogSearchParams,
  type CatalogSearchValue,
} from "./catalog-params";

import type { ConservationStatus, SpeciesCatalogFacets } from "./schemas";
import MultiSelect from "@/components/ui/multi-select";
import { codeLabel, regionLabel } from "./region-labels";
import multiSelectStyles from "@/components/ui/multi-select.module.css";
import styles from "./catalog.module.css";

type Props = { value: CatalogSearchValue; facets: SpeciesCatalogFacets };

/** Drops empty facets so a pristine URL stays clean. */
function activeFilterCount(value: CatalogSearchValue) {
  return (
    value.statuses.length +
    value.taxa.length +
    value.regions.length +
    value.habitats.length
  );
}

export default function CatalogControls({ value, facets }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("catalog");
  const speciesT = useTranslations("species");
  const [draft, setDraft] = useState(value);
  const [query, setQuery] = useState(value.query);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const queryDraft = useRef(value.query);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const closeRef = useRef<HTMLButtonElement>(null);

  const [drawerRevision, setDrawerRevision] = useState(0);
  const filterRef = useRef<HTMLButtonElement>(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (!drawerOpen) return;
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeDrawer();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  function navigate(
    next: CatalogSearchValue,
    mode: "push" | "replace" = "push",
  ) {
    clearTimeout(timer.current);
    timer.current = undefined;
    const queryString = serializeCatalogSearchParams(next);
    router[mode](`${pathname}${queryString ? `?${queryString}` : ""}`, {
      scroll: false,
    });
  }

  function update<K extends keyof CatalogSearchValue>(
    key: K,
    nextValue: CatalogSearchValue[K],
  ) {
    navigate({
      ...value,
      query: queryDraft.current.trim().replace(/\s+/gu, " "),
      [key]: nextValue,
      page: key === "view" ? value.page : 1,
    });
  }

  function updateDraft<K extends keyof CatalogSearchValue>(
    key: K,
    nextValue: CatalogSearchValue[K],
  ) {
    setDraft((current) => ({ ...current, [key]: nextValue, page: 1 }));
  }

  function closeDrawer() {
    setDrawerOpen(false);
    filterRef.current?.focus();
  }

  function applyFilters() {
    navigate({
      ...draft,
      query: queryDraft.current.trim().replace(/\s+/gu, " "),
      page: 1,
    });
    closeDrawer();
  }

  function onQueryChange(nextQuery: string) {
    queryDraft.current = nextQuery;
    setQuery(nextQuery);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      navigate(
        {
          ...value,
          query: queryDraft.current.trim().replace(/\s+/gu, " "),
          page: 1,
        },
        "replace",
      );
    }, 300);
  }

  const statusOptions = [
    { value: "CR", label: `${speciesT("status.CR")} (CR)` },
    { value: "EN", label: `${speciesT("status.EN")} (EN)` },
    { value: "VU", label: `${speciesT("status.VU")} (VU)` },
    { value: "NT", label: `${speciesT("status.NT")} (NT)` },
    { value: "LC", label: `${speciesT("status.LC")} (LC)` },
    { value: "DD", label: `${speciesT("status.DD")} (DD)` },
    { value: "EX", label: `${speciesT("status.EX")} (EX)` },
    { value: "EW", label: `${speciesT("status.EW")} (EW)` },
    { value: "NE", label: `${speciesT("status.NE")} (NE)` },
  ];
  const taxonLabels: Record<string, string> = {
    amphibian: speciesT("group.amphibian"),
    animal: speciesT("group.animal"),
    bird: speciesT("group.bird"),
    fish: speciesT("group.fish"),
    flora: speciesT("group.plant"),
    fungus: speciesT("group.fungus"),
    insect: speciesT("group.insect"),
    invertebrate: speciesT("group.invertebrate"),
    mammal: speciesT("group.mammal"),
    reptile: speciesT("group.reptile"),
  };
  const taxonOptions = facets.taxonGroups.map((group) => ({
    value: group,
    label: Object.prototype.hasOwnProperty.call(taxonLabels, group)
      ? (taxonLabels[group] ?? codeLabel(group))
      : codeLabel(group),
  }));
  const regionOptions = facets.regions.map((region) => ({
    value: region,
    label: regionLabel(region),
  }));
  const habitatOptions = facets.habitats.map((habitat) => ({
    value: habitat,
    label: codeLabel(habitat),
  }));
  const count = activeFilterCount(value);

  return (
    <>
      <form
        className={styles.controls}
        onSubmit={(event) => {
          event.preventDefault();
          navigate({
            ...value,
            query: queryDraft.current.trim().replace(/\s+/gu, " "),
            page: 1,
          });
        }}
      >
        <label className={styles.search}>
          <span className="sr-only">{t("searchLabel")}</span>
          <input
            autoComplete="off"
            maxLength={200}
            name="q"
            onChange={(event) =>
              onQueryChange(
                Array.from(event.currentTarget.value).slice(0, 100).join(""),
              )
            }
            placeholder={t("searchPlaceholder")}
            type="search"
            value={query}
          />
        </label>

        <button
          aria-expanded={drawerOpen}
          aria-controls="species-filter-drawer"
          ref={filterRef}
          className={
            count > 0
              ? `${styles.filterButton} ${styles.filterButtonActive}`
              : styles.filterButton
          }
          onClick={() => {
            setDraft(value);
            setDrawerRevision((revision) => revision + 1);
            setDrawerOpen(true);
          }}
          type="button"
        >
          <SlidersHorizontal aria-hidden="true" size={17} strokeWidth={2} />
          {t("filterButton")}
          {count > 0 ? (
            <span className={styles.filterCount}>{count}</span>
          ) : null}
        </button>

        <div
          className={styles.viewToggle}
          data-view={value.view}
          role="group"
          aria-label={t("viewLabel")}
        >
          <button
            aria-pressed={value.view === "grid"}
            onClick={() => update("view", "grid")}
            type="button"
          >
            <LayoutGrid aria-hidden="true" size={16} strokeWidth={2} />
            {t("grid")}
          </button>
          <button
            aria-pressed={value.view === "list"}
            onClick={() => update("view", "list")}
            type="button"
          >
            <List aria-hidden="true" size={16} strokeWidth={2} />
            {t("list")}
          </button>
        </div>
      </form>

      <div
        aria-hidden={!drawerOpen}
        className={styles.drawerLayer}
        data-open={drawerOpen ? "true" : "false"}
      >
        <button
          aria-label={t("closeFilters")}
          className={styles.drawerScrim}
          onClick={closeDrawer}
          type="button"
        />
        <aside
          aria-label={t("filterPanelLabel")}
          className={styles.drawer}
          id="species-filter-drawer"
          role="dialog"
        >
          <header className={styles.drawerHeader}>
            <h2>
              <SlidersHorizontal aria-hidden="true" size={18} strokeWidth={2} />
              {t("filterPanelTitle")}
            </h2>
            <button
              aria-label={t("closeFilters")}
              className={styles.drawerClose}
              onClick={closeDrawer}
              ref={closeRef}
              type="button"
            >
              <X aria-hidden="true" size={18} strokeWidth={2} />
            </button>
          </header>

          <div className={styles.drawerBody} key={drawerRevision}>
            <MultiSelect
              label={t("statusLabel")}
              onChange={(next) =>
                updateDraft("statuses", next as ConservationStatus[])
              }
              options={statusOptions}
              placeholder={t("allStatuses")}
              searchPlaceholder={t("searchOption")}
              selected={draft.statuses}
            />
            <MultiSelect
              label={t("taxonLabel")}
              onChange={(next) => updateDraft("taxa", next)}
              options={taxonOptions}
              placeholder={t("allTaxa")}
              searchPlaceholder={t("searchOption")}
              selected={draft.taxa}
            />
            <MultiSelect
              label={t("regionLabel")}
              onChange={(next) => updateDraft("regions", next)}
              options={regionOptions}
              placeholder={t("allRegions")}
              searchPlaceholder={t("searchOption")}
              selected={draft.regions}
            />
            <MultiSelect
              label={t("habitatLabel")}
              onChange={(next) => updateDraft("habitats", next)}
              options={habitatOptions}
              placeholder={t("allHabitats")}
              searchPlaceholder={t("searchOption")}
              selected={draft.habitats}
            />
            <label className={styles.drawerSortField}>
              <span>{t("sortLabel")}</span>
              <select
                className={multiSelectStyles.trigger}
                name="sort"
                onChange={(event) =>
                  updateDraft(
                    "sort",
                    event.target.value as CatalogSearchValue["sort"],
                  )
                }
                value={draft.sort}
              >
                <option value="name">{t("sortName")}</option>
                <option value="updated">{t("sortUpdated")}</option>
              </select>
            </label>
          </div>
          <footer className={styles.drawerFooter}>
            <button
              className={styles.drawerReset}
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  statuses: [],
                  taxa: [],
                  regions: [],
                  habitats: [],
                  sort: "name",
                  page: 1,
                }))
              }
              type="button"
            >
              {t("reset")}
            </button>
            <button
              className={styles.drawerApply}
              onClick={applyFilters}
              type="button"
            >
              {t("apply")}
            </button>
          </footer>
        </aside>
      </div>
    </>
  );
}

/** Page numbers with ellipses: 1 … 4 5 6 … 20 */
function pageItems(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: (number | "gap")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) items.push("gap");
  for (let page = start; page <= end; page += 1) items.push(page);
  if (end < total - 1) items.push("gap");
  items.push(total);
  return items;
}

export function CatalogPagination({
  value,
  total,
}: {
  value: CatalogSearchValue;
  total: number;
}) {
  const t = useTranslations("catalog");
  const pages = Math.max(1, Math.ceil(total / value.pageSize));
  const href = (page: number) => {
    const query = serializeCatalogSearchParams({ ...value, page });
    return `/species${query ? `?${query}` : ""}`;
  };
  const current = Math.min(Math.max(value.page, 1), pages);

  return (
    <nav className={styles.pager} aria-label={t("paginationLabel")}>
      <Link
        aria-disabled={current === 1}
        aria-label={t("firstPage")}
        className={current === 1 ? styles.pagerEdgeDisabled : styles.pagerEdge}
        href={href(1)}
        tabIndex={current === 1 ? -1 : undefined}
      >
        <ChevronFirst aria-hidden="true" size={17} strokeWidth={2} />
      </Link>
      <Link
        aria-disabled={current === 1}
        aria-label={t("previous")}
        className={current === 1 ? styles.pagerEdgeDisabled : styles.pagerEdge}
        href={href(Math.max(1, current - 1))}
        tabIndex={current === 1 ? -1 : undefined}
      >
        <ChevronLeft aria-hidden="true" size={17} strokeWidth={2} />
      </Link>

      <ol className={styles.pagerPages}>
        {pageItems(current, pages).map((item, index) =>
          item === "gap" ? (
            <li
              aria-hidden="true"
              className={styles.pagerGap}
              key={`gap-${index}`}
            >
              …
            </li>
          ) : (
            <li key={item}>
              {item === current ? (
                <span aria-current="page" className={styles.pagerCurrent}>
                  {item}
                </span>
              ) : (
                <Link className={styles.pagerPage} href={href(item)}>
                  {item}
                </Link>
              )}
            </li>
          ),
        )}
      </ol>

      <Link
        aria-disabled={current === pages}
        aria-label={t("next")}
        className={
          current === pages ? styles.pagerEdgeDisabled : styles.pagerEdge
        }
        href={href(Math.min(pages, current + 1))}
        tabIndex={current === pages ? -1 : undefined}
      >
        <ChevronRight aria-hidden="true" size={17} strokeWidth={2} />
      </Link>
      <Link
        aria-disabled={current === pages}
        aria-label={t("lastPage")}
        className={
          current === pages ? styles.pagerEdgeDisabled : styles.pagerEdge
        }
        href={href(pages)}
        tabIndex={current === pages ? -1 : undefined}
      >
        <ChevronLast aria-hidden="true" size={17} strokeWidth={2} />
      </Link>
    </nav>
  );
}
