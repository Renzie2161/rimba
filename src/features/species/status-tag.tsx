import { useTranslations } from "next-intl";
import type { SpeciesDetail } from "./schemas";
import styles from "./status-tag.module.css";

type Props = {
  status: SpeciesDetail["status"];
  /** Distinct ecological classification; never merged with the IUCN status. */
  invasiveStatus?: SpeciesDetail["invasiveStatus"];
  /** Compact chips sit on photography; default sits in a metadata row. */
  variant?: "chip" | "inline";
};

export default function StatusTag({
  status,
  invasiveStatus = null,
  variant = "inline",
}: Props) {
  const t = useTranslations("species");
  const className = `${styles.tag} ${variant === "chip" ? styles.chip : styles.inline}`;

  return (
    <>
      <span className={`${className} ${styles.threat}`}>
        {status ? `${status} · ${t(`status.${status}`)}` : t("statusUnknown")}
      </span>
      {invasiveStatus ? (
        <span
          className={`${className} ${
            invasiveStatus === "invasive" ? styles.invasive : styles.ecological
          }`}
        >
          {t(`ecological.${invasiveStatus}`)}
        </span>
      ) : null}
    </>
  );
}
