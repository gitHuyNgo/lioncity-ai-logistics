const fs = require("fs");
const path = require("path");

const SRC = path.resolve(__dirname, "..");

const BATCH_A_FILES = [
  "pages/Overview.jsx",
  "pages/Auth.jsx",
  "pages/Drivers.jsx",
  "pages/Vehicles.jsx",
];

const BATCH_B_FILES = [
  "pages/Orders.jsx",
  "pages/HubManagers.jsx",
  "pages/Zones.jsx",
  "pages/Hubs.jsx",
  "pages/Shipper.jsx",
];

function read(relPath) {
  return fs.readFileSync(path.join(SRC, relPath), "utf8");
}

function rawHexInStyleOrClass(source) {
  const offenders = [];
  const regex = /(className\s*=\s*(?:"[^"]*"|\{`[^`]*`\}|\{[^}]*\})|style\s*=\s*\{\{[\s\S]*?\}\})/g;
  let match;
  while ((match = regex.exec(source)) !== null) {
    if (/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/.test(match[1])) {
      offenders.push(match[1].slice(0, 160));
    }
  }
  return offenders;
}

describe("migrated page token compliance", () => {
  it("Property 2: batch-A migrated files do not hardcode raw hex in style/className", () => {
    const offenders = {};
    for (const file of BATCH_A_FILES) {
      const found = rawHexInStyleOrClass(read(file));
      if (found.length) offenders[file] = found;
    }
    expect(offenders).toEqual({});
  });

  it("Property 2: batch-B migrated files do not hardcode raw hex in style/className", () => {
    const offenders = {};
    for (const file of BATCH_B_FILES) {
      const found = rawHexInStyleOrClass(read(file));
      if (found.length) offenders[file] = found;
    }
    expect(offenders).toEqual({});
  });
});

describe("focus, reduced motion, and responsive integrity", () => {
  it("Property 8/9: global CSS defines visible focus rings and reduced-motion handling", () => {
    const css = read("index.css");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("outline: 2px solid hsl(var(--ring))");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("animation: none !important");
  });

  it("Property 7: shell and route-planning surfaces use responsive overflow-safe layouts", () => {
    const appShell = read("components/layout/AppShell.jsx");
    const routing = read("pages/Routing.jsx");
    const dataTable = read("components/composite/DataTable.jsx");

    expect(appShell).toContain("overflow-hidden");
    expect(appShell).toContain("min-w-0");
    expect(dataTable).toContain("overflow-x-auto");
    expect(routing).toContain("lg:grid-cols-[1fr_360px]");
  });
});

describe("legacy shim retirement", () => {
  it("task 11.1: index.css no longer defines legacy card/button/table/stat shims", () => {
    const css = read("index.css");
    expect(css).not.toMatch(/^\.(card|btn|tbl|stat)\b/m);
    expect(css).not.toContain("RESIDUAL LEGACY-CLASS COMPATIBILITY");
  });
});
