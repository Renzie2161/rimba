import type { SpeciesDetail } from "./schemas";
import styles from "./catalog.module.css";

type Props = {
  species: SpeciesDetail;
  labels: (key: "mediaUnavailable") => string;
};

export default function SpeciesMedia({ species, labels }: Props) {
  const media = species.media[0];
  if (!media) {
    return (
      <figure className={styles.mediaFallback}>
        <span aria-hidden="true">{species.scientificName.slice(0, 1)}</span>
        <figcaption>{labels("mediaUnavailable")}</figcaption>
      </figure>
    );
  }
  return (
    <figure className={styles.mediaFigure}>
      {/* URLs and attribution have already passed the published-media schema. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={media.url}
        alt={media.alt}
        style={{
          objectPosition: `${media.positionX ?? 50}% ${media.positionY ?? 50}%`,
        }}
      />
      <figcaption>
        <span>{media.attributionText}</span>
        <a href={media.sourceUrl} target="_blank" rel="noreferrer">
          {media.license}
        </a>
      </figcaption>
    </figure>
  );
}
