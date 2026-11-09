import { ArrowUpRight, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import StatusTag from "./status-tag";
import { regionLabel } from "./region-labels";
import type { SpeciesDetail } from "./schemas";
import styles from "./catalog.module.css";

export default function SpeciesCard({ species }: { species: SpeciesDetail }) {
  const media = species.media[0];
  const regions = species.regionCodes.map(regionLabel);

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
        <span aria-hidden="true" className={styles.cardCue}>
          <ArrowUpRight size={16} strokeWidth={2} />
        </span>
      </figure>
      <div className={styles.cardContent}>
        <h3>{species.commonName}</h3>
        <p className={styles.cardScientific}>{species.scientificName}</p>
        <p className={styles.cardSummary}>{species.summary}</p>
        <div className={styles.cardMeta}>
          <StatusTag
            invasiveStatus={species.invasiveStatus}
            status={species.status}
          />
          {regions.length > 0 ? (
            <span className={styles.cardRegion}>
              <MapPin aria-hidden="true" size={13} strokeWidth={2} />
              {regions.join(" · ")}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
