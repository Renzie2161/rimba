"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import styles from "@/features/species/catalog.module.css";

export default function SpeciesCatalogError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("catalog");
  const router = useRouter();
  return (
    <main className={styles.page} id="main">
      <section className={styles.state} role="alert">
        <h1>{t("unavailableTitle")}</h1>
        <p>{t("unavailableDescription")}</p>
        <button
          className={styles.apply}
          onClick={() => {
            reset();
            router.refresh();
          }}
          type="button"
        >
          {t("retry")}
        </button>
      </section>
    </main>
  );
}
