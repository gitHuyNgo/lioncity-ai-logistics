import * as React from "react";
import { ResponsiveContainer } from "recharts";
import { BarChart3 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/composite/EmptyState";

/**
 * ChartCard — standardizes recharts panels on the Design_System (Requirements
 * 10.4, 10.6).
 *
 * Design notes:
 *   - Built on the shadcn `Card` so every chart panel shares the same surface,
 *     border, radius, and shadow tokens as the rest of the console.
 *   - Series, grid, axis, and tooltip colors come from Design_Tokens via the
 *     `chartTheme()` bridge (`src/lib/design/chartTheme.js`). Callers read
 *     `chartTheme()` and pass the resolved colors to their recharts elements,
 *     so no raw hex appears anywhere in the chart (Req 10.4). ChartCard itself
 *     uses only token-backed Tailwind utilities — no raw hex.
 *   - Chart empty-state (Req 10.6): when the chart has no data points, the plot
 *     area is replaced by an `EmptyState` whose message names the absent data,
 *     instead of rendering an empty/blank plot.
 *   - The recharts tree is wrapped in a `ResponsiveContainer` sized to `height`
 *     so charts fill their card width responsively at the requested height.
 *
 * Emptiness detection: by default ChartCard inspects the recharts child's
 * `data` prop — an empty (or missing) `data` array means "no data points". A
 * caller whose data lives on series rather than the chart element can pass the
 * explicit `isEmpty` prop to override the heuristic.
 *
 * @param {Object} props
 * @param {string} props.title - Card title naming what the chart shows.
 * @param {React.ReactNode} [props.actions] - Optional right-aligned controls
 *   (e.g. a range selector) rendered in the card header.
 * @param {number} [props.height=320] - Plot area height in pixels; the width is
 *   responsive via `ResponsiveContainer`.
 * @param {React.ReactElement} props.children - A single recharts element
 *   (e.g. `<BarChart data={...}>...`).
 * @param {boolean} [props.isEmpty] - Explicit empty override. When provided it
 *   takes precedence over the `data`-prop heuristic.
 * @param {string} [props.emptyTitle="No chart data"] - Heading for the
 *   empty-state; should name the absent data.
 * @param {string} [props.emptyMessage] - Optional supporting copy for the
 *   empty-state.
 * @param {string} [props.className] - Optional extra classes for the card.
 * @returns {JSX.Element}
 */
export function ChartCard({
  title,
  actions,
  height = 320,
  children,
  isEmpty,
  emptyTitle = "No chart data",
  emptyMessage,
  className,
} = {}) {
  const empty = isEmpty ?? !chartChildHasData(children);

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </CardHeader>
      <CardContent>
        {empty ? (
          <EmptyState
            icon={BarChart3}
            title={emptyTitle}
            message={emptyMessage}
            className="border-0 bg-transparent"
          />
        ) : (
          <div style={{ width: "100%", height }}>
            <ResponsiveContainer width="100%" height="100%">
              {children}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Inspect a recharts element to decide whether it has data points to plot.
 * Returns false when the child is not a valid element or its `data` prop is an
 * empty array; returns true when `data` has entries or is absent (in which case
 * the caller should use the explicit `isEmpty` prop to signal emptiness).
 *
 * @param {React.ReactNode} child
 * @returns {boolean}
 */
function chartChildHasData(child) {
  if (!React.isValidElement(child)) {
    return false;
  }
  const data = child.props?.data;
  if (Array.isArray(data)) {
    return data.length > 0;
  }
  // Unknown shape (data lives on series): assume it has data unless the caller
  // overrides via `isEmpty`.
  return true;
}

export default ChartCard;
