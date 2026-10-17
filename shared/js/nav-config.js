/*
 * SafePermit role navigation: the single source for every role sidebar.
 * Visibility is NOT authorization. Every route stays subject to the workflow
 * rules in data-adapter.js / safety-workflow.js and, in production, a backend.
 *
 * Item fields: id, en/ar label, route (relative to the project root),
 * match (extra path prefixes that mark the item active), icon, badge.
 */
(function (root) {
  "use strict";

  const CC = "safety/risk-command-center/";
  const groups = {
    overview: ["Overview", "نظرة عامة"],
    permits: ["Permit lists", "قوائم التصاريح"],
    work: ["My work", "عملي"],
    review: ["Permit review", "مراجعة التصاريح"],
    team: ["Team & work", "الفريق والعمل"],
    permitSafety: ["Permit safety", "سلامة التصاريح"],
    control: ["Risk & control", "المخاطر والتحكم"],
    incidents: ["Incidents & compliance", "الحوادث والامتثال"],
    insights: ["Insights", "التحليلات"],
    management: ["Permit management", "إدارة التصاريح"],
    organization: ["Organization", "المؤسسة"],
    audit: ["Reports & audit", "التقارير والتدقيق"],
    account: ["Account", "الحساب"],
    system: ["System", "النظام"]
  };

  const roles = Object.freeze({
    worker: { en: "Worker workspace", ar: "مساحة العامل", items: [
      { id: "dashboard", group: "overview", en: "Dashboard", ar: "لوحة التحكم", route: "worker/dashboard/", icon: "dashboard" },
      { id: "create", group: "permits", en: "Create permit", ar: "إنشاء تصريح", route: "worker/create-permit/basic-info/", match: ["worker/create-permit/"], icon: "create" },
      { id: "permits", group: "permits", en: "My permits", ar: "تصاريحي", route: "worker/permits/", match: ["worker/permit-details/"], icon: "permits" },
      { id: "drafts", group: "permits", en: "Draft permits", ar: "مسودات التصاريح", route: "worker/permits/?status=draft", icon: "create" },
      { id: "tracking", group: "permits", en: "Approval tracking", ar: "تتبع الموافقات", route: "worker/approval-tracking/", icon: "tracking" },
      { id: "returned", group: "permits", en: "Returned for correction", ar: "مُعادة للتصحيح", route: "worker/permits/?status=returned", icon: "returned" },
      { id: "active", group: "work", en: "Active work", ar: "العمل النشط", route: "worker/permits/?status=active", icon: "active" },
      { id: "stopped", group: "work", en: "Stopped / on hold", ar: "موقوفة / معلّقة", route: "worker/permits/?status=stopped", icon: "lock" },
      { id: "guidance", group: "work", en: "Safety guidance", ar: "إرشادات السلامة", route: "resources/safety-review/", icon: "helmet" },
      { id: "notifications", group: "account", en: "Notifications", ar: "الإشعارات", route: "worker/notifications/", icon: "notifications", badge: { id: "sidebarUnreadBadge" } },
      { id: "ai", group: "account", en: "AI assistant", ar: "المساعد الذكي", route: "worker/dashboard/#ai-assistant-entry", icon: "ai", ai: true },
      { id: "profile", group: "account", en: "Profile", ar: "الملف الشخصي", route: "worker/profile/", icon: "profile" }
    ] },
    supervisor: { en: "Supervisor workspace", ar: "مساحة المشرف", items: [
      { id: "dashboard", group: "overview", en: "Dashboard", ar: "لوحة التحكم", route: "supervisor/dashboard/", icon: "dashboard" },
      { id: "pending", group: "review", en: "Pending reviews", ar: "مراجعات معلّقة", route: "supervisor/review-queue/", match: ["supervisor/review-permit/"], icon: "review", badge: { id: "queueBadge", review: "supervisor" } },
      { id: "reviewed", group: "review", en: "Reviewed permits", ar: "تصاريح تمت مراجعتها", route: "supervisor/history/", icon: "history" },
      { id: "returned", group: "review", en: "Returned permits", ar: "تصاريح مُعادة", route: "supervisor/history/?status=returned", icon: "returned" },
      { id: "supervision", group: "team", en: "Active supervision", ar: "الإشراف النشط", route: "supervisor/active-supervision/", match: ["supervisor/permit-details/"], icon: "active" },
      { id: "notifications", group: "account", en: "Notifications", ar: "الإشعارات", route: "supervisor/notifications/", icon: "notifications", badge: { id: "sidebarUnreadBadge" } },
      { id: "ai", group: "account", en: "AI assistant", ar: "المساعد الذكي", route: "supervisor/dashboard/#ai-assistant-entry", icon: "ai", ai: true },
      { id: "profile", group: "account", en: "Profile", ar: "الملف الشخصي", route: "supervisor/profile/", icon: "profile" }
    ] },
    safety: { en: "Safety workspace", ar: "مساحة السلامة", items: [
      { id: "dashboard", group: "overview", en: "Safety dashboard", ar: "لوحة السلامة", route: "safety/dashboard/", icon: "dashboard" },
      { id: "pending", group: "permitSafety", en: "Pending safety reviews", ar: "مراجعات سلامة معلّقة", route: "safety/review-queue/", match: ["safety/review-permit/", "safety/permit-details/"], icon: "review", badge: { id: "queueBadge", review: "safety" } },
      { id: "highRisk", group: "permitSafety", en: "High & critical risk", ar: "المخاطر العالية والحرجة", route: "safety/risk-overview/", icon: "risk" },
      { id: "gates", group: "permitSafety", en: "Permit safety gates", ar: "بوابات سلامة التصاريح", route: CC + "#gates", icon: "approval" },
      { id: "history", group: "permitSafety", en: "Review history", ar: "سجل المراجعات", route: "safety/history/", icon: "history" },
      { id: "risks", group: "control", en: "Risk register", ar: "سجل المخاطر", route: CC + "#risks", icon: "risk" },
      { id: "zones", group: "control", en: "Live risk map", ar: "خريطة المخاطر", route: CC + "#zones", icon: "sites" },
      { id: "conflicts", group: "control", en: "SIMOPS conflicts", ar: "تعارضات SIMOPS", route: CC + "#conflicts", icon: "inspection" },
      { id: "isolations", group: "control", en: "Digital LOTO", ar: "LOTO الرقمي", route: CC + "#isolations", icon: "loto" },
      { id: "passports", group: "control", en: "Safety passports", ar: "جوازات السلامة", route: CC + "#passports", icon: "users" },
      { id: "stopworks", group: "control", en: "Stop-Work center", ar: "مركز إيقاف العمل", route: CC + "#stopworks", icon: "lock" },
      { id: "resume", group: "control", en: "Controlled resume", ar: "الاستئناف المضبوط", route: "safety/controlled-resume/", icon: "play" },
      { id: "incidents", group: "incidents", en: "Incidents & near misses", ar: "الحوادث وشبه الحوادث", route: CC + "#incidents", icon: "info" },
      { id: "actions", group: "incidents", en: "Compliance & actions", ar: "الامتثال والإجراءات", route: CC + "#actions", icon: "approval" },
      { id: "indicators", group: "insights", en: "Risk intelligence", ar: "تحليلات المخاطر", route: CC + "#indicators", icon: "reports" },
      { id: "notifications", group: "account", en: "Notifications", ar: "الإشعارات", route: "safety/notifications/", icon: "notifications", badge: { id: "sidebarUnreadBadge" } },
      { id: "ai", group: "account", en: "AI assistant", ar: "المساعد الذكي", route: "safety/dashboard/#ai-assistant-entry", icon: "ai", ai: true },
      { id: "profile", group: "account", en: "Profile", ar: "الملف الشخصي", route: "safety/profile/", icon: "profile" }
    ] },
    admin: { en: "Admin workspace", ar: "مساحة الإدارة", items: [
      { id: "dashboard", group: "overview", en: "Admin dashboard", ar: "لوحة الإدارة", route: "admin/dashboard/", icon: "dashboard" },
      { id: "pending", group: "management", en: "Pending final approvals", ar: "موافقات نهائية معلّقة", route: "admin/pending-permits/", match: ["admin/review-permit/"], icon: "review", badge: { id: "pendingBadge", review: "admin" } },
      { id: "active", group: "management", en: "Permit control", ar: "التحكم بالتصاريح", route: "admin/active-permits/", icon: "active" },
      { id: "approved", group: "management", en: "Approved / activation checks", ar: "معتمدة / فحوص التفعيل", route: "admin/active-permits/?status=approved", icon: "approval" },
      { id: "stopped", group: "management", en: "Stopped / on hold", ar: "موقوفة / معلّقة", route: "admin/active-permits/?status=stopped", icon: "lock" },
      { id: "users", group: "organization", en: "Users & roles", ar: "المستخدمون والأدوار", route: "admin/users/", icon: "users" },
      { id: "sites", group: "organization", en: "Sites & areas", ar: "المواقع والمناطق", route: "admin/sites-areas/", icon: "sites" },
      { id: "types", group: "organization", en: "Permit types", ar: "أنواع التصاريح", route: "admin/permit-types/", icon: "types" },
      { id: "reports", group: "audit", en: "Reports & audit", ar: "التقارير والتدقيق", route: "admin/reports-audit/", icon: "reports" },
      { id: "notifications", group: "system", en: "Notifications", ar: "الإشعارات", route: "admin/notifications/", icon: "notifications" },
      { id: "settings", group: "system", en: "Settings", ar: "الإعدادات", route: "admin/settings/", icon: "settings" },
      { id: "ai", group: "system", en: "AI assistant", ar: "المساعد الذكي", route: "admin/dashboard/#ai-assistant-entry", icon: "ai", ai: true },
      { id: "profile", group: "system", en: "Profile", ar: "الملف الشخصي", route: "admin/profile/", icon: "profile" }
    ] }
  });

  const arabic = () => root.document.documentElement.lang === "ar";
  const clean = path => String(path || "").replace(/index\.html$/, "").replace(/\/$/, "/");

  // Rebuild a role nav from the config, reusing the page's own link/badge classes.
  function render(nav, role, projectRoot) {
    const config = roles[role];
    if (!nav || !config || nav.hasAttribute("data-sp-nav-rendered")) return;
    const sample = nav.querySelector("a");
    const linkClass = sample ? sample.className.split(/\s+/).filter(c => c && c !== "is-active" && c !== "sp-ai-nav-link").join(" ") : "";
    const badgeSample = nav.querySelector("[class*='badge']");
    const badgeClass = badgeSample ? badgeSample.className.split(/\s+/).filter(c => !/--/.test(c)).join(" ") : "";
    // Page scripts hold references to their own badges (queueBadge, pendingBadge, sidebarUnreadBadge); keep those nodes.
    const owned = {};
    nav.querySelectorAll("[id]").forEach(node => { owned[node.id] = node; });
    nav.textContent = "";
    let lastGroup = "";
    config.items.forEach(item => {
      if (item.group !== lastGroup) {
        lastGroup = item.group;
        const heading = root.document.createElement("span");
        heading.className = "sp-nav-group";
        heading.setAttribute("role", "presentation");
        heading.setAttribute("data-i18n-ignore", "");
        heading.dataset.spSessionEn = groups[item.group][0];
        heading.dataset.spSessionAr = groups[item.group][1];
        heading.textContent = arabic() ? groups[item.group][1] : groups[item.group][0];
        nav.appendChild(heading);
      }
      const link = root.document.createElement("a");
      link.className = linkClass + (item.ai ? " sp-ai-nav-link" : "");
      link.href = new URL(item.route, projectRoot).href;
      link.dataset.spNavId = item.id;
      link.dataset.spNavGroup = item.group;
      link.dataset.spNavEn = item.en;
      link.dataset.spNavAr = item.ar;
      link.dataset.spNavIcon = item.icon;
      if (item.match) link.dataset.spNavMatch = item.match.map(m => new URL(m, projectRoot).pathname).join(" ");
      link.setAttribute("data-i18n-ignore", "");
      link.appendChild(root.document.createTextNode(arabic() ? item.ar : item.en));
      if (item.badge) {
        // Badges start empty and only ever show a computed count (never a fixed number).
        const badge = owned[item.badge.id] || root.document.createElement("span");
        if (!owned[item.badge.id]) {
          badge.className = badgeClass || "sp-nav-badge";
          badge.id = item.badge.id;
        }
        if (item.badge.review) badge.dataset.spNavReview = item.badge.review;
        link.appendChild(badge);
      }
      nav.appendChild(link);
    });
    nav.setAttribute("data-sp-nav-rendered", "");
    refreshBadges(nav);
  }

  function refreshBadges(scope) {
    const repo = root.SafePermitData && root.SafePermitData.repository;
    if (!repo || typeof repo.listForReview !== "function") return;
    scope.querySelectorAll("[data-sp-nav-review]").forEach(badge => {
      repo.listForReview(badge.dataset.spNavReview).then(items => {
        // A page script may own this badge and set a count first; never overwrite it.
        if (badge.textContent.trim()) return;
        badge.textContent = items.length ? String(items.length) : "";
      }).catch(() => { badge.textContent = ""; });
    });
  }

  // Match destination filters/hash; extra search or permit context must not lose orientation.
  function activeItem(links, location) {
    const path = clean(location.pathname);
    const linkPath = link => clean(link.pathname);
    const parameters = new URLSearchParams(location.search);
    const matches = link => Array.from(new URLSearchParams(link.search)).every(([key,value]) =>
      key === "status" ? (parameters.get(key) || "").toLowerCase() === value.toLowerCase() : parameters.get(key) === value);
    return links.find(l => linkPath(l) === path && matches(l) && l.hash && l.hash === location.hash) ||
      links.find(l => linkPath(l) === path && l.search && matches(l) && !l.hash) ||
      links.find(l => linkPath(l) === path && !l.search && !l.hash) ||
      links.find(l => (l.dataset.spNavMatch || "").split(" ").some(prefix => prefix && location.pathname.indexOf(prefix) === 0)) ||
      null;
  }

  // Breadcrumb: Workspace (dashboard link) › Group › Page. Rendered at the top of the content area.
  function renderBreadcrumb(sidebar, role, projectRoot, active) {
    const config = roles[role];
    const shell = sidebar.parentElement;
    if (!config || !shell) return;
    const content = Array.from(shell.children).find(node => node !== sidebar && !/overlay/i.test(node.className) && node.tagName !== "SCRIPT");
    if (!content) return;
    let crumb = content.querySelector(":scope > .sp-breadcrumb");
    if (!crumb) {
      crumb = root.document.createElement("nav");
      crumb.className = "sp-breadcrumb";
      crumb.setAttribute("data-i18n-ignore", "");
      content.prepend(crumb);
    }
    const ar = arabic();
    crumb.setAttribute("aria-label", ar ? "مسار التنقل" : "Breadcrumb");
    crumb.textContent = "";
    const list = root.document.createElement("ol");
    const add = (text, href) => {
      const li = root.document.createElement("li");
      if (href) { const a = root.document.createElement("a"); a.href = href; a.textContent = text; li.appendChild(a); }
      else { li.textContent = text; li.setAttribute("aria-current", "page"); }
      list.appendChild(li);
    };
    const dashboard = config.items[0];
    add(ar ? config.ar : config.en, new URL(dashboard.route, projectRoot).href);
    if (active && active.dataset.spNavId !== dashboard.id) {
      const groupLabel = groups[active.dataset.spNavGroup][ar ? 1 : 0];
      const itemLabel = ar ? active.dataset.spNavAr : active.dataset.spNavEn;
      if (groupLabel !== itemLabel) { add(groupLabel); list.lastChild.removeAttribute("aria-current"); }
      const exact = clean(active.pathname) === clean(root.location.pathname);
      add(ar ? active.dataset.spNavAr : active.dataset.spNavEn, exact ? null : active.href);
      if (!exact) {
        const title = root.document.querySelector("h1");
        if (title && title.textContent.trim()) add(title.textContent.trim());
      }
    }
    crumb.appendChild(list);
  }

  function localize(scope) {
    const ar = arabic();
    scope.querySelectorAll("[data-sp-nav-en]").forEach(link => {
      const label = link.querySelector(".sp-session-label");
      const target = label || Array.from(link.childNodes).find(n => n.nodeType === 3);
      if (target) target.textContent = ar ? link.dataset.spNavAr : link.dataset.spNavEn;
    });
    scope.querySelectorAll(".sp-nav-group").forEach(h => { h.textContent = ar ? h.dataset.spSessionAr : h.dataset.spSessionEn; });
  }

  // Where a permit record opens for each role (same routes as the role dashboards).
  // Opening a route is not authorization: every page applies its own workflow checks.
  const PERMIT_ROUTE = {
    worker: id => "worker/permit-details/?id=" + id,
    supervisor: (id, status) => (status === "Pending Supervisor Review" ? "supervisor/review-permit/?id=" : "supervisor/permit-details/?id=") + id,
    safety: (id, status) => status === "Pending Safety Review" ? "safety/review-permit/?id=" + id :
      status === "Stopped" ? "safety/controlled-resume/?id=" + id : "safety/permit-details/?id=" + id,
    admin: (id, status) => status === "Pending Admin Approval" ? "admin/review-permit/?id=" + id :
      status === "Approved" ? "admin/active-permits/?status=approved&q=" + id : "admin/review-permit/?id=" + id
  };
  function permitRoute(role, id, status) { return PERMIT_ROUTE[role] ? PERMIT_ROUTE[role](encodeURIComponent(String(id)), String(status || "")) : ""; }
  // Distinct icons for the secondary groups (v13.6).
  const groupIcons = { overview: "dashboard", permits: "permits", work: "helmet", review: "review", team: "users", permitSafety: "approval",
    control: "loto", incidents: "info", insights: "reports", management: "tracking", organization: "sites", audit: "history", account: "profile", system: "settings" };

  root.SafePermitNav = Object.freeze({ roles, groups, groupIcons, render, refreshBadges, activeItem, renderBreadcrumb, localize, permitRoute });
})(typeof window !== "undefined" ? window : globalThis);
