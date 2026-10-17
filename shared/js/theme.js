(function () {
  const STORAGE_KEY = "safePermitTheme";

  function getTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  function saveTheme(theme) {
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (error) {}
  }

  function updateButton(button) {
    if (!button) return;
    const dark = getTheme() === "dark";
    const icon = button.querySelector("[data-sp-theme-icon]");
    const label = button.querySelector("[data-sp-theme-label]");
    button.setAttribute("aria-pressed", String(dark));
    button.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    button.title = dark ? "Light theme" : "Dark theme";
    if (icon) icon.textContent = dark ? "☀" : "☾";
    if (label) label.textContent = dark ? "Light" : "Dark";
  }

  function updateAllButtons(scope) {
    (scope || document).querySelectorAll("[data-sp-theme-toggle]").forEach(updateButton);
  }

  function setTheme(theme) {
    const next = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    saveTheme(next);
    updateAllButtons(document);
    document.dispatchEvent(new CustomEvent("safepermit:themechange", { detail: { theme: next } }));
  }

  function bind(scope) {
    const host = scope || document;
    host.querySelectorAll("[data-sp-theme-toggle]").forEach(function (button) {
      if (button.dataset.spThemeBound === "true") {
        updateButton(button);
        return;
      }
      button.dataset.spThemeBound = "true";
      updateButton(button);
      button.addEventListener("click", function () {
        setTheme(getTheme() === "dark" ? "light" : "dark");
      });
    });
  }

  window.SafePermitTheme = { getTheme, setTheme, bind, syncControls: bind };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { bind(document); });
  } else {
    bind(document);
  }

  window.addEventListener("storage", function (event) {
    if (event.key === STORAGE_KEY && (event.newValue === "dark" || event.newValue === "light")) {
      document.documentElement.setAttribute("data-theme", event.newValue);
      updateAllButtons(document);
    }
  });
})();
