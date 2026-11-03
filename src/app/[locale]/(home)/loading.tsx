import { getTranslations } from "next-intl/server";

export default async function Loading() {
  const t = await getTranslations("states");

  return (
    <main className="site-frame state-page" id="main" aria-busy="true">
      <p role="status">{t("loading")}</p>
    </main>
  );
}
