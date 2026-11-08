import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import styles from "./forest-media.module.css";

type ForestMediaProps = {
  children: ReactNode;
  labelledBy: string;
  className?: string | undefined;
};

export default async function ForestMedia({
  children,
  labelledBy,
  className,
}: ForestMediaProps) {
  const t = await getTranslations("media");

  return (
    <figure
      aria-labelledby={labelledBy}
      className={`${styles.figure}${className ? ` ${className}` : ""}`}
    >
      <Image
        alt={t("forestAlt")}
        className={styles.image}
        fill
        loading="eager"
        sizes="(max-width: 767px) 100vw, 1129px"
        src="/images/forest-canopy.jpg"
      />
      <span className={styles.scrim} aria-hidden="true" />
      <div className={styles.content}>{children}</div>
    </figure>
  );
}
