import { buildClusterIcon, buildMarkerIcon } from "../markerStyles";
import { MAP_ATTRIBUTION, mapTheme } from "../mapTheme";

describe("mapTheme", () => {
  it("returns the light CARTO tiles for non-dark themes", () => {
    for (const theme of [undefined, null, "", "light", "system"]) {
      expect(mapTheme(theme)).toEqual({
        variant: "light_all",
        url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        attribution: MAP_ATTRIBUTION,
        isDark: false,
      });
    }
  });

  it("returns the dark CARTO tiles for dark theme values", () => {
    expect(mapTheme(" dark ")).toEqual({
      variant: "dark_all",
      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      attribution: MAP_ATTRIBUTION,
      isDark: true,
    });
  });
});

describe("markerStyles", () => {
  it("buildMarkerIcon is total and returns tokenized divIcons with non-color cues", () => {
    const cases = [
      ["hub", { isDefault: true }],
      ["order", { status: "pending" }],
      ["order", { status: "delivering" }],
      ["order", { status: "delivered" }],
      ["order", { status: "failed" }],
      ["driver", { initial: "A" }],
      ["incident", {}],
      ["unknown", {}],
      [null, {}],
    ];

    for (const [kind, opts] of cases) {
      const icon = buildMarkerIcon(kind, opts);
      expect(icon.options.className).toContain("lc-marker");
      expect(icon.options.html).toContain("hsl(var(");
      expect(icon.options.html).toMatch(/<svg|>[A-Z]</);
      expect(icon.options.iconSize).toBeDefined();
      expect(icon.options.iconAnchor).toBeDefined();
    }
  });

  it("buildClusterIcon returns bucketed tokenized cluster icons", () => {
    expect(buildClusterIcon(3).options.className).toContain("lc-cluster--small");
    expect(buildClusterIcon(10).options.className).toContain("lc-cluster--medium");
    expect(buildClusterIcon(100).options.className).toContain("lc-cluster--large");
    expect(buildClusterIcon(undefined).options.html).toContain(">0<");

    const icon = buildClusterIcon(42);
    expect(icon.options.html).toContain("hsl(var(--primary))");
    expect(icon.options.html).toContain("42");
    expect(icon.options.iconSize).toEqual([44, 44]);
  });
});
