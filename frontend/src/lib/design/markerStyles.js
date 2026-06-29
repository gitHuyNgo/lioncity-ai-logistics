/**
 * Token-driven Leaflet marker style system for the Map_View
 * (Requirements 10.1, 12.1, 12.3).
 *
 * `buildMarkerIcon(kind, opts)` produces an `L.divIcon` for each marker type so
 * that every marker is distinguishable by **shape + lucide icon**, not by color
 * alone (Req 12.1):
 *
 *   - hub      → rounded square + Warehouse icon       (--primary)
 *   - order    → teardrop pin + per-status icon        (status chart token)
 *   - driver   → circular avatar with initial          (--primary)
 *   - incident → diamond + AlertTriangle icon          (--destructive)
 *
 * Colors are expressed through CSS custom properties (`hsl(var(--token))`) set
 * inline on the marker HTML, so markers re-theme automatically when the `.dark`
 * class toggles on `<html>` — no rebuild required. No raw hex literals are used
 * in this module; the only non-token color a marker can carry is a per-entity
 * `color` passed by the caller (e.g. a hub's stored brand color), preserving
 * existing data-driven coloring.
 *
 * Hover / keyboard-focus emphasis (scale + elevation) is handled by the shared
 * `.lc-marker` class in `index.css`; reduced-motion gating is applied later
 * (task 10.7). This module only supplies the markup + tokens.
 *
 * The function is total: every supported `kind` (and any unknown kind, which
 * falls back to an order pin) returns a valid `L.divIcon` carrying an icon, and
 * it never throws.
 */

import L from "leaflet";

/**
 * Inner SVG markup for the lucide icons used by markers (24×24 viewBox,
 * stroke-based, `currentColor`). Embedded as static strings so they can live
 * inside `L.divIcon` HTML without a React render. Sourced from lucide-react
 * (ISC licensed).
 * @type {Record<string, string>}
 */
const ICON_PATHS = {
  // Warehouse
  hub:
    '<path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/>' +
    '<path d="M6 18h12"/><path d="M6 14h12"/><path d="M6 10h12"/>',
  // Package
  package:
    '<path d="m7.5 4.27 9 5.15"/>' +
    '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>' +
    '<path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  // Truck
  truck:
    '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>' +
    '<path d="M15 18H9"/>' +
    '<path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>' +
    '<circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  // Check
  check: '<path d="M20 6 9 17l-5-5"/>',
  // X
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  // AlertTriangle
  alert:
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>' +
    '<path d="M12 9v4"/><path d="M12 17h.01"/>',
};

/**
 * Wrap one of the {@link ICON_PATHS} entries as a complete inline SVG string
 * inheriting the current text color (`currentColor`).
 *
 * @param {keyof typeof ICON_PATHS} name Icon key.
 * @param {number} [size=14] Rendered icon size in px.
 * @returns {string} SVG markup, or empty string for an unknown name.
 */
function svgIcon(name, size = 14) {
  const inner = ICON_PATHS[name] || "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    `${inner}</svg>`
  );
}

/**
 * Resolve an order status to its non-color icon cue and the chart/semantic
 * token that fills its pin. Normalizes the raw status the same way the rest of
 * the Design_System does (lowercase, `-`→`_`).
 *
 * @param {string} status Raw order status.
 * @returns {{ icon: keyof typeof ICON_PATHS, token: string }}
 */
function orderStatusVisual(status) {
  const s = String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");

  switch (s) {
    case "delivered":
      return { icon: "check", token: "--chart-4" };
    case "failed":
      return { icon: "x", token: "--destructive" };
    case "delivering":
      return { icon: "truck", token: "--chart-2" };
    case "assigned":
      return { icon: "truck", token: "--chart-1" };
    case "pending":
    default:
      return { icon: "package", token: "--chart-3" };
  }
}

/**
 * Build the `L.divIcon` wrapper, attaching the shared `.lc-marker` class plus a
 * per-kind modifier (and an optional highlight modifier) so `index.css` can
 * target shape + hover/focus emphasis.
 *
 * @param {object} cfg
 * @param {string} cfg.kind Marker kind modifier (`hub`/`order`/`driver`/`incident`).
 * @param {string} cfg.html Inner marker HTML.
 * @param {[number, number]} cfg.size `iconSize`.
 * @param {[number, number]} cfg.anchor `iconAnchor`.
 * @param {boolean} [cfg.isHighlighted] Adds the highlight modifier class.
 * @param {boolean} [cfg.isDefault] Adds the default modifier class (hubs).
 * @returns {L.DivIcon}
 */
function makeDivIcon({ kind, html, size, anchor, isHighlighted = false, isDefault = false }) {
  const classes = ["lc-marker", `lc-marker--${kind}`];
  if (isDefault) classes.push("lc-marker--default");
  if (isHighlighted) classes.push("lc-marker--highlight");

  return L.divIcon({
    className: classes.join(" "),
    html,
    iconSize: size,
    iconAnchor: anchor,
    popupAnchor: [0, -anchor[1] + 2],
  });
}

/**
 * Hub marker — rounded square + Warehouse icon. Larger with an emphasis ring
 * for the default hub. Fills with the entity's stored `color` when supplied,
 * otherwise the `--primary` brand token.
 */
function hubIcon({ isDefault = false, isHighlighted = false, color } = {}) {
  const dim = isDefault ? 30 : 24;
  const bg = color || "hsl(var(--primary))";
  const html =
    `<div class="lc-marker__shape" style="--mk-bg:${bg};` +
    `--mk-fg:hsl(var(--primary-foreground))">${svgIcon("hub", isDefault ? 16 : 13)}</div>`;
  return makeDivIcon({
    kind: "hub",
    html,
    size: [dim, dim],
    anchor: [dim / 2, dim / 2],
    isHighlighted,
    isDefault,
  });
}

/**
 * Order marker — teardrop pin whose icon + fill encode the delivery status.
 */
function orderIcon({ status, isHighlighted = false } = {}) {
  const { icon, token } = orderStatusVisual(status);
  const html =
    `<div class="lc-marker__pin" style="--mk-bg:hsl(var(${token}));` +
    `--mk-fg:hsl(var(--primary-foreground))"><span class="lc-marker__pin-icon">` +
    `${svgIcon(icon, 13)}</span></div>`;
  return makeDivIcon({
    kind: "order",
    html,
    size: [30, 38],
    anchor: [15, 35],
    isHighlighted,
  });
}

/**
 * Driver marker — circular avatar showing the driver's initial (Truck icon as
 * fallback when no initial is available).
 */
function driverIcon({ initial, isHighlighted = false } = {}) {
  const ch = String(initial ?? "").trim().charAt(0).toUpperCase();
  const content = ch ? ch : svgIcon("truck", 13);
  const html =
    '<div class="lc-marker__shape" style="--mk-bg:hsl(var(--primary));' +
    `--mk-fg:hsl(var(--primary-foreground))">${content}</div>`;
  return makeDivIcon({
    kind: "driver",
    html,
    size: [26, 26],
    anchor: [13, 13],
    isHighlighted,
  });
}

/**
 * Incident marker — diamond + AlertTriangle icon, filled with `--destructive`.
 */
function incidentIcon({ isHighlighted = false } = {}) {
  const html =
    '<div class="lc-marker__shape" style="--mk-bg:hsl(var(--destructive));' +
    `--mk-fg:hsl(var(--destructive-foreground))"><span class="lc-marker__diamond-icon">` +
    `${svgIcon("alert", 12)}</span></div>`;
  return makeDivIcon({
    kind: "incident",
    html,
    size: [24, 24],
    anchor: [12, 12],
    isHighlighted,
  });
}

/**
 * Build a token-driven `L.divIcon` for a map marker.
 *
 * Total function — never throws. An unrecognized `kind` falls back to an order
 * pin so callers always receive a usable icon carrying a lucide glyph.
 *
 * @param {"hub"|"order"|"driver"|"incident"} kind Marker type.
 * @param {object} [opts]
 * @param {string} [opts.status] Order status (order markers).
 * @param {string} [opts.initial] Driver initial (driver markers).
 * @param {boolean} [opts.isDefault] Whether a hub is the default hub.
 * @param {boolean} [opts.isHighlighted] Emphasize this marker (e.g. "your hub").
 * @param {string} [opts.color] Optional per-entity color (e.g. hub brand color).
 * @returns {L.DivIcon}
 */
export function buildMarkerIcon(kind, opts = {}) {
  switch (kind) {
    case "hub":
      return hubIcon(opts);
    case "driver":
      return driverIcon(opts);
    case "incident":
      return incidentIcon(opts);
    case "order":
    default:
      return orderIcon(opts);
  }
}

/**
 * Build a token-driven directional arrowhead `L.divIcon` for a route segment
 * (Req 12.5). The arrow is a small filled triangle whose inner glyph is rotated
 * to the supplied screen bearing, conveying travel order along the polyline.
 *
 * The triangle fills with the `--primary` brand token (expressed as a CSS
 * custom property so it re-themes with the `.dark` class) unless an explicit
 * per-route `color` is supplied, in which case that color is honored — matching
 * the route stroke. No raw hex. Styling lives on the shared `.lc-route-arrow`
 * class in `index.css`. Arrows are rendered as non-interactive markers so they
 * never intercept popups/clicks.
 *
 * Total function — never throws. A missing/invalid angle renders pointing up.
 *
 * @param {number} [angleDeg=0] Clockwise screen rotation in degrees (0 = up/north).
 * @param {string} [color] Optional per-route color to honor instead of `--primary`.
 * @returns {L.DivIcon}
 */
export function buildArrowIcon(angleDeg = 0, color) {
  const deg = Number.isFinite(Number(angleDeg)) ? Number(angleDeg) : 0;
  const fg = color || "hsl(var(--primary))";
  const triangle =
    '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" ' +
    'viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">' +
    '<path d="M12 3 21 21 12 16.5 3 21Z"/></svg>';
  const html =
    `<div class="lc-route-arrow__glyph" style="--mk-fg:${fg};` +
    `transform:rotate(${deg}deg)">${triangle}</div>`;

  return L.divIcon({
    className: "lc-route-arrow",
    html,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

/**
 * Resolve a contained-marker count to a size bucket. Buckets keep dense order
 * clusters legible: more orders → a larger, more prominent cluster bubble.
 *
 * @param {number} count Number of markers contained in the cluster.
 * @returns {{ bucket: "small"|"medium"|"large", dim: number }}
 */
function clusterSizeBucket(count) {
  const n = Number(count) || 0;
  if (n >= 100) return { bucket: "large", dim: 52 };
  if (n >= 10) return { bucket: "medium", dim: 44 };
  return { bucket: "small", dim: 36 };
}

/**
 * Build a token-driven `L.divIcon` for an order-marker cluster (Req 12.2).
 *
 * The cluster bubble shows the contained order count and is sized by bucket
 * (small/medium/large). Colors come from Design_System tokens (`--primary` /
 * `--primary-foreground`) expressed as CSS custom properties so the cluster
 * re-themes with the `.dark` class — no raw hex. Styling lives on the shared
 * `.lc-cluster` class in `index.css`.
 *
 * Total function — never throws. A missing/invalid count renders as `0` in the
 * small bucket.
 *
 * @param {number} count Number of order markers contained in the cluster.
 * @returns {L.DivIcon}
 */
export function buildClusterIcon(count) {
  const { bucket, dim } = clusterSizeBucket(count);
  const n = Number(count) || 0;
  const html =
    '<div class="lc-cluster__bubble" style="--mk-bg:hsl(var(--primary));' +
    '--mk-fg:hsl(var(--primary-foreground))">' +
    `<span class="lc-cluster__count">${n}</span></div>`;

  return L.divIcon({
    className: `lc-cluster lc-cluster--${bucket}`,
    html,
    iconSize: [dim, dim],
    iconAnchor: [dim / 2, dim / 2],
  });
}

export default buildMarkerIcon;
