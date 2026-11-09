import { Skeleton } from "@/components/ui/skeleton";
import styles from "./page-skeleton.module.css";

type PageSkeletonProps = {
  /** Number of card placeholders below the content block. */
  cards?: number;
  /** Show the wide media block used by journal and catalog heroes. */
  hero?: boolean;
  /** Accessible label announced while the real page loads. */
  label: string;
};

export default function PageSkeleton({
  cards = 6,
  hero = false,
  label,
}: PageSkeletonProps) {
  return (
    <div aria-busy="true" className={styles.page} role="status">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className={styles.inner}>
        <Skeleton className={styles.eyebrow} />
        <Skeleton className={styles.title} />
        <Skeleton className={styles.subtitle} />
        {hero ? <Skeleton className={styles.hero} /> : null}
        <div className={styles.metrics}>
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton className={styles.metric} key={index} />
          ))}
        </div>
        <div className={styles.grid}>
          {Array.from({ length: cards }, (_, index) => (
            <div className={styles.card} key={index}>
              <Skeleton className={styles.cardMedia} />
              <Skeleton className={styles.cardLine} />
              <Skeleton className={styles.cardLineShort} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
