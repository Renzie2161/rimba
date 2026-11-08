import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import ForestMedia from "../forest-media";
import styles from "./about.module.css";

type AboutPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: AboutPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return { title: t("title") };
}

export default async function AboutPage() {
  const t = await getTranslations("about");

  return (
    <main className={styles.page} id="main">
      <article className={styles.panel}>
        <h1>{t("title")}</h1>
        <div className={styles.prose}>
          <p>{t("paragraphOne")}</p>
          <p>{t("paragraphTwo")}</p>
        </div>
        <p className={styles.prototypeNote}>{t("prototypeDisclaimer")}</p>
        <ForestMedia className={styles.banner} labelledBy="about-banner-title">
          <h2 id="about-banner-title">{t("bannerTitle")}</h2>
        </ForestMedia>
      </article>
    </main>
  );
}
