(function () {
  "use strict";
  if (window.SafePermitNavOverlay) return;
  const instances = new WeakMap();

  function init(host) {
    if (!host || host.dataset.variant !== "home") return null;
    if (instances.has(host)) return instances.get(host);
    const navbar = host.querySelector("[data-sp-navbar]");
    const dialog = host.querySelector("[data-sp-nav-overlay]");
    const toggle = host.querySelector("[data-sp-nav-toggle]");
    const topbar = host.querySelector(".sp-navbar__inner");
    const links = host.querySelector("[data-sp-home-links]");
    const actions = host.querySelector(".sp-navbar__actions");
    if (!navbar || !dialog || !toggle || !topbar || !links || !actions) return null;
    const root = document.documentElement;
    const viewport = dialog.querySelector("[data-sp-overlay-viewport]");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const marker = document.createComment("Public navigation top bar");
    navbar.insertBefore(marker, topbar);
    dialog.querySelector("[data-sp-overlay-links]").appendChild(links);
    dialog.querySelector("[data-sp-overlay-actions]").appendChild(actions);
    links.classList.add("sp-nav-overlay__links");
    actions.classList.add("sp-nav-overlay__actions");
    links.querySelectorAll(".sp-navbar__link").forEach(function (link, index) {
      const mask = document.createElement("div");
      mask.className = "sp-nav-overlay__mask";
      mask.style.setProperty("--i", index);
      link.style.setProperty("--i", index);
      link.before(mask);
      mask.appendChild(link);
    });
    toggle.setAttribute("aria-controls", dialog.id);
    host.dataset.spOverlayReady = "true";
    // These shared binders are idempotent and also support the embedded preview.
    if (window.SafePermitTheme) window.SafePermitTheme.bind(host);
    if (window.SafePermitI18n) {
      window.SafePermitI18n.bind(host);
      window.SafePermitI18n.apply(host);
    }
    if (window.SafePermitLetterSwap) window.SafePermitLetterSwap.init(links);
    let opened = false, active = false, closing = null, closeTimer = 0, frame = 0;
    let scrollState = null;
    const background = [];
    navbar.classList.add("sp-navbar--home");
    function syncScroll() { navbar.classList.toggle("sp-navbar--scrolled", (scrollState ? scrollState.y : window.scrollY) > 8); }
    window.addEventListener("scroll", syncScroll, { passive: true });
    syncScroll();

    function syncLabel() {
      const key = "shared.navbar." + (opened ? "close_navigation" : "open_navigation");
      const i18n = window.SafePermitI18n;
      let label = i18n && i18n.t ? i18n.t(key) : key;
      if (!label || label === key) label = root.lang === "ar"
        ? (opened ? "إغلاق قائمة التنقل" : "فتح قائمة التنقل")
        : (opened ? "Close navigation" : "Open navigation");
      toggle.setAttribute("data-i18n-aria-label", key);
      toggle.setAttribute("aria-label", label);
      toggle.setAttribute("aria-expanded", String(opened));
    }

    function freezeBackground() {
      let branch = host;
      while (branch && branch !== document.body) {
        const parent = branch.parentElement;
        if (!parent) break;
        Array.from(parent.children).forEach(function (element) {
          if (element === branch || /^(SCRIPT|STYLE|LINK)$/.test(element.tagName)) return;
          background.push({ element: element, inert: element.hasAttribute("inert"), aria: element.getAttribute("aria-hidden") });
          element.inert = true;
          element.setAttribute("inert", "");
          element.setAttribute("aria-hidden", "true");
        });
        branch = parent;
      }
    }
    function unfreezeBackground() {
      background.splice(0).forEach(function (entry) {
        entry.element.inert = entry.inert;
        if (!entry.inert) entry.element.removeAttribute("inert");
        if (entry.aria === null) entry.element.removeAttribute("aria-hidden");
        else entry.element.setAttribute("aria-hidden", entry.aria);
      });
    }
    function saveStyles(element, properties) {
      return properties.map(function (name) { return [name, element.style.getPropertyValue(name), element.style.getPropertyPriority(name)]; });
    }
    function restoreStyles(element, styles) {
      styles.forEach(function (entry) {
        if (entry[1]) element.style.setProperty(entry[0], entry[1], entry[2]);
        else element.style.removeProperty(entry[0]);
      });
    }
    function lockScroll() {
      const body = document.body;
      scrollState = { x: window.scrollX, y: window.scrollY,
        body: saveStyles(body, ["position", "top", "inset-inline", "width", "overflow", "padding-inline-end"]),
        root: saveStyles(root, ["overflow", "scroll-behavior"]) };
      const gap = root.clientWidth > 0 ? Math.max(0, window.innerWidth - root.clientWidth) : 0;
      if (gap) body.style.paddingInlineEnd = (parseFloat(window.getComputedStyle(body).paddingInlineEnd) || 0) + gap + "px";
      body.style.position = "fixed";
      body.style.top = -scrollState.y + "px";
      body.style.setProperty("inset-inline", "0");
      body.style.width = "100%";
      body.style.overflow = "hidden";
      root.style.overflow = "hidden";
    }
    function unlockScroll() {
      if (!scrollState) return;
      const saved = scrollState;
      scrollState = null;
      restoreStyles(document.body, saved.body);
      restoreStyles(root, saved.root);
      root.style.scrollBehavior = "auto";
      window.scrollTo(saved.x, saved.y);
      restoreStyles(root, saved.root);
    }
    function focusable() {
      return Array.from(dialog.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(function (element) {
        if (element.closest("[hidden],[inert]")) return false;
        const style = window.getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden";
      });
    }
    function focusFirst() {
      const first = links.querySelector("a[href]") || toggle;
      first.focus({ preventScroll: true });
    }
    function cancelClose() {
      window.clearTimeout(closeTimer);
      closeTimer = 0;
      if (closing) { closing.resolve(false); closing = null; }
    }
    function open() {
      if (opened) return;
      cancelClose();
      if (frame) window.cancelAnimationFrame(frame);
      if (!active) {
        active = true;
        dialog.hidden = false;
        dialog.inert = false;
        dialog.removeAttribute("inert");
        dialog.setAttribute("aria-hidden", "false");
        dialog.querySelector("[data-sp-overlay-topbar]").appendChild(topbar);
        navbar.classList.add("is-overlay-visible");
        lockScroll();
        focusFirst();
        freezeBackground();
      }
      opened = true;
      navbar.classList.remove("is-overlay-closing");
      viewport.inert = false;
      viewport.removeAttribute("inert");
      syncLabel();
      document.dispatchEvent(new CustomEvent("safepermit:navigationchange", { detail: { open: true } }));
      // Establish the closed clip before applying the opening state.
      void dialog.offsetHeight;
      frame = window.requestAnimationFrame(function () { frame = 0; navbar.classList.add("is-overlay-open"); });
      focusFirst();
    }
    function finishClose() {
      if (!closing || opened) return;
      const pending = closing;
      closing = null;
      window.clearTimeout(closeTimer);
      closeTimer = 0;
      navbar.insertBefore(topbar, marker.nextSibling);
      navbar.classList.remove("is-overlay-visible", "is-overlay-closing");
      dialog.hidden = true;
      dialog.inert = true;
      dialog.setAttribute("inert", "");
      dialog.setAttribute("aria-hidden", "true");
      active = false;
      unfreezeBackground();
      unlockScroll();
      document.dispatchEvent(new CustomEvent("safepermit:navigationchange", { detail: { open: false } }));
      toggle.focus({ preventScroll: true });
      pending.resolve(true);
    }
    function close() {
      if (closing) return closing.promise;
      if (!active) return Promise.resolve(true);
      if (frame) { window.cancelAnimationFrame(frame); frame = 0; }
      opened = false;
      navbar.classList.remove("is-overlay-open");
      navbar.classList.add("is-overlay-closing");
      viewport.inert = true;
      viewport.setAttribute("inert", "");
      toggle.focus({ preventScroll: true });
      syncLabel();
      let resolve;
      const promise = new Promise(function (done) { resolve = done; });
      closing = { promise: promise, resolve: resolve };
      closeTimer = window.setTimeout(finishClose, reduced.matches ? 160 : 850);
      return promise;
    }
    dialog.querySelector(".sp-nav-overlay__surface").addEventListener("transitionend", function (event) {
      if (event.target === event.currentTarget && (event.propertyName === "clip-path" || event.propertyName === "opacity")) finishClose();
    });
    toggle.addEventListener("click", function () { if (opened) close(); else open(); });
    document.addEventListener("keydown", function (event) {
      if (!active) return;
      if (event.key === "Escape") { event.preventDefault(); close(); return; }
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0] || toggle, last = items[items.length - 1] || toggle;
      if (!items.includes(document.activeElement) || (event.shiftKey && document.activeElement === first)) {
        event.preventDefault(); (event.shiftKey ? last : first).focus({ preventScroll: true });
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus({ preventScroll: true });
      }
    });
    document.addEventListener("focusin", function (event) {
      if (active && !dialog.contains(event.target)) { if (opened) focusFirst(); else toggle.focus({ preventScroll: true }); }
    });
    navbar.addEventListener("click", function (event) {
      const link = event.target.closest("a[href]");
      if (!active || !link || !navbar.contains(link)) return;
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.target === "_blank" || link.hasAttribute("download")) { close(); return; }
      const destination = new URL(link.href, window.location.href);
      // A static host can serve index.html at the directory URL.
      const pagePath = function (pathname) { return pathname.replace(/\/index\.html$/, "/"); };
      const samePage = destination.origin === window.location.origin && pagePath(destination.pathname) === pagePath(window.location.pathname) && destination.search === window.location.search;
      let target = null;
      try { target = destination.hash && document.getElementById(decodeURIComponent(destination.hash.slice(1))); } catch (error) {}
      event.preventDefault();
      event.stopPropagation();
      close().then(function (completed) {
        if (!completed) return;
        if (samePage && target) {
          if (window.location.hash !== destination.hash) window.history.pushState(null, "", destination.hash);
          const story = window.SafePermitSafetySections;
          if (story && story.goToAnchor && story.goToAnchor(destination.hash, { behavior: reduced.matches ? "auto" : "smooth", focus: true })) return;
          target.scrollIntoView({ behavior: reduced.matches ? "auto" : "smooth", block: "start" });
          // Focus the destination after restoring the background; temporary tabindex is cleaned on blur.
          const focusTarget = target.closest("section") || target;
          if (!focusTarget.hasAttribute("tabindex")) {
            focusTarget.setAttribute("tabindex", "-1");
            focusTarget.addEventListener("blur", function () { focusTarget.removeAttribute("tabindex"); }, { once: true });
          }
          focusTarget.focus({ preventScroll: true });
          window.dispatchEvent(new Event("hashchange"));
        } else window.location.assign(destination.href);
      });
    }, true);
    document.addEventListener("safepermit:languagechange", syncLabel);
    document.addEventListener("safepermit:i18nready", syncLabel);
    reduced.addEventListener("change", function () { if (closing) finishClose(); });
    window.addEventListener("pagehide", function () {
      if (active) { opened = false; if (!closing) close(); finishClose(); }
    });
    syncLabel();
    const instance = { open: open, close: close, isOpen: function () { return opened; } };
    instances.set(host, instance);
    return instance;
  }
  function initAll() { document.querySelectorAll('#shared-navbar[data-variant="home"]').forEach(init); }
  window.SafePermitNavOverlay = { init: init, initAll: initAll };
  window.addEventListener("safepermit:navbarready", function (event) { init(event.detail && event.detail.host); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAll);
  else initAll();
})();
