/* Read-only reference QR. Never evidence of approval, validity or authorization. */
(function (root) {
  "use strict";
  if (root.SafePermitPermitQR) return;
  const base = new URL("../../", document.currentScript.src);
  const supported = /^PTW-(10\d\d|11\d\d|1200)$/;
  const valid = id => /^PTW-[A-Z0-9-]{1,24}$/.test(id);
  const text = (en, ar) => document.documentElement.lang === "ar" ? ar : en;
  let dismiss = null, pending = false;
  function node(tag, value, cls) {
    const element = document.createElement(tag);
    if (value) element.textContent = value;
    if (cls) element.className = cls;
    element.setAttribute("data-i18n-ignore", "");
    return element;
  }
  function show(raw, trigger) {
    const id = String(raw || "").trim().toUpperCase();
    if (!valid(id)) return false;
    if (dismiss) dismiss();
    if (Array.from(document.querySelectorAll('[role="dialog"][aria-modal="true"]')).some(dialog => dialog.getClientRects().length)) return false;
    const opener = trigger || document.activeElement;
    const cover = node("div", "", "sp-qr-cover");
    cover.id = "sp-qr-dialog";
    const panel = node("section", "", "sp-qr-panel");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", "sp-qr-title");
    panel.setAttribute("aria-describedby", "sp-qr-warning");
    const heading = node("h2", text("Reference QR code", "رمز QR مرجعي"));
    heading.id = "sp-qr-title";
    heading.tabIndex = -1;
    const reference = node("bdi", id);
    reference.dir = "ltr";
    const warning = node("p", text(
      "DEMO · UNVERIFIED. QR does not authorize work or prove permit validity. Do not begin or resume work based on this reference. Verify live status through an authenticated backend before site use.",
      "تجريبي · غير موثّق. لا يمنح رمز QR تفويضًا للعمل ولا يثبت صلاحية التصريح. لا تبدأ العمل أو تستأنفه بناءً على هذا المرجع. تحقّق من الحالة الحالية عبر خادم موثوق قبل الاستخدام في الموقع."), "sp-qr-warning");
    warning.id = "sp-qr-warning";
    panel.append(heading, reference, warning);
    if (supported.test(id)) {
      const image = node("img");
      image.width = image.height = 220;
      image.alt = text("Unverified QR reference for ", "مرجع QR غير موثّق للتصريح ") + id;
      image.src = new URL("shared/qr/permit-codes/" + id + ".svg", base).href;
      image.addEventListener("error", () => {
        image.replaceWith(node("p", text("QR image unavailable. Use the unverified reference link.", "صورة QR غير متاحة. استخدم الرابط المرجعي غير الموثّق.")));
      });
      panel.append(image);
    } else panel.append(node("p", text(
      "No offline QR image is available for this ID. Use the reference link; new codes require a trusted backend service.",
      "لا تتوفر صورة QR محلية لهذا الرقم. استخدم الرابط المرجعي؛ تتطلب الرموز الجديدة خدمة خادم موثوقة.")));
    const link = node("a", text("Open unverified reference (new tab)", "فتح المرجع غير الموثّق (علامة تبويب جديدة)"));
    link.href = new URL("permit-verify/?id=" + encodeURIComponent(id), base).href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    const close = node("button", text("Close", "إغلاق"), "sp-btn sp-btn--secondary");
    close.type = "button";
    panel.append(link, close);
    cover.append(panel);
    const background = Array.from(document.body.children).filter(el => !el.matches("script,style,link"))
      .map(el => [el, el.inert]);
    const overflow = document.body.style.overflow;
    background.forEach(([el]) => { el.inert = true; });
    document.body.append(cover);
    document.body.style.overflow = "hidden";
    function key(event) {
      if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); dismiss(); }
      if (event.key === "Tab") {
        if (document.activeElement !== link && document.activeElement !== close) { event.preventDefault(); (event.shiftKey ? close : link).focus(); }
        else if (event.shiftKey && document.activeElement === link) { event.preventDefault(); close.focus(); }
        else if (!event.shiftKey && document.activeElement === close) { event.preventDefault(); link.focus(); }
      }
    }
    function focus(event) { if (!panel.contains(event.target)) heading.focus({ preventScroll: true }); }
    dismiss = function () {
      document.removeEventListener("keydown", key, true);
      document.removeEventListener("focusin", focus);
      cover.remove();
      background.forEach(([el, inert]) => { el.inert = inert; });
      document.body.style.overflow = overflow;
      dismiss = null;
      const replacement = Array.from(document.querySelectorAll('.sp-qr-entry')).find(button => button.dataset.permitId === id && button.getClientRects().length);
      const fallback = document.querySelector('#permitSearch,#queueSearch,#historySearch,#activeSearch,#riskSearch') || document.querySelector('main h1');
      const target = opener && opener.isConnected && opener.getClientRects().length ? opener : replacement || fallback;
      if (target) {
        if (target.matches('h1')) target.tabIndex = -1;
        target.focus({ preventScroll: true });
      }
    };
    close.addEventListener("click", () => dismiss());
    cover.addEventListener("click", event => { if (event.target === cover) dismiss(); });
    document.addEventListener("keydown", key, true);
    document.addEventListener("focusin", focus);
    heading.focus({ preventScroll: true });
    return true;
  }
  function entry(id) {
    const button = node("button", text("QR code (reference)", "رمز QR (مرجعي)"), "sp-qr-entry");
    button.type = "button";
    button.dataset.permitId = id;
    button.setAttribute("aria-label", text("Reference QR code for ", "رمز QR مرجعي للتصريح ") + id);
    button.addEventListener("click", () => show(id, button));
    return button;
  }
  function enhance() {
    pending = false;
    // Existing record links supply identity; no text scraping or default IDs.
    document.querySelectorAll('main a[href]').forEach(link => {
      let url;
      try { url = new URL(link.href, location.href); } catch (_) { return; }
      const id = url.searchParams.get("id") || "";
      if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname) ||
          !/\/(permit-details|review-permit|approval-tracking)\//.test(url.pathname) || !valid(id)) return;
      const row = link.closest("tr,article");
      if (!row || row.querySelector('.sp-qr-entry')) return;
      (link.closest("td") || link.parentElement).append(entry(id));
    });
    const id = new URLSearchParams(location.search).get("id") || "";
    if (!valid(id) || !/\/(permit-details|review-permit|approval-tracking)\//.test(location.pathname) ||
        document.documentElement.classList.contains("sp-permit-missing")) return;
    let known = false;
    try { known = !!root.SafePermitData?.getPermit(id); } catch (_) {}
    if (!known && !document.querySelector('.sp-permit-state--demo')) return;
    const title = document.querySelector("main h1");
    if (title && !document.querySelector(".sp-qr-detail-action")) {
      const button = entry(id);
      button.classList.add("sp-qr-detail-action");
      title.parentElement.append(button);
    }
  }
  function schedule() { if (!pending) { pending = true; requestAnimationFrame(enhance); } }
  function init() {
    enhance();
    new MutationObserver(schedule).observe(document.querySelector("main") || document.body, { childList: true, subtree: true });
    document.addEventListener("safepermit:languagechange", () => {
      const activeId = dismiss ? document.querySelector('.sp-qr-panel bdi')?.textContent : "";
      document.querySelectorAll(".sp-qr-entry").forEach(button => {
        const replacement = entry(button.dataset.permitId);
        if (button.classList.contains("sp-qr-detail-action")) replacement.classList.add("sp-qr-detail-action");
        button.replaceWith(replacement);
      });
      if (activeId) {
        const trigger = Array.from(document.querySelectorAll('.sp-qr-entry')).find(button => button.dataset.permitId === activeId && button.getClientRects().length);
        show(activeId, trigger);
      }
    });
  }
  root.SafePermitPermitQR = Object.freeze({ show });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(window);
