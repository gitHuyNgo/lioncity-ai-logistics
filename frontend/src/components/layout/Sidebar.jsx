import * as React from "react";
import { NavLink } from "react-router-dom";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Sidebar — tokenized, collapsible navigation rail (design.md "Component:
 * Sidebar").
 *
 * Renders the brand header plus the already-role-filtered, grouped navigation
 * as `react-router-dom` `NavLink`s. It contains **no business logic**: role
 * filtering happens upstream (the parent passes `nav` from
 * {@link getNavForRole}), so this component only presents the groups/items it
 * is given.
 *
 * Key behaviors:
 *   - **Active state (Req 4.2)** is signalled by `NavLink`'s automatic
 *     `aria-current="page"`, reinforced with a NON-color cue: a left accent
 *     bar plus a heavier icon stroke weight on the active item. The cue does
 *     not rely on color alone.
 *   - **Collapsed rail (Req 4.x / 7.4)**: when `collapsed` is true, labels and
 *     group headings are hidden and each item is wrapped in a shadcn `Tooltip`
 *     that surfaces the label on hover/focus, keeping icon-only controls
 *     discoverable.
 *   - **onNavigate**: invoked whenever a link is activated so the parent can
 *     close the mobile drawer.
 *   - **Tokenized dark surface**: the rail is a dark panel rendered with the
 *     `--popover` / `--popover-foreground` tokens (replacing the legacy
 *     `.lc-sidebar` `#0b1e24`). No raw hex anywhere.
 *
 * @param {Object} props
 * @param {import("@/lib/design/nav.config").NavGroup[]} props.nav  Role-filtered nav groups.
 * @param {boolean} props.collapsed   Whether the rail is in icon-only mode.
 * @param {() => void} [props.onNavigate]  Called when a nav link is clicked.
 * @returns {JSX.Element}
 */
export function Sidebar({ nav = [], collapsed = false, onNavigate }) {
  return (
    <TooltipProvider delayDuration={0}>
      <aside
        data-testid="sidebar"
        className={cn(
          "flex h-full flex-col gap-2 overflow-y-auto border-r border-white/10",
          "bg-popover text-popover-foreground",
          collapsed ? "w-16 px-2 py-4" : "w-full px-3 py-4"
        )}
      >
        {/* Brand */}
        <div
          className={cn(
            "flex items-center gap-3 px-1 pb-3",
            collapsed && "justify-center px-0"
          )}
        >
          <span
            aria-hidden="true"
            className="h-3 w-3 shrink-0 rounded-full bg-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.2)]"
          />
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-extrabold tracking-tight">
                LionCity
              </div>
              <div className="truncate text-xs text-popover-foreground/60">
                AI-Logistics · SG
              </div>
            </div>
          )}
        </div>

        {/* Grouped navigation */}
        <nav className="flex flex-1 flex-col gap-4" aria-label="Primary">
          {nav.map((group) => (
            <div key={group.group} className="flex flex-col gap-1">
              {!collapsed && (
                <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-popover-foreground/50">
                  {group.group}
                </div>
              )}
              {group.items.map((item) => (
                <SidebarItem
                  key={item.to}
                  item={item}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </TooltipProvider>
  );
}

/**
 * A single navigation entry. Rendered as a `NavLink` whose active state drives
 * both `aria-current="page"` and the non-color cues (left accent bar + heavier
 * icon stroke). When `collapsed`, the link is wrapped in a tooltip exposing the
 * label.
 *
 * @param {Object} props
 * @param {import("@/lib/design/nav.config").NavItem} props.item
 * @param {boolean} props.collapsed
 * @param {() => void} [props.onNavigate]
 */
function SidebarItem({ item, collapsed, onNavigate }) {
  const Icon = item.icon;

  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      data-testid={`nav-${item.to.replace("/", "") || "overview"}`}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
          "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover",
          collapsed && "justify-center px-0",
          isActive
            ? "bg-white/10 font-semibold text-popover-foreground"
            : "text-popover-foreground/70 hover:bg-white/5 hover:text-popover-foreground"
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Non-color cue 1: left accent bar (shape/position, present only when active) */}
          <span
            aria-hidden="true"
            className={cn(
              "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary transition-opacity",
              isActive ? "opacity-100" : "opacity-0"
            )}
          />
          {/* Non-color cue 2: heavier icon stroke weight when active */}
          <Icon
            className="h-4 w-4 shrink-0"
            strokeWidth={isActive ? 2.5 : 1.75}
            aria-hidden="true"
            focusable="false"
          />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </>
      )}
    </NavLink>
  );

  if (!collapsed) {
    return link;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

export default Sidebar;
