import { getTranslations } from "next-intl/server";
import PageSkeleton from "@/components/page-skeleton";

export default async function IdentifyLoading() {
  const t = await getTranslations("identify");
  return <PageSkeleton cards={2} label={t("loading")} />;
}
