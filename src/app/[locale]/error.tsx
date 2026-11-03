"use client";

import { useTranslations } from "next-intl";

type ErrorBoundaryProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorBoundary({ reset }: ErrorBoundaryProps) {
  const t = useTranslations("states");

  return (
    <main className="site-frame state-page" id="main">
      <h1>{t("errorTitle")}</h1>
      <p>{t("errorDescription")}</p>
      <button onClick={reset} type="button">
        {t("retry")}
      </button>
    </main>
  );
}
