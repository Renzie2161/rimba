import { getTranslations } from "next-intl/server";
import styles from "@/features/species/catalog.module.css";

export default async function SpeciesLoading() {
  const t = await getTranslations("catalog");
  return (
    <main className={styles.page} id="main" aria-busy="true">
      <h1>{t("title")}</h1>
      <p role="status">{t("loading")}</p>
    </main>
  );
}
