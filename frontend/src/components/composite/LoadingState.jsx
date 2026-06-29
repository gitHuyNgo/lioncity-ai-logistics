import * as React from "react";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * LoadingState — a skeleton placeholder shown while an Async_View is retrieving
 * data (Requirement 5.1).
 *
 * The critical property (Requirement 5.6) is that the skeleton RESERVES the
 * same width and height that the eventual content will occupy, so no
 * surrounding element shifts position when the real data arrives. Callers size
 * the skeleton to match their content region by passing `className` (height /
 * width utilities) and/or choosing a `variant` whose layout mirrors the
 * eventual content.
 *
 * Variants:
 *   - "block" : a single solid skeleton filling the wrapper. Use when you can
 *     give the wrapper the exact content dimensions (e.g. a fixed-height map or
 *     chart panel) via `className`.
 *   - "text"  : `lines` stacked text-line skeletons. Use for paragraph / list
 *     content; the last line is shortened to mimic real text.
 *   - "table" : a header row plus `rows` data rows. Use for Data_Table regions;
 *     reserves the vertical space of the eventual rows so the table does not
 *     grow when data lands.
 *   - "cards" : a responsive grid of `rows` card skeletons. Use for stat-card
 *     grids and dashboard tiles.
 *
 * Accessibility: exposes `role="status"`, `aria-busy="true"`, and
 * `aria-live="polite"` with visually-hidden "Loading" text so assistive
 * technology announces the loading state. The skeleton shapes themselves are
 * decorative (`aria-hidden`). All color comes from the `Skeleton` primitive's
 * token-backed styling — no raw hex.
 *
 * @param {Object} props
 * @param {"block"|"text"|"table"|"cards"} [props.variant="block"] - Skeleton layout.
 * @param {number} [props.rows=3] - Row/card/line count for the "table"/"cards" variants.
 * @param {number} [props.columns=4] - Column count for the "table" variant.
 * @param {number} [props.lines=3] - Line count for the "text" variant.
 * @param {string} [props.label="Loading"] - Visually-hidden status text.
 * @param {string} [props.className] - Extra classes / dimensions for the wrapper.
 * @returns {JSX.Element}
 */
export function LoadingState({
  variant = "block",
  rows = 3,
  columns = 4,
  lines = 3,
  label = "Loading",
  className,
} = {}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={cn("w-full", className)}
    >
      <span className="sr-only">{label}</span>
      {renderSkeleton({ variant, rows, columns, lines })}
    </div>
  );
}

/**
 * @param {{ variant: string, rows: number, columns: number, lines: number }} opts
 * @returns {JSX.Element}
 */
function renderSkeleton({ variant, rows, columns, lines }) {
  if (variant === "text") {
    return (
      <div aria-hidden="true" className="space-y-2">
        {Array.from({ length: Math.max(1, lines) }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn("h-4 w-full", i === lines - 1 && "w-2/3")}
          />
        ))}
      </div>
    );
  }

  if (variant === "cards") {
    return (
      <div
        aria-hidden="true"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {Array.from({ length: Math.max(1, rows) }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (variant === "table") {
    const cols = Math.max(1, columns);
    return (
      <div aria-hidden="true" className="space-y-2">
        {/* header row */}
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-5 w-3/4" />
          ))}
        </div>
        {/* data rows */}
        {Array.from({ length: Math.max(1, rows) }).map((_, r) => (
          <div
            key={r}
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-4 w-full" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  // "block" (default)
  return <Skeleton aria-hidden="true" className="h-full min-h-24 w-full" />;
}

export default LoadingState;
