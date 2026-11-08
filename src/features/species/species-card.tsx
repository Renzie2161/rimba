import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { SpeciesDetail } from "./schemas";
import styles from "./catalog.module.css";

export default function SpeciesCard({ species }: { species: SpeciesDetail }) {
  const t = useTranslations("species");
  const media = species.media[0];
  return (
    <Link className={styles.card} href={`/species/${species.slug}`}>
      <figure className={styles.cardMedia}>
        {media ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={media.url}
            alt={media.alt}
            loading="lazy"
            style={{
              objectPosition: `${media.positionX ?? 50}% ${media.positionY ?? 50}%`,
            }}
          />
        ) : (
          <span className={styles.cardFallback} aria-hidden="true">
            {species.scientificName.slice(0, 1)}
          </span>
        )}
        <figcaption>
          {media ? (
            <>
              <span>{media.attributionText}</span>
              <span>{media.license}</span>
            </>
          ) : (
            t("mediaUnavailable")
          )}
        </figcaption>
      </figure>
      <div className={styles.cardContent}>
        <h3>{species.commonName}</h3>
        <p className={styles.cardScientific}>{species.scientificName}</p>
        <p className={styles.cardSummary}>{species.summary}</p>
        <div className={styles.cardMeta}>
          <span className={styles.status}>
            {species.status ? t(`status.${species.status}`) : t("unknown")}
          </span>
          {species.regionCodes.length > 0 && (
            <span>{species.regionCodes.join(", ")}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
