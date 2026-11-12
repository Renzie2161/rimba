import { getTranslations } from "next-intl/server";
import PageSkeleton from "@/components/page-skeleton";

export default async function SpeciesLoading() {
  const t = await getTranslations("catalog");
  return <PageSkeleton variant="catalog" label={t("loading")} />;
}
