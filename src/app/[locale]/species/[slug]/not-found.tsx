import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import styles from "@/features/species/catalog.module.css";

export default async function SpeciesNotFound() {
  const t = await getTranslations("species");
  return (
    <main className={styles.page} id="main">
      <section className={styles.state}>
        <h1>{t("notFoundTitle")}</h1>
        <p>{t("notFoundDescription")}</p>
        <Link href="/species">{t("backToCatalog")}</Link>
      </section>
    </main>
  );
}
