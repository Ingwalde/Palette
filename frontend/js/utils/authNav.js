import { getStoredUser } from "./authStorage.js";

export function initAuthNav() {
  syncAdminNavVisibility();

  const authButton = document.querySelector("[data-auth-nav]");

  if (authButton) {
    const user = getStoredUser();

    if (user) {
      authButton.textContent = "Account";
      authButton.setAttribute("aria-label", `Open account for ${user.username}`);

      if (window.location.pathname.endsWith("profile.html")) {
        authButton.classList.add("site-nav__link--active");
      } else {
        authButton.classList.remove("site-nav__link--active");
      }

      authButton.addEventListener("click", () => {
        moveNavIndicatorTo(authButton);
        window.setTimeout(() => {
          window.location.href = "profile.html";
        }, 160);
      });
    } else {
      authButton.textContent = "Login";
      authButton.setAttribute("aria-label", "Go to login page");

      if (window.location.pathname.endsWith("login.html")) {
        authButton.classList.add("site-nav__link--active");
      } else {
        authButton.classList.remove("site-nav__link--active");
      }

      authButton.addEventListener("click", () => {
        moveNavIndicatorTo(authButton);
        window.setTimeout(() => {
          window.location.href = "login.html";
        }, 160);
      });
    }
  }

  initSlidingNavIndicator();
}

function syncAdminNavVisibility() {
  const user = getStoredUser();
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

function initSlidingNavIndicator() {
  const nav = document.querySelector(".site-nav");

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

  const activeItem = getActiveNavItem(nav) || getFirstVisibleNavItem(nav);

  if (activeItem) {
    moveNavIndicatorTo(activeItem, false);
  }

  requestAnimationFrame(() => {
    nav.classList.add("site-nav--ready");
  });

  nav.querySelectorAll(".site-nav__link").forEach((item) => {
    item.addEventListener("click", () => {
      if (item.hidden) {
        return;
      }

      setActiveNavItem(nav, item);
      moveNavIndicatorTo(item);
    });
  });

  window.addEventListener("resize", () => {
    const currentActiveItem = getActiveNavItem(nav) || getFirstVisibleNavItem(nav);

    if (currentActiveItem) {
      moveNavIndicatorTo(currentActiveItem, false);
    }
  });
}

function getActiveNavItem(nav) {
  return [...nav.querySelectorAll(".site-nav__link--active")]
    .find((item) => !item.hidden && item.offsetParent !== null);
}

function getFirstVisibleNavItem(nav) {
  return [...nav.querySelectorAll(".site-nav__link")]
    .find((item) => !item.hidden && item.offsetParent !== null);
}

function setActiveNavItem(nav, activeItem) {
  nav.querySelectorAll(".site-nav__link--active").forEach((item) => {
    item.classList.remove("site-nav__link--active");
  });

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

initAuthNav();
