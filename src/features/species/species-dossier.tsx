import type { SpeciesDetail } from "./schemas";
import {
  ArrowRight,
  Globe2,
  Leaf,
  NotebookText,
  TriangleAlert,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
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
  | "kingdom"
  | "taxonOrder"
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
  | "discoveryLabel"
  | "observeTitle"
  | "observeDescription"
  | "exploreJournal"
  | "indonesiaContext"
  | "assessmentGlobal"
  | "assessmentNational"
  | "assessmentRegional"
  | `ecological.${NonNullable<SpeciesDetail["invasiveStatus"]>}`
  | `status.${NonNullable<SpeciesDetail["status"]>}`
  | `rank.${SpeciesDetail["taxonRank"]}`;

type Props = { species: SpeciesDetail; labels: (key: LabelKey) => string };

export default function SpeciesDossier({ species, labels }: Props) {
  const ecologicalLabel = species.indonesiaEcologicalStatus
    ? labels(`ecological.${species.indonesiaEcologicalStatus}`)
    : null;
  const scopeLabels: Record<string, LabelKey> = {
    global: "assessmentGlobal",
    national: "assessmentNational",
    regional: "assessmentRegional",
  };
  const assessmentLabel = species.assessmentScope
    ? labels(scopeLabels[species.assessmentScope.toLowerCase()] ?? "iucnScope")
    : labels("assessment");

  return (
    <div className={styles.dossier}>
      <header className={styles.dossierHeader}>
        <p className={styles.dossierEyebrow}>
          <Leaf size={14} aria-hidden="true" /> {labels("discoveryLabel")}
        </p>
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
                <dt>{labels("kingdom")}</dt>
                <dd>{species.kingdom ?? labels("notAvailable")}</dd>
              </div>
              <div>
                <dt>{labels("taxonOrder")}</dt>
                <dd>{species.taxonOrder ?? labels("notAvailable")}</dd>
              </div>
              <div>
                <dt>{labels("family")}</dt>
                <dd>{species.family ?? labels("unknown")}</dd>
              </div>
              <div>
                <dt>{labels("genus")}</dt>
                <dd>
                  {species.genus ? <i>{species.genus}</i> : labels("unknown")}
                </dd>
              </div>
            </dl>
          </section>
          <div className={styles.observationNote}>
            <span className={styles.warningIcon} aria-hidden="true">
              <TriangleAlert size={20} />
            </span>
            <div>
              <h2>{labels("observeTitle")}</h2>
              <p>{labels("observeDescription")}</p>
            </div>
          </div>
        </aside>

        <div className={styles.dossierBody}>
          <div className={styles.statusGrid}>
            <section
              className={styles.statusCard}
              aria-labelledby="iucn-heading"
            >
              <div className={styles.statusHeading}>
                <span className={styles.statusIcon} aria-hidden="true">
                  <Globe2 size={17} strokeWidth={1.7} />
                </span>
                <h2 id="iucn-heading">{labels("iucnGlobal")}</h2>
              </div>
              <div
                className={styles.conservationBadge}
                data-status={species.status}
              >
                <StatusTag status={species.status} />
              </div>
              <p>
                {species.status
                  ? [assessmentLabel, species.assessmentYear]
                      .filter(Boolean)
                      .join(" · ")
                  : labels("noAssessment")}
              </p>
            </section>
            <section
              className={styles.statusCard}
              aria-labelledby="ecological-heading"
            >
              <div className={styles.statusHeading}>
                <span className={styles.statusIcon} aria-hidden="true">
                  <Leaf size={17} strokeWidth={1.7} />
                </span>
                <h2 id="ecological-heading">{labels("ecologicalIndonesia")}</h2>
              </div>
              {ecologicalLabel ? (
                <span className={styles.ecologyBadge}>
                  <Leaf size={15} aria-hidden="true" />
                  {ecologicalLabel}
                </span>
              ) : (
                <p>{labels("notAvailable")}</p>
              )}
              {ecologicalLabel ? <p>{labels("indonesiaContext")}</p> : null}
            </section>
          </div>

          <DossierPanel
            icon={panelIcons.habitat}
            id="habitat-heading"
            title={labels("habitatDistribution")}
          >
            <p>{species.habitatDescription}</p>
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
            <p>{species.description}</p>
          </section>
          <div className={styles.resourcesSection}>
            <Link className={styles.journalLink} href="/journal">
              <NotebookText size={16} strokeWidth={1.7} aria-hidden="true" />
              {labels("exploreJournal")}{" "}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
