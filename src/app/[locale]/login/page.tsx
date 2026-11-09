import type { Metadata } from "next";
import { ArrowLeft, LogIn, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import styles from "./login.module.css";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "login" });
  return { title: t("title") };
}

/**
 * Sign-in placeholder. The prototype has no accounts, so this page states that
 * plainly and offers a way back instead of showing a non-functional form.
 */
export default async function LoginPage() {
  const t = await getTranslations("login");

  return (
    <main className={styles.page} id="main">
      <div className={styles.card}>
        <span aria-hidden="true" className={styles.icon}>
          <LogIn size={26} strokeWidth={1.7} />
        </span>
        <p className={styles.eyebrow}>{t("eyebrow")}</p>
        <h1>{t("title")}</h1>
        <p className={styles.body}>{t("body")}</p>
        <p className={styles.note}>
          <ShieldCheck aria-hidden="true" size={15} strokeWidth={2} />
          {t("note")}
        </p>
        <Link className={styles.back} href="/journal">
          <ArrowLeft aria-hidden="true" size={17} strokeWidth={2} />
          {t("back")}
        </Link>
      </div>
    </main>
  );
}
