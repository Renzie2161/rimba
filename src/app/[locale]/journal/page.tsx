import type { Metadata } from "next";
import { ClipboardList, Leaf, NotebookText, PawPrint } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getFeaturedSpecies } from "@/features/species/queries";
import type { SpeciesDetail } from "@/features/species/schemas";
import FeaturedCarousel from "@/features/species/featured-carousel";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ForestMedia from "../forest-media";
import styles from "./journal.module.css";

type JournalPageProps = { params: Promise<{ locale: string }> };

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

export default async function JournalPage() {
  const t = await getTranslations("journal");

  let featured: SpeciesDetail[] = [];
  let summary = { total: 0, flora: 0, fauna: 0, attention: 0 };
  let failed = false;
  try {
    const result = await getFeaturedSpecies(createSupabaseServerClient(), {
      locale: "id",
      limit: 8,
    });
    featured = result.items;
    summary = result.summary;
  } catch {
    failed = true;
  }

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
            {formatCount(summary.total)}
          </span>
          <span className={styles.metricLabel}>{t("metricTotal")}</span>
          <span className={styles.metricHelp}>{t("metricTotalHelp")}</span>
        </li>
        <li className={styles.metric}>
          <Leaf aria-hidden="true" />
          <span className={styles.metricValue} data-metric="flora">
            {formatCount(summary.flora)}
          </span>
          <span className={styles.metricLabel}>{t("metricFlora")}</span>
          <span className={styles.metricHelp}>{t("metricFloraHelp")}</span>
        </li>
        <li className={styles.metric}>
          <PawPrint aria-hidden="true" />
          <span className={styles.metricValue} data-metric="fauna">
            {formatCount(summary.fauna)}
          </span>
          <span className={styles.metricLabel}>{t("metricFauna")}</span>
          <span className={styles.metricHelp}>{t("metricFaunaHelp")}</span>
        </li>
        <li className={styles.metric}>
          <ClipboardList aria-hidden="true" />
          <span className={styles.metricValue} data-metric="attention">
            {formatCount(summary.attention)}
          </span>
          <span className={styles.metricLabel}>{t("metricThreatened")}</span>
          <span className={styles.metricHelp}>{t("metricThreatenedHelp")}</span>
        </li>
      </ul>

      {failed ? (
        <p className={styles.empty} role="alert">
          {t("emptyFeatured")}
        </p>
      ) : featured.length === 0 ? (
        <p className={styles.empty} role="status">
          {t("emptyFeatured")}
        </p>
      ) : (
        <FeaturedCarousel species={featured} />
      )}
    </main>
  );
}
