import { getTranslations } from "next-intl/server";
import PageSkeleton from "@/components/page-skeleton";

export default async function Loading() {
  const t = await getTranslations("states");
  return <PageSkeleton cards={3} label={t("loading")} />;
}
