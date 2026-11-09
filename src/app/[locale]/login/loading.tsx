import { getTranslations } from "next-intl/server";
import PageSkeleton from "@/components/page-skeleton";

export default async function LoginLoading() {
  const t = await getTranslations("login");
  return <PageSkeleton cards={0} label={t("loading")} />;
}
