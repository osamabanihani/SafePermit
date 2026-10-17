/* Shared permit lookup states for the permit review and details pages.
 * A requested permit is shown only when it is stored in this browser. Built-in sample permits are shown
 * only in an explicitly requested, clearly labelled demo mode (?demo=1); otherwise the page shows one
 * consistent "Permit not found" state instead of silently substituting another permit. */
(function (root) {
  "use strict";
  if (root.SafePermitPermitState) return;

  function demoRequested() {
    return new URLSearchParams(root.location.search).get("demo") === "1";
  }

  function requestedId() {
    return (new URLSearchParams(root.location.search).get("id") || "").trim();
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  // Role pages share one shell: main > .sp-container > (aside sidebar, section content). Inside the content
  // section the mobile bar and top bar stay; the permit hero, status layers and grid are what we replace.
  function contentArea() {
    const main = document.querySelector("main");
    if (!main) return null;
    return main.querySelector(":scope > .sp-container > section") || main;
  }

  function isChrome(child) {
    return child.matches("[class*='mobile-top'], [class*='topbar'], .sp-breadcrumb, .sp-permit-state");
  }

  function insertAtTop(area, node) {
    const chrome = Array.from(area.children).filter(isChrome);
    const anchor = chrome.length ? chrome[chrome.length - 1].nextSibling : area.firstChild;
    area.insertBefore(node, anchor);
  }

  function showNotFound(options) {
    const main = contentArea();
    if (!main || main.querySelector(".sp-permit-state--missing")) return;
    const id = options && options.id != null ? String(options.id) : requestedId();

    // Page styles such as ".review-grid { display: grid }" outrank the [hidden] attribute, so hide inline too.
    function hide(node) { node.hidden = true; node.style.display = "none"; }
    Array.from(main.children).forEach(function (child) { if (!isChrome(child)) hide(child); });
    // The top bar keeps only its back link: queue positions and permit actions describe a permit that is not here.
    main.querySelectorAll("[class*='topbar']").forEach(function (bar) {
      Array.from(bar.children).slice(1).forEach(hide);
    });
    // The permit QR button is mounted separately (possibly later); a page class hides it whenever it appears.
    document.documentElement.classList.add("sp-permit-missing");

    const card = element("section", "sp-permit-state sp-permit-state--missing");
    card.setAttribute("role", "status");
    card.appendChild(element("h1", "sp-permit-state__title", "Permit not found"));
    card.appendChild(element("p", "sp-permit-state__text", id
      ? "No permit with this ID is stored in this browser demo."
      : "No permit was selected. Open a permit from your list."));
    if (id) {
      const ref = element("p", "sp-permit-state__id");
      ref.appendChild(element("span", "", "Permit ID"));
      const code = element("code", "", id);
      code.setAttribute("data-i18n-ignore", "");
      ref.appendChild(code);
      card.appendChild(ref);
    }
    if (options && options.backHref) {
      const back = element("a", "sp-btn sp-btn--secondary sp-permit-state__back", options.backLabel || "Back");
      back.href = options.backHref;
      card.appendChild(back);
    }
    insertAtTop(main, card);
    document.title = "Permit not found | SafePermit";
  }

  function showDemoBanner() {
    const main = contentArea();
    if (!main || main.querySelector(".sp-permit-state--demo")) return;
    const banner = element("div", "sp-permit-state sp-permit-state--demo");
    banner.setAttribute("role", "note");
    banner.appendChild(element("strong", "sp-permit-state__badge", "Demo sample"));
    banner.appendChild(element("span", "sp-permit-state__text",
      "This built-in sample permit is not stored in this browser. It is shown for demonstration only, and decisions on it cannot be saved."));
    insertAtTop(main, banner);
  }

  root.SafePermitPermitState = Object.freeze({
    demoRequested: demoRequested,
    requestedId: requestedId,
    showNotFound: showNotFound,
    showDemoBanner: showDemoBanner
  });
})(window);
