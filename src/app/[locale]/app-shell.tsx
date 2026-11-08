"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { usePathname, Link } from "@/i18n/navigation";
import {
  ArrowRight,
  Bell,
  UserRound,
  Compass,
  HandHeart,
  Heart,
  Leaf,
  Menu,
  NotebookText,
  ScanLine,
  Sprout,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

const subscribe = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;
type ShellDestination = {
  href: "/journal" | "/species" | "/guide" | "/about" | "/donate";
  label: string;
  breadcrumbLabel?: string;
  group: "explore" | "resources";
};

type AppShellProps = {
  children: ReactNode;
  footer: ReactNode;
  destinations: readonly ShellDestination[];
  identificationLabel: string;
  identificationUnavailable: string;
  strapline: string;
  missionEyebrow: string;
  missionHeadline: string;
  missionDescription: string;
  missionLink: string;
};

function DestinationIcon({ href }: Pick<ShellDestination, "href">): ReactNode {
  const props = { size: 19, strokeWidth: 1.75, "aria-hidden": true as const };
  switch (href) {
    case "/journal":
      return <NotebookText {...props} />;
    case "/species":
      return <Compass {...props} />;
    case "/guide":
      return <Leaf {...props} />;
    case "/about":
      return <Heart {...props} />;
    case "/donate":
      return <HandHeart {...props} />;
    default:
      return null;
  }
}

export default function AppShell({
  children,
  footer,
  destinations,
  identificationLabel,
  identificationUnavailable,
  strapline,
  missionEyebrow,
  missionHeadline,
  missionDescription,
  missionLink,
}: AppShellProps) {
  const t = useTranslations("navigation");
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isHydrated = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
  const isDetail = pathname.startsWith("/species/");
  const isPanelCanvas = pathname === "/about" || pathname === "/donate";

  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1200px)");
    const closeOnDesktop = () => {
      if (media.matches && dialogRef.current?.open) {
        dialogRef.current.close();
        setDrawerOpen(false);
      }
    };
    media.addEventListener("change", closeOnDesktop);
    return () => media.removeEventListener("change", closeOnDesktop);
  }, []);

  function openDrawer() {
    dialogRef.current?.showModal();
    setDrawerOpen(true);
  }

  function closeDrawer() {
    dialogRef.current?.close();
    setDrawerOpen(false);
    menuButtonRef.current?.focus();
  }

  function destinationIsActive(href: ShellDestination["href"]) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const currentDestination = destinations.find((destination) =>
    destinationIsActive(destination.href),
  );

  const navigation = (mobile = false) => (
    <nav className="shell-navigation" aria-label={t("label")}>
      {(["explore", "resources"] as const).map((group) => {
        const groupDestinations = destinations.filter(
          (destination) => destination.group === group,
        );
        if (groupDestinations.length === 0) return null;
        return (
          <section className="shell-navigation-group" key={group}>
            <p className="shell-navigation-heading">
              {t(group === "explore" ? "exploreGroup" : "resourcesGroup")}
            </p>
            {groupDestinations.map((destination) => {
              const active = destinationIsActive(destination.href);
              return (
                <Link
                  key={destination.href}
                  className="shell-destination"
                  href={destination.href}
                  aria-current={
                    active && (mobile ? drawerOpen : !drawerOpen)
                      ? "page"
                      : undefined
                  }
                  onClick={mobile ? closeDrawer : undefined}
                >
                  <DestinationIcon href={destination.href} />
                  <span>{destination.label}</span>
                </Link>
              );
            })}
            {group === "explore" ? (
              <div className="shell-destination shell-destination--pending">
                <ScanLine size={19} strokeWidth={1.75} aria-hidden="true" />
                <span>{identificationLabel}</span>
                <span className="shell-destination-status">
                  {identificationUnavailable}
                </span>
              </div>
            ) : null}
          </section>
        );
      })}
    </nav>
  );

  return (
    <div
      className={`app-shell${isDetail ? " app-shell--detail" : ""}${
        isHydrated ? " app-shell--ready" : ""
      }`}
    >
      <aside className="shell-rail">
        <Link className="wordmark" href="/journal">
          <Image
            className="wordmark-logo"
            src="/rimba-mark.png"
            alt=""
            width={34}
            height={34}
            priority
          />
          <span>RIMBA</span>
        </Link>
        <p className="shell-strapline">{strapline}</p>
        {navigation()}
        <section
          className="shell-mission"
          aria-labelledby="shell-mission-title"
        >
          <span className="shell-mission-icon">
            <Sprout size={51} strokeWidth={1.7} aria-hidden="true" />
          </span>
          <p className="shell-mission-eyebrow">{missionEyebrow}</p>
          <h2 id="shell-mission-title">{missionHeadline}</h2>
          <p className="shell-mission-description">{missionDescription}</p>
          <Link href="/about">
            <span>{missionLink}</span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>
      </aside>
      <div className="shell-workspace">
        <div className="shell-mobile-fallback">{navigation()}</div>
        <header className="shell-topbar">
          <button
            ref={menuButtonRef}
            className="shell-menu-trigger"
            type="button"
            aria-label={t("openMenu")}
            aria-controls="shell-drawer"
            aria-expanded={drawerOpen}
            onClick={openDrawer}
          >
            <Menu size={19} aria-hidden="true" />
          </button>
          <p className="shell-breadcrumb">
            <Compass
              className="shell-breadcrumb-icon"
              size={16}
              strokeWidth={1.75}
              aria-hidden="true"
            />
            {currentDestination ? (
              <>
                <span className="shell-breadcrumb-parent">
                  {isDetail ? currentDestination.label : t("exploreGroup")}
                </span>
                <span className="shell-breadcrumb-separator" aria-hidden="true">
                  /
                </span>
                <span className="shell-breadcrumb-current" aria-current="page">
                  {isDetail
                    ? t("detailDestination")
                    : (currentDestination.breadcrumbLabel ??
                      currentDestination.label)}
                </span>
              </>
            ) : (
              "Rimba"
            )}
          </p>
          <div className="shell-header-actions">
            <button
              className="shell-header-action"
              type="button"
              disabled
              aria-label={t("notificationsUnavailable")}
            >
              <Bell size={18} strokeWidth={1.75} aria-hidden="true" />
            </button>
            <button
              className="shell-header-action shell-header-action--account"
              type="button"
              disabled
              aria-label={t("accountUnavailable")}
            >
              <UserRound size={19} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        </header>
        <div
          className={
            isPanelCanvas
              ? "shell-content shell-content--panel-canvas"
              : "shell-content"
          }
        >
          {children}
        </div>
        <footer className="site-footer">
          <div className="site-frame">{footer}</div>
        </footer>
      </div>
      <dialog
        ref={dialogRef}
        id="shell-drawer"
        className="shell-drawer"
        aria-label={t("label")}
        onClose={() => setDrawerOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDrawer();
        }}
      >
        <div className="shell-drawer-header">
          <span>{t("menuTitle")}</span>
          <button
            className="shell-drawer-close"
            type="button"
            onClick={closeDrawer}
          >
            {t("closeMenu")}
          </button>
        </div>
        {navigation(true)}
      </dialog>
    </div>
  );
}
