/**
 * Property test: Token completeness (Property 1).
 *
 * Validates: Requirements 1.1, 1.2
 *
 * Every custom-property (`--token`) name defined in the light token set
 * (the `:root` block of tokens.css) must also be defined in the dark token
 * set (the `.dark` block) and vice versa. In other words, the two sets of
 * token names must be exactly equal — no token may exist in one theme but be
 * missing from the other, otherwise that token would fail to resolve when the
 * corresponding theme is active.
 *
 * The source of truth is parsed directly from src/styles/tokens.css on disk so
 * the test reflects the real token definitions, not a duplicated copy.
 */

const fs = require("fs");
const path = require("path");
const fc = require("fast-check");

const TOKENS_CSS_PATH = path.resolve(__dirname, "..", "..", "..", "styles", "tokens.css");

/**
 * Extract the body of the first CSS rule whose selector exactly matches the
 * given selector (e.g. ":root" or ".dark"). Returns the text between the
 * matching `{` and its closing `}`.
 */
function extractBlock(css, selector) {
  // Find "<selector> {" allowing arbitrary whitespace around the selector.
  const selectorRegex = new RegExp(`(^|})\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{`, "m");
  const match = selectorRegex.exec(css);
  if (!match) {
    throw new Error(`Could not find "${selector}" block in tokens.css`);
  }
  const openBraceIndex = css.indexOf("{", match.index);
  // Walk forward to find the matching closing brace (these blocks are flat,
  // no nesting, so the first unbalanced "}" closes the rule).
  let depth = 0;
  for (let i = openBraceIndex; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}") {
      depth--;
      if (depth === 0) {
        return css.slice(openBraceIndex + 1, i);
      }
    }
  }
  throw new Error(`Unterminated "${selector}" block in tokens.css`);
}

/**
 * Collect the set of CSS custom-property names (e.g. "--primary") declared in
 * a CSS block body.
 */
function extractTokenNames(blockBody) {
  const names = new Set();
  const declRegex = /(--[A-Za-z0-9-]+)\s*:/g;
  let m;
  while ((m = declRegex.exec(blockBody)) !== null) {
    names.add(m[1]);
  }
  return names;
}

const css = fs.readFileSync(TOKENS_CSS_PATH, "utf8");
const lightTokens = extractTokenNames(extractBlock(css, ":root"));
const darkTokens = extractTokenNames(extractBlock(css, ".dark"));

describe("tokens.css completeness", () => {
  it("parses at least one token from each theme block (sanity)", () => {
    expect(lightTokens.size).toBeGreaterThan(0);
    expect(darkTokens.size).toBeGreaterThan(0);
  });

  // Property 1: Token completeness — set equality between light and dark.
  it("Property 1: every light token exists in dark and vice versa", () => {
    const lightArray = [...lightTokens];
    const darkArray = [...darkTokens];

    // Property over the light set: each light token is present in dark.
    fc.assert(
      fc.property(fc.constantFrom(...lightArray), (token) => {
        expect(darkTokens.has(token)).toBe(true);
      })
    );

    // Property over the dark set: each dark token is present in light.
    fc.assert(
      fc.property(fc.constantFrom(...darkArray), (token) => {
        expect(lightTokens.has(token)).toBe(true);
      })
    );

    // Explicit set-equality assertion with readable diff on failure.
    const missingFromDark = lightArray.filter((t) => !darkTokens.has(t));
    const missingFromLight = darkArray.filter((t) => !lightTokens.has(t));
    expect({ missingFromDark, missingFromLight }).toEqual({
      missingFromDark: [],
      missingFromLight: [],
    });
  });
});
