"use client";

import { Bell, BellOff, LogIn, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import styles from "./header-actions.module.css";
import type { AccountSummary } from "@/features/account/schemas";
import { signOut } from "@/features/account/actions";

/**
 * Account actions reflect the verified server session. Notifications remain an
 * empty state until the app has a notification source.
 */
export default function HeaderActions({
  account,
}: {
  account: AccountSummary | null;
}) {
  const t = useTranslations("navigation");

  return (
    <div className="shell-header-actions">
      <Popover>
        <PopoverTrigger asChild>
          <button
            aria-label={t("notifications")}
            className="shell-header-action"
            type="button"
          >
            <Bell aria-hidden="true" size={18} strokeWidth={1.75} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className={styles.panel}>
          <header className={styles.panelHeader}>
            <span aria-hidden="true" className={styles.panelIcon}>
              <Bell size={16} strokeWidth={2} />
            </span>
            <div>
              <h2 className={styles.panelTitle}>{t("notifications")}</h2>
              <p className={styles.panelSubtitle}>{t("notificationsEmpty")}</p>
            </div>
          </header>

          <div className={styles.emptyBody}>
            <span aria-hidden="true" className={styles.emptyIcon}>
              <BellOff size={26} strokeWidth={1.6} />
            </span>
            <p className={styles.emptyText}>{t("notificationsEmptyHelp")}</p>
          </div>

          <footer className={styles.panelFooter}>
            {t("notificationsNote")}
          </footer>
        </PopoverContent>
      </Popover>

      <Link
        className="shell-header-action shell-header-action--signin"
        href={
          account ? (account.username ? "/profile" : "/onboarding") : "/login"
        }
      >
        <LogIn aria-hidden="true" size={16} strokeWidth={2} />
        {account ? "Lihat profil" : t("signIn")}
      </Link>

      <Popover>
        <PopoverTrigger asChild>
          <button
            aria-label={t("account")}
            className={`shell-header-action ${styles.accountButton}`}
            type="button"
          >
            <UserRound aria-hidden="true" size={18} strokeWidth={1.75} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className={styles.panel}>
          <header className={styles.panelHeader}>
            <span aria-hidden="true" className={styles.panelIcon}>
              <UserRound size={16} strokeWidth={2} />
            </span>
            <div>
              <h2 className={styles.panelTitle}>{t("account")}</h2>
              <p className={styles.panelSubtitle}>
                {account?.displayName || t("accountSignedOut")}
              </p>
            </div>
          </header>

          <div className={styles.emptyBody}>
            {account ? (
              <>
                <Link href={account.username ? "/profile" : "/onboarding"}>
                  {account.username
                    ? `@${account.username} · Lihat profil`
                    : "Lengkapi profil"}
                </Link>
                <form action={signOut}>
                  <button className="shell-account-logout" type="submit">
                    Keluar
                  </button>
                </form>
              </>
            ) : (
              <>
                <p className={styles.emptyText}>{t("accountSignedOutHelp")}</p>
                <Link href="/login">Masuk dengan Google →</Link>
              </>
            )}
          </div>

          <footer className={styles.panelFooter}>{t("accountNote")}</footer>
        </PopoverContent>
      </Popover>
    </div>
  );
}
