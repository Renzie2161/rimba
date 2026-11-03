import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import { hasLocale } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import SiteControls from "./site-controls";
import "../globals.css";

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken-grotesk",
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

  const [messages, navigationT, footerT] = await Promise.all([
    getMessages(),
    getTranslations("navigation"),
    getTranslations("footer"),
  ]);

  return (
    <html lang={locale} data-theme="light">
      <body className={hankenGrotesk.variable}>
        <NextIntlClientProvider messages={messages}>
          <a className="skip-link" href="#main">
            {navigationT("skipToMain")}
          </a>
          <div className="site-frame">
            <header className="site-header">
              <nav
                className="site-navigation"
                aria-label={navigationT("label")}
              >
                <Link
                  className="wordmark"
                  href="/"
                  aria-label={navigationT("homeLink")}
                >
                  <Image
                    className="wordmark-logo"
                    src="/favicon.png"
                    alt=""
                    width={32}
                    height={32}
                    priority
                  />
                  <span>Rimba</span>
                </Link>
                <SiteControls />
              </nav>
            </header>
            {children}
            <footer className="site-footer">
              <p>{footerT("project")}</p>
            </footer>
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
