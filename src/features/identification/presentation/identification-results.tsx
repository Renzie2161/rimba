import { useRef, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  Expand,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { ModelCandidate } from "../domain/types";
import { displayCandidates, formatModelScore } from "./result-candidates";
import styles from "./identification-results.module.css";

export type IdentificationResultsLabels = {
  resultEyebrow: string;
  resultTitle: string;
  resultIntroduction: string;
  resultTopCandidate: string;
  resultAlternativeCandidate: string;
  resultUncertainty: string;
  resultModelName: string;
  modelScore: string;
  noEncyclopediaMatch: string;
  lookupWarning: string;
  viewDetail: string;
  resultPhotoLabel: string;
  resultReferenceLabel: string;
  resultReferenceHelp: string;
  resultComparePhotos: string;
  resultComparisonTitle: string;
  resultClose: string;
  resultUploadedImage: string;
  resultReferenceImage: string;
  resultNoReferencePhoto: string;
  resultAlternativesTitle: string;
  resultShowAlternatives: string;
  resultHideAlternatives: string;
  resultChooseCandidate: string;
  resultNoCandidatesTitle: string;
  resultNoCandidatesBody: string;
  resultSearchEncyclopedia: string;
  resultOpenEncyclopedia: string;
  resultRescan: string;
};

type Props = {
  candidates: ModelCandidate[];
  fileName: string;
  labels: IdentificationResultsLabels & { previewAlt: string };
  lookupWarning: boolean;
  onRescan: () => void;
  previewUrl: string;
};

function normalizedName(name: string): string {
  return name.trim().toLowerCase();
}

export default function IdentificationResults({
  candidates,
  fileName,
  labels,
  lookupWarning,
  onRescan,
  previewUrl,
}: Props) {
  const visibleCandidates = displayCandidates(candidates);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [failedMediaUrl, setFailedMediaUrl] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const selected = visibleCandidates[selectedIndex];
  const species = selected?.rimbaSpecies;
  const media = species?.media ?? null;
  const alternatives = visibleCandidates.slice(1);
  const shownAlternatives = expanded ? alternatives : alternatives.slice(0, 1);
  const searchName = selected?.scientificName ?? "";
  const searchHref = searchName
    ? `/species?q=${encodeURIComponent(searchName)}`
    : "/species";
  const modelNameDiffers =
    selected !== undefined &&
    species !== undefined &&
    normalizedName(selected.scientificName) !==
      normalizedName(species.scientificName);

  return (
    <section
      aria-labelledby="identify-result-title"
      aria-live="polite"
      className={styles.results}
    >
      <header className={styles.header}>
        <p className={styles.eyebrow}>{labels.resultEyebrow}</p>
        <h2 id="identify-result-title">{labels.resultTitle}</h2>
        <p className={styles.introduction}>{labels.resultIntroduction}</p>
      </header>

      <div className={styles.layout}>
        <figure className={styles.observation}>
          <div className={styles.observationFrame}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt={labels.previewAlt} src={previewUrl} />
          </div>
          <figcaption className={styles.observationCaption}>
            <span>{labels.resultPhotoLabel}</span>
            <small>{fileName}</small>
          </figcaption>
        </figure>

        <div className={styles.details}>
          {lookupWarning ? (
            <p className={styles.lookupWarning} role="alert">
              {labels.lookupWarning}
            </p>
          ) : null}

          {selected ? (
            <section
              aria-labelledby="identify-primary-candidate"
              className={styles.primary}
            >
              <p className={styles.candidateType}>
                {selectedIndex === 0
                  ? labels.resultTopCandidate
                  : labels.resultAlternativeCandidate}
              </p>
              <h3 id="identify-primary-candidate">
                {species?.commonName || (
                  <em>{species?.scientificName ?? selected.scientificName}</em>
                )}
              </h3>
              {species && species.commonName !== species.scientificName ? (
                <p className={styles.scientificName}>
                  <em>{species.scientificName}</em>
                </p>
              ) : null}
              {modelNameDiffers ? (
                <p className={styles.modelName}>
                  {labels.resultModelName}: <em>{selected.scientificName}</em>
                </p>
              ) : null}

              <div className={styles.score}>
                <div className={styles.scoreHeader}>
                  <span>{labels.modelScore}</span>
                  <output>{formatModelScore(selected.modelScore)}</output>
                </div>
                <meter
                  aria-label={labels.modelScore}
                  aria-valuetext={formatModelScore(selected.modelScore)}
                  className={styles.scoreBar}
                  max={1}
                  min={0}
                  value={selected.modelScore}
                >
                  {formatModelScore(selected.modelScore)}
                </meter>
              </div>
              <p className={styles.uncertainty}>{labels.resultUncertainty}</p>
            </section>
          ) : (
            <div className={styles.emptyState}>
              <h3>{labels.resultNoCandidatesTitle}</h3>
              <p>{labels.resultNoCandidatesBody}</p>
            </div>
          )}

          {selected && !species && !lookupWarning ? (
            <p className={styles.noMatch}>{labels.noEncyclopediaMatch}</p>
          ) : null}

          {species ? (
            <section
              aria-labelledby="identify-reference-title"
              className={styles.reference}
            >
              <div className={styles.referenceHeading}>
                <h3 id="identify-reference-title">
                  {labels.resultReferenceLabel}
                </h3>
                <p>{labels.resultReferenceHelp}</p>
              </div>
              {media && failedMediaUrl !== media.url ? (
                <figure className={styles.referenceFigure}>
                  <button
                    aria-label={labels.resultComparePhotos}
                    className={styles.referenceTrigger}
                    onClick={() => dialogRef.current?.showModal()}
                    type="button"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={media.alt}
                      onError={() => setFailedMediaUrl(media.url)}
                      src={media.url}
                      style={{
                        objectPosition: `${media.positionX ?? 50}% ${media.positionY ?? 50}%`,
                      }}
                    />
                    <span className={styles.expandIcon} aria-hidden="true">
                      <Expand size={17} />
                    </span>
                  </button>
                  <figcaption>
                    <span>{species.commonName}</span>
                    <em>{species.scientificName}</em>
                  </figcaption>
                </figure>
              ) : (
                <p className={styles.referenceUnavailable} role="status">
                  {labels.resultNoReferencePhoto}
                </p>
              )}
            </section>
          ) : null}

          {alternatives.length > 0 ? (
            <section
              aria-labelledby="identify-alternatives-title"
              className={styles.alternatives}
            >
              <h3 id="identify-alternatives-title">
                {labels.resultAlternativesTitle}
              </h3>
              <ol id="identify-alternatives">
                {shownAlternatives.map((candidate, index) => {
                  const rank = index + 1;
                  const alternativeSpecies = candidate.rimbaSpecies;
                  const alternativeName =
                    alternativeSpecies?.commonName ?? candidate.scientificName;
                  const candidateLabel = `${labels.resultChooseCandidate}: ${alternativeName}`;
                  return (
                    <li
                      key={
                        candidate.canonicalTaxonId || candidate.modelClassIndex
                      }
                    >
                      <button
                        aria-label={candidateLabel}
                        aria-pressed={
                          selected?.modelClassIndex ===
                          candidate.modelClassIndex
                        }
                        className={styles.alternative}
                        onClick={() => setSelectedIndex(rank)}
                        type="button"
                      >
                        <span className={styles.alternativeRank}>
                          {rank + 1}
                        </span>
                        <span className={styles.alternativeName}>
                          <span>
                            {alternativeSpecies?.commonName ?? (
                              <em>{candidate.scientificName}</em>
                            )}
                          </span>
                          {alternativeSpecies ? (
                            <em>{alternativeSpecies.scientificName}</em>
                          ) : null}
                        </span>
                        <output>
                          {formatModelScore(candidate.modelScore)}
                        </output>
                      </button>
                    </li>
                  );
                })}
              </ol>
              {alternatives.length > 1 ? (
                <button
                  aria-controls="identify-alternatives"
                  aria-expanded={expanded}
                  className={styles.expandAlternatives}
                  onClick={() => setExpanded((value) => !value)}
                  type="button"
                >
                  {expanded
                    ? labels.resultHideAlternatives
                    : labels.resultShowAlternatives}
                  <ChevronDown
                    aria-hidden="true"
                    className={expanded ? styles.chevronExpanded : undefined}
                    size={16}
                  />
                </button>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>

      <footer className={styles.actions}>
        {species ? (
          <Link
            className={styles.primaryAction}
            href={`/species/${species.slug}`}
          >
            {labels.viewDetail}
            <ArrowRight aria-hidden="true" size={17} />
          </Link>
        ) : null}
        <Link
          aria-label={
            searchName
              ? `${labels.resultSearchEncyclopedia}: ${searchName}`
              : labels.resultOpenEncyclopedia
          }
          className={styles.secondaryAction}
          href={searchHref}
        >
          <Search aria-hidden="true" size={16} />
          {searchName
            ? labels.resultSearchEncyclopedia
            : labels.resultOpenEncyclopedia}
        </Link>
        <button
          className={styles.rescanAction}
          onClick={onRescan}
          type="button"
        >
          <RotateCcw aria-hidden="true" size={16} />
          {labels.resultRescan}
        </button>
      </footer>

      {media && failedMediaUrl !== media.url ? (
        <dialog
          aria-describedby="identify-comparison-description"
          aria-labelledby="identify-comparison-title"
          className={styles.dialog}
          ref={dialogRef}
        >
          <div className={styles.dialogInner}>
            <header className={styles.dialogHeader}>
              <div>
                <h2 id="identify-comparison-title">
                  {labels.resultComparisonTitle}
                </h2>
                <p id="identify-comparison-description">
                  {labels.resultReferenceHelp}
                </p>
              </div>
              <button
                aria-label={labels.resultClose}
                className={styles.dialogClose}
                onClick={() => dialogRef.current?.close()}
                type="button"
              >
                <X aria-hidden="true" size={19} />
              </button>
            </header>
            <div className={styles.comparisonImages}>
              <figure>
                <div className={styles.comparisonFrame}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt={labels.previewAlt} src={previewUrl} />
                </div>
                <figcaption>{labels.resultUploadedImage}</figcaption>
              </figure>
              <figure>
                <div className={styles.comparisonFrame}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={media.alt}
                    onError={() => setFailedMediaUrl(media.url)}
                    src={media.url}
                    style={{
                      objectPosition: `${media.positionX ?? 50}% ${media.positionY ?? 50}%`,
                    }}
                  />
                </div>
                <figcaption>{labels.resultReferenceImage}</figcaption>
              </figure>
            </div>
          </div>
        </dialog>
      ) : null}
    </section>
  );
}
