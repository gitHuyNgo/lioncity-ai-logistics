import * as React from "react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { statusToVariant } from "@/lib/design/statusMap";

/**
 * StatusBadge — a tokenized, NON-color-only status indicator.
 *
 * Renders a lucide icon (the non-color cue) + a text label + token-backed
 * color, resolved from {@link statusToVariant}. Every status is therefore
 * distinguishable without relying on color alone, satisfying the
 * accessibility requirement (icon/shape + text + color).
 *
 * Builds on the shadcn {@link Badge} primitive (using its token-driven base
 * styles) and layers the per-status token classes (`tokenBg`/`tokenFg`/
 * `tokenBorder`) on top. No raw hex — all color comes from design tokens.
 *
 * @param {Object} props
 * @param {string} props.status         Raw status value (any string is tolerated).
 * @param {React.ReactNode} [props.children]  Optional label override; defaults
 *   to the mapped human-readable label.
 * @param {string} [props.className]    Additional classes merged onto the badge.
 * @returns {JSX.Element}
 */
function StatusBadge({ status, children, className, ...props }) {
  const { label, icon: Icon, tokenBg, tokenFg, tokenBorder } =
    statusToVariant(status);

  return (
    <Badge
      variant="outline"
      className={cn("gap-1 font-medium", tokenBg, tokenFg, tokenBorder, className)}
      {...props}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>{children ?? label}</span>
    </Badge>
  );
}

export { StatusBadge };
