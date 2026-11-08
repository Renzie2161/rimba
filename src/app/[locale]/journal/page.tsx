import type { Metadata } from "next";
import Image from "next/image";
import {
  ClipboardList,
  LayoutGrid,
  LayoutList,
  Leaf,
  NotebookText,
  PawPrint,
  Search,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getJournalDemoEntries } from "@/features/journal/queries";
import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ForestMedia from "../forest-media";
import JournalSearchInput from "./journal-search-input";
import styles from "./journal.module.css";

type JournalPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
}: Pick<JournalPageProps, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "journal" });
  return { title: t("title") };
}

function formatCount(count: number) {
  return String(count).padStart(2, "0");
}
type JournalGroup = "all" | "flora" | "fauna";
type JournalSort = "newest" | "oldest" | "name";
type JournalView = "grid" | "list";
type JournalFilters = {
  query: string;
  group: JournalGroup;
  sort: JournalSort;
  view: JournalView;
};
type JournalQueryKey = "q" | "group" | "sort" | "view";
type JournalSearchParams = Record<string, string | string[] | undefined>;

const journalQueryKeys: ReadonlySet<string> = new Set([
  "q",
  "group",
  "sort",
  "view",
]);

function parseJournalFilters(search: JournalSearchParams) {
  let invalid = Object.keys(search).some((key) => !journalQueryKeys.has(key));
  const read = (key: JournalQueryKey) => {
    const value = search[key];
    if (Array.isArray(value)) {
      invalid = true;
      return undefined;
    }
    return value;
  };
  let query = (read("q") ?? "").normalize("NFC").trim().replace(/\s+/gu, " ");
  if (Array.from(query).length > 100) {
    invalid = true;
    query = "";
  }

  const groupValue = read("group");
  let group: JournalGroup = "all";
  if (groupValue === "flora" || groupValue === "fauna") group = groupValue;
  else if (groupValue !== undefined && groupValue !== "all") invalid = true;

  const sortValue = read("sort");
  let sort: JournalSort = "newest";
  if (sortValue === "oldest" || sortValue === "name") sort = sortValue;
  else if (sortValue !== undefined && sortValue !== "newest") invalid = true;

  const viewValue = read("view");
  let view: JournalView = "grid";
  if (viewValue === "list") view = viewValue;
  else if (viewValue !== undefined && viewValue !== "grid") invalid = true;

  return { valid: !invalid, filters: { query, group, sort, view } };
}

function journalHref(
  filters: JournalFilters,
  changes: Partial<JournalFilters> = {},
) {
  const next = { ...filters, ...changes };
  const params = new URLSearchParams();
  if (next.query) params.set("q", next.query);
  if (next.group !== "all") params.set("group", next.group);
  if (next.sort !== "newest") params.set("sort", next.sort);
  if (next.view !== "grid") params.set("view", next.view);
  const query = params.toString();
  return query ? `/journal?${query}` : "/journal";
}

export default async function JournalPage({
  params,
  searchParams,
}: JournalPageProps) {
  const [{ locale }, search, t] = await Promise.all([
    params,
    searchParams,
    getTranslations("journal"),
  ]);
  const { filters: selected, valid: validSearch } = parseJournalFilters(search);
  const entries = await getJournalDemoEntries(createSupabaseServerClient());
  const counts = entries.reduce(
    (total, entry) => {
      total[entry.group] += 1;
      if (entry.needsReview) total.needsReview += 1;
      return total;
    },
    { flora: 0, fauna: 0, needsReview: 0 },
  );
  const query = selected.query.toLocaleLowerCase(locale);
  const collator = new Intl.Collator(locale, { sensitivity: "base" });
  const visibleEntries = validSearch
    ? entries
        .filter((entry) => {
          if (selected.group !== "all" && entry.group !== selected.group)
            return false;
          if (!query) return true;
          return (
            entry.commonName
              .normalize("NFC")
              .toLocaleLowerCase(locale)
              .includes(query) ||
            entry.scientificName
              .normalize("NFC")
              .toLocaleLowerCase(locale)
              .includes(query)
          );
        })
        .sort((first, second) => {
          if (selected.sort === "name")
            return (
              collator.compare(first.commonName, second.commonName) ||
              first.id.localeCompare(second.id)
            );
          const dateOrder =
            selected.sort === "newest"
              ? Date.parse(second.observedAt) - Date.parse(first.observedAt)
              : Date.parse(first.observedAt) - Date.parse(second.observedAt);
          return dateOrder || first.id.localeCompare(second.id);
        })
    : [];
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
  });

  const collectionFilters = [
    { key: "all", group: "all", label: t("filterAll"), count: entries.length },
    { key: "threatened", label: t("filterThreatened") },
    { key: "invasive", label: t("filterInvasive") },
    {
      key: "flora",
      group: "flora",
      label: t("filterPlants"),
      count: counts.flora,
    },
    {
      key: "fauna",
      group: "fauna",
      label: t("filterAnimals"),
      count: counts.fauna,
    },
  ] as const;
  const resetHref = journalHref(selected, { query: "", group: "all" });

  return (
    <main className={styles.page} id="main">
      <header className={styles.intro}>
        <p className={styles.eyebrow}>{t("eyebrow")}</p>
        <h1>
          {t("title")}
          <span aria-hidden="true" className={styles.titleDot}>
            .
          </span>
        </h1>
        <p className={styles.subtitle}>{t("introduction")}</p>
      </header>

      <ForestMedia
        className={styles.journalHero}
        labelledBy="journal-hero-title"
      >
        <div className={styles.heroCopy}>
          <p className={styles.heroLabel}>{t("heroLabel")}</p>
          <h2 id="journal-hero-title">
            <span>{t("heroTitleLineOne")}</span>
            <span className={styles.heroAccent}>{t("heroTitleLineTwo")}</span>
          </h2>
          <p className={styles.heroDescription}>{t("heroDescription")}</p>
        </div>
      </ForestMedia>

      <ul className={styles.metrics} aria-label={t("metricsLabel")}>
        <li className={styles.metric}>
          <NotebookText aria-hidden="true" />
          <span className={styles.metricValue} data-metric="total">
            {formatCount(entries.length)}
          </span>
          <span className={styles.metricLabel}>{t("metricTotal")}</span>
          <span className={styles.metricHelp}>{t("metricTotalHelp")}</span>
        </li>
        <li className={styles.metric}>
          <Leaf aria-hidden="true" />
          <span className={styles.metricValue} data-metric="flora">
            {formatCount(counts.flora)}
          </span>
          <span className={styles.metricLabel}>{t("metricFlora")}</span>
          <span className={styles.metricHelp}>{t("metricFloraHelp")}</span>
        </li>
        <li className={styles.metric}>
          <PawPrint aria-hidden="true" />
          <span className={styles.metricValue} data-metric="fauna">
            {formatCount(counts.fauna)}
          </span>
          <span className={styles.metricLabel}>{t("metricFauna")}</span>
          <span className={styles.metricHelp}>{t("metricFaunaHelp")}</span>
        </li>
        <li className={styles.metric}>
          <ClipboardList aria-hidden="true" />
          <span className={styles.metricValue} data-metric="review">
            {formatCount(counts.needsReview)}
          </span>
          <span className={styles.metricLabel}>{t("metricReview")}</span>
          <span className={styles.metricHelp}>{t("metricReviewHelp")}</span>
        </li>
      </ul>

      <section className={styles.collection} aria-labelledby="collection-title">
        <header className={styles.collectionHeader}>
          <div className={styles.collectionTitle}>
            <h2 id="collection-title">{t("collectionTitle")}</h2>
            {validSearch ? (
              <span
                aria-label={t("resultCount", { count: visibleEntries.length })}
              >
                {formatCount(visibleEntries.length)}
              </span>
            ) : null}
          </div>
          <div className={styles.collectionControls}>
            <details className={styles.sortMenu}>
              <summary>
                {t("sortLabel")}:{" "}
                <strong>
                  {selected.sort === "newest"
                    ? t("sortNewest")
                    : selected.sort === "oldest"
                      ? t("sortOldest")
                      : t("sortName")}
                </strong>
              </summary>
              <div className={styles.sortOptions}>
                <Link
                  aria-current={selected.sort === "newest" ? "true" : undefined}
                  className={styles.sortOption}
                  href={journalHref(selected, { sort: "newest" })}
                >
                  {t("sortNewest")}
                </Link>
                <Link
                  aria-current={selected.sort === "oldest" ? "true" : undefined}
                  className={styles.sortOption}
                  href={journalHref(selected, { sort: "oldest" })}
                >
                  {t("sortOldest")}
                </Link>
                <Link
                  aria-current={selected.sort === "name" ? "true" : undefined}
                  className={styles.sortOption}
                  href={journalHref(selected, { sort: "name" })}
                >
                  {t("sortName")}
                </Link>
              </div>
            </details>
            <nav className={styles.viewToggle} aria-label={t("viewLabel")}>
              <Link
                aria-current={selected.view === "grid" ? "page" : undefined}
                aria-label={t("viewGrid")}
                className={styles.viewLink}
                href={journalHref(selected, { view: "grid" })}
              >
                <LayoutGrid aria-hidden="true" />
              </Link>
              <Link
                aria-current={selected.view === "list" ? "page" : undefined}
                aria-label={t("viewList")}
                className={styles.viewLink}
                href={journalHref(selected, { view: "list" })}
              >
                <LayoutList aria-hidden="true" />
              </Link>
            </nav>
          </div>
        </header>
        <div className={styles.collectionFilters}>
          <nav className={styles.filters} aria-label={t("filterLabel")}>
            {collectionFilters.map((filter) =>
              "group" in filter ? (
                <Link
                  aria-current={
                    selected.group === filter.group ? "page" : undefined
                  }
                  className={`${styles.filter}${
                    selected.group === filter.group
                      ? ` ${styles.filterActive}`
                      : ""
                  }`}
                  href={journalHref(selected, { group: filter.group })}
                  key={filter.key}
                >
                  {filter.label}
                  <span>{formatCount(filter.count)}</span>
                </Link>
              ) : (
                <button
                  aria-describedby="journal-status-unavailable"
                  className={`${styles.filter} ${styles.filterUnavailable}`}
                  disabled
                  key={filter.key}
                  type="button"
                >
                  {filter.label}
                </button>
              ),
            )}
          </nav>
          <form action="/id/journal" className={styles.searchForm} method="get">
            {selected.group !== "all" ? (
              <input name="group" type="hidden" value={selected.group} />
            ) : null}
            {selected.sort !== "newest" ? (
              <input name="sort" type="hidden" value={selected.sort} />
            ) : null}
            {selected.view !== "grid" ? (
              <input name="view" type="hidden" value={selected.view} />
            ) : null}
            <div className={styles.searchControl}>
              <button
                aria-label={t("searchSubmit")}
                className={styles.searchButton}
                type="submit"
              >
                <Search aria-hidden="true" />
              </button>
              <JournalSearchInput
                key={selected.query}
                label={t("searchLabel")}
                placeholder={t("searchPlaceholder")}
                query={selected.query}
              />
            </div>
          </form>
        </div>

        {!validSearch ? (
          <p className={styles.empty} role="alert">
            {t("invalidUrl")} <Link href={resetHref}>{t("clearFilters")}</Link>
          </p>
        ) : visibleEntries.length === 0 ? (
          <p className={styles.empty} role="status">
            {entries.length === 0
              ? t("emptyDemo")
              : selected.query
                ? t("emptySearch")
                : t("emptyGroup")}{" "}
            {selected.query || selected.group !== "all" ? (
              <Link href={resetHref}>{t("clearFilters")}</Link>
            ) : null}
          </p>
        ) : (
          <div
            className={
              selected.view === "grid" ? styles.cardGrid : styles.cardList
            }
            data-view={selected.view}
          >
            {visibleEntries.map((entry) => (
              <article
                className={styles.card}
                key={entry.id}
                data-journal-entry="true"
                data-group={entry.group}
                data-needs-review={entry.needsReview ? "true" : "false"}
              >
                <div className={styles.cardImage}>
                  <Image
                    alt={entry.imageAlt}
                    fill
                    sizes="(max-width: 767px) 100vw, (max-width: 1199px) 45vw, 310px"
                    src={entry.imagePath}
                  />
                  <span className={styles.demoBadge}>{t("demoBadge")}</span>
                  <span className={styles.groupBadge}>
                    {entry.group === "flora"
                      ? t("filterFlora")
                      : t("filterFauna")}
                  </span>
                </div>
                <div className={styles.cardBody}>
                  <h3>{entry.commonName}</h3>
                  <p className={styles.scientificName}>
                    <em>{entry.scientificName}</em>
                  </p>
                  <div className={styles.cardMetadata}>
                    <span>{entry.regionLabel}</span>
                    <time dateTime={entry.observedAt}>
                      {dateFormatter.format(new Date(entry.observedAt))}
                    </time>
                  </div>
                  {entry.needsReview ? (
                    <p className={styles.reviewNote}>{t("reviewNote")}</p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <footer className={styles.journalFooter}>
        <p className={styles.filterStatusNote} id="journal-status-unavailable">
          {t("statusUnavailable")}
        </p>
        <p className={styles.demoNotice}>{t("demoNotice")}</p>
      </footer>
    </main>
  );
}
