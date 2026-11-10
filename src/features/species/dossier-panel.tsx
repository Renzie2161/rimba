import { Waves, ShieldCheck, Sprout, type LucideIcon } from "lucide-react";
import type { SpeciesDetail } from "./schemas";
import styles from "./species-dossier.module.css";

type PanelProps = {
  icon: LucideIcon;
  id: string;
  title: string;
  children: React.ReactNode;
  empty?: boolean;
};

/**
 * One labelled dossier panel. The icon is decorative; the heading carries the
 * meaning for assistive technology.
 */
export default function DossierPanel({
  icon: Icon,
  id,
  title,
  children,
  empty = false,
}: PanelProps) {
  return (
    <section
      className={`${styles.panel} ${styles.infoPanel}`}
      aria-labelledby={id}
    >
      <span aria-hidden="true" className={styles.panelIcon}>
        <Icon size={20} strokeWidth={1.75} />
      </span>
      <h2 className={styles.panelTitle} id={id}>
        {title}
      </h2>
      <div className={empty ? styles.panelEmpty : styles.panelBody}>
        {children}
      </div>
    </section>
  );
}

export const panelIcons = {
  iucn: ShieldCheck,
  ecological: Sprout,
  habitat: Waves,
  regulation: ShieldCheck,
  ecosystem: Sprout,
} as const;

export type EcologyFields = Pick<
  SpeciesDetail,
  "indonesiaEcologicalStatus" | "regulationStatus" | "ecosystemRole"
>;
