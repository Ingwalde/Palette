import { getStoredUser } from "./authStorage.js";

const ROUTE_TO_NAV_SELECTOR = {
  "index.html": 'a[href="index.html"]',
  "favorites.html": 'a[href="favorites.html"]',
  "export.html": 'a[href="export.html"]',
  "admin.html": 'a[href="admin.html"]',
  "login.html": "[data-auth-nav]",
  "profile.html": "[data-auth-nav]"
};

const PAGES_WITHOUT_ACTIVE_NAV = new Set([
  "changelog.html"
]);

export function initAuthNav() {
  const nav = document.querySelector(".site-nav");
  const authButton = document.querySelector("[data-auth-nav]");
  const user = getStoredUser();

  syncAuthButton(authButton, user);
  syncAdminNavVisibility(user);
  syncActiveNavItem(nav, user);
  initSlidingNavIndicator(nav);
}

function syncAuthButton(authButton, user) {
  if (!authButton) {
    return;
  }

  if (user) {
    authButton.textContent = "Account";
    authButton.setAttribute("aria-label", `Open account for ${user.username}`);

    authButton.addEventListener("click", () => {
      setActiveNavItem(authButton.closest(".site-nav"), authButton);
      updateNavIndicator(authButton.closest(".site-nav"));

      window.setTimeout(() => {
        window.location.href = "profile.html";
      }, 160);
    });

    return;
  }

  authButton.textContent = "Login";
  authButton.setAttribute("aria-label", "Go to login page");

  authButton.addEventListener("click", () => {
    setActiveNavItem(authButton.closest(".site-nav"), authButton);
    updateNavIndicator(authButton.closest(".site-nav"));

    window.setTimeout(() => {
      window.location.href = "login.html";
    }, 160);
  });
}

function syncAdminNavVisibility(user) {
  const isAdmin = Boolean(user?.is_admin);

  document.querySelectorAll('.site-nav__link[href$="admin.html"]').forEach((link) => {
    if (isAdmin) {
      link.hidden = false;
      link.classList.add("site-nav__link--admin-visible");
      return;
    }

    link.hidden = true;
    link.classList.remove("site-nav__link--admin-visible");
    link.classList.remove("site-nav__link--active");
  });
}

function syncActiveNavItem(nav, user) {
  if (!nav) {
    return;
  }

  clearActiveNavItems(nav);

  const currentPage = getCurrentPageName();

  if (PAGES_WITHOUT_ACTIVE_NAV.has(currentPage)) {
    return;
  }

  const selector = ROUTE_TO_NAV_SELECTOR[currentPage];

  if (!selector) {
    return;
  }

  const activeItem = nav.querySelector(selector);

  if (!activeItem || activeItem.hidden || activeItem.offsetParent === null) {
    return;
  }

  if (currentPage === "login.html" && user) {
    return;
  }

  if (currentPage === "profile.html" && !user) {
    return;
  }

  activeItem.classList.add("site-nav__link--active");
}

function initSlidingNavIndicator(nav) {
  if (!nav) {
    return;
  }

  let indicator = nav.querySelector(".site-nav__indicator");

  if (!indicator) {
    indicator = document.createElement("span");
    indicator.className = "site-nav__indicator";
    indicator.setAttribute("aria-hidden", "true");
    nav.prepend(indicator);
  }

  nav.querySelectorAll(".site-nav__link").forEach((item) => {
    item.addEventListener("click", () => {
      if (item.hidden) {
        return;
      }

      setActiveNavItem(nav, item);
      updateNavIndicator(nav);
    });
  });

  scheduleNavIndicatorUpdate(nav);

  window.addEventListener("resize", () => {
    scheduleNavIndicatorUpdate(nav);
  });

  window.addEventListener("load", () => {
    scheduleNavIndicatorUpdate(nav);
  });

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      scheduleNavIndicatorUpdate(nav);
    });
  }
}

function scheduleNavIndicatorUpdate(nav) {
  updateNavIndicator(nav, false);

  requestAnimationFrame(() => {
    updateNavIndicator(nav, false);

    requestAnimationFrame(() => {
      updateNavIndicator(nav, false);
    });
  });
}

function updateNavIndicator(nav, animated = true) {
  if (!nav) {
    return;
  }

  const activeItem = getActiveNavItem(nav);
  const indicator = nav.querySelector(".site-nav__indicator");

  if (!activeItem || !indicator) {
    nav.classList.remove("site-nav--ready");
    return;
  }

  moveNavIndicatorTo(activeItem, animated);
  nav.classList.add("site-nav--ready");
}

function getActiveNavItem(nav) {
  return [...nav.querySelectorAll(".site-nav__link--active")]
    .find((item) => !item.hidden && item.offsetParent !== null);
}

function clearActiveNavItems(nav) {
  nav.querySelectorAll(".site-nav__link--active").forEach((item) => {
    item.classList.remove("site-nav__link--active");
  });
}

function setActiveNavItem(nav, activeItem) {
  if (!nav || !activeItem) {
    return;
  }

  clearActiveNavItems(nav);
  activeItem.classList.add("site-nav__link--active");
}

function moveNavIndicatorTo(target, animated = true) {
  const nav = target?.closest(".site-nav");
  const indicator = nav?.querySelector(".site-nav__indicator");

  if (!nav || !indicator || !target || target.hidden || target.offsetParent === null) {
    return;
  }

  if (!animated) {
    indicator.style.transition = "none";
  }

  const navRect = nav.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const x = targetRect.left - navRect.left;
  const y = targetRect.top - navRect.top;

  indicator.style.setProperty("--nav-indicator-x", `${x}px`);
  indicator.style.setProperty("--nav-indicator-y", `${y}px`);
  indicator.style.setProperty("--nav-indicator-width", `${targetRect.width}px`);
  indicator.style.setProperty("--nav-indicator-height", `${targetRect.height}px`);

  if (!animated) {
    requestAnimationFrame(() => {
      indicator.style.transition = "";
    });
  }
}

function getCurrentPageName() {
  const pageName = window.location.pathname.split("/").pop();

  return pageName || "index.html";
}

initAuthNav();
