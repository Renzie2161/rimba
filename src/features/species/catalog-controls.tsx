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
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  serializeCatalogSearchParams,
  type CatalogSearchValue,
} from "./catalog-params";
import { Link } from "@/i18n/navigation";
import type { ConservationStatus, SpeciesCatalogFacets } from "./schemas";
import Multiselect from "./multiselect";
import { codeLabel, regionLabel } from "./region-labels";
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
  const [query, setQuery] = useState(value.query);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const queryDraft = useRef(value.query);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (!drawerOpen) return;
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setDrawerOpen(false);
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
  const taxonOptions = facets.taxonGroups.map((group) => ({
    value: group,
    label: codeLabel(group),
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
          className={
            count > 0
              ? `${styles.filterButton} ${styles.filterButtonActive}`
              : styles.filterButton
          }
          onClick={() => setDrawerOpen(true)}
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

        <label className={styles.sortField}>
          <span className="sr-only">{t("sortLabel")}</span>
          <select
            aria-label={t("sortLabel")}
            name="sort"
            onChange={(event) =>
              update("sort", event.target.value as CatalogSearchValue["sort"])
            }
            value={value.sort}
          >
            <option value="name">{t("sortName")}</option>
            <option value="updated">{t("sortUpdated")}</option>
          </select>
        </label>
      </form>

      {drawerOpen ? (
        <>
          <button
            aria-label={t("closeFilters")}
            className={styles.drawerScrim}
            onClick={() => setDrawerOpen(false)}
            type="button"
          />
          <aside
            aria-label={t("filterPanelLabel")}
            className={styles.drawer}
            role="dialog"
          >
            <header className={styles.drawerHeader}>
              <h2>
                <SlidersHorizontal
                  aria-hidden="true"
                  size={18}
                  strokeWidth={2}
                />
                {t("filterPanelTitle")}
              </h2>
              <button
                aria-label={t("closeFilters")}
                className={styles.drawerClose}
                onClick={() => setDrawerOpen(false)}
                ref={closeRef}
                type="button"
              >
                <X aria-hidden="true" size={18} strokeWidth={2} />
              </button>
            </header>

            <div className={styles.drawerBody}>
              <Multiselect
                label={t("statusLabel")}
                onChange={(next) =>
                  update("statuses", next as ConservationStatus[])
                }
                options={statusOptions}
                placeholder={t("allStatuses")}
                searchPlaceholder={t("searchOption")}
                selected={value.statuses}
              />
              <Multiselect
                label={t("taxonLabel")}
                onChange={(next) => update("taxa", next)}
                options={taxonOptions}
                placeholder={t("allTaxa")}
                searchPlaceholder={t("searchOption")}
                selected={value.taxa}
              />
              <Multiselect
                label={t("regionLabel")}
                onChange={(next) => update("regions", next)}
                options={regionOptions}
                placeholder={t("allRegions")}
                searchPlaceholder={t("searchOption")}
                selected={value.regions}
              />
              <Multiselect
                label={t("habitatLabel")}
                onChange={(next) => update("habitats", next)}
                options={habitatOptions}
                placeholder={t("allHabitats")}
                searchPlaceholder={t("searchOption")}
                selected={value.habitats}
              />
            </div>

            <footer className={styles.drawerFooter}>
              <Link className={styles.drawerReset} href="/species">
                {t("reset")}
              </Link>
              <button
                className={styles.drawerApply}
                onClick={() => setDrawerOpen(false)}
                type="button"
              >
                {t("apply")}
              </button>
            </footer>
          </aside>
        </>
      ) : null}
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
