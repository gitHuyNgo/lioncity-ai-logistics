/**
 * Status → visual mapping for the LionCity client.
 *
 * Provides a single source of truth that maps every {@link EntityStatus} to a
 * tokenized visual descriptor (variant, human label, a lucide icon used as a
 * NON-color cue, and Design_System token-backed Tailwind classes for the
 * background, foreground, and border).
 *
 * Colors are expressed exclusively through design tokens (`hsl(var(--token))`
 * via Tailwind utilities / arbitrary values) — never raw hex — so badges
 * re-theme automatically between light and dark.
 *
 * Consumed by `StatusBadge` (task 5.3) and the totality property test (2.2).
 *
 * @see {@link statusToVariant} for the total resolution function.
 */

import {
  CheckCircle2,
  Truck,
  Moon,
  Clock,
  UserCheck,
  PackageCheck,
  XCircle,
  Leaf,
  Fuel,
} from "lucide-react";

/**
 * @typedef {"available"|"delivering"|"off_duty"|"pending"|"assigned"|"delivered"|"failed"|"ev"|"diesel"} EntityStatus
 */

/**
 * A tokenized visual descriptor for a status.
 *
 * @typedef {Object} StatusVisual
 * @property {EntityStatus} variant      Canonical normalized status key.
 * @property {string}       label        Human-readable label.
 * @property {import("lucide-react").LucideIcon} icon  Non-color cue icon.
 * @property {string}       tokenBg      Token-backed background class string.
 * @property {string}       tokenFg      Token-backed foreground (text) class string.
 * @property {string}       tokenBorder  Token-backed border class string.
 */

/**
 * The canonical default visual used for any unknown / unmapped status, so that
 * {@link statusToVariant} is total and never throws.
 * @type {EntityStatus}
 */
export const DEFAULT_STATUS = "pending";

/**
 * Map of every {@link EntityStatus} to its {@link StatusVisual}.
 *
 * Class strings are written as full literals (not built dynamically) so the
 * Tailwind content scanner can detect them. Each status pairs a distinct hue
 * (drawn from the chart / semantic tokens) with a distinct icon, so statuses
 * remain distinguishable without relying on color alone.
 *
 * @type {Record<EntityStatus, StatusVisual>}
 */
export const STATUS_MAP = {
  available: {
    variant: "available",
    label: "Available",
    icon: CheckCircle2,
    tokenBg: "bg-[hsl(var(--chart-4)/0.15)]",
    tokenFg: "text-[hsl(var(--chart-4))]",
    tokenBorder: "border-[hsl(var(--chart-4)/0.30)]",
  },
  delivering: {
    variant: "delivering",
    label: "Delivering",
    icon: Truck,
    tokenBg: "bg-[hsl(var(--chart-2)/0.15)]",
    tokenFg: "text-[hsl(var(--chart-2))]",
    tokenBorder: "border-[hsl(var(--chart-2)/0.30)]",
  },
  off_duty: {
    variant: "off_duty",
    label: "Off Duty",
    icon: Moon,
    tokenBg: "bg-muted",
    tokenFg: "text-muted-foreground",
    tokenBorder: "border-border",
  },
  pending: {
    variant: "pending",
    label: "Pending",
    icon: Clock,
    tokenBg: "bg-[hsl(var(--chart-3)/0.15)]",
    tokenFg: "text-[hsl(var(--chart-3))]",
    tokenBorder: "border-[hsl(var(--chart-3)/0.30)]",
  },
  assigned: {
    variant: "assigned",
    label: "Assigned",
    icon: UserCheck,
    tokenBg: "bg-[hsl(var(--chart-1)/0.15)]",
    tokenFg: "text-[hsl(var(--chart-1))]",
    tokenBorder: "border-[hsl(var(--chart-1)/0.30)]",
  },
  delivered: {
    variant: "delivered",
    label: "Delivered",
    icon: PackageCheck,
    tokenBg: "bg-[hsl(var(--chart-4)/0.15)]",
    tokenFg: "text-[hsl(var(--chart-4))]",
    tokenBorder: "border-[hsl(var(--chart-4)/0.30)]",
  },
  failed: {
    variant: "failed",
    label: "Failed",
    icon: XCircle,
    tokenBg: "bg-destructive/15",
    tokenFg: "text-destructive",
    tokenBorder: "border-destructive/30",
  },
  ev: {
    variant: "ev",
    label: "EV",
    icon: Leaf,
    tokenBg: "bg-[hsl(var(--chart-4)/0.15)]",
    tokenFg: "text-[hsl(var(--chart-4))]",
    tokenBorder: "border-[hsl(var(--chart-4)/0.30)]",
  },
  diesel: {
    variant: "diesel",
    label: "Diesel",
    icon: Fuel,
    tokenBg: "bg-muted",
    tokenFg: "text-muted-foreground",
    tokenBorder: "border-border",
  },
};

/**
 * Resolve any raw status string to a defined {@link StatusVisual}.
 *
 * Total function — never throws. Normalizes the input (lowercase, `-` → `_`,
 * trimmed) and returns the mapped visual, falling back to the `pending`
 * default for any unknown, empty, null, or non-string input.
 *
 * @param {string} status Raw status value from the API (e.g. "off-duty",
 *   "Delivering", "off_duty"). Any type is tolerated.
 * @returns {StatusVisual} A defined visual; output always carries a non-null icon.
 */
export function statusToVariant(status) {
  let raw = "";
  try {
    raw = String(status ?? "");
  } catch {
    raw = "";
  }

  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");

  if (Object.prototype.hasOwnProperty.call(STATUS_MAP, normalized)) {
    return STATUS_MAP[normalized];
  }
  return STATUS_MAP[DEFAULT_STATUS];
}
