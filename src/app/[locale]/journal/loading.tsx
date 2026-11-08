import { getTranslations } from "next-intl/server";
import styles from "./journal.module.css";

export default async function JournalLoading() {
  const t = await getTranslations("journal");
  return (
    <main className={styles.page} id="main" aria-busy="true">
      <h1>{t("title")}</h1>
      <p role="status">{t("loading")}</p>
    </main>
  );
}
