import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getAccount } from "@/features/account/server";
import AccountUnavailable from "@/features/account/account-unavailable";
import GoogleSignInForm from "./google-sign-in-form";
import styles from "./login.module.css";

type LoginPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
};

export async function generateMetadata({
  params,
}: Pick<LoginPageProps, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "login" });

  return {
    title: t("metadataTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function LoginPage({
  params,
  searchParams,
}: LoginPageProps) {
  const [{ locale }, { error }] = await Promise.all([params, searchParams]);
  const t = await getTranslations({ locale, namespace: "login" });
  const account = await getAccount();
  if (account?.unavailable) return <AccountUnavailable />;
  if (account)
    redirect(account.profile?.username ? "/id/profile" : "/id/onboarding");

  return (
    <main id="main" className={styles.page}>
      <section className={styles.card} aria-labelledby="login-title">
        <div className={styles.brand}>
          <Image
            className={styles.brandLogo}
            src="/rimba-mark.png"
            alt=""
            width={40}
            height={40}
            priority
          />
          <span className={styles.brandName}>{t("brand")}</span>
        </div>
        <p className={styles.eyebrow}>{t("eyebrow")}</p>
        <h1 id="login-title">{t("heading")}</h1>
        <p className={styles.body}>{t("description")}</p>
        {error ? (
          <p role="alert" className={styles.error}>
            {t("error")}
          </p>
        ) : null}
        <GoogleSignInForm
          label={t("googleButton")}
          pendingLabel={t("googlePending")}
        />
        <p className={styles.note}>{t("privacyNote")}</p>
        <Link className={styles.back} href="/journal">
          <ArrowLeft size={16} aria-hidden="true" />
          {t("returnToJournal")}
        </Link>
      </section>
    </main>
  );
}
