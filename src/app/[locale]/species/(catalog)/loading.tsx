import { getTranslations } from "next-intl/server";
import PageSkeleton from "@/components/page-skeleton";

export default async function SpeciesLoading() {
  const t = await getTranslations("catalog");
  return <PageSkeleton cards={6} label={t("loading")} />;
}
