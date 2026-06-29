import fc from "fast-check";

import { chartTheme, FALLBACK_CHART_THEME } from "../chartTheme";
import { buildNav, getNavForRole, NAV_CONFIG } from "../nav.config";
import {
  applyThemeSelection,
  initialTheme,
  resolveTheme,
  THEME_PREFERENCES,
} from "../resolveTheme";
import { DEFAULT_STATUS, STATUS_MAP, statusToVariant } from "../statusMap";

describe("statusToVariant", () => {
  it("Property 4: is total for arbitrary input and always returns an icon", () => {
    fc.assert(
      fc.property(fc.anything(), (value) => {
        const visual = statusToVariant(value);
        expect(visual).toBeDefined();
        expect(visual.variant).toBeDefined();
        expect(visual.label).toEqual(expect.any(String));
        expect(visual.icon).toBeDefined();
        expect(visual.tokenBg).toEqual(expect.any(String));
        expect(visual.tokenFg).toEqual(expect.any(String));
        expect(visual.tokenBorder).toEqual(expect.any(String));
      })
    );
  });

  it("normalizes case and dashes, and falls back to pending", () => {
    expect(statusToVariant("OFF-DUTY")).toBe(STATUS_MAP.off_duty);
    expect(statusToVariant(" delivering ")).toBe(STATUS_MAP.delivering);
    expect(statusToVariant("unknown-status")).toBe(STATUS_MAP[DEFAULT_STATUS]);
  });
});

describe("role navigation", () => {
  const allItems = NAV_CONFIG.flatMap((group) => group.items);

  it("Property 3: preserves order and only returns role-permitted items", () => {
    fc.assert(
      fc.property(fc.constantFrom("super_admin", "hub_manager", "shipper", "guest", "", null), (role) => {
        const nav = buildNav(NAV_CONFIG, role);
        const outputItems = nav.flatMap((group) => group.items);

        expect(nav.every((group) => group.items.length > 0)).toBe(true);
        expect(outputItems.every((item) => item.roles.includes(role))).toBe(true);

        const inputOrder = new Map(allItems.map((item, index) => [item.to, index]));
        const outputIndexes = outputItems.map((item) => inputOrder.get(item.to));
        expect(outputIndexes).toEqual([...outputIndexes].sort((a, b) => a - b));
      })
    );
  });

  it("matches the preserved App.js role visibility contract", () => {
    expect(getNavForRole("super_admin").flatMap((g) => g.items.map((i) => i.to))).toEqual([
      "/",
      "/routing",
      "/orders",
      "/drivers",
      "/vehicles",
      "/zones",
      "/hubs",
      "/hub-managers",
      "/shipper",
    ]);

    expect(getNavForRole("hub_manager").flatMap((g) => g.items.map((i) => i.to))).toEqual([
      "/",
      "/routing",
      "/orders",
      "/drivers",
      "/vehicles",
      "/zones",
      "/hubs",
      "/shipper",
    ]);

    expect(getNavForRole("shipper").flatMap((g) => g.items.map((i) => i.to))).toEqual([
      "/",
      "/routing",
      "/shipper",
    ]);
  });
});

describe("chartTheme", () => {
  let getComputedStyleSpy;

  afterEach(() => {
    getComputedStyleSpy?.mockRestore();
    getComputedStyleSpy = undefined;
  });

  function mockRootStyle(values) {
    getComputedStyleSpy = jest.spyOn(window, "getComputedStyle").mockImplementation(() => ({
      getPropertyValue: (name) => values[name] ?? "",
    }));
  }

  it("returns concrete colors from defined tokens", () => {
    mockRootStyle({
      "--chart-1": "1 2% 3%",
      "--chart-2": "4 5% 6%",
      "--chart-3": "7 8% 9%",
      "--chart-4": "10 11% 12%",
      "--chart-5": "13 14% 15%",
      "--border": "16 17% 18%",
      "--muted-foreground": "19 20% 21%",
      "--popover": "22 23% 24%",
    });

    expect(chartTheme()).toEqual({
      series: [
        "hsl(1 2% 3%)",
        "hsl(4 5% 6%)",
        "hsl(7 8% 9%)",
        "hsl(10 11% 12%)",
        "hsl(13 14% 15%)",
      ],
      grid: "hsl(16 17% 18%)",
      axis: "hsl(19 20% 21%)",
      tooltipBg: "hsl(22 23% 24%)",
    });
  });

  it("falls back to brand defaults when vars are empty", () => {
    mockRootStyle({});
    expect(chartTheme()).toEqual({
      series: [...FALLBACK_CHART_THEME.series],
      grid: FALLBACK_CHART_THEME.grid,
      axis: FALLBACK_CHART_THEME.axis,
      tooltipBg: FALLBACK_CHART_THEME.tooltipBg,
    });
  });
});

describe("theme helpers", () => {
  it("Property 5: resolveTheme is deterministic for all supported preferences", () => {
    fc.assert(
      fc.property(fc.constantFrom(...THEME_PREFERENCES, "bad-value", "", null), fc.boolean(), (preference, systemPrefersDark) => {
        expect(resolveTheme(preference, systemPrefersDark)).toBe(resolveTheme(preference, systemPrefersDark));
      })
    );
  });

  it("defaults to light when no valid stored preference exists", () => {
    expect(initialTheme(undefined)).toBe("light");
    expect(initialTheme(null)).toBe("light");
    expect(initialTheme("bad-value")).toBe("light");
    expect(initialTheme("dark")).toBe("dark");
  });

  it("applies selected theme immediately while preserving stored value on persistence failure", () => {
    expect(applyThemeSelection("dark", "light", false, false)).toEqual({
      appliedClass: "dark",
      storedPreference: "light",
      persisted: false,
      notifyFailure: true,
    });

    expect(applyThemeSelection("light", "dark", true, true)).toEqual({
      appliedClass: "",
      storedPreference: "light",
      persisted: true,
      notifyFailure: false,
    });
  });
});
