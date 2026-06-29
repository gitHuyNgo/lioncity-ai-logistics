import * as React from "react";
import { Outlet } from "react-router-dom";

import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  useBreakpoint,
  BREAKPOINTS,
} from "@/lib/design/useBreakpoint";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

/** localStorage key persisting the user's desktop collapsed (rail) preference. */
export const SIDEBAR_COLLAPSED_KEY = "lc-sidebar-collapsed";

/**
 * Resolve the sidebar presentation mode from the current viewport width and the
 * user's persisted collapse preference. Mirrors the "Responsive sidebar state"
 * pseudocode in design.md exactly:
 *
 *   - width < md (768)                         → "drawer"  (hidden, opens as Sheet)
 *   - else if userCollapsed OR width < lg (1024) → "rail"  (icon-only 64px)
 *   - else                                       → "expanded" (full panel)
 *
 * Pure and total: every `(width, collapsed)` pair maps to exactly one mode.
 *
 * @param {number} viewportWidth Viewport width in pixels.
 * @param {boolean} userCollapsed Whether the user collapsed the rail on desktop.
 * @returns {"drawer"|"rail"|"expanded"} The active sidebar mode.
 */
export function sidebarMode(viewportWidth, userCollapsed) {
  if (viewportWidth < BREAKPOINTS.md) {
    return "drawer";
  }
  if (userCollapsed || viewportWidth < BREAKPOINTS.lg) {
    return "rail";
  }
  return "expanded";
}

/** Read the persisted collapsed preference; SSR-safe, defaults to false. */
function readCollapsed() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

/** Persist the collapsed preference; swallows storage failures (private mode). */
function writeCollapsed(value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, value ? "true" : "false");
  } catch {
    /* storage unavailable — keep the in-session value only */
  }
}

/**
 * AppShell — the responsive Navigation_Shell frame (design.md "Component:
 * AppShell").
 *
 * Replaces the legacy fixed-width `.lc-shell` grid with a responsive layout
 * that owns:
 *   - the **collapsed/expanded** rail state on desktop, persisted to
 *     `localStorage` under {@link SIDEBAR_COLLAPSED_KEY} (Req 2.2);
 *   - the **mobile drawer** open/close state (Req 2.1, 2.7, 2.8);
 *   - rendering `Sidebar` + `Topbar` + the content region.
 *
 * Responsive behavior driven by {@link sidebarMode}:
 *   - **drawer** (`< md`, ≤ 767px): no persistent sidebar occupies the layout;
 *     the content is full width and the `Sidebar` is rendered inside a shadcn
 *     `Sheet` opened via the Topbar toggle (Req 2.1).
 *   - **rail** (`< lg` or user-collapsed): a 64px icon-only persistent panel.
 *   - **expanded** (`≥ lg`, not collapsed): the full persistent panel (Req 2.2).
 *
 * The Topbar toggle (`onMenuClick`) is visible at every width (Req 2.6). On
 * mobile it opens/closes the drawer (Req 2.7, 2.8); on desktop it toggles the
 * collapsed flag (rail ↔ expanded) and persists it.
 *
 * Content: prefers `children` (the current `App.js` renders a `<Routes>` block
 * as children — see task 7.1); falls back to `<Outlet/>` for nested-route
 * setups.
 *
 * All styling derives from Design_System tokens (`bg-background`,
 * `text-foreground`, `border-border`, …); no raw hex. The layout produces no
 * horizontal page scroll at 375 / 768 / 1024 / 1440 px (`min-w-0` on the
 * content column confines overflow).
 *
 * @param {Object} props
 * @param {import("@/lib/design/nav.config").NavGroup[]} [props.nav]  Role-filtered nav groups.
 * @param {React.ReactNode} [props.children]  Page content (preferred over Outlet).
 * @returns {JSX.Element}
 */
export function AppShell({ nav = [], children }) {
  const { width } = useBreakpoint();
  const [collapsed, setCollapsed] = React.useState(readCollapsed);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const mode = sidebarMode(width, collapsed);
  const isDrawer = mode === "drawer";

  // Close the mobile drawer whenever we leave drawer mode (e.g. on rotate /
  // resize up to a desktop width) so it can't linger off-screen.
  React.useEffect(() => {
    if (!isDrawer && drawerOpen) {
      setDrawerOpen(false);
    }
  }, [isDrawer, drawerOpen]);

  // Toggle control (Req 2.6–2.8): open/close the drawer on mobile, toggle the
  // persisted rail/expanded state on desktop.
  const handleToggle = React.useCallback(() => {
    if (sidebarMode(window.innerWidth, collapsed) === "drawer") {
      setDrawerOpen((open) => !open);
      return;
    }
    setCollapsed((prev) => {
      const next = !prev;
      writeCollapsed(next);
      return next;
    });
  }, [collapsed]);

  const closeDrawer = React.useCallback(() => setDrawerOpen(false), []);

  const content = children ?? <Outlet />;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Persistent sidebar — only in rail/expanded modes (≥ md). Hidden in
          drawer mode where it occupies no layout space (Req 2.1). */}
      {!isDrawer && (
        <div
          data-testid="appshell-sidebar"
          data-mode={mode}
          className={cn(
            "hidden shrink-0 md:block",
            mode === "rail" ? "w-16" : "w-[232px]"
          )}
        >
          <Sidebar nav={nav} collapsed={mode === "rail"} />
        </div>
      )}

      {/* Mobile drawer — Sidebar inside a Sheet, opened via the Topbar toggle
          (Req 2.1, 2.7, 2.8). */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="left"
          className="w-[232px] border-r border-border bg-popover p-0 text-popover-foreground"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>Primary navigation menu</SheetDescription>
          </SheetHeader>
          <Sidebar nav={nav} collapsed={false} onNavigate={closeDrawer} />
        </SheetContent>
      </Sheet>

      {/* Main column. `min-w-0` confines content overflow so the document body
          never produces a horizontal scrollbar (Req 2.3). */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={handleToggle} />
        <main className="min-w-0 flex-1 overflow-auto bg-background p-4 sm:p-6">
          {content}
        </main>
      </div>
    </div>
  );
}

export default AppShell;
