const fs = require("fs");
const path = require("path");

const { AA_LARGE, AA_NORMAL, contrastRatio } = require("../contrast");

const TOKENS_CSS_PATH = path.resolve(__dirname, "..", "..", "..", "styles", "tokens.css");

const BODY_TEXT_PAIRS = [
  ["--foreground", "--background"],
  ["--card-foreground", "--card"],
  ["--popover-foreground", "--popover"],
  ["--primary-foreground", "--primary"],
  ["--secondary-foreground", "--secondary"],
  ["--accent-foreground", "--accent"],
  ["--muted-foreground", "--background"],
];

const EXCLUDED_BODY_TEXT_PAIRS = [
  ["--destructive-foreground", "--destructive"],
];

function extractBlock(css, selector) {
  const selectorRegex = new RegExp(`(^|})\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{`, "m");
  const match = selectorRegex.exec(css);
  if (!match) {
    throw new Error(`Could not find "${selector}" block in tokens.css`);
  }

  const openBraceIndex = css.indexOf("{", match.index);
  let depth = 0;
  for (let i = openBraceIndex; i < css.length; i++) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        return css.slice(openBraceIndex + 1, i);
      }
    }
  }
  throw new Error(`Unterminated "${selector}" block in tokens.css`);
}

function extractTokens(blockBody) {
  const tokens = {};
  const declRegex = /(--[A-Za-z0-9-]+)\s*:\s*([^;]+);/g;
  let match;
  while ((match = declRegex.exec(blockBody)) !== null) {
    tokens[match[1]] = match[2].replace(/\/\*.*?\*\//g, "").trim();
  }
  return tokens;
}

const css = fs.readFileSync(TOKENS_CSS_PATH, "utf8");
const themes = {
  light: extractTokens(extractBlock(css, ":root")),
  dark: extractTokens(extractBlock(css, ".dark")),
};

describe("token contrast pairings", () => {
  it("Property 6: documented body text pairs meet WCAG AA in light and dark", () => {
    for (const [themeName, tokens] of Object.entries(themes)) {
      for (const [fgToken, bgToken] of BODY_TEXT_PAIRS) {
        const ratio = contrastRatio(tokens[fgToken], tokens[bgToken]);
        expect({
          themeName,
          fgToken,
          bgToken,
          ratio: Number(ratio.toFixed(2)),
        }).toEqual(
          expect.objectContaining({
            ratio: expect.any(Number),
          })
        );
        expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);
      }
    }
  });

  it("documents excluded body-text pairs that do not meet the 4.5:1 threshold", () => {
    const failingPairs = [];
    for (const [themeName, tokens] of Object.entries(themes)) {
      for (const [fgToken, bgToken] of EXCLUDED_BODY_TEXT_PAIRS) {
        const ratio = contrastRatio(tokens[fgToken], tokens[bgToken]);
        if (ratio < AA_NORMAL) {
          failingPairs.push({ themeName, fgToken, bgToken });
        }
        expect(ratio).toBeGreaterThanOrEqual(AA_LARGE);
      }
    }

    expect(failingPairs).toEqual([
      {
        themeName: "dark",
        fgToken: "--destructive-foreground",
        bgToken: "--destructive",
      },
    ]);
  });
});
