/**
 * Theme resolution & persistence helpers for the LionCity client.
 *
 * This is a small, pure (side-effect-free) module that encodes the
 * deterministic theme rules from the design's "Theme resolution & persistence"
 * pseudocode. It is consumed by:
 *   - the `ThemeProvider` wiring (tasks 1.6 / 4.4), which maps these helpers
 *     onto `next-themes`, and
 *   - the theme-idempotence property test (task 2.10).
 *
 * Design tokens (`hsl(var(--*))`) are resolved per the active theme block once
 * the `dark` class is present (or absent) on `<html>`. These helpers decide
 * *which* class should be applied; they never touch the DOM or `localStorage`
 * themselves so they stay deterministic and trivially testable.
 *
 * ── How this maps onto `next-themes` ────────────────────────────────────────
 * `next-themes` is mounted with `attribute="class"`, so it toggles the `dark`
 * class on `<html>` based on the active theme and the OS preference. The class
 * it applies for a given (preference, systemPrefersDark) pair is exactly what
 * {@link resolveTheme} returns — this module mirrors that decision so it can be
 * reasoned about and property-tested in isolation.
 *
 * @module lib/design/resolveTheme
 */

/**
 * @typedef {"light"|"dark"|"system"} ThemePreference
 *   A user-selectable theme preference. `"system"` defers to the OS color
 *   scheme; `"light"`/`"dark"` are explicit selections.
 */

/**
 * @typedef {""|"dark"} AppliedThemeClass
 *   The class `next-themes` adds to `<html>`: `"dark"` when the effective
 *   theme is dark, otherwise the empty string (light).
 */

/**
 * Valid explicit/stored preference values.
 * @type {readonly ThemePreference[]}
 */
export const THEME_PREFERENCES = Object.freeze(["light", "dark", "system"]);

/**
 * The class applied when the dark theme is effective.
 * @type {AppliedThemeClass}
 */
export const DARK_CLASS = "dark";

/**
 * The class applied when the light theme is effective (none — light is the
 * absence of the `dark` class).
 * @type {AppliedThemeClass}
 */
export const LIGHT_CLASS = "";

/**
 * The theme applied when no selection has ever been stored.
 *
 * Per Requirement 3.5 (updated): when NO theme selection is stored, the app
 * defaults to LIGHT regardless of any operating-system color-scheme
 * preference. This is intentionally NOT `"system"`.
 * @type {ThemePreference}
 */
export const DEFAULT_PREFERENCE = "light";

/**
 * Deterministically resolve a theme preference to the class `next-themes`
 * applies to `<html>`.
 *
 * Mirrors the design pseudocode `resolveTheme(preference, systemPrefersDark)`:
 *   - `"system"` → effective is `dark` when `systemPrefersDark`, else `light`.
 *   - `"light"`/`"dark"` → effective is the preference itself.
 *   - returns `"dark"` when effective is dark, otherwise `""`.
 *
 * Pure & total: same inputs always yield the same output (Property 5 — theme
 * idempotence) and any unrecognized preference is treated as light so the
 * function never throws.
 *
 * @param {ThemePreference} preference      One of "light" | "dark" | "system".
 * @param {boolean}         systemPrefersDark Whether the OS reports a dark
 *   color-scheme preference (only consulted when `preference === "system"`).
 * @returns {AppliedThemeClass} `"dark"` when the effective theme is dark,
 *   otherwise `""`.
 */
export function resolveTheme(preference, systemPrefersDark) {
  const effective =
    preference === "system"
      ? systemPrefersDark
        ? "dark"
        : "light"
      : preference === "dark"
        ? "dark"
        : "light";

  return effective === "dark" ? DARK_CLASS : LIGHT_CLASS;
}

/**
 * Resolve the initial preference to use on app load given what (if anything)
 * was previously persisted.
 *
 * Per Requirement 3.5 (updated): when NO selection is stored, default to
 * LIGHT — never to `"system"` and never derived from the OS preference. When a
 * selection IS stored, honor it (Requirement 3.3 — the identical theme is
 * applied automatically on the next session).
 *
 * The `ThemeProvider` wiring (tasks 1.6 / 4.4) uses this to pick `next-themes`'
 * `defaultTheme`/initial value: pass the persisted value (or `null`/`undefined`
 * when nothing is stored) and use the result.
 *
 * @param {ThemePreference|null|undefined} storedPreference The previously
 *   persisted preference, or a nullish value when none exists.
 * @returns {ThemePreference} The stored preference when valid, otherwise the
 *   light default.
 */
export function initialTheme(storedPreference) {
  return isValidPreference(storedPreference)
    ? storedPreference
    : DEFAULT_PREFERENCE;
}

/**
 * Narrow an arbitrary value to a valid {@link ThemePreference}.
 *
 * @param {unknown} value Any value (e.g. a raw `localStorage` read).
 * @returns {value is ThemePreference} `true` when `value` is one of the
 *   recognized preferences.
 */
export function isValidPreference(value) {
  return THEME_PREFERENCES.includes(/** @type {ThemePreference} */ (value));
}

/**
 * Compute the result of a theme-selection attempt when persistence may fail.
 *
 * Encodes the failure-fallback semantics of Requirement 3.4 as a pure
 * decision (no DOM / storage access), so the caller can apply the outcome and
 * the behavior can be tested deterministically:
 *
 *   - The selected theme is ALWAYS applied to the current session
 *     (`appliedClass` reflects `selected`).
 *   - WHEN persistence succeeds: the stored preference becomes `selected` and
 *     `persisted` is `true`.
 *   - WHEN persistence fails: the previously stored selection is retained
 *     UNCHANGED for the next session (`storedPreference` stays
 *     `previousStored`), `persisted` is `false`, and `notifyFailure` is `true`
 *     so the caller can surface an "unable to save preference" indication.
 *
 * Maps onto `next-themes`: `setTheme(selected)` updates the in-memory/applied
 * theme immediately. If writing to `localStorage` throws (e.g. quota /
 * private-mode / disabled storage), the caller keeps the prior stored value
 * and shows the failure indication, while the current session still reflects
 * `selected`.
 *
 * @param {ThemePreference} selected        The theme the user just selected.
 * @param {ThemePreference|null|undefined} previousStored The preference stored
 *   before this attempt (nullish when none).
 * @param {boolean} persistSucceeded Whether the persistence write succeeded.
 * @param {boolean} systemPrefersDark OS dark-scheme preference, forwarded to
 *   {@link resolveTheme} for the applied class.
 * @returns {{
 *   appliedClass: AppliedThemeClass,
 *   storedPreference: ThemePreference|null|undefined,
 *   persisted: boolean,
 *   notifyFailure: boolean,
 * }} The outcome the caller should apply.
 */
export function applyThemeSelection(
  selected,
  previousStored,
  persistSucceeded,
  systemPrefersDark
) {
  return {
    // Selected theme is applied to the current session regardless of outcome.
    appliedClass: resolveTheme(selected, systemPrefersDark),
    // On success the stored value advances to `selected`; on failure the
    // previously stored selection is retained unchanged.
    storedPreference: persistSucceeded ? selected : previousStored,
    persisted: persistSucceeded,
    // Surface the "could not save" indication only when persistence failed.
    notifyFailure: !persistSucceeded,
  };
}

export default resolveTheme;
