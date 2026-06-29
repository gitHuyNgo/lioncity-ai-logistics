import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { resolveTheme, DARK_CLASS } from "@/lib/design/resolveTheme";

/**
 * ThemeToggle — a persistently visible, labeled control that switches the
 * active theme between exactly two states: light and dark (Requirement 3.1).
 *
 * Behavior:
 *   - Uses `next-themes` `useTheme()` to read/set the theme. The provider is
 *     mounted in `src/index.js` with `defaultTheme="light"` and
 *     `enableSystem={false}`, so when nothing is stored the effective theme is
 *     LIGHT and there is no "system" option (Requirement 3.5, updated).
 *   - Selecting a theme applies it immediately and `next-themes` persists the
 *     choice to `localStorage` so it is reapplied next session (Requirement
 *     3.2, 3.3).
 *   - Keyboard operable: it renders a real shadcn `Button` (`<button>`), so it
 *     is focusable and activatable with Enter/Space, and carries an
 *     `aria-label` describing the action it performs (Requirement 7.x).
 *   - Token-only styling: colors come from the shadcn `Button` ghost variant
 *     (`--accent`, `--foreground`, `--ring`); no raw hex values.
 *   - Icons are lucide `Sun`/`Moon`, marked `aria-hidden` since the accessible
 *     name is provided by `aria-label`.
 *
 * @param {{ className?: string }} props
 */
export function ThemeToggle({ className } = {}) {
  const { theme, setTheme } = useTheme();

  // `next-themes` returns `undefined` for `theme` until the component has
  // mounted on the client. Track mount so the first paint reflects the real
  // theme without assuming a value (avoids a flash / hydration mismatch).
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Determine whether the dark theme is currently effective. We reuse the
  // deterministic `resolveTheme` helper so this decision stays consistent with
  // the rest of the theme wiring. `enableSystem` is false, so the OS
  // preference argument is irrelevant and passed as `false`.
  const isDark = mounted && resolveTheme(theme, false) === DARK_CLASS;

  const nextTheme = isDark ? "light" : "dark";
  const label = `Switch to ${nextTheme} theme`;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      onClick={() => setTheme(nextTheme)}
      className={className}
    >
      {isDark ? (
        <Sun aria-hidden="true" focusable="false" />
      ) : (
        <Moon aria-hidden="true" focusable="false" />
      )}
    </Button>
  );
}

export default ThemeToggle;
