const ENHANCED_CLASS = "native-select--enhanced";
const WRAPPER_CLASS = "custom-select";

let globalListenersInitialized = false;

export function initCustomSelects(root = document) {
  const selects = [...root.querySelectorAll(`select.select:not(.${ENHANCED_CLASS})`)];
  selects.forEach(enhanceSelect);
  initGlobalListeners();
}

export function syncCustomSelect(select) {
  if (!select) return;

  const wrapper = select.nextElementSibling;
  if (!wrapper?.classList.contains(WRAPPER_CLASS)) return;

  const label = wrapper.querySelector(".custom-select__label");
  const optionButtons = [...wrapper.querySelectorAll(".custom-select__option")];
  const selectedOption = select.options[select.selectedIndex];

  if (label && selectedOption) {
    label.textContent = selectedOption.textContent;
  }

  optionButtons.forEach((button) => {
    const selected = button.dataset.value === select.value;
    button.classList.toggle("custom-select__option--selected", selected);
    button.setAttribute("aria-selected", String(selected));
  });
}

function enhanceSelect(select) {
  select.classList.add(ENHANCED_CLASS);

  const wrapper = document.createElement("div");
  wrapper.className = WRAPPER_CLASS;

  const button = document.createElement("button");
  button.className = "custom-select__button";
  button.type = "button";
  button.setAttribute("aria-haspopup", "listbox");
  button.setAttribute("aria-expanded", "false");

  const label = document.createElement("span");
  label.className = "custom-select__label";
  label.textContent = select.options[select.selectedIndex]?.textContent || "Select";

  const chevron = document.createElement("span");
  chevron.className = "custom-select__chevron";
  chevron.setAttribute("aria-hidden", "true");

  button.append(label, chevron);

  const menu = document.createElement("div");
  menu.className = "custom-select__menu";
  menu.setAttribute("role", "listbox");
  menu.hidden = true;

  [...select.options].forEach((option) => {
    const optionButton = document.createElement("button");
    optionButton.className = "custom-select__option";
    optionButton.type = "button";
    optionButton.textContent = option.textContent;
    optionButton.dataset.value = option.value;
    optionButton.setAttribute("role", "option");

    optionButton.addEventListener("click", () => {
      select.value = option.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      syncCustomSelect(select);
      closeSelect(wrapper);
      button.focus();
    });

    optionButton.addEventListener("keydown", (event) => {
      handleOptionKeydown(event, wrapper, button);
    });

    menu.append(optionButton);
  });

  button.addEventListener("click", (event) => {
    event.preventDefault();
    toggleSelect(wrapper);
  });

  button.addEventListener("keydown", (event) => {
    if (["Enter", " ", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      openSelect(wrapper);
      focusSelectedOption(wrapper);
    }

    if (event.key === "Escape") {
      closeSelect(wrapper);
    }
  });

  select.insertAdjacentElement("afterend", wrapper);
  wrapper.append(button, menu);
  syncCustomSelect(select);
}

function initGlobalListeners() {
  if (globalListenersInitialized) return;

  document.addEventListener("click", (event) => {
    if (!event.target.closest(`.${WRAPPER_CLASS}`)) {
      closeAllSelects();
    }
  });

  window.addEventListener("resize", closeAllSelects);
  globalListenersInitialized = true;
}

function toggleSelect(wrapper) {
  if (wrapper.classList.contains("custom-select--open")) {
    closeSelect(wrapper);
  } else {
    openSelect(wrapper);
  }
}

function openSelect(wrapper) {
  closeAllSelects(wrapper);
  wrapper.classList.add("custom-select--open");
  wrapper.querySelector(".custom-select__button")?.setAttribute("aria-expanded", "true");
  const menu = wrapper.querySelector(".custom-select__menu");
  if (menu) {
    menu.hidden = false;
    menu.style.display = "grid";
  }
}

function closeSelect(wrapper) {
  wrapper.classList.remove("custom-select--open");
  wrapper.querySelector(".custom-select__button")?.setAttribute("aria-expanded", "false");
  const menu = wrapper.querySelector(".custom-select__menu");
  if (menu) {
    menu.hidden = true;
    menu.style.display = "none";
  }
}

function closeAllSelects(exceptWrapper = null) {
  document.querySelectorAll(`.${WRAPPER_CLASS}`).forEach((wrapper) => {
    if (wrapper !== exceptWrapper) {
      closeSelect(wrapper);
    }
  });
}

function focusSelectedOption(wrapper) {
  const selectedOption = wrapper.querySelector(".custom-select__option--selected");
  const firstOption = wrapper.querySelector(".custom-select__option");
  (selectedOption || firstOption)?.focus();
}

function handleOptionKeydown(event, wrapper, triggerButton) {
  const options = [...wrapper.querySelectorAll(".custom-select__option")];
  const currentIndex = options.indexOf(event.currentTarget);

  if (event.key === "Escape") {
    event.preventDefault();
    closeSelect(wrapper);
    triggerButton.focus();
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    options[Math.min(currentIndex + 1, options.length - 1)]?.focus();
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    options[Math.max(currentIndex - 1, 0)]?.focus();
  }

  if (event.key === "Home") {
    event.preventDefault();
    options[0]?.focus();
  }

  if (event.key === "End") {
    event.preventDefault();
    options[options.length - 1]?.focus();
  }
}
