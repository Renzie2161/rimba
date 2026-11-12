import { getTranslations } from "next-intl/server";
import PageSkeleton from "@/components/page-skeleton";

export default async function JournalLoading() {
  const t = await getTranslations("journal");
  return <PageSkeleton variant="journal" label={t("loading")} />;
}
