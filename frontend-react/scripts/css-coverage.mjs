/**
 * Reports selectors in styles/vanilla/*.css that look unused. Reports only — deletes nothing.
 *
 *   npm run css:report                 # writes docs/css-dead-report.md
 *
 * Two independent signals, because neither is trustworthy alone:
 *
 *   1. Runtime CSS coverage from Chromium, collected while walking every route and the same
 *      interaction states the visual baselines capture. Authoritative about what DID match,
 *      but it only ever sees the states the walk reaches — a class used in one rare branch
 *      looks dead here.
 *   2. A literal search for the class name across src/**. Catches classes the walk never
 *      reached, including ones assembled in template strings, at the cost of false "alive"
 *      hits from comments or unrelated words.
 *
 * A selector is only listed as a strong candidate when BOTH say it is unused. Anything the
 * two disagree about is listed separately, for a human to judge.
 */
import { chromium } from "playwright";
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:4173";
const OUT = join(ROOT, "..", "docs", "css-dead-report.md");

const ADMIN = {
  id: 1,
  username: "admin",
  email: "admin@example.com",
  is_admin: true,
  email_verified: true,
  created_at: "2026-01-01T00:00:00Z",
};
const PALETTES = {
  items: [
    {
      id: 1,
      slug: "sea-breeze",
      name: "Sea Breeze",
      description: "Fresh blue and green colors inspired by the sea.",
      colors: ["#006D77", "#0F9199", "#83C5BE", "#EDE7C8"],
      tags: ["cold", "sea", "calm"],
      created_at: "",
      updated_at: "",
    },
  ],
  total: 1,
  limit: 100,
  offset: 0,
};
const TAGS = [
  { name: "cold", kind: "free", count: 1 },
  { name: "warm", kind: "purpose", count: 1 },
];

async function stub(page, loggedIn) {
  await page.route("**/api/v1/palettes*", (r) => r.fulfill({ json: PALETTES }));
  await page.route("**/api/v1/tags", (r) => r.fulfill({ json: TAGS }));
  await page.route("**/api/v1/favorites", (r) => r.fulfill({ json: PALETTES.items }));
  await page.route("**/api/v1/favorites/keys", (r) =>
    r.fulfill({ json: ["sea-breeze"] }),
  );
  await page.route("**/api/v1/auth/verify*", (r) =>
    r.fulfill({ status: 400, json: { detail: "Invalid link" } }),
  );
  await page.route("**/api/v1/auth/me", (r) =>
    loggedIn
      ? r.fulfill({ json: ADMIN })
      : r.fulfill({ status: 401, json: { detail: "no" } }),
  );
}

const ROUTES = [
  ["/", false],
  ["/login", false],
  ["/favorites", false],
  ["/export", false],
  ["/changelog", false],
  ["/forgot-password", false],
  ["/reset-password?token=x", false],
  ["/verify?token=x", false],
  ["/no-such-page", false],
  ["/profile", true],
  ["/admin", true],
];

/** Extra states that only exist after a click; these are invisible to a plain route walk. */
async function exerciseInteractions(page, path) {
  if (path === "/") {
    await page
      .getByRole("button", { name: "Sort palettes" })
      .click()
      .catch(() => {});
  }
  if (path === "/login") {
    await page
      .locator(".password-toggle")
      .first()
      .click()
      .catch(() => {});
  }
  await page.waitForTimeout(150);
}

/** Selector text -> covered?, accumulated across every page visit. */
async function collectCoverage() {
  const browser = await chromium.launch();
  const covered = new Set();
  const seen = new Set();

  for (const [path, loggedIn] of ROUTES) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await stub(page, loggedIn);
    await page.coverage.startCSSCoverage();
    await page.goto(BASE_URL + path, { waitUntil: "networkidle" });
    await exerciseInteractions(page, path);
    const entries = await page.coverage.stopCSSCoverage();

    for (const entry of entries) {
      if (!entry.text) continue;
      for (const { selector, start, end } of parseRules(entry.text)) {
        seen.add(selector);
        const used = entry.ranges.some((r) => r.start < end && r.end > start);
        if (used) covered.add(selector);
      }
    }
    await page.close();
  }

  await browser.close();
  return { covered, seen };
}

/**
 * Minimal rule splitter: enough to map a selector to its byte range so coverage ranges can be
 * matched against it. Nested at-rules (@media) are walked into rather than treated as one rule,
 * otherwise a single used rule marks the whole block alive.
 */
function parseRules(text) {
  const rules = [];
  let depth = 0;
  let selectorStart = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") {
      if (depth === 0) {
        const selector = text.slice(selectorStart, i).trim();
        if (selector && !selector.startsWith("@")) {
          const close = matchBrace(text, i);
          rules.push({ selector, start: selectorStart, end: close });
          i = close;
          selectorStart = i + 1;
          continue;
        }
        // At-rule: descend so its inner rules are measured individually.
        selectorStart = i + 1;
      }
      depth++;
    } else if (ch === "}") {
      depth = Math.max(0, depth - 1);
      selectorStart = i + 1;
    }
  }
  return rules;
}

function matchBrace(text, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return text.length - 1;
}

/**
 * Class names mentioned anywhere in the source, plus the prefixes of names that are completed
 * at runtime.
 *
 * `tag-badge--${tag.kind}` never contains the literal `tag-badge--free`, so a plain word
 * search declares that rule dead when it is not. Collecting the fragment immediately before
 * each `${` lets the caller treat any class starting with it as possibly-alive.
 */
async function classNamesInSource() {
  const words = new Set();
  const dynamicPrefixes = new Set();

  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        const text = await readFile(full, "utf8");
        for (const m of text.matchAll(/[\w-]+/g)) words.add(m[0]);
        for (const literal of text.matchAll(/`([^`]*)`/g)) {
          // Drop escape sequences first: the `n` of a `\n` immediately before an
          // interpolation reads as a one-letter prefix that then matches every class.
          const body = literal[1].replace(/\\./g, " ");
          for (const m of body.matchAll(/([a-zA-Z][\w-]*)\$\{/g)) {
            // Only BEM-ish fragments. A prefix with no separator is almost never a partial
            // class name, and a short one matches far too much.
            if (/[-_]/.test(m[1])) dynamicPrefixes.add(m[1]);
          }
        }
      }
    }
  };

  await walk(join(ROOT, "src"));
  return { words, dynamicPrefixes };
}

function classesOf(selector) {
  return [...selector.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map((m) => m[1]);
}

const { covered, seen } = await collectCoverage();
const { words, dynamicPrefixes } = await classNamesInSource();

const isDynamic = (name) => [...dynamicPrefixes].some((p) => name.startsWith(p));

const both = [];
const disagree = [];

for (const selector of [...seen].sort()) {
  if (covered.has(selector)) continue;
  const classes = classesOf(selector);
  // A selector with no class at all (element or pseudo) is not judged here.
  if (classes.length === 0) continue;
  const inSource = classes.some((c) => words.has(c) || isDynamic(c));
  (inSource ? disagree : both).push({ selector, classes });
}

const lines = [
  "# Unused CSS report",
  "",
  "Generated by `frontend-react/scripts/css-coverage.mjs`. **Nothing here has been deleted.**",
  "",
  `Rules examined: ${seen.size}. Matched at runtime: ${covered.size}.`,
  "",
  "## Strong candidates — unused at runtime *and* absent from the source",
  "",
  both.length ? "| Selector | Classes |\n| --- | --- |" : "_None._",
  ...both.map((r) => `| \`${r.selector}\` | ${r.classes.join(", ")} |`),
  "",
  "## Needs a human — unused at runtime but the class appears in the source",
  "",
  "Usually a state the walk never reached (an error branch, an admin-only view), so treat",
  "these as alive unless you can show otherwise.",
  "",
  disagree.length ? "| Selector | Classes |\n| --- | --- |" : "_None._",
  ...disagree.map((r) => `| \`${r.selector}\` | ${r.classes.join(", ")} |`),
  "",
];

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, lines.join("\n"), "utf8");
console.log(
  `${both.length} strong candidates, ${disagree.length} to review -> ${relative(process.cwd(), OUT)}`,
);
