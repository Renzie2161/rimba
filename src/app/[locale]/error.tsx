"use client";

import { useTranslations } from "next-intl";

export default function ErrorBoundary() {
  const t = useTranslations("states");

  return (
    <main className="site-frame state-page" id="main">
      <h1>{t("errorTitle")}</h1>
      <p>{t("errorDescription")}</p>
      <button onClick={() => window.location.reload()} type="button">
        {t("retry")}
      </button>
    </main>
  );
}
