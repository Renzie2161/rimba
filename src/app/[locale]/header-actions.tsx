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

/**
 * Header actions for notifications and account.
 *
 * No notification backend exists yet, so the panel shows a designed empty state
 * rather than fabricated items or an invented unread count. The account control
 * is a labelled sign-in link because nobody is signed in.
 */
export default function HeaderActions() {
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
        href="/login"
      >
        <LogIn aria-hidden="true" size={16} strokeWidth={2} />
        {t("signIn")}
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
              <p className={styles.panelSubtitle}>{t("accountSignedOut")}</p>
            </div>
          </header>

          <div className={styles.emptyBody}>
            <p className={styles.emptyText}>{t("accountSignedOutHelp")}</p>
          </div>

          <footer className={styles.panelFooter}>{t("accountNote")}</footer>
        </PopoverContent>
      </Popover>
    </div>
  );
}
