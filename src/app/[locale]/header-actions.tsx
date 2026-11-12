"use client";

import {
  ArrowUpRight,
  Bell,
  BellOff,
  LogIn,
  LogOut,
  UserRound,
} from "lucide-react";
import Image from "next/image";
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
              <p className={styles.panelSubtitle}>
                {t("notificationsUnavailable")}
              </p>
            </div>
          </header>

          <div className={styles.emptyBody}>
            <span aria-hidden="true" className={styles.emptyIcon}>
              <BellOff size={22} strokeWidth={1.6} />
            </span>
            <p className={styles.emptyText}>{t("notificationsEmptyHelp")}</p>
          </div>
        </PopoverContent>
      </Popover>

      {account ? (
        <Popover>
          <PopoverTrigger asChild>
            <button
              aria-label={t("account")}
              className={`shell-header-action ${styles.accountButton}`}
              type="button"
            >
              {account.avatarUrl ? (
                <Image
                  alt=""
                  className={styles.avatarImage}
                  height={36}
                  src={account.avatarUrl}
                  unoptimized
                  width={36}
                />
              ) : (
                <UserRound aria-hidden="true" size={18} strokeWidth={1.75} />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className={styles.panel}>
            <header className={styles.panelHeader}>
              <span aria-hidden="true" className={styles.profileAvatar}>
                {account.avatarUrl ? (
                  <Image
                    alt=""
                    className={styles.avatarImage}
                    height={44}
                    src={account.avatarUrl}
                    unoptimized
                    width={44}
                  />
                ) : (
                  <UserRound size={19} strokeWidth={1.75} />
                )}
              </span>
              <div>
                <h2 className={styles.panelTitle}>{account.displayName}</h2>
                <p className={styles.panelSubtitle}>
                  {account.username
                    ? `@${account.username}`
                    : "Lengkapi profil"}
                </p>
              </div>
            </header>

            <div className={styles.profileActions}>
              <Link
                className={styles.profileLink}
                href={account.username ? "/profile" : "/onboarding"}
              >
                <UserRound aria-hidden="true" size={16} strokeWidth={1.8} />
                <span>
                  {account.username ? "Lihat profil" : "Lengkapi profil"}
                </span>
                <ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.8} />
              </Link>
              <form action={signOut}>
                <button className={styles.logout} type="submit">
                  <LogOut aria-hidden="true" size={16} strokeWidth={1.8} />
                  Keluar
                </button>
              </form>
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        <Link
          className="shell-header-action shell-header-action--signin"
          href="/login"
        >
          <LogIn aria-hidden="true" size={16} strokeWidth={2} />
          {t("signIn")}
        </Link>
      )}
    </div>
  );
}
