// Lightweight SPA router for the main nav tabs. Intercepts clicks on the tab links,
// fetches the target page, swaps only <main> and <title>, and slides the nav indicator
// within the same document — so there is no full reload, no white flash, and no
// view-transition freeze. Login/Account and the footer Changelog link fall through to
// normal navigation.
import { activateNavForPath } from "./utils/authNav.js";
import { getStoredUser } from "./utils/authStorage.js";

// Only these pages are SPA-routed (they have a page module to (re)initialise).
const PAGE_MODULES = {
  "index.html": "./pages/home.js",
  "favorites.html": "./pages/favorites.js",
  "export.html": "./pages/export.js",
  "admin.html": "./pages/admin.js",
  "login.html": "./pages/login.js",
  "profile.html": "./pages/profile.js",
};

// Pages the router will SPA-navigate. Changelog has no page module (just a content
// swap); the rest re-run their module after the swap.
const ROUTABLE_PAGES = new Set([...Object.keys(PAGE_MODULES), "changelog.html"]);

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// The page transition is an opacity-only cross-fade (no movement), so it is safe to keep
// even under reduced-motion — just shorter — instead of an abrupt instant swap.
const FADE_MS = prefersReducedMotion ? 140 : 280;

function pageOf(pathname) {
  return pathname.split("/").pop() || "index.html";
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadPage(pathname, { push }) {
  const page = pageOf(pathname);
  const currentMain = document.querySelector("main");
  const animate = Boolean(currentMain);

  // Start fading the old content out immediately, while the fetch runs in parallel.
  if (animate) {
    currentMain.classList.add("spa-fade");
    void currentMain.offsetWidth; // commit the starting state before transitioning
    currentMain.classList.add("spa-fade--out");
  }

  let html;
  try {
    const [text] = await Promise.all([
      fetch(pathname, { headers: { "X-Requested-With": "spa" } }).then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.text();
      }),
      animate ? delay(FADE_MS) : Promise.resolve(),
    ]);
    html = text;
  } catch {
    window.location.href = pathname; // fall back to a full navigation
    return;
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  const newMain = doc.querySelector("main");

  if (!newMain || !currentMain) {
    window.location.href = pathname;
    return;
  }

  // Insert the new content already faded out, then fade it in on the next frame.
  if (animate) {
    newMain.classList.add("spa-fade", "spa-fade--out");
  }
  currentMain.replaceWith(newMain);
  document.title = doc.title;
  // Sync body class so page-scoped styles (e.g. .auth-page) apply after an SPA swap.
  document.body.className = doc.body.className;

  if (animate) {
    void newMain.offsetWidth;
    requestAnimationFrame(() => newMain.classList.remove("spa-fade--out"));
  }

  if (push) {
    history.pushState({ spa: true }, "", pathname);
  }
  window.scrollTo({ top: 0 });

  activateNavForPath(pathname);

  // Re-run the page module against the freshly swapped DOM. The cache-buster forces a
  // fresh module instance so its top-level init runs again; the utility modules it
  // statically imports keep their normal URLs and stay singletons.
  const mod = PAGE_MODULES[page];
  if (mod) {
    try {
      await import(/* @vite-ignore */ `${mod}?v=${Date.now()}`);
    } catch (error) {
      console.error("SPA page init failed:", error);
    }
  }
}

function isRoutableLink(link) {
  if (!link) return false;
  if (link.target === "_blank") return false;
  const href = link.getAttribute("href");
  if (!href) return false;
  const url = new URL(href, location.href);
  if (url.origin !== location.origin) return false;
  return ROUTABLE_PAGES.has(pageOf(url.pathname));
}

document.addEventListener("click", (event) => {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }

  const link = event.target.closest("a[href]");
  if (!isRoutableLink(link)) {
    return;
  }

  const url = new URL(link.getAttribute("href"), location.href);
  if (url.pathname === location.pathname) {
    // Same page: let the browser handle in-page anchor scrolling (e.g. #palettes);
    // only block a same-page link with no hash to avoid a pointless reload.
    if (!url.hash) {
      event.preventDefault();
    }
    return;
  }

  event.preventDefault();
  loadPage(url.pathname, { push: true });
});

// The Account/Login tab is a <button data-auth-nav>, not an anchor. Intercept it in the
// capture phase and SPA-navigate to profile (logged in) or login (guest), stopping
// authNav's own full-page redirect for this click.
document.addEventListener(
  "click",
  (event) => {
    const authButton = event.target.closest("[data-auth-nav]");
    if (!authButton) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    const target = getStoredUser() ? "profile.html" : "login.html";
    if (pageOf(location.pathname) === target) {
      return;
    }

    loadPage(`/${target}`, { push: true });
  },
  true // capture: run before authNav's bubble-phase handler on the button
);

// Custom search clear button: reset the target input and refresh its results.
document.addEventListener("click", (event) => {
  const clearButton = event.target.closest(".search-clear");
  if (!clearButton) {
    return;
  }

  event.preventDefault();
  const input = document.getElementById(clearButton.getAttribute("data-clear-target"));
  if (!input) {
    return;
  }

  input.value = "";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.focus();
});

window.addEventListener("popstate", () => {
  loadPage(location.pathname, { push: false });
});
