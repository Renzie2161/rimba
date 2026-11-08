import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BookOpen, Leaf } from "lucide-react";
import styles from "./donate.module.css";

type DonatePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: DonatePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "donate" });
  return { title: t("title") };
}

export default async function DonatePage() {
  const t = await getTranslations("donate");

  return (
    <main className={styles.page} id="main">
      <article className={styles.panel}>
        <header className={styles.intro}>
          <h1>{t("title")}</h1>
          <p>{t("subtitle")}</p>
        </header>

        <div className={styles.content}>
          <section
            className={styles.story}
            aria-labelledby="donate-story-title"
          >
            <h2 id="donate-story-title">{t("storyTitle")}</h2>
            <p>{t("storyDescription")}</p>
            <ul className={styles.purposes}>
              <li>
                <span className={styles.purposeIcon} aria-hidden="true">
                  <BookOpen size={20} strokeWidth={1.8} />
                </span>
                <div>
                  <h3>{t("purposeOneTitle")}</h3>
                  <p>{t("purposeOneDescription")}</p>
                </div>
              </li>
              <li>
                <span className={styles.purposeIcon} aria-hidden="true">
                  <Leaf size={20} strokeWidth={1.8} />
                </span>
                <div>
                  <h3>{t("purposeTwoTitle")}</h3>
                  <p>{t("purposeTwoDescription")}</p>
                </div>
              </li>
            </ul>
          </section>

          <aside className={styles.demo} aria-labelledby="demo-title">
            <p className={styles.warning}>{t("warning")}</p>
            <h2 id="demo-title">{t("demoTitle")}</h2>
            <div className={styles.codeBox}>
              <p>{t("warning")}</p>
              <span>{t("noCode")}</span>
            </div>
            <p className={styles.disclaimer}>{t("disclaimer")}</p>
          </aside>
        </div>

        <section className={styles.thanks} aria-labelledby="thanks-title">
          <h2 id="thanks-title">{t("thanksTitle")}</h2>
          <p>{t("thanksDescription")}</p>
        </section>
      </article>
    </main>
  );
}
