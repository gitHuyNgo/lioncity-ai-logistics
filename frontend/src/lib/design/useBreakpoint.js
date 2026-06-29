import { useEffect, useState } from "react";

/**
 * Tailwind default breakpoint thresholds (min-width, in pixels).
 * Widths below `sm` resolve to the implicit "base" breakpoint.
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};

/** Viewport width below which the UI is treated as mobile. */
export const MOBILE_MAX_WIDTH = BREAKPOINTS.md; // 768

const DEBOUNCE_MS = 150; // >= 100ms per spec

/**
 * Map a viewport width to its Tailwind breakpoint key.
 *
 * @param {number} width - Viewport width in pixels.
 * @returns {"base"|"sm"|"md"|"lg"|"xl"|"2xl"} The active breakpoint key.
 */
export function widthToBreakpoint(width) {
  if (width >= BREAKPOINTS["2xl"]) return "2xl";
  if (width >= BREAKPOINTS.xl) return "xl";
  if (width >= BREAKPOINTS.lg) return "lg";
  if (width >= BREAKPOINTS.md) return "md";
  if (width >= BREAKPOINTS.sm) return "sm";
  return "base";
}

function readWidth() {
  if (typeof window === "undefined") return 0;
  return window.innerWidth;
}

function buildState(width) {
  return {
    width,
    bp: width === 0 ? "base" : widthToBreakpoint(width),
    isMobile: width === 0 ? false : width < MOBILE_MAX_WIDTH,
  };
}

/**
 * Track the active responsive breakpoint derived from `window.innerWidth`.
 *
 * Pre: runs in the browser; an SSR guard returns `base`/`isMobile=false` when
 *      `window` is undefined.
 * Post: returns the current breakpoint; updates on resize via a single
 *       debounced (>= 100ms) listener.
 * Invariant: at most one resize listener is registered and it is removed on
 *            unmount.
 *
 * @returns {{ width: number, bp: "base"|"sm"|"md"|"lg"|"xl"|"2xl", isMobile: boolean }}
 */
export function useBreakpoint() {
  const [state, setState] = useState(() => buildState(readWidth()));

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    let timeoutId = null;

    const update = () => setState(buildState(window.innerWidth));

    const onResize = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        timeoutId = null;
        update();
      }, DEBOUNCE_MS);
    };

    // Sync immediately in case the width changed between render and effect.
    update();

    window.addEventListener("resize", onResize);
    return () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return state;
}

export default useBreakpoint;
