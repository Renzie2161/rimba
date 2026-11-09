import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import IdentifyWorkspace from "./identify-workspace";
import styles from "./identify.module.css";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "identify" });
  return { title: t("title") };
}

export default async function IdentifyPage() {
  const t = await getTranslations("identify");

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

      <IdentifyWorkspace
        labels={{
          dropTitle: t("dropTitle"),
          dropHelp: t("dropHelp"),
          dropActive: t("dropActive"),
          chooseFile: t("chooseFile"),
          takePhoto: t("takePhoto"),
          fileTypeError: t("fileTypeError"),
          fileSizeError: t("fileSizeError"),
          fileTooLarge: t("fileTooLarge"),
          analysing: t("analysing"),
          unavailableTitle: t("unavailableTitle"),
          unavailableBody: t("unavailableBody"),
          trySearch: t("trySearch"),
          searchLabel: t("searchLabel"),
          searchPlaceholder: t("searchPlaceholder"),
          searchSubmit: t("searchSubmit"),
          previewAlt: t("previewAlt"),
          removeImage: t("removeImage"),
        }}
        searchHref="/species"
      />

      <section aria-labelledby="identify-limits" className={styles.limits}>
        <h2 id="identify-limits">{t("limitsTitle")}</h2>
        <p>{t("limitsBody")}</p>
      </section>
    </main>
  );
}
