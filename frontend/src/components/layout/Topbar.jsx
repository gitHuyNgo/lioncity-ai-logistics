import * as React from "react";
import { useLocation } from "react-router-dom";
import { PanelLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useAuth } from "@/context/AuthContext";
import { NAV_CONFIG } from "@/lib/design/nav.config";
import ThemeToggle from "@/components/layout/ThemeToggle";
import AccountMenu from "@/components/layout/AccountMenu";

/**
 * @typedef {Object} Crumb
 * @property {string} label  Visible breadcrumb label.
 * @property {string} [to]   Optional route the crumb links to. When omitted the
 *   crumb renders as the current (non-interactive) page.
 */

/**
 * Resolve the human-readable title for a route path from {@link NAV_CONFIG}.
 *
 * Falls back to a Title-Cased version of the last path segment when the path is
 * not a known navigation destination (e.g. detail routes), and to "Overview"
 * for the root path. Pure and total — always returns a non-empty string.
 *
 * @param {string} pathname The active route path (e.g. "/orders").
 * @returns {string} The page title.
 */
export function titleFromPath(pathname) {
  for (const group of NAV_CONFIG) {
    for (const item of group.items) {
      if (item.to === pathname) return item.label;
    }
  }
  if (!pathname || pathname === "/") return "Overview";

  const segment = pathname.split("/").filter(Boolean).pop() || "Overview";
  return segment
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Topbar — the Navigation_Shell top bar.
 *
 * Responsibilities (Requirements 4.3, 4.5, 2.6):
 *   - Renders the active page's title and a breadcrumb. The parent normally
 *     passes `title`; when it is omitted the title is derived from the active
 *     route via {@link titleFromPath}. A breadcrumb is likewise derived from
 *     the route when not supplied.
 *   - Hosts the sidebar toggle control, visible at ALL viewport widths
 *     (Requirement 2.6, updated): a real `<button>` with an accessible
 *     `aria-label` and a lucide icon, calling `onMenuClick`.
 *   - Displays the authenticated user's name and role (Requirement 4.5) and the
 *     global actions (`ThemeToggle` + `AccountMenu`) on the right. The account
 *     control surfaces the signed-in user's name and role; both are derived
 *     from `useAuth()`.
 *
 * Styling uses Design_System tokens only (`bg-card`, `border-border`,
 * `text-foreground`, …) — no raw hex. Every control is keyboard operable.
 *
 * @param {{ title?: string, breadcrumb?: Crumb[], onMenuClick?: () => void }} props
 */
export function Topbar({ title, breadcrumb, onMenuClick } = {}) {
  const { user } = useAuth();
  const { pathname } = useLocation();

  const pageTitle = title ?? titleFromPath(pathname);

  // Derive a default breadcrumb from the active route when the parent does not
  // provide one: "Overview" (home) → current page. The root route shows just
  // the page itself.
  const crumbs = React.useMemo(() => {
    if (breadcrumb && breadcrumb.length > 0) return breadcrumb;
    if (!pathname || pathname === "/") {
      return [{ label: pageTitle }];
    }
    return [{ label: "Overview", to: "/" }, { label: pageTitle }];
  }, [breadcrumb, pathname, pageTitle]);

  return (
    <header className="flex h-16 items-center gap-3 border-b border-border bg-card px-4 text-foreground sm:px-6">
      {/* Sidebar toggle — visible at all widths (Req 2.6). */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Toggle sidebar"
        title="Toggle sidebar"
        onClick={onMenuClick}
        className="shrink-0"
      >
        <PanelLeft aria-hidden="true" focusable="false" />
      </Button>

      {/* Title + breadcrumb derived from the active route. */}
      <div className="min-w-0 flex-1">
        <Breadcrumb>
          <BreadcrumbList>
            {crumbs.map((crumb, index) => {
              const isLast = index === crumbs.length - 1;
              return (
                <React.Fragment key={`${crumb.label}-${index}`}>
                  <BreadcrumbItem>
                    {isLast || !crumb.to ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={crumb.to}>
                        {crumb.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                </React.Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="truncate text-base font-bold leading-tight text-foreground sm:text-lg">
          {pageTitle}
        </h1>
      </div>

      {/* Global actions. AccountMenu surfaces the authenticated user's name and
          role (Req 4.5); rendered only while a user is signed in. */}
      <div className="flex shrink-0 items-center gap-2">
        <ThemeToggle />
        {user && <AccountMenu />}
      </div>
    </header>
  );
}

export default Topbar;
