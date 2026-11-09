import type { Metadata } from "next";
import { RotateCcw, SearchX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import {
  parseCatalogSearchParams,
  serializeCatalogSearchParams,
} from "@/features/species/catalog-params";
import { getPublishedSpeciesCatalog } from "@/features/species/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseEnvironment } from "@/lib/env";
import { Link } from "@/i18n/navigation";
import CatalogControls, {
  CatalogPagination,
} from "@/features/species/catalog-controls";
import SpeciesCard from "@/features/species/species-card";
import type { SpeciesCatalogPage } from "@/features/species/schemas";
import styles from "@/features/species/catalog.module.css";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "catalog" });
  return { title: t("title") };
}

export default async function SpeciesCatalogPage({ searchParams }: PageProps) {
  const t = await getTranslations("catalog");
  const parsed = parseCatalogSearchParams(await searchParams);
  if (!parsed.ok) {
    return (
      <main className={styles.page} id="main">
        <header className={styles.intro}>
          <h1>{t("title")}</h1>
          <p>{t("description")}</p>
        </header>
        <section
          className={styles.state}
          aria-labelledby="catalog-invalid-title"
        >
          <h2 id="catalog-invalid-title">{t("invalidTitle")}</h2>
          <p>{t("invalidDescription")}</p>
          <Link href="/species">{t("reset")}</Link>
        </section>
      </main>
    );
  }

  let catalog: SpeciesCatalogPage | undefined;
  let unconfigured = false;
  let failed = false;
  try {
    getSupabaseEnvironment();
  } catch {
    unconfigured = true;
  }
  if (!unconfigured) {
    try {
      catalog = await getPublishedSpeciesCatalog(createSupabaseServerClient(), {
        ...parsed.value,
        locale: "id",
      });
    } catch {
      failed = true;
    }
  }

  const pageCount = catalog ? Math.ceil(catalog.total / catalog.pageSize) : 0;
  const pageOutOfRange = Boolean(
    catalog && parsed.value.page > Math.max(1, pageCount),
  );
  const hasAnyFilter =
    parsed.value.query.length > 0 ||
    parsed.value.statuses.length > 0 ||
    parsed.value.taxa.length > 0 ||
    parsed.value.regions.length > 0 ||
    parsed.value.habitats.length > 0;
  const emptyUnfilteredCatalog = catalog?.total === 0 && !hasAnyFilter;

  return (
    <main className={styles.page} id="main">
      <header className={styles.intro}>
        <h1>{t("title")}</h1>
        <p>{t("description")}</p>
      </header>
      {unconfigured || failed || !catalog ? (
        <section className={styles.state} aria-labelledby="catalog-error-title">
          <h2 id="catalog-error-title">
            {t(unconfigured ? "unconfiguredTitle" : "unavailableTitle")}
          </h2>
          <p>
            {t(
              unconfigured
                ? "unconfiguredDescription"
                : "unavailableDescription",
            )}
          </p>
          <Link href="/species">{t("retry")}</Link>
        </section>
      ) : (
        <>
          <section
            className={styles.catalog}
            aria-labelledby="catalog-results-title"
          >
            <div className={styles.resultsHeading}>
              <div>
                <h2 id="catalog-results-title">{t("resultsTitle")}</h2>
                <p>
                  {t("resultSummary", {
                    shown: catalog.items.length,
                    total: catalog.total,
                  })}
                </p>
              </div>
            </div>
            <CatalogControls
              key={serializeCatalogSearchParams(parsed.value)}
              value={parsed.value}
              facets={catalog.facets}
            />
            {catalog.items.length ? (
              <div
                className={
                  parsed.value.view === "list" ? styles.list : styles.grid
                }
              >
                {catalog.items.map((species) => (
                  <SpeciesCard key={species.id} species={species} />
                ))}
              </div>
            ) : (
              <section className={styles.emptyState} aria-live="polite">
                <span aria-hidden="true" className={styles.emptyIcon}>
                  <SearchX size={30} strokeWidth={1.6} />
                </span>
                <h3>
                  {t(
                    pageOutOfRange
                      ? "outOfRangeTitle"
                      : emptyUnfilteredCatalog
                        ? "emptyTitle"
                        : "noMatchTitle",
                  )}
                </h3>
                <p>
                  {t(
                    pageOutOfRange
                      ? "outOfRangeDescription"
                      : emptyUnfilteredCatalog
                        ? "emptyDescription"
                        : "noMatchDescription",
                  )}
                </p>
                {!emptyUnfilteredCatalog && (
                  <>
                    <p className={styles.emptyHint}>{t("emptyHint")}</p>
                    <Link className={styles.emptyAction} href="/species">
                      <RotateCcw aria-hidden="true" size={16} strokeWidth={2} />
                      {t("emptyAction")}
                    </Link>
                  </>
                )}
              </section>
            )}
            {(pageCount > 1 || pageOutOfRange) && (
              <nav
                className={styles.pagination}
                aria-label={t("paginationLabel")}
              >
                <CatalogPagination value={parsed.value} total={catalog.total} />
              </nav>
            )}
          </section>
        </>
      )}
    </main>
  );
}
