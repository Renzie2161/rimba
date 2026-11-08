import type { SpeciesDetail } from "./schemas";
import SpeciesMedia from "./species-media";
import styles from "./catalog.module.css";

type LabelKey =
  | "section.summary"
  | "section.description"
  | "section.distinctive_traits"
  | "section.habitat_description"
  | "section.threats_description"
  | "section.conservation_actions"
  | "mediaUnavailable"
  | "unknown"
  | "dossierLabel"
  | "taxonomy"
  | "taxonGroup"
  | "taxonRank"
  | "family"
  | "genus"
  | "habitat"
  | "regions"
  | "habitats"
  | "assessment"
  | "noAssessment"
  | "assessmentSource"
  | "summary"
  | "description"
  | "distinctiveTraits"
  | "threats"
  | "conservationActions"
  | "sources"
  | `status.${NonNullable<SpeciesDetail["status"]>}`
  | `rank.${SpeciesDetail["taxonRank"]}`;
type Props = { species: SpeciesDetail; labels: (key: LabelKey) => string };

function SectionSources({
  sources,
  section,
}: {
  sources: SpeciesDetail["sources"];
  section: string;
}) {
  const matching = sources.filter((source) =>
    source.sectionKeys.includes(section),
  );
  return matching.length ? (
    <ul className={styles.inlineSources}>
      {matching.map((source) => (
        <li key={source.id}>
          <a href={source.url} target="_blank" rel="noreferrer">
            {source.title}
          </a>
        </li>
      ))}
    </ul>
  ) : null;
}

export default function SpeciesDossier({ species, labels }: Props) {
  const assessmentSource = species.sources.find(
    (source) => source.id === species.assessmentSourceId,
  );
  const sectionLabels: Record<string, string> = {
    summary: labels("section.summary"),
    description: labels("section.description"),
    distinctive_traits: labels("section.distinctive_traits"),
    habitat_description: labels("section.habitat_description"),
    threats_description: labels("section.threats_description"),
    conservation_actions: labels("section.conservation_actions"),
  };
  const statusLabel = species.status
    ? labels(`status.${species.status}`)
    : labels("unknown");
  return (
    <div className={styles.dossier}>
      <header className={styles.dossierHeader}>
        <p className={styles.dossierEyebrow}>{labels("dossierLabel")}</p>
        <h1>{species.commonName}</h1>
        <p className={styles.scientificName}>{species.scientificName}</p>
      </header>
      <div className={styles.dossierColumns}>
        <aside className={styles.dossierAside}>
          <SpeciesMedia species={species} labels={labels} />
          <section
            className={styles.factPanel}
            aria-labelledby="taxonomy-heading"
          >
            <h2 id="taxonomy-heading">{labels("taxonomy")}</h2>
            <dl>
              <div>
                <dt>{labels("taxonGroup")}</dt>
                <dd>{species.taxonGroup}</dd>
              </div>
              <div>
                <dt>{labels("taxonRank")}</dt>
                <dd>{labels(`rank.${species.taxonRank}`)}</dd>
              </div>
              <div>
                <dt>{labels("family")}</dt>
                <dd>{species.family ?? labels("unknown")}</dd>
              </div>
              <div>
                <dt>{labels("genus")}</dt>
                <dd>{species.genus ?? labels("unknown")}</dd>
              </div>
            </dl>
          </section>
          <section
            className={styles.factPanel}
            aria-labelledby="habitat-heading"
          >
            <h2 id="habitat-heading">{labels("habitat")}</h2>
            <p>{species.habitatDescription}</p>
            <SectionSources
              sources={species.sources}
              section="habitat_description"
            />
            {species.regionCodes.length > 0 && (
              <p>
                {labels("regions")}: {species.regionCodes.join(", ")}
              </p>
            )}
            {species.habitatCodes.length > 0 && (
              <p>
                {labels("habitats")}: {species.habitatCodes.join(", ")}
              </p>
            )}
          </section>
        </aside>
        <div className={styles.dossierBody}>
          <section
            className={styles.statusPanel}
            aria-labelledby="assessment-heading"
          >
            <div>
              <h2 id="assessment-heading">{labels("assessment")}</h2>
              <p className={styles.status}>{statusLabel}</p>
            </div>
            <p>
              {species.status
                ? [species.assessmentScope, species.assessmentYear]
                    .filter(Boolean)
                    .join(" · ")
                : labels("noAssessment")}
            </p>
            {assessmentSource && (
              <p>
                <a href={assessmentSource.url} target="_blank" rel="noreferrer">
                  {labels("assessmentSource")}: {assessmentSource.title}
                </a>
              </p>
            )}
            {species.assessmentNotes && <p>{species.assessmentNotes}</p>}
          </section>
          <section className={styles.prosePanel}>
            <h2>{labels("summary")}</h2>
            <p className={styles.summary}>{species.summary}</p>
            <SectionSources sources={species.sources} section="summary" />
          </section>
          <section className={styles.prosePanel}>
            <h2>{labels("description")}</h2>
            <p>{species.description}</p>
            <SectionSources sources={species.sources} section="description" />
          </section>
          <section className={styles.prosePanel}>
            <h2>{labels("distinctiveTraits")}</h2>
            <p>{species.distinctiveTraits}</p>
            <SectionSources
              sources={species.sources}
              section="distinctive_traits"
            />
          </section>
          <section className={styles.prosePanel}>
            <h2>{labels("threats")}</h2>
            <p>{species.threatsDescription}</p>
            <SectionSources
              sources={species.sources}
              section="threats_description"
            />
          </section>
          <section className={styles.prosePanel}>
            <h2>{labels("conservationActions")}</h2>
            <p>{species.conservationActions}</p>
            <SectionSources
              sources={species.sources}
              section="conservation_actions"
            />
          </section>
          <section className={styles.sources} aria-labelledby="sources-heading">
            <h2 id="sources-heading">{labels("sources")}</h2>
            <ol>
              {species.sources.map((source) => (
                <li key={source.id}>
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.title}
                  </a>
                  <span>
                    {source.organization}
                    {source.publishedOn ? ` · ${source.publishedOn}` : ""}
                  </span>
                  <small>
                    {source.sectionKeys
                      .map((key) => sectionLabels[key] ?? key)
                      .join(", ")}
                  </small>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
