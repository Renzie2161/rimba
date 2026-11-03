"use client";

import { Check, ChevronDown, Globe, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";

type Theme = "light" | "dark";

export default function SiteControls() {
  const t = useTranslations("navigation");
  const [theme, setTheme] = useState<Theme>("light");
  const [isLanguageMenuOpen, setLanguageMenuOpen] = useState(false);
  const isDark = theme === "dark";

  function toggleTheme() {
    const nextTheme = isDark ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    setTheme(nextTheme);
  }

  return (
    <div className="site-controls">
      <details
        className="language-menu"
        onToggle={(event) => setLanguageMenuOpen(event.currentTarget.open)}
      >
        <summary
          className="site-control language-trigger"
          role="button"
          aria-label={t("chooseLanguage")}
          title={t("chooseLanguage")}
          aria-expanded={isLanguageMenuOpen}
          aria-controls="language-menu-options"
        >
          <Globe size={19} strokeWidth={1.75} aria-hidden="true" />
          <ChevronDown size={14} strokeWidth={1.75} aria-hidden="true" />
        </summary>
        <div id="language-menu-options" className="language-menu-panel">
          <Link
            className="language-option"
            href="/"
            locale="id"
            aria-current="page"
          >
            <Check size={16} strokeWidth={1.75} aria-hidden="true" />
            <span>{t("indonesianLanguage")}</span>
          </Link>
        </div>
      </details>
      <button
        className="site-control theme-toggle"
        type="button"
        aria-label={t(isDark ? "switchToLightTheme" : "switchToDarkTheme")}
        aria-pressed={isDark}
        title={t(isDark ? "switchToLightTheme" : "switchToDarkTheme")}
        onClick={toggleTheme}
      >
        {isDark ? (
          <Sun size={20} strokeWidth={1.75} aria-hidden="true" />
        ) : (
          <Moon size={20} strokeWidth={1.75} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
