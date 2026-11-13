import { cache } from "react";
import { IBM_Plex_Mono } from "next/font/google";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { speciesRowSchema } from "@/features/species/schemas";
import { getPublishedSpeciesDetail } from "@/features/species/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SpeciesDossier from "@/features/species/species-dossier";
import SpeciesActivityRecorder from "@/features/account/species-activity-recorder";
import styles from "@/features/species/catalog.module.css";
import { socialMetadata } from "@/lib/social-metadata";
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-ibm-plex-mono",
  preload: false,
});

type PageProps = { params: Promise<{ slug: string; locale: string }> };

const loadSpecies = cache(async (slug: string) => {
  if (!speciesRowSchema.shape.slug.safeParse(slug).success) notFound();
  return getPublishedSpeciesDetail(createSupabaseServerClient(), {
    slug,
    locale: "id",
  });
});

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  if (!speciesRowSchema.shape.slug.safeParse(slug).success) return {};
  const t = await getTranslations({ locale, namespace: "species" });
  const detail = await loadSpecies(slug);
  if (!detail) return { title: t("notFoundTitle") };
  return socialMetadata({
    locale,
    title: detail.seoTitle ?? detail.commonName,
    description: detail.seoDescription ?? detail.summary,
    path: `/species/${slug}`,
    image: detail.media[0],
  });
}

export default async function SpeciesDetailPage({ params }: PageProps) {
  const [{ slug }, t] = await Promise.all([params, getTranslations("species")]);
  const species = await loadSpecies(slug);
  if (!species) notFound();
  return (
    <main
      className={`${styles.page} ${styles.detailPage} ${ibmPlexMono.variable}`}
      id="main"
    >
      <Link className={styles.backLink} href="/species">
        <ArrowLeft aria-hidden="true" size={17} strokeWidth={2} />
        {t("backToCatalog")}
      </Link>
      <SpeciesActivityRecorder speciesId={species.id} />
      <SpeciesDossier species={species} labels={t} />
    </main>
  );
}
