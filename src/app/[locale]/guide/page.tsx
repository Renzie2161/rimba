import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Sprout, X } from "lucide-react";
import styles from "./guide.module.css";

type GuidePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: GuidePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "guide" });
  return { title: t("title") };
}

export default async function GuidePage() {
  const t = await getTranslations("guide");
  const rules = [
    {
      key: "ruleOne",
      title: "ruleOneTitle",
      description: "ruleOneDescription",
    },
    {
      key: "ruleTwo",
      title: "ruleTwoTitle",
      description: "ruleTwoDescription",
    },
    {
      key: "ruleThree",
      title: "ruleThreeTitle",
      description: "ruleThreeDescription",
    },
  ] as const;

  return (
    <main className={styles.page} id="main">
      <section className={styles.panel} aria-labelledby="guide-title">
        <div className={styles.panelHeader}>
          <div className={styles.emblem} aria-hidden="true">
            <span className={styles.emblemMark}>
              <Sprout size={26} strokeWidth={1.7} />
            </span>
          </div>
          <Link
            aria-label={t("backLink")}
            className={styles.backLink}
            href="/species"
          >
            <X aria-hidden="true" size={20} strokeWidth={1.8} />
          </Link>
        </div>
        <p className={styles.introLabel}>{t("introLabel")}</p>
        <h1 id="guide-title">{t("headline")}</h1>
        <p className={styles.introduction}>{t("introduction")}</p>
        <ol className={styles.rules} role="list">
          {rules.map((rule, index) => (
            <li
              aria-posinset={index + 1}
              aria-setsize={rules.length}
              className={styles.rule}
              key={rule.key}
              role="listitem"
            >
              <span className={styles.number} aria-hidden="true">
                0{index + 1}
              </span>
              <div>
                <h2>{t(rule.title)}</h2>
                <p>{t(rule.description)}</p>
              </div>
            </li>
          ))}
        </ol>
        <Link className={styles.catalogLink} href="/species">
          {t("catalogLink")}
        </Link>
      </section>
    </main>
  );
}
