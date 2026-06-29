/**
 * StatCard — a tokenized metric tile.
 *
 * Replaces the inline `stat()` render helper and the legacy `.stat` /
 * `.small-stat` CSS classes used in `Overview.jsx` and `Shipper.jsx`. Built on
 * the shadcn `Card` primitive so it inherits the Design_System surface
 * (background, border, radius, shadow) and re-themes automatically between
 * light and dark.
 *
 * All colors resolve through Design_System tokens (`hsl(var(--token))` via
 * Tailwind utilities / arbitrary values) — never raw hex. The optional `tone`
 * selects a token-backed accent applied as a top border and to the icon:
 *
 * | tone      | token        |
 * |-----------|--------------|
 * | default   | `--border` / `--muted-foreground` |
 * | teal      | `--primary`     |
 * | red       | `--destructive` |
 * | amber     | `--chart-3`     |
 * | emerald   | `--chart-4`     |
 *
 * The numeric `value` is rendered with `tabular-nums` (fixed-width figures) so
 * changing values do not cause horizontal jitter.
 *
 * _Requirements: 1.2_
 */

import * as React from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * @typedef {"default"|"teal"|"red"|"amber"|"emerald"} StatTone
 */

/**
 * Per-tone token-backed class strings. Written as full literals (not built
 * dynamically) so the Tailwind content scanner can detect them.
 *
 * @type {Record<StatTone, { accent: string; icon: string; iconWrap: string }>}
 */
const TONE_STYLES = {
  default: {
    accent: "border-t-border",
    icon: "text-muted-foreground",
    iconWrap: "bg-muted",
  },
  teal: {
    accent: "border-t-primary",
    icon: "text-primary",
    iconWrap: "bg-[hsl(var(--primary)/0.12)]",
  },
  red: {
    accent: "border-t-destructive",
    icon: "text-destructive",
    iconWrap: "bg-[hsl(var(--destructive)/0.12)]",
  },
  amber: {
    accent: "border-t-[hsl(var(--chart-3))]",
    icon: "text-[hsl(var(--chart-3))]",
    iconWrap: "bg-[hsl(var(--chart-3)/0.12)]",
  },
  emerald: {
    accent: "border-t-[hsl(var(--chart-4))]",
    icon: "text-[hsl(var(--chart-4))]",
    iconWrap: "bg-[hsl(var(--chart-4)/0.12)]",
  },
};

/**
 * @typedef {Object} StatCardProps
 * @property {string} label                          Metric label (uppercased caption).
 * @property {React.ReactNode} value                 Metric value; falls back to "—" when null/undefined.
 * @property {StatTone} [tone="default"]             Token-backed accent tone.
 * @property {React.ReactNode} [delta]               Optional secondary line (e.g. trend / context).
 * @property {import("lucide-react").LucideIcon} [icon] Optional lucide icon shown in the corner.
 * @property {string} [className]                    Extra classes for the root card.
 */

/**
 * @type {React.ForwardRefExoticComponent<StatCardProps & React.RefAttributes<HTMLDivElement>>}
 */
const StatCard = React.forwardRef(
  ({ label, value, tone = "default", delta, icon: Icon, className, ...props }, ref) => {
    const styles = TONE_STYLES[tone] || TONE_STYLES.default;
    const displayValue = value === null || value === undefined ? "—" : value;

    return (
      <Card
        ref={ref}
        className={cn("border-t-[3px] p-4", styles.accent, className)}
        {...props}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
              {label}
            </div>
            <div className="mt-1 text-2xl font-semibold leading-tight tabular-nums text-card-foreground">
              {displayValue}
            </div>
            {delta != null && (
              <div className="mt-1 text-[11.5px] text-muted-foreground">{delta}</div>
            )}
          </div>
          {Icon && (
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                styles.iconWrap,
                styles.icon
              )}
              aria-hidden="true"
            >
              <Icon className="h-5 w-5" />
            </span>
          )}
        </div>
      </Card>
    );
  }
);

StatCard.displayName = "StatCard";

export { StatCard };
export default StatCard;
