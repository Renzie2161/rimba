"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  serializeCatalogSearchParams,
  type CatalogSearchValue,
} from "./catalog-params";
import { Link } from "@/i18n/navigation";
import type { SpeciesCatalogFacets } from "./schemas";
import styles from "./catalog.module.css";

type Props = { value: CatalogSearchValue; facets: SpeciesCatalogFacets };

export default function CatalogControls({ value, facets }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("catalog");
  const [query, setQuery] = useState(value.query);
  const speciesT = useTranslations("species");
  const queryDraft = useRef(value.query);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

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
    const normalizedQuery = queryDraft.current.trim().replace(/\s+/gu, " ");
    navigate({
      ...value,
      query: normalizedQuery,
      [key]: nextValue,
      page: key === "view" && normalizedQuery === value.query ? value.page : 1,
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

  function action(next: Partial<CatalogSearchValue>) {
    navigate({
      ...value,
      ...next,
      query: queryDraft.current.trim().replace(/\s+/gu, " "),
      page: 1,
    });
  }

  return (
    <form
      className={styles.controls}
      action="/id/species"
      method="get"
      onSubmit={(event) => {
        event.preventDefault();
        const nextQuery = queryDraft.current.trim().replace(/\s+/gu, " ");
        if (nextQuery === value.query && value.page === 1) {
          clearTimeout(timer.current);
          timer.current = undefined;
          return;
        }
        navigate({ ...value, query: nextQuery, page: 1 });
      }}
    >
      <label className={styles.search}>
        <span>{t("searchLabel")}</span>
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
      <div className={styles.filters}>
        <label>
          <span>{t("statusLabel")}</span>
          <select
            aria-label={t("statusLabel")}
            name="status"
            value={value.status ?? ""}
            onChange={(event) =>
              action({
                status: event.target.value
                  ? (event.target.value as CatalogSearchValue["status"])
                  : null,
                threatened: false,
                page: 1,
              })
            }
          >
            <option value="">{t("allStatuses")}</option>
            {facets.statuses.map((status) => (
              <option key={status} value={status}>
                {speciesT(`status.${status}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t("taxonLabel")}</span>
          <select
            aria-label={t("taxonLabel")}
            name="taxon"
            value={value.taxon ?? ""}
            onChange={(event) =>
              action({ taxon: event.target.value || null, page: 1 })
            }
          >
            <option value="">{t("allTaxa")}</option>
            {facets.taxonGroups.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t("regionLabel")}</span>
          <select
            aria-label={t("regionLabel")}
            name="region"
            value={value.region ?? ""}
            onChange={(event) =>
              action({ region: event.target.value || null, page: 1 })
            }
          >
            <option value="">{t("allRegions")}</option>
            {facets.regions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t("habitatLabel")}</span>
          <select
            aria-label={t("habitatLabel")}
            name="habitat"
            value={value.habitat ?? ""}
            onChange={(event) =>
              action({ habitat: event.target.value || null, page: 1 })
            }
          >
            <option value="">{t("allHabitats")}</option>
            {facets.habitats.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t("sortLabel")}</span>
          <select
            aria-label={t("sortLabel")}
            name="sort"
            value={value.sort}
            onChange={(event) =>
              action({
                sort: event.target.value as CatalogSearchValue["sort"],
                page: 1,
              })
            }
          >
            <option value="name">{t("sortName")}</option>
            <option value="updated">{t("sortUpdated")}</option>
          </select>
        </label>
        <button className={styles.apply} type="submit">
          {t("apply")}
        </button>
      </div>
      <input name="page" type="hidden" value="1" />
      <input name="view" type="hidden" value={value.view} />
      <div className={styles.controlFooter}>
        <label className={styles.threatened}>
          <input
            checked={value.threatened}
            name="threatened"
            onChange={(event) =>
              action({
                threatened: event.target.checked,
                status: null,
                page: 1,
              })
            }
            type="checkbox"
            value="1"
          />{" "}
          {t("threatened")}
        </label>
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
            {t("grid")}
          </button>
          <button
            aria-pressed={value.view === "list"}
            onClick={() => update("view", "list")}
            type="button"
          >
            {t("list")}
          </button>
        </div>
      </div>
    </form>
  );
}

export function CatalogPagination({
  value,
  total,
}: {
  value: CatalogSearchValue;
  total: number;
}) {
  const t = useTranslations("catalog");
  const pages = Math.ceil(total / value.pageSize);
  const href = (page: number) => {
    const query = serializeCatalogSearchParams({ ...value, page });
    return `/species${query ? `?${query}` : ""}`;
  };
  return (
    <div className={styles.pageActions}>
      {value.page > pages && total > 0 ? (
        <Link href={href(1)}>{t("firstPage")}</Link>
      ) : value.page > 1 ? (
        <Link href={href(value.page - 1)}>{t("previous")}</Link>
      ) : null}
      <span aria-current="page">{t("pageLabel", { page: value.page })}</span>
      {value.page < pages ? (
        <Link href={href(value.page + 1)}>{t("next")}</Link>
      ) : null}
    </div>
  );
}
