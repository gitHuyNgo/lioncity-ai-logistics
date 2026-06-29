import { useEffect, useState } from "react";

/**
 * Subscribe to a CSS media query and track whether it currently matches.
 *
 * Pre: `query` is a valid media query string.
 * Post: returns the current match state; subscribes to `matchMedia` change
 *       events and removes the listener on unmount. SSR-safe (returns `false`
 *       when `window`/`matchMedia` is unavailable).
 *
 * @param {string} query - A CSS media query, e.g. "(min-width: 768px)".
 * @returns {boolean} `true` when the query currently matches, otherwise `false`.
 */
export function useMediaQuery(query) {
  const getMatch = () => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia(query).matches;
  };

  const [matches, setMatches] = useState(getMatch);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const mql = window.matchMedia(query);
    const onChange = (event) => setMatches(event.matches);

    // Sync immediately in case the query changed between render and effect.
    setMatches(mql.matches);

    // addEventListener is the modern API; fall back to addListener for older
    // engines (Safari < 14) so cleanup still pairs correctly.
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }

    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, [query]);

  return matches;
}

export default useMediaQuery;
