import { Skeleton } from "@/components/ui/skeleton";
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
        <div aria-hidden="true" className={styles.loadingBrand}>
          <Skeleton className={styles.loadingLogo} />
          <Skeleton className={styles.loadingBrandName} />
        </div>
        <p className={styles.eyebrow}>{t("eyebrow")}</p>
        <h1 id="login-loading-title">{t("heading")}</h1>
        <p className={styles.body}>{t("loading")}</p>
        <div aria-hidden="true" className={styles.loadingStructure}>
          <Skeleton className={styles.loadingAction} />
          <Skeleton className={styles.loadingNote} />
          <Skeleton className={styles.loadingBack} />
        </div>
      </section>
    </main>
  );
}
