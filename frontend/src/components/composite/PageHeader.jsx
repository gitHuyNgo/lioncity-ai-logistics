import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * PageHeader — a tokenized, responsive page header that replaces the legacy
 * inline `.page-title` / `.page-subtitle` + flex header pattern scattered
 * across the pages (Overview, Shipper, Drivers, ...).
 *
 * Design notes:
 *   - The title renders as a semantic heading (`<h1>` by default) so each page
 *     has a single top-level heading; pass `as="h2"` when nested under another
 *     heading (Requirement 9.1 — Design_System semantics).
 *   - All visual values resolve through Design_Tokens via Tailwind utilities
 *     (`text-foreground`, `text-muted-foreground`, `bg-destructive` for the
 *     accent dot). No raw hex / inline palette values (Requirement 1.2).
 *   - Layout: the title block sits on the left and the optional `actions` slot
 *     is right-aligned. The row wraps on narrow widths (`flex-wrap`) and the
 *     actions stay aligned to the end, so the header never forces horizontal
 *     page scrolling.
 *
 * @param {Object} props
 * @param {string} props.title - The page title text (rendered as the heading).
 * @param {string} [props.subtitle] - Optional supporting copy under the title.
 * @param {boolean} [props.accent=false] - When true, renders a red-dot accent
 *   (`bg-destructive`) before the title.
 * @param {React.ReactNode} [props.actions] - Optional right-aligned controls
 *   (buttons, selects, ...).
 * @param {"h1"|"h2"|"h3"} [props.as="h1"] - Semantic heading level for the title.
 * @param {string} [props.className] - Optional extra classes for the wrapper.
 */
export function PageHeader({
  title,
  subtitle,
  accent = false,
  actions,
  as: Heading = "h1",
  className,
} = {}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-x-4 gap-y-3",
        className
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {accent ? (
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-destructive"
            />
          ) : null}
          <Heading className="truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {title}
          </Heading>
        </div>
        {subtitle ? (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export default PageHeader;
