/**
 * Theme-aware basemap bridge for the Leaflet Map_View (Requirement 12.8).
 *
 * Leaflet's `TileLayer` needs a concrete tile-URL template and attribution
 * string; it cannot read CSS custom properties. This helper selects the CARTO
 * raster basemap variant that matches the active Design_System theme so the
 * map background re-themes alongside the rest of the LionCity_Client:
 *
 *   - light theme → CARTO `light_all`
 *   - dark theme  → CARTO `dark_all`
 *
 * `MapView` keys/urls its `TileLayer` on the value returned here (driven by
 * `next-themes` `resolvedTheme`), so when the theme flips the tile layer swaps
 * to the matching variant without remounting the whole map.
 *
 * Pure and side-effect free: given the same `resolvedTheme` it always returns
 * the same descriptor. Any value other than the string "dark" (including
 * `undefined` before next-themes has resolved on the client) yields the light
 * basemap, matching the app's light-by-default theme policy (Requirement 3.5).
 *
 * @typedef {{ variant: "light_all"|"dark_all", url: string, attribution: string, isDark: boolean }} MapTheme
 */

/** CARTO basemap tile templates, one per theme. */
const CARTO_TILES = Object.freeze({
  light_all: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  dark_all: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
});

/** Shared attribution string for the CARTO/OpenStreetMap basemap. */
export const MAP_ATTRIBUTION = "&copy; OpenStreetMap &copy; CARTO";

/**
 * Resolve the basemap tile descriptor for the active theme.
 *
 * @param {string} [resolvedTheme] The active theme from `next-themes`
 *   `useTheme().resolvedTheme` (e.g. "light" | "dark"). Any non-"dark" value
 *   (including `undefined`) resolves to the light basemap.
 * @returns {MapTheme} Tile variant, URL template, attribution, and dark flag.
 */
export function mapTheme(resolvedTheme) {
  const isDark = String(resolvedTheme ?? "").trim().toLowerCase() === "dark";
  const variant = isDark ? "dark_all" : "light_all";

  return {
    variant,
    url: CARTO_TILES[variant],
    attribution: MAP_ATTRIBUTION,
    isDark,
  };
}

export default mapTheme;
