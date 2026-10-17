/* SafePermit Slide Tabs — vanilla port of the SlideTabs pill navigation.
 * Enhances the existing public navbar links ([data-sp-home-links]); it never adds a second navbar.
 * When the links fit, they sit inline in the bar inside one pill with a sliding highlight.
 * When they do not fit, they go back to the existing nav-overlay dialog (hamburger), unchanged.
 */
(function () {
  "use strict";
  if (window.SafePermitSlideTabs) return;
  const instances = new WeakMap();
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const SLACK = 24; // free space required before the pill is shown inline (also absorbs rounding)

  function init(host) {
    if (!host) return null;
    if (instances.has(host)) { instances.get(host).refresh(); return instances.get(host); }
    const navbar = host.querySelector("[data-sp-navbar]");
    const inner = host.querySelector(".sp-navbar__inner");
    const links = host.querySelector("[data-sp-home-links]");
    const actions = host.querySelector(".sp-navbar__actions");
    const dialog = host.querySelector("[data-sp-nav-overlay]");
    if (!navbar || !inner || !links || !actions || !dialog) return null;
    const overlayLinks = dialog.querySelector("[data-sp-overlay-links]");
    const overlayActions = dialog.querySelector("[data-sp-overlay-actions]");
    const overlay = window.SafePermitNavOverlay && window.SafePermitNavOverlay.init(host);
    if (!overlayLinks || !overlayActions) return null;

    const linkSlot = document.createElement("div");
    linkSlot.className = "sp-slide-tabs__slot";
    const actionSlot = document.createElement("div");
    actionSlot.className = "sp-slide-tabs__actions-slot";
    const brand = inner.firstElementChild;
    brand.after(linkSlot);
    linkSlot.after(actionSlot);

    const cursor = document.createElement("span");
    cursor.className = "sp-slide-tabs__cursor";
    cursor.setAttribute("aria-hidden", "true");
    links.prepend(cursor);

    let mode = "";
    let target = null;      // link the highlight is on (hovered, focused, or active)
    let hovered = null;
    let placed = false;     // false until the cursor has a position (first placement never animates)
    let frame = 0;
    let decideFrame = 0;

    function linkList() { return Array.from(links.querySelectorAll(".sp-navbar__link")); }
    function activeLink() { return links.querySelector(".sp-navbar__link.is-active"); }
    function focusedLink() {
      const el = document.activeElement;
      return el && links.contains(el) && el.classList.contains("sp-navbar__link") ? el : null;
    }

    function setMode(next) {
      if (mode === next) return;
      mode = next;
      if (next === "inline") {
        linkSlot.appendChild(links);
        actionSlot.appendChild(actions);
        links.classList.remove("sp-nav-overlay__links");
        actions.classList.remove("sp-nav-overlay__actions");
        links.classList.add("sp-slide-tabs", "sp-slide-tabs--inline");
        actions.classList.add("sp-slide-tabs__actions");
        navbar.classList.add("sp-slide-tabs-bar--inline");
        placed = false;
      } else {
        overlayLinks.appendChild(links);
        overlayActions.appendChild(actions);
        links.classList.remove("sp-slide-tabs--inline");
        actions.classList.remove("sp-slide-tabs__actions");
        links.classList.add("sp-nav-overlay__links");
        actions.classList.add("sp-nav-overlay__actions");
        navbar.classList.remove("sp-slide-tabs-bar--inline");
        linkList().forEach(function (link) { link.classList.remove("is-highlighted"); });
        cursor.style.opacity = "0";
      }
      host.dataset.spSlideTabs = next;
    }

    function visibleWidth(el) {
      if (!el || window.getComputedStyle(el).display === "none") return null;
      return el.getBoundingClientRect().width;
    }

    // Inline only when brand + pill + actions fit with slack. Measured synchronously, before paint.
    function decide() {
      decideFrame = 0;
      if (overlay && overlay.isOpen && overlay.isOpen()) return;
      if (navbar.classList.contains("is-overlay-visible")) return;
      const before = mode;
      setMode("inline");
      const style = window.getComputedStyle(inner);
      const gap = parseFloat(style.columnGap) || 0;
      const widths = Array.from(inner.children).map(visibleWidth).filter(function (w) { return w !== null; });
      const need = widths.reduce(function (sum, w) { return sum + w; }, 0) + gap * Math.max(0, widths.length - 1) +
        (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
      const fits = need + SLACK <= inner.getBoundingClientRect().width;
      if (!fits) setMode("overlay");
      if (mode === "inline") { if (before !== "inline") placed = false; schedule(); }
    }
    function scheduleDecide() {
      if (decideFrame) return;
      decideFrame = window.requestAnimationFrame(decide);
    }

    function place() {
      frame = 0;
      if (mode !== "inline") return;
      const link = target && links.contains(target) ? target : null;
      linkList().forEach(function (item) { item.classList.toggle("is-highlighted", item === link); });
      if (!link) { cursor.style.opacity = "0"; return; }
      // Geometry is physical (left/width from bounding boxes), so it holds in RTL without offsetLeft.
      const box = links.getBoundingClientRect();
      const r = link.getBoundingClientRect();
      const x = r.left - box.left - links.clientLeft;
      const instant = !placed || reduced.matches;
      if (instant) cursor.classList.add("is-instant");
      cursor.style.width = r.width + "px";
      cursor.style.height = r.height + "px";
      cursor.style.transform = "translate3d(" + x.toFixed(2) + "px," + (r.top - box.top - links.clientTop).toFixed(2) + "px,0)";
      cursor.style.opacity = "1";
      if (instant) {
        void cursor.offsetWidth;
        cursor.classList.remove("is-instant");
      }
      placed = true;
    }
    function schedule() {
      if (frame) return;
      frame = window.requestAnimationFrame(place);
    }
    function restore() {
      target = focusedLink() || hovered || activeLink();
      schedule();
    }

    links.addEventListener("pointerover", function (event) {
      if (mode !== "inline") return;
      const link = event.target.closest(".sp-navbar__link");
      if (!link || !links.contains(link)) return;
      hovered = link;
      target = link;
      schedule();
    });
    links.addEventListener("pointerleave", function () {
      hovered = null;
      restore();
    });
    links.addEventListener("focusin", function (event) {
      const link = event.target.closest(".sp-navbar__link");
      if (!link) return;
      target = link;
      schedule();
    });
    links.addEventListener("focusout", function () {
      window.setTimeout(restore, 0);
    });

    const resize = new ResizeObserver(scheduleDecide);
    resize.observe(inner);
    resize.observe(links);
    resize.observe(host);
    // Viewport resizes also arrive as window events (covers orientation changes and zoom).
    window.addEventListener("resize", scheduleDecide);
    const onActive = function () { restore(); };
    const onLanguage = function () {
      // i18n rewrites labels and letter-swap rebuilds its copy; measure after both settle.
      window.requestAnimationFrame(function () { placed = false; scheduleDecide(); });
    };
    host.addEventListener("safepermit:navactivechange", onActive);
    document.addEventListener("safepermit:languagechange", onLanguage);
    document.addEventListener("safepermit:i18nready", onLanguage);
    document.addEventListener("safepermit:themechange", scheduleDecide);
    const onOverlay = function (event) { if (event.detail && event.detail.open === false) scheduleDecide(); };
    document.addEventListener("safepermit:navigationchange", onOverlay);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { placed = false; scheduleDecide(); });
    reduced.addEventListener("change", function () { placed = false; schedule(); });

    host.classList.add("sp-slide-tabs-host");
    decide();
    restore();

    const instance = {
      refresh: function () { placed = false; scheduleDecide(); restore(); },
      mode: function () { return mode; },
      destroy: function () {
        resize.disconnect();
        window.removeEventListener("resize", scheduleDecide);
        host.removeEventListener("safepermit:navactivechange", onActive);
        document.removeEventListener("safepermit:languagechange", onLanguage);
        document.removeEventListener("safepermit:i18nready", onLanguage);
        document.removeEventListener("safepermit:themechange", scheduleDecide);
        document.removeEventListener("safepermit:navigationchange", onOverlay);
        setMode("overlay");
        cursor.remove(); linkSlot.remove(); actionSlot.remove();
        instances.delete(host);
      }
    };
    instances.set(host, instance);
    return instance;
  }

  window.SafePermitSlideTabs = { init: init };
})();
