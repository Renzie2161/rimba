"use client";

import {
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import StatusTag from "./status-tag";
import { regionLabel } from "./region-labels";
import type { SpeciesDetail } from "./schemas";
import styles from "./featured-carousel.module.css";

type Props = { species: SpeciesDetail[] };

/** Cards kept in the strip. Beyond this the catalog owns the full list. */
const MAX_SLIDES = 6;

export default function FeaturedCarousel({ species }: Props) {
  const t = useTranslations("journal");
  const trackRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const [scrollable, setScrollable] = useState(false);

  const slides = species.slice(0, MAX_SLIDES);

  // Arrow state depends on real overflow, so a short list never shows dead controls.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () =>
      setScrollable(track.scrollWidth > track.clientWidth + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [slides.length]);

  const scrollToSlide = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const slide = track.children[index];
    if (!(slide instanceof HTMLElement)) return;
    // Rect delta is reliable regardless of which element is the offsetParent.
    const delta =
      slide.getBoundingClientRect().left - track.getBoundingClientRect().left;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    track.scrollBy({ left: delta, behavior: reduced ? "auto" : "smooth" });
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    function onScroll() {
      const current = track!;
      const children = Array.from(current.children);
      const nearest = children.reduce(
        (best, node, index) => {
          if (!(node instanceof HTMLElement)) return best;
          const distance = Math.abs(
            node.getBoundingClientRect().left -
              current.getBoundingClientRect().left,
          );
          return distance < best.distance ? { index, distance } : best;
        },
        { index: 0, distance: Number.POSITIVE_INFINITY },
      );
      setActive(nearest.index);
    }
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, []);

  function step(direction: -1 | 1) {
    const next = Math.min(
      Math.max(active + direction, 0),
      Math.max(slides.length - 1, 0),
    );
    setActive(next);
    scrollToSlide(next);
  }

  return (
    <section
      aria-labelledby="featured-title"
      aria-roledescription="carousel"
      className={styles.section}
    >
      <header className={styles.header}>
        <div className={styles.heading}>
          <h2 id="featured-title">{t("carouselTitle")}</h2>
          <p className={styles.description}>{t("carouselDescription")}</p>
        </div>
        <div className={styles.actions}>
          {scrollable ? (
            <div className={styles.controls}>
              <button
                aria-label={t("previousSlide")}
                className={styles.control}
                disabled={active === 0}
                onClick={() => step(-1)}
                type="button"
              >
                <ChevronLeft aria-hidden="true" size={18} strokeWidth={2} />
              </button>
              <button
                aria-label={t("nextSlide")}
                className={styles.control}
                disabled={active >= slides.length - 1}
                onClick={() => step(1)}
                type="button"
              >
                <ChevronRight aria-hidden="true" size={18} strokeWidth={2} />
              </button>
            </div>
          ) : null}
          <Link className={styles.seeAllLink} href="/species" prefetch={false}>
            {t("seeAllSpecies")}
            <ArrowRight aria-hidden="true" size={17} strokeWidth={2} />
          </Link>
        </div>
      </header>

      <ul
        aria-label={t("carouselLabel")}
        className={styles.track}
        onKeyDown={(event) => {
          if (!scrollable) return;
          if (event.key === "ArrowRight") {
            event.preventDefault();
            step(1);
          }
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            step(-1);
          }
        }}
        ref={trackRef}
        tabIndex={scrollable ? 0 : -1}
      >
        {slides.map((entry, index) => {
          const media = entry.media[0];
          return (
            <li
              aria-label={t("slideOf", {
                current: index + 1,
                total: slides.length,
              })}
              aria-roledescription="slide"
              className={styles.slide}
              key={entry.id}
            >
              <Link className={styles.card} href={`/species/${entry.slug}`}>
                <div className={styles.media}>
                  {media ? (
                    <Image
                      alt={media.alt}
                      fill
                      sizes="(max-width: 767px) 84vw, (max-width: 1199px) 44vw, 330px"
                      src={media.url}
                      style={{
                        objectPosition: `${media.positionX ?? 50}% ${media.positionY ?? 50}%`,
                      }}
                    />
                  ) : (
                    <span aria-hidden="true" className={styles.mediaFallback}>
                      {entry.scientificName.slice(0, 1)}
                    </span>
                  )}
                  <div className={styles.chips}>
                    <StatusTag
                      invasiveStatus={entry.invasiveStatus}
                      status={entry.status}
                      variant="chip"
                    />
                  </div>
                  <span aria-hidden="true" className={styles.cue}>
                    <ArrowUpRight size={16} strokeWidth={2} />
                  </span>
                </div>
                <div className={styles.body}>
                  <h3>{entry.commonName}</h3>
                  <p className={styles.scientific}>
                    <em>{entry.scientificName}</em>
                  </p>
                  <p className={styles.summary}>{entry.summary}</p>
                  {entry.regionCodes.length > 0 ? (
                    <p className={styles.region}>
                      {entry.regionCodes.map(regionLabel).join(" · ")}
                    </p>
                  ) : null}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
