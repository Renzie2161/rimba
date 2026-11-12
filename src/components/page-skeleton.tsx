import { Skeleton } from "@/components/ui/skeleton";
import styles from "./page-skeleton.module.css";

type PageSkeletonVariant =
  "about" | "catalog" | "detail" | "donate" | "identify" | "journal";

type PageSkeletonProps = {
  variant: PageSkeletonVariant;
  label: string;
};

function TextBlock({ lines = 3 }: { lines?: number }) {
  return (
    <div className={styles.textBlock}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          className={
            index === lines - 1 ? styles.textLineShort : styles.textLine
          }
          key={index}
        />
      ))}
    </div>
  );
}

function SpeciesCard() {
  return (
    <div className={styles.card}>
      <Skeleton className={styles.cardMedia} />
      <Skeleton className={styles.cardLine} />
      <Skeleton className={styles.cardLineShort} />
      <Skeleton className={styles.cardMeta} />
    </div>
  );
}

export default function PageSkeleton({ variant, label }: PageSkeletonProps) {
  const hasEyebrow = ["detail", "identify", "journal"].includes(variant);

  return (
    <div aria-busy="true" className={styles.page} role="status">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className={`${styles.inner} ${styles[variant]}`}>
        {variant === "detail" ? <Skeleton className={styles.backLink} /> : null}
        <header className={styles.intro}>
          {hasEyebrow ? <Skeleton className={styles.eyebrow} /> : null}
          <Skeleton className={styles.title} />
          {variant !== "about" && variant !== "detail" ? (
            <Skeleton className={styles.subtitle} />
          ) : null}
          {variant === "detail" ? (
            <Skeleton className={styles.scientificName} />
          ) : null}
        </header>

        {variant === "journal" ? (
          <>
            <section className={styles.journalHero}>
              <div className={styles.heroCopy}>
                <Skeleton className={styles.heroEyebrow} />
                <Skeleton className={styles.heroTitle} />
                <Skeleton className={styles.heroTitleShort} />
                <TextBlock lines={2} />
              </div>
            </section>
            <div className={styles.metrics}>
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton className={styles.metric} key={index} />
              ))}
            </div>
            <section className={styles.featured}>
              <header className={styles.sectionIntro}>
                <Skeleton className={styles.sectionTitle} />
                <Skeleton className={styles.sectionSubtitle} />
              </header>
              <div className={styles.featuredCards}>
                {Array.from({ length: 3 }, (_, index) => (
                  <SpeciesCard key={index} />
                ))}
              </div>
            </section>
          </>
        ) : null}

        {variant === "catalog" ? (
          <section className={styles.catalog}>
            <header className={styles.resultsHeading}>
              <Skeleton className={styles.sectionTitle} />
              <Skeleton className={styles.sectionSubtitle} />
            </header>
            <div className={styles.catalogControls}>
              <Skeleton className={styles.search} />
              <Skeleton className={styles.filter} />
              <Skeleton className={styles.viewToggle} />
            </div>
            <div className={styles.grid}>
              {Array.from({ length: 6 }, (_, index) => (
                <SpeciesCard key={index} />
              ))}
            </div>
            <div className={styles.pagination}>
              <Skeleton className={styles.pageButton} />
              <Skeleton className={styles.pageNumber} />
              <Skeleton className={styles.pageNumber} />
              <Skeleton className={styles.pageButton} />
            </div>
          </section>
        ) : null}

        {variant === "detail" ? (
          <div className={styles.detailColumns}>
            <aside className={styles.detailAside}>
              <Skeleton className={styles.detailMedia} />
              <div className={styles.detailPanel}>
                <Skeleton className={styles.panelTitle} />
                <div className={styles.taxonomyGrid}>
                  {Array.from({ length: 4 }, (_, index) => (
                    <div className={styles.taxonomyItem} key={index}>
                      <Skeleton className={styles.taxonomyLabel} />
                      <Skeleton className={styles.taxonomyValue} />
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles.observation}>
                <Skeleton className={styles.observationTitle} />
                <TextBlock lines={2} />
              </div>
            </aside>
            <div className={styles.detailBody}>
              <div className={styles.statusGrid}>
                {Array.from({ length: 2 }, (_, index) => (
                  <div className={styles.statusCard} key={index}>
                    <Skeleton className={styles.statusTitle} />
                    <Skeleton className={styles.statusValue} />
                    <TextBlock lines={1} />
                  </div>
                ))}
              </div>
              {Array.from({ length: 5 }, (_, index) => (
                <div className={styles.detailPanel} key={index}>
                  <Skeleton className={styles.panelTitle} />
                  <TextBlock lines={2} />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {variant === "identify" ? (
          <>
            <div className={styles.modeOptions}>
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton className={styles.modeOption} key={index} />
              ))}
            </div>
            <section className={styles.uploadPanel}>
              <Skeleton className={styles.uploadIcon} />
              <Skeleton className={styles.uploadTitle} />
              <Skeleton className={styles.uploadHelp} />
              <div className={styles.uploadActions}>
                <Skeleton className={styles.uploadAction} />
                <Skeleton className={styles.uploadActionSecondary} />
              </div>
            </section>
            <section className={styles.limits}>
              <Skeleton className={styles.sectionTitle} />
              <TextBlock lines={3} />
            </section>
          </>
        ) : null}

        {variant === "about" ? (
          <>
            <TextBlock lines={5} />
            <TextBlock lines={5} />
            <section className={styles.aboutBanner}>
              <Skeleton className={styles.bannerTitle} />
              <Skeleton className={styles.bannerTitleShort} />
            </section>
          </>
        ) : null}

        {variant === "donate" ? (
          <>
            <div className={styles.donateColumns}>
              <section className={styles.donateStory}>
                <Skeleton className={styles.sectionTitle} />
                <TextBlock lines={3} />
                {Array.from({ length: 2 }, (_, index) => (
                  <div className={styles.purpose} key={index}>
                    <Skeleton className={styles.purposeIcon} />
                    <div>
                      <Skeleton className={styles.purposeTitle} />
                      <TextBlock lines={2} />
                    </div>
                  </div>
                ))}
              </section>
              <aside className={styles.donateDemo}>
                <Skeleton className={styles.sectionTitle} />
                <TextBlock lines={2} />
                <Skeleton className={styles.demoBox} />
                <TextBlock lines={2} />
              </aside>
            </div>
            <section className={styles.thanks}>
              <Skeleton className={styles.sectionTitle} />
              <TextBlock lines={2} />
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
