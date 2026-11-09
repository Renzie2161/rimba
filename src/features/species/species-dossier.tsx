import type { SpeciesDetail } from "./schemas";
import DossierPanel, { panelIcons } from "./dossier-panel";
import StatusTag from "./status-tag";
import SpeciesMedia from "./species-media";
import styles from "./species-dossier.module.css";

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
  | "iucnGlobal"
  | "ecologicalIndonesia"
  | "habitatDistribution"
  | "regulationStatus"
  | "ecosystemRole"
  | "notAvailable"
  | "iucnScope"
  | "iucnYear"
  | "seeFull"
  | `ecological.${NonNullable<SpeciesDetail["invasiveStatus"]>}`
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
  const ecologicalLabel = species.indonesiaEcologicalStatus
    ? labels(`ecological.${species.indonesiaEcologicalStatus}`)
    : null;

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
          <section className={styles.panel} aria-labelledby="taxonomy-heading">
            <h2 className={styles.panelTitle} id="taxonomy-heading">
              {labels("taxonomy")}
            </h2>
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
        </aside>

        <div className={styles.dossierBody}>
          <div className={styles.statusHero}>
            <div className={styles.statusHeroRow}>
              <StatusTag
                invasiveStatus={species.invasiveStatus}
                status={species.status}
              />
            </div>
            <p className={styles.statusHeroMeta}>
              {species.status
                ? [species.assessmentScope, species.assessmentYear]
                    .filter(Boolean)
                    .join(" · ")
                : labels("noAssessment")}
            </p>
          </div>

          <DossierPanel
            empty={!species.status}
            icon={panelIcons.iucn}
            id="iucn-heading"
            title={labels("iucnGlobal")}
          >
            {species.status ? (
              <dl>
                <div>
                  <dt>{labels("assessment")}</dt>
                  <dd>
                    {species.status} · {labels(`status.${species.status}`)}
                  </dd>
                </div>
                {species.assessmentScope ? (
                  <div>
                    <dt>{labels("iucnScope")}</dt>
                    <dd>{species.assessmentScope}</dd>
                  </div>
                ) : null}
                {species.assessmentYear ? (
                  <div>
                    <dt>{labels("iucnYear")}</dt>
                    <dd>{species.assessmentYear}</dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              labels("noAssessment")
            )}
            {assessmentSource ? (
              <p>
                <a href={assessmentSource.url} target="_blank" rel="noreferrer">
                  {labels("assessmentSource")}: {assessmentSource.title}
                </a>
              </p>
            ) : null}
            {species.assessmentNotes ? <p>{species.assessmentNotes}</p> : null}
          </DossierPanel>

          <DossierPanel
            empty={!ecologicalLabel}
            icon={panelIcons.ecological}
            id="ecological-heading"
            title={labels("ecologicalIndonesia")}
          >
            {ecologicalLabel ? (
              <p>{ecologicalLabel}</p>
            ) : (
              labels("notAvailable")
            )}
          </DossierPanel>

          <DossierPanel
            icon={panelIcons.habitat}
            id="habitat-heading"
            title={labels("habitatDistribution")}
          >
            <p>{species.habitatDescription}</p>
            <dl>
              {species.regionCodes.length > 0 ? (
                <div>
                  <dt>{labels("regions")}</dt>
                  <dd>{species.regionCodes.join(" · ")}</dd>
                </div>
              ) : null}
              {species.habitatCodes.length > 0 ? (
                <div>
                  <dt>{labels("habitats")}</dt>
                  <dd>{species.habitatCodes.join(" · ")}</dd>
                </div>
              ) : null}
            </dl>
            <SectionSources
              sources={species.sources}
              section="habitat_description"
            />
          </DossierPanel>

          <DossierPanel
            empty={!species.regulationStatus}
            icon={panelIcons.regulation}
            id="regulation-heading"
            title={labels("regulationStatus")}
          >
            {species.regulationStatus ?? labels("notAvailable")}
          </DossierPanel>

          <DossierPanel
            empty={!species.ecosystemRole}
            icon={panelIcons.ecosystem}
            id="ecosystem-heading"
            title={labels("ecosystemRole")}
          >
            {species.ecosystemRole ?? labels("notAvailable")}
          </DossierPanel>

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
