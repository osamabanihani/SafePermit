/* Presentation/navigation only. URLs and visible tools do not grant authority. */
(function (root) {
  "use strict";
  if (root.SafePermitContext) return;
  const base = root.SafePermitPaths.projectRoot;
  const route = location.pathname.slice(base.pathname.length).replace(/index\.html$/, "");
  const role = route.split("/")[0];
  const lists = new Set(["worker/permits/", "supervisor/review-queue/", "supervisor/history/",
    "supervisor/active-supervision/", "safety/review-queue/", "safety/history/", "safety/risk-overview/",
    "admin/pending-permits/", "admin/active-permits/"]);
  const destinations = new Set({
    worker:["dashboard/","permits/","permit-details/","approval-tracking/"],
    supervisor:["dashboard/","review-queue/","history/","active-supervision/","permit-details/","review-permit/"],
    safety:["dashboard/","review-queue/","history/","permit-details/","review-permit/","risk-overview/","risk-command-center/","controlled-resume/"],
    admin:["dashboard/","pending-permits/","active-permits/","review-permit/"]
  }[role] || []);
  const keys = new Set(["q","risk","status","sort","start","site","decision","checklist","id","demo","view"]);
  const text = (en, ar) => document.documentElement.lang === "ar" ? ar : en;
  function setText(element, value) { if (element.textContent !== value) element.textContent = value; }
  function safeReturn(value, depth = 0) {
    if (!value) return "";
    try {
      const url = new URL(value, base);
      const relative = url.pathname.slice(base.pathname.length).replace(/index\.html$/, "");
      if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname) ||
          !relative.startsWith(role + "/") || !destinations.has(relative.slice(role.length + 1)) || url.username || url.password) return "";
      const nested = depth < 1 ? safeReturn(url.searchParams.get("returnTo"), depth + 1) : "";
      Array.from(url.searchParams.keys()).forEach(key => { if (!keys.has(key)) url.searchParams.delete(key); });
      if (nested) url.searchParams.set("returnTo", nested.slice(base.href.length));
      return url.href;
    } catch (_) { return ""; }
  }
  const controls = [];
  let updating = false, pending = false, feedback, clear, retry, message;
  const isList = lists.has(route);
  function currentReturn() {
    const url = new URL(location.href);
    const previous = safeReturn(url.searchParams.get("returnTo"));
    Array.from(url.searchParams.keys()).forEach(key => { if (!keys.has(key)) url.searchParams.delete(key); });
    if (previous) url.searchParams.set("returnTo", previous.slice(base.href.length));
    return url.pathname.slice(base.pathname.length) + url.search + url.hash;
  }
  function writeFilters() {
    if (updating) return;
    const url = new URL(location.href);
    controls.forEach(({element,key,initial}) => {
      if (element.value !== initial) url.searchParams.set(key, key === "status" ? element.value.toLowerCase() : element.value);
      else url.searchParams.delete(key);
    });
    const status = document.querySelector('[data-status-filter].is-active');
    if (status) {
      if (status.dataset.statusFilter === "all") url.searchParams.delete("status");
      else url.searchParams.set("status", status.dataset.statusFilter);
    }
    const risk = document.querySelector('[data-risk-filter].is-active');
    if (risk) {
      if (risk.dataset.riskFilter === "all") url.searchParams.delete("risk");
      else url.searchParams.set("risk", risk.dataset.riskFilter);
    }
    if (url.href !== location.href) {
      history.replaceState(history.state, "", url);
      root.dispatchEvent(new CustomEvent("safepermit:viewchange"));
    }
    schedule();
  }
  function restoreFilters() {
    updating = true;
    const params = new URLSearchParams(location.search);
    controls.forEach(({element,key,initial}) => {
      const alias = key === "decision" ? {returned:"return",approved:"approve",rejected:"reject"}[params.get("status")] : "";
      const value = params.get(key) || alias || initial;
      const option = element.tagName === "SELECT" && Array.from(element.options).find(o => o.value.toLowerCase() === value.toLowerCase());
      element.value = element.tagName === "SELECT" ? option ? option.value : initial : value;
      element.dispatchEvent(new Event(element.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
    });
    ["status", "risk"].forEach(key => {
      const value = params.get(key) || "all";
      const button = Array.from(document.querySelectorAll('[data-' + key + '-filter]'))
        .find(el => el.dataset[key + "Filter"] === value);
      if (button) button.click();
    });
    updating = false;
  }
  function resetFilters() {
    updating = true;
    controls.forEach(({element,initial}) => {
      element.value = initial;
      element.dispatchEvent(new Event(element.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
    });
    document.querySelector('[data-status-filter="all"]')?.click();
    document.querySelector('[data-risk-filter="all"]')?.click();
    const url = new URL(location.href);
    ["q","risk","status","sort","start","site","decision","checklist"].forEach(key => url.searchParams.delete(key));
    history.replaceState(history.state, "", url);
    root.dispatchEvent(new CustomEvent("safepermit:viewchange"));
    updating = false;
    schedule();
  }
  function storageUnavailable() {
    try {
      for (const key of ["safePermitSubmittedPermits", "safePermitSubmittedPermit"]) {
        const raw = localStorage.getItem(key);
        if (raw === null) continue;
        const value = JSON.parse(raw);
        if (key.endsWith("Permits") ? !Array.isArray(value) : value !== null && (typeof value !== "object" || Array.isArray(value))) return true;
      }
      return false;
    } catch (_) { return true; }
  }
  function listFeedback() {
    if (!feedback) return;
    const table = document.querySelector('#permitTableBody,#queueTableBody,#pendingTableBody,#historyTableBody,#activeTableBody');
    const cards = document.querySelector('#activePermitList,#riskList');
    const source = table || cards;
    if (!source) return;
    const native = document.querySelector('.sp-async-state');
    if (native && !native.hasAttribute("data-sp-context-empty")) native.setAttribute("data-sp-context-empty", "");
    const nativeState = source.dataset.listState || native?.dataset.state;
    const unavailable = storageUnavailable() || nativeState === "error";
    const loading = nativeState === "loading";
    const rows = Array.from(source.children).filter(el => !el.hidden && el.matches('tr,article'));
    const count = rows.filter(el => !el.classList.contains("is-hidden")).length;
    const state = unavailable ? "error" : loading ? "loading" : !rows.length ? "empty" : !count ? "filtered" : "ready";
    feedback.dataset.state = state;
    const labels = {
      error: text("Permit data is unavailable. Records below are hidden until a successful refresh; no clearance is implied.", "بيانات التصاريح غير متاحة. تُخفى السجلات حتى نجاح التحديث؛ ولا يعني ذلك اجتياز متطلبات السلامة."),
      loading: text("Loading permit records…", "جارٍ تحميل سجلات التصاريح…"),
      empty: text("No permit records in this view yet.", "لا توجد سجلات تصاريح في هذا العرض بعد."),
      filtered: text("No permits match these filters. Clear filters to see available records.", "لا تطابق أي تصاريح هذه المرشحات. امسح المرشحات لعرض السجلات المتاحة."),
      ready: text(count + " matching permit records. Browser demo data only.", count + " من سجلات التصاريح المطابقة. بيانات تجريبية في هذا المتصفح فقط.")
    };
    setText(message, labels[state]);
    setText(clear, text("Clear filters", "مسح المرشحات"));
    setText(retry, text("Retry", "إعادة المحاولة"));
    retry.hidden = state !== "error";
    const params = new URLSearchParams(location.search);
    clear.disabled = !["q","risk","status","sort","start","site","decision","checklist"].some(key => params.has(key));
    const targets = [table?.closest("table"), cards,
      document.querySelector('#permitCards,#queueMobileList,#pendingMobileList,#historyMobileList,#activeMobileList')].filter(Boolean);
    targets.forEach(target => {
      if (unavailable || loading) { if (!target.hasAttribute("data-sp-unavailable")) target.setAttribute("data-sp-unavailable", ""); }
      else target.removeAttribute("data-sp-unavailable");
    });
    document.querySelectorAll('#permitsEmpty,#queueEmpty,#pendingEmpty,#historyEmpty,#activeEmpty,#riskEmpty')
      .forEach(el => { if (!el.hasAttribute("data-sp-context-empty")) el.setAttribute("data-sp-context-empty", ""); });
  }
  function enhance() {
    pending = false;
    if (route === "worker/approval-tracking/" && !new URLSearchParams(location.search).get("id")) {
      const missing = document.querySelector('.sp-permit-state--missing');
      if (missing) {
        const heading = missing.querySelector('h1'), description = missing.querySelector('.sp-permit-state__text');
        heading.setAttribute("data-i18n-ignore", ""); description.setAttribute("data-i18n-ignore", "");
        setText(heading,text("Choose a permit to track","اختر تصريحًا لتتبّعه"));
        setText(description,text("Open My permits, then choose Track permit on the record you need. No permit is selected automatically.","افتح تصاريحي ثم اختر تتبّع التصريح في السجل المطلوب. لا يتم اختيار أي تصريح تلقائيًا."));
      }
    }
    document.querySelectorAll('[data-sp-context-label]').forEach(element => {
      const key=element.dataset.spContextLabel;
      const arabic={risk:"المخاطر",status:"الحالة",sort:"الترتيب",start:"موعد البدء",site:"الموقع",decision:"القرار",checklist:"قائمة التحقق"};
      const label=key==="q" ? text("Search permits","البحث في التصاريح") : text("Filter permits by "+key,"تصفية التصاريح حسب "+arabic[key]);
      if(element.getAttribute("aria-label")!==label)element.setAttribute("aria-label",label);
    });
    const lifecycleTip = document.querySelector('.admin-sidebar__tip p');
    if (lifecycleTip) {
      lifecycleTip.setAttribute("data-i18n-ignore", "");
      setText(lifecycleTip, text("Approved and Active are stored lifecycle states. Work still requires current validity, documented approvals and cleared safety blockers.", "معتمد ونشط حالتان مسجّلتان في دورة التصريح. يظل العمل مشروطًا بالصلاحية الحالية والموافقات الموثّقة واجتياز موانع السلامة."));
    }
    const returnUrl = safeReturn(new URLSearchParams(location.search).get("returnTo"));
    const selectedPage = /\/(permit-details|review-permit|approval-tracking)\//.test(location.pathname) && new URLSearchParams(location.search).has("id");
    const returnValue = isList || selectedPage ? currentReturn() : returnUrl ? returnUrl.slice(base.href.length) : "";
    if (selectedPage && !document.documentElement.classList.contains("sp-permit-missing")) {
      const id = new URLSearchParams(location.search).get("id");
      let permit = null;
      try { permit = root.SafePermitData?.getPermit(id); } catch (_) {}
      const heading = document.querySelector("main h1");
      if (permit && heading && !document.querySelector('.sp-context-tools')) {
        const group = document.createElement("div"); group.className = "sp-context-tools";
        const add = (path,en,ar) => {
          const link = document.createElement("a"), url = new URL(path,base);
          url.searchParams.set("returnTo",currentReturn()); link.href=url.href;
          link.className="sp-context-tool"; link.dataset.contextEn=en; link.dataset.contextAr=ar;
          link.setAttribute("data-i18n-ignore",""); setText(link,text(en,ar)); group.append(link);
        };
        if (role === "safety") {
          add("safety/risk-command-center/?id="+encodeURIComponent(id)+"#gates","Open linked safety controls","فتح ضوابط السلامة المرتبطة");
          if (permit.status === "Stopped") add("safety/controlled-resume/?id="+encodeURIComponent(id),"Open controlled resume","فتح الاستئناف المضبوط");
        }
        if (role === "admin" && permit.status === "Approved") add("admin/active-permits/?status=approved&q="+encodeURIComponent(id),"Open activation checks","فتح فحوص التفعيل");
        if (group.children.length) heading.parentElement.append(group);
      }
    }
    document.querySelectorAll('.sp-context-tool').forEach(link=>setText(link,text(link.dataset.contextEn,link.dataset.contextAr)));
    document.querySelectorAll('main section a[href]').forEach(link => {
      if (link.closest('aside,[role="dialog"]')) return;
      if (link.hasAttribute("data-sp-context-back")) {
        if (returnUrl) {
          if (link.href !== returnUrl) link.href = returnUrl;
          setText(link, new URL(returnUrl).searchParams.has("id") ? text("Back to permit", "العودة إلى التصريح") : text("Back to results", "العودة إلى النتائج"));
        }
        return;
      }
      let url;
      try { url = new URL(link.href, location.href); } catch (_) { return; }
      if (url.origin !== base.origin || !url.pathname.startsWith(new URL(role + "/", base).pathname)) return;
      if (url.searchParams.has("id") && /\/(permit-details|review-permit|approval-tracking|controlled-resume|risk-command-center)\//.test(url.pathname) && returnValue) {
        url.searchParams.set("returnTo", returnValue);
        if (link.href !== url.href) link.href = url.href;
      } else if (!isList && returnUrl && !url.searchParams.has("id") && lists.has(url.pathname.slice(base.pathname.length))) {
        if (link.href !== returnUrl) link.href = returnUrl;
        if (!link.hasAttribute("data-sp-context-back")) { link.removeAttribute("data-i18n-text"); link.setAttribute("data-sp-context-back", ""); link.setAttribute("data-i18n-ignore", ""); }
        setText(link, new URL(returnUrl).searchParams.has("id") ? text("Back to permit", "العودة إلى التصريح") : text("Back to results", "العودة إلى النتائج"));
      }
    });
    // Each Worker row gets a record-specific tracking link, not a bare tracking page.
    if (route === "worker/permits/") document.querySelectorAll('tr,article.permit-mobile-card').forEach(row => {
      const detail = row.querySelector('a[href*="permit-details/"]');
      if (!detail || row.querySelector('.sp-context-track')) return;
      const url = new URL(detail.href);
      if (!url.searchParams.get("id")) return;
      url.pathname = new URL("worker/approval-tracking/", base).pathname;
      const link = document.createElement("a");
      link.href = url.href; link.className = "sp-context-track"; link.setAttribute("data-i18n-ignore", "");
      setText(link, text("Track permit", "تتبّع التصريح"));
      detail.parentElement.append(link);
    });
    document.querySelectorAll('.sp-context-track').forEach(link => setText(link, text("Track permit", "تتبّع التصريح")));
    if (returnUrl && !isList && !document.querySelector('[data-sp-context-back]')) {
      const heading = document.querySelector('main h1');
      if (heading) {
        const back = document.createElement("a"); back.href = returnUrl; back.className = "sp-context-back";
        back.setAttribute("data-sp-context-back", ""); back.setAttribute("data-i18n-ignore", "");
        setText(back, new URL(returnUrl).searchParams.has("id") ? text("Back to permit", "العودة إلى التصريح") : text("Back to results", "العودة إلى النتائج")); heading.parentElement.append(back);
      }
    }
    listFeedback();
  }
  function schedule() { if (!pending) { pending = true; requestAnimationFrame(enhance); } }
  function init() {
    if (isList) {
      const map = {permitSearch:"q",queueSearch:"q",historySearch:"q",activeSearch:"q",riskSearch:"q",
        riskFilter:"risk",statusFilter:"status",sortFilter:"sort",startFilter:"start",siteFilter:"site",decisionFilter:"decision",checklistFilter:"checklist"};
      Object.entries(map).forEach(([id,key]) => {
        const element = document.getElementById(id);
        if (!element) return;
        const initial = element.tagName === "SELECT" ? (Array.from(element.options).find(o => o.defaultSelected) || element.options[0]).value : element.defaultValue;
        controls.push({element,key,initial});
        if (!element.labels?.length && !element.hasAttribute("aria-label")) element.dataset.spContextLabel=key;
        element.addEventListener(element.tagName === "SELECT" ? "change" : "input", writeFilters);
      });
      feedback = document.createElement("div"); feedback.className = "sp-list-feedback";
      message = document.createElement("p"); message.setAttribute("role", "status"); message.setAttribute("aria-live", "polite");
      clear = document.getElementById("resetFilters") || document.createElement("button"); retry = document.createElement("button"); clear.type = retry.type = "button";
      clear.addEventListener("click", resetFilters);
      retry.addEventListener("click", () => {
        if (/history\/|active-supervision\/|risk-overview\//.test(route)) location.reload();
        else root.dispatchEvent(new CustomEvent("safepermit:permits-updated"));
      });
      feedback.setAttribute("data-i18n-ignore", ""); feedback.append(message,clear,retry);
      const toolbar = controls[0]?.element.closest('[class*="toolbar"]');
      if (toolbar) toolbar.after(feedback); else document.querySelector('main h1')?.parentElement.append(feedback);
      restoreFilters();
      document.addEventListener("click", event => { if (event.target.closest('[data-status-filter],[data-risk-filter]')) writeFilters(); });
      root.addEventListener("popstate", () => { restoreFilters(); schedule(); });
    }
    enhance();
    new MutationObserver(schedule).observe(document.querySelector("main"), { childList:true,subtree:true,attributes:true,attributeFilter:["class","hidden","data-state","data-list-state"] });
    document.addEventListener("safepermit:languagechange", schedule);
    root.addEventListener("storage", schedule);
    root.addEventListener("safepermit:permits-updated", schedule);
  }
  root.SafePermitContext = Object.freeze({ safeReturn, resetFilters });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(window);
