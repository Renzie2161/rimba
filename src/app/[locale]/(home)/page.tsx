import { getTranslations } from "next-intl/server";

export default async function HomePage() {
  const t = await getTranslations("home");

  return (
    <main className="site-frame" id="main">
      <section className="home-intro" aria-labelledby="home-title">
        <div className="intro-copy">
          <h1 className="home-title" id="home-title">
            {t("title")}
          </h1>
          <p className="home-introduction">{t("introduction")}</p>
        </div>
        <aside className="project-note" aria-label={t("projectLabel")}>
          <p className="project-label">{t("projectLabel")}</p>
          <p>{t("projectNote")}</p>
        </aside>
      </section>

      <section className="empty-state" aria-labelledby="empty-title">
        <div className="empty-heading">
          <p className="catalog-label">{t("catalogLabel")}</p>
          <h2 className="empty-title" id="empty-title">
            {t("emptyTitle")}
          </h2>
        </div>
        <p className="empty-description" role="status">
          {t("emptyDescription")}
        </p>
      </section>
    </main>
  );
}
