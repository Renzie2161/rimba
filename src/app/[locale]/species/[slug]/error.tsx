"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import styles from "@/features/species/catalog.module.css";

export default function SpeciesDetailError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("species");
  const router = useRouter();
  return (
    <main className={styles.page} id="main">
      <section className={styles.state} role="alert">
        <h1>{t("errorTitle")}</h1>
        <p>{t("errorDescription")}</p>
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
