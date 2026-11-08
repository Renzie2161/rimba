import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("states");

  return (
    <main className="site-frame state-page" id="main">
      <h1>{t("notFoundTitle")}</h1>
      <p>{t("notFoundDescription")}</p>
      <Link href="/journal">{t("journalLink")}</Link>
    </main>
  );
}
