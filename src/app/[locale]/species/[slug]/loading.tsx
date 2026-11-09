import { getTranslations } from "next-intl/server";
import PageSkeleton from "@/components/page-skeleton";

export default async function SpeciesDetailLoading() {
  const t = await getTranslations("species");
  return <PageSkeleton cards={3} label={t("loading")} />;
}
