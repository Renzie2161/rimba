import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import ForestMedia from "../forest-media";
import styles from "./about.module.css";
import { socialMetadata } from "@/lib/social-metadata";

type AboutPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: AboutPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return socialMetadata({ locale, title: t("title"), path: "/about" });
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
        <ForestMedia className={styles.banner} labelledBy="about-banner-title">
          <h2 id="about-banner-title">{t("bannerTitle")}</h2>
        </ForestMedia>
      </article>
    </main>
  );
}
