import type { Metadata } from "next";
import Image from "next/image";
import { Plus_Jakarta_Sans } from "next/font/google";
import { hasLocale } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import AppShell from "./app-shell";
import { routing } from "@/i18n/routing";
import "../globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
});

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: Pick<LocaleLayoutProps, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: `/${locale}` },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const [messages, navigationT, footerT, journalT, guideT, aboutT, donateT] =
    await Promise.all([
      getMessages(),
      getTranslations("navigation"),
      getTranslations("footer"),
      getTranslations("journal"),
      getTranslations("guide"),
      getTranslations("about"),
      getTranslations("donate"),
    ]);

  return (
    <html lang={locale} data-theme="light">
      <body className={plusJakartaSans.variable}>
        <NextIntlClientProvider messages={messages}>
          <a className="skip-link" href="#main">
            {navigationT("skipToMain")}
          </a>
          <AppShell
            guideLabel={guideT("title")}
            identificationLabel={navigationT("identificationDestination")}
            strapline={navigationT("strapline")}
            missionEyebrow={navigationT("missionEyebrow")}
            missionHeadline={navigationT("missionHeadline")}
            missionDescription={navigationT("missionDescription")}
            missionLink={navigationT("missionLink")}
            destinations={[
              {
                href: "/journal",
                label: journalT("title"),
                breadcrumbLabel: journalT("breadcrumbLabel"),
                group: "explore",
              },
              {
                href: "/species",
                label: navigationT("encyclopediaDestination"),
                group: "explore",
              },
              {
                href: "/about",
                label: aboutT("title"),
                group: "resources",
              },
              {
                href: "/donate",
                label: donateT("title"),
                group: "resources",
              },
            ]}
            footer={
              <div className="site-footer-content">
                <div className="site-footer-brand">
                  <Image
                    className="site-footer-logo"
                    src="/rimba-mark.png"
                    alt=""
                    width={24}
                    height={24}
                  />
                  <strong>RIMBA</strong>
                  <span>{footerT("motto")}</span>
                </div>
                <p className="site-footer-project">{footerT("project")}</p>
              </div>
            }
          >
            {children}
          </AppShell>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
