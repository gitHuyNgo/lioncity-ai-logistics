/**
 * WCAG contrast utilities for Design_System token pairs.
 *
 * Color tokens in `src/styles/tokens.css` are stored as bare HSL triples
 * ("H S% L%", no hsl() wrapper). These helpers parse those triples, convert
 * them to linear RGB, derive relative luminance, and compute the WCAG 2.1
 * contrast ratio so foreground/background token pairings can be validated
 * against the AA thresholds (Requirements 1.5, 1.6).
 *
 * References:
 *   - Relative luminance: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 *   - Contrast ratio:     https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 *   (Content was rephrased for compliance with licensing restrictions.)
 *
 * @typedef {{ r: number, g: number, b: number }} Rgb  // channels in [0, 255]
 */

/** AA contrast threshold for normal-size body text. */
export const AA_NORMAL = 4.5;
/** AA contrast threshold for large text (>=18pt, or >=14pt bold) and UI boundaries. */
export const AA_LARGE = 3;

/**
 * Parse a bare HSL triple string into its numeric components.
 *
 * Accepts the token storage format `"H S% L%"` (e.g. `"178 81% 27%"`). The
 * percent signs on saturation/lightness are optional and extra whitespace is
 * tolerated. Hue is normalized into [0, 360); saturation and lightness are
 * clamped into [0, 100].
 *
 * @param {string} triple - HSL triple such as "178 81% 27%".
 * @returns {{ h: number, s: number, l: number }}
 * @throws {Error} when the string cannot be parsed into three numbers.
 */
export function parseHslTriple(triple) {
  if (typeof triple !== "string") {
    throw new Error(`Expected HSL triple string, received ${typeof triple}`);
  }
  const parts = triple
    .trim()
    .replace(/%/g, "")
    .split(/[\s,]+/)
    .filter(Boolean);
  if (parts.length !== 3) {
    throw new Error(`Invalid HSL triple: "${triple}"`);
  }
  const nums = parts.map(Number);
  if (nums.some((n) => Number.isNaN(n))) {
    throw new Error(`Invalid HSL triple (non-numeric): "${triple}"`);
  }
  let [h, s, l] = nums;
  h = ((h % 360) + 360) % 360;
  s = Math.min(100, Math.max(0, s));
  l = Math.min(100, Math.max(0, l));
  return { h, s, l };
}

/**
 * Convert a bare HSL triple string to an RGB object with channels in [0, 255].
 *
 * @param {string} triple - HSL triple such as "178 81% 27%".
 * @returns {Rgb}
 */
export function hslTripleToRgb(triple) {
  const { h, s, l } = parseHslTriple(triple);
  const sFrac = s / 100;
  const lFrac = l / 100;

  const c = (1 - Math.abs(2 * lFrac - 1)) * sFrac;
  const hPrime = h / 60;
  const x = c * (1 - Math.abs((hPrime % 2) - 1));
  const m = lFrac - c / 2;

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hPrime >= 0 && hPrime < 1) {
    [r1, g1, b1] = [c, x, 0];
  } else if (hPrime < 2) {
    [r1, g1, b1] = [x, c, 0];
  } else if (hPrime < 3) {
    [r1, g1, b1] = [0, c, x];
  } else if (hPrime < 4) {
    [r1, g1, b1] = [0, x, c];
  } else if (hPrime < 5) {
    [r1, g1, b1] = [x, 0, c];
  } else {
    [r1, g1, b1] = [c, 0, x];
  }

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

/**
 * Linearize a single sRGB channel value (0-255) per the WCAG transfer function.
 *
 * @param {number} channel - sRGB channel in [0, 255].
 * @returns {number} linear-light value in [0, 1].
 */
function linearizeChannel(channel) {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Compute the WCAG relative luminance of a color.
 *
 * Accepts either an Rgb object or a bare HSL triple string.
 *
 * @param {Rgb | string} color
 * @returns {number} relative luminance in [0, 1].
 */
export function relativeLuminance(color) {
  const rgb = typeof color === "string" ? hslTripleToRgb(color) : color;
  const r = linearizeChannel(rgb.r);
  const g = linearizeChannel(rgb.g);
  const b = linearizeChannel(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Compute the WCAG contrast ratio between a foreground and background color.
 *
 * The ratio is symmetric and always >= 1 (identical colors yield 1) and
 * <= 21 (black vs. white). Each argument may be an Rgb object or a bare HSL
 * triple string.
 *
 * @param {Rgb | string} fg - foreground color.
 * @param {Rgb | string} bg - background color.
 * @returns {number} contrast ratio in [1, 21].
 */
export function contrastRatio(fg, bg) {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Determine whether a foreground/background pair meets the WCAG AA threshold.
 *
 * @param {Rgb | string} fg - foreground color.
 * @param {Rgb | string} bg - background color.
 * @param {boolean} [isLargeText=false] - true for large text (>=18pt / >=14pt
 *   bold) or UI component boundaries, which use the 3:1 threshold; otherwise
 *   the 4.5:1 normal-text threshold applies.
 * @returns {boolean}
 */
export function meetsAA(fg, bg, isLargeText = false) {
  const threshold = isLargeText ? AA_LARGE : AA_NORMAL;
  return contrastRatio(fg, bg) >= threshold;
}
