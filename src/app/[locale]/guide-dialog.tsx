"use client";

import { Sprout } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import styles from "./guide-dialog.module.css";

/**
 * Field guide as an in-page dialog rather than its own route.
 *
 * Uses the same native <dialog> pattern as the mobile navigation drawer, so focus
 * handling, Escape and the backdrop come from the platform.
 */
export default function GuideDialog({ label }: { label: string }) {
  const t = useTranslations("guide");
  const dialogRef = useRef<HTMLDialogElement>(null);

  const rules = [
    {
      key: "ruleOne",
      title: "ruleOneTitle",
      description: "ruleOneDescription",
    },
    {
      key: "ruleTwo",
      title: "ruleTwoTitle",
      description: "ruleTwoDescription",
    },
    {
      key: "ruleThree",
      title: "ruleThreeTitle",
      description: "ruleThreeDescription",
    },
  ] as const;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    function onClick(event: MouseEvent) {
      if (event.target === dialog) dialog?.close();
    }
    dialog.addEventListener("click", onClick);
    return () => dialog.removeEventListener("click", onClick);
  }, []);

  return (
    <>
      <button
        className={styles.trigger}
        onClick={() => dialogRef.current?.showModal()}
        type="button"
      >
        <Sprout aria-hidden="true" size={19} strokeWidth={1.75} />
        <span>{label}</span>
      </button>

      <dialog
        aria-labelledby="guide-dialog-title"
        className={styles.dialog}
        ref={dialogRef}
      >
        <div className={styles.inner}>
          <div className={styles.emblem} aria-hidden="true">
            <span className={styles.emblemMark}>
              <Sprout size={24} strokeWidth={1.7} />
            </span>
          </div>

          <p className={styles.introLabel}>{t("introLabel")}</p>
          <h2 className={styles.headline} id="guide-dialog-title">
            {t("headline")}
          </h2>
          <p className={styles.introduction}>{t("introduction")}</p>

          <ol className={styles.rules}>
            {rules.map((rule, index) => (
              <li className={styles.rule} key={rule.key}>
                <span className={styles.number} aria-hidden="true">
                  0{index + 1}
                </span>
                <div>
                  <h3>{t(rule.title)}</h3>
                  <p>{t(rule.description)}</p>
                </div>
              </li>
            ))}
          </ol>

          <button
            className={styles.primary}
            onClick={() => dialogRef.current?.close()}
            type="button"
          >
            {t("catalogLink")}
          </button>
        </div>
      </dialog>
    </>
  );
}
