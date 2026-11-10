import { getTranslations } from "next-intl/server";
import styles from "./login.module.css";

export default async function LoginLoading() {
  const t = await getTranslations("login");

  return (
    <main id="main" className={styles.page}>
      <section
        aria-busy="true"
        aria-labelledby="login-loading-title"
        className={styles.card}
        role="status"
      >
        <p className={styles.eyebrow}>{t("eyebrow")}</p>
        <h1 id="login-loading-title">{t("heading")}</h1>
        <p className={styles.body}>{t("loading")}</p>
      </section>
    </main>
  );
}
