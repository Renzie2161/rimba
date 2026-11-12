import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function socialMetadata({
  locale,
  title,
  path = "",
  description,
  image: speciesImage,
}: {
  locale: string;
  title: string;
  path?: string;
  description?: string;
  image?: { url: string; alt: string } | undefined;
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "metadata" });
  const summary = description ?? t("description");
  const url = `/${locale}${path}`;
  const image = speciesImage ?? {
    url: `/images/social/rimba-${locale === "en" ? "en" : "id"}.png`,
    width: 1200,
    height: 630,
    alt:
      locale === "en"
        ? "RIMBA — Discover life. Protect biodiversity."
        : "RIMBA — Kenali kehidupan. Rawat keberagaman.",
  };

  return {
    title,
    description: summary,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: "RIMBA",
      title,
      description: summary,
      url,
      locale: locale === "en" ? "en_US" : "id_ID",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: summary,
      images: [image],
    },
  };
}
