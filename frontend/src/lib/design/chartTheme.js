/**
 * Chart/Map token bridge for recharts and leaflet (Requirements 10.1, 10.3, 10.4).
 *
 * Recharts and Leaflet cannot consume CSS custom properties directly — they
 * need concrete color strings passed as props/options. This bridge reads the
 * computed Design_System color tokens off `document.documentElement` and wraps
 * each bare HSL triple ("H S% L%") as a usable `hsl(...)` string.
 *
 * Because the values are read live from `getComputedStyle`, the result already
 * reflects the active theme: calling `chartTheme()` again after a light/dark
 * switch (e.g. from an effect keyed on `resolvedTheme`) returns the dark-mode
 * colors. The function is pure with respect to the current DOM, side-effect
 * free, and safe to call repeatedly.
 *
 * If a token resolves empty — for example when a chart mounts before the
 * stylesheet has loaded (see design Error Handling Scenario 3) — the bridge
 * falls back to baked brand defaults so charts always render with the brand
 * palette rather than transparent/black series.
 *
 * @typedef {{
 *   series: [string, string, string, string, string],
 *   grid: string,
 *   axis: string,
 *   tooltipBg: string,
 * }} ChartTheme
 */

/**
 * Baked brand defaults (light theme values from `src/styles/tokens.css`),
 * pre-wrapped as `hsl(...)` strings. Used when a token reads empty.
 *
 * Series order: teal (#0d7c78), blue, amber, emerald, red.
 */
export const FALLBACK_CHART_THEME = Object.freeze({
  series: Object.freeze([
    "hsl(178 81% 27%)", // --chart-1 teal (#0d7c78)
    "hsl(217 91% 60%)", // --chart-2 blue
    "hsl(32 95% 44%)", //  --chart-3 amber
    "hsl(160 84% 26%)", // --chart-4 emerald
    "hsl(350 73% 48%)", // --chart-5 red
  ]),
  grid: "hsl(200 24% 88%)", //        --border
  axis: "hsl(200 9% 40%)", //         --muted-foreground
  tooltipBg: "hsl(197 50% 9%)", //    --popover
});

/** CSS custom properties backing each chart series slot, in order. */
const SERIES_VARS = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5"];

/**
 * Read a CSS custom property holding a bare HSL triple and wrap it as an
 * `hsl(...)` string. Returns `null` when the variable is unset/empty so the
 * caller can substitute a fallback.
 *
 * @param {CSSStyleDeclaration} style - computed style of the root element.
 * @param {string} varName - custom property name, e.g. "--chart-1".
 * @returns {string|null} an `hsl(...)` string, or `null` when empty.
 */
function readHslVar(style, varName) {
  const raw = style.getPropertyValue(varName).trim();
  if (!raw) {
    return null;
  }
  // Tokens are stored as bare triples; if a full color slipped through
  // (e.g. "hsl(...)" or "#fff"), pass it through unchanged.
  if (/^(hsl|rgb|var|#)/i.test(raw)) {
    return raw;
  }
  return `hsl(${raw})`;
}

/**
 * Build the concrete color set recharts/leaflet need from the active
 * Design_System tokens.
 *
 * Pre: ideally runs in the browser after the stylesheet has loaded.
 * Post: returns concrete `hsl(...)` color strings for the five chart series,
 *       grid (`--border`), axis (`--muted-foreground`), and tooltip background
 *       (`--popover`). Any token that resolves empty — or any non-browser
 *       environment (SSR) — falls back to the baked brand defaults. Re-run on
 *       theme change to pick up the new palette.
 *
 * @returns {ChartTheme}
 */
export function chartTheme() {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    !document.documentElement
  ) {
    return {
      series: [...FALLBACK_CHART_THEME.series],
      grid: FALLBACK_CHART_THEME.grid,
      axis: FALLBACK_CHART_THEME.axis,
      tooltipBg: FALLBACK_CHART_THEME.tooltipBg,
    };
  }

  const style = window.getComputedStyle(document.documentElement);

  const series = SERIES_VARS.map(
    (varName, i) => readHslVar(style, varName) ?? FALLBACK_CHART_THEME.series[i]
  );

  return {
    series,
    grid: readHslVar(style, "--border") ?? FALLBACK_CHART_THEME.grid,
    axis: readHslVar(style, "--muted-foreground") ?? FALLBACK_CHART_THEME.axis,
    tooltipBg: readHslVar(style, "--popover") ?? FALLBACK_CHART_THEME.tooltipBg,
  };
}

export default chartTheme;
