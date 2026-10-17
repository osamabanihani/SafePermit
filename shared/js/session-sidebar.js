/*
 * Vanilla JavaScript adaptation of the supplied SessionNavBar component.
 * Enhances SafePermit's existing sidebars; no React, Tailwind or npm packages.
 * Keep ../css/session-sidebar.css beside the shared CSS files.
 */
(function () {
  "use strict";

  if (window.SafePermitSessionSidebar) {
    window.SafePermitSessionSidebar.initAll();
    return;
  }

  const ownScript = document.currentScript || document.querySelector('script[src*="/session-sidebar.js"]');
  const projectRoot = window.SafePermitPaths
    ? window.SafePermitPaths.projectRoot
    : new URL("../../", ownScript ? ownScript.src : document.baseURI);
  const instances = new WeakMap();
  const desktop = window.matchMedia("(min-width: 821px)");
  const roleNames = {
    worker: ["Worker workspace", "مساحة العامل"],
    supervisor: ["Supervisor workspace", "مساحة المشرف"],
    safety: ["Safety workspace", "مساحة السلامة"],
    admin: ["Admin workspace", "مساحة الإدارة"]
  };
  const iconPaths = {
    dashboard: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    permits: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
    create: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 8v8M8 12h8"/>',
    review: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 13l2 2 4-4"/>',
    active: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    tracking: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    history: '<path d="M3 11a9 9 0 1 1 2.5 7M3 3v8h8M12 7v5l3 2"/>',
    notifications: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/>',
    sites: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    types: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    reports: '<path d="M4 3v18h17M9 17v-5M14 17V8M19 17V5"/>',
    settings: '<path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    risk: '<path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0ZM12 9v4M12 17h.01"/>',
    ai: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/>',
    home: '<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7"/>',
    chevrons: '<path d="m8 9 4-4 4 4M8 15l4 4 4-4"/>',
    pin: '<path d="M16 3 9 3l1 6-4 4v2h5v6l2-2v-4h5v-2l-4-4z"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    recent: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
  };

  function element(tag, className) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function icon(name) {
    if (window.SafePermitIcons && window.SafePermitIcons.names.indexOf(name) >= 0) return window.SafePermitIcons.create(name, "sp-session-icon");
    const node = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    node.setAttribute("viewBox", "0 0 24 24");
    node.setAttribute("fill", "none");
    node.setAttribute("stroke", "currentColor");
    node.setAttribute("stroke-width", "1.8");
    node.setAttribute("stroke-linecap", "round");
    node.setAttribute("stroke-linejoin", "round");
    node.setAttribute("aria-hidden", "true");
    node.classList.add("sp-session-icon");
    node.innerHTML = iconPaths[name] || iconPaths.permits;
    return node;
  }

  function localized(tag, className, english, arabic) {
    const node = element(tag, className);
    node.dataset.spSessionEn = english;
    node.dataset.spSessionAr = arabic;
    node.setAttribute("data-i18n-ignore", "");
    return node;
  }

  function routeIcon(link) {
    if (link.dataset.spNavIcon) return link.dataset.spNavIcon;
    if (link.hash.indexOf("ai-assistant") !== -1) return "ai";
    const path = new URL(link.href).pathname;
    const routes = [
      ["create-permit", "create"], ["pending-permits", "review"],
      ["review-queue", "review"], ["review-permit", "review"],
      ["active-permits", "active"], ["active-supervision", "active"],
      ["approval-tracking", "tracking"], ["risk-overview", "risk"],
      ["permit-types", "types"], ["reports-audit", "reports"],
      ["sites-areas", "sites"], ["notifications", "notifications"],
      ["dashboard", "dashboard"], ["history", "history"],
      ["profile", "profile"], ["settings", "settings"], ["users", "users"]
    ];
    const match = routes.find(function (entry) { return path.indexOf("/" + entry[0] + "/") !== -1; });
    return match ? match[1] : "permits";
  }

  function ensureStyles() {
    if (document.querySelector("link[data-sp-session-style]") || !ownScript) return;
    const link = element("link");
    link.rel = "stylesheet";
    link.href = new URL("../css/session-sidebar.css?v=13.6.0", ownScript.src).href;
    link.setAttribute("data-sp-session-style", "");
    document.head.appendChild(link);
  }

  function init(sidebar) {
    if (!sidebar) return null;
    if (instances.has(sidebar)) return instances.get(sidebar);
    const role = sidebar.id.replace(/Sidebar$/, "").toLowerCase();
    if (!roleNames[role]) return null;
    const nav = sidebar.querySelector("nav");
    // Central role navigation (shared/js/nav-config.js) replaces the page's hand-written links.
    if (nav && window.SafePermitNav) window.SafePermitNav.render(nav, role, projectRoot);
    const top = sidebar.firstElementChild;
    const profile = top && Array.from(top.children).find(function (node) { return node.tagName !== "BUTTON" && node.querySelector("strong"); });
    if (!nav || !profile) return null;

    ensureStyles();
    // Taking over the page's own drawer position must not animate: in RTL the closed drawer
    // would otherwise sweep across the screen on every page load.
    sidebar.style.transition = "none";
    // A timer (not requestAnimationFrame) so a background tab cannot leave the drawer without its animation.
    const restoreTransition = function () { window.setTimeout(function () { sidebar.style.transition = ""; }, 80); };
    const sessionStyle = document.querySelector("link[data-sp-session-style]");
    if (sessionStyle && !sessionStyle.sheet) sessionStyle.addEventListener("load", restoreTransition, { once: true });
    else restoreTransition();
    sidebar.classList.add("sp-session-sidebar");
    sidebar.setAttribute("data-sp-session-sidebar", "");
    const shell = sidebar.parentElement;
    shell.classList.add("sp-session-shell");
    top.classList.add("sp-session-top");
    nav.classList.add("sp-session-nav");
    // One-click Home belongs in the visible sidebar, not in an extra workspace menu.
    const oldHome = sidebar.querySelector("[data-sp-role-home]");
    if (oldHome) oldHome.remove();
    const homeLink = element("a", "sp-session-home-link");
    homeLink.href = new URL("index.html", projectRoot).href;
    homeLink.dataset.spNavId = "home";
    homeLink.dataset.spNavEn = "Home";
    homeLink.dataset.spNavAr = "الرئيسية";
    homeLink.dataset.spNavIcon = "home";
    homeLink.setAttribute("data-i18n-ignore", "");
    homeLink.textContent = document.documentElement.lang === "ar" ? "الرئيسية" : "Home";
    nav.prepend(homeLink);
    const links = Array.from(nav.querySelectorAll("a"));
    const originalActive = links.find(function (link) { return link.classList.contains("is-active"); });
    const mobileOpen = document.getElementById("sidebarOpen");
    const mobileClose = document.getElementById("sidebarClose");
    let hovered = false;
    let pinned = desktop.matches;
    try {
      const preference = localStorage.getItem("safePermitSidebarPinned:" + role);
      if (preference !== null) pinned = preference === "true";
    } catch (_) {}
    const dropdowns = [];

    links.forEach(function (link, index) {
      // Some SafePermit pages already include icons; replace them consistently.
      link.querySelectorAll('[class*="nav__icon"]').forEach(function (node) { node.remove(); });
      Array.from(link.children).filter(function (node) { return node.tagName.toLowerCase() === "svg"; }).forEach(function (node) { node.remove(); });
      link.classList.add("sp-session-link");
      link.style.setProperty("--sp-session-index", String(index));
      const label = element("span", "sp-session-label");
      ["data-i18n-text", "data-i18n-texts"].forEach(function (attribute) {
        if (link.hasAttribute(attribute)) {
          label.setAttribute(attribute, link.getAttribute(attribute));
          link.removeAttribute(attribute);
        }
      });
      // Move the actual text nodes so i18n state and badge elements survive.
      Array.from(link.childNodes).filter(function (node) { return node.nodeType === Node.TEXT_NODE; }).forEach(function (node) { label.appendChild(node); });
      link.prepend(icon(routeIcon(link)), label);
      Array.from(link.children).filter(function (node) { return node !== label && node.tagName.toLowerCase() !== "svg"; }).forEach(function (node) { node.classList.add("sp-session-badge"); });
      // SafePermit's AI link changes the hash with history.replaceState().
      link.addEventListener("click", function () { window.setTimeout(updateActive, 0); });
    });

    // Progressive disclosure: priority actions remain one click away, while the full
    // original navigation survives inside native accessible <details> groups.
    const priorities = {
      worker: ["home", "dashboard", "create", "permits", "drafts", "returned", "notifications"],
      supervisor: ["home", "dashboard", "pending", "supervision", "reviewed", "notifications"],
      safety: ["home", "dashboard", "pending", "highRisk", "stopworks", "resume", "notifications"],
      admin: ["home", "dashboard", "pending", "active", "approved", "notifications"]
    };
    const primaryIds = new Set(priorities[role]);
    const groupLabels = Array.from(nav.querySelectorAll(".sp-nav-group"));
    const secondaryLinks = links.filter(function (link) { return !primaryIds.has(link.dataset.spNavId); });
    const hasConfiguredGroups = groupLabels.length > 0 && !!window.SafePermitNav;
    if (hasConfiguredGroups) nav.textContent = "";
    const essentials = element("div", "sp-session-priority");
    const essentialTitle = localized("span", "sp-session-nav-heading sp-session-label", "Quick access", "وصول سريع");
    essentials.appendChild(essentialTitle);
    links.filter(function (link) { return primaryIds.has(link.dataset.spNavId); })
      .forEach(function (link) { essentials.appendChild(link); });
    if (hasConfiguredGroups) nav.appendChild(essentials);
    const moreTitle = localized("span", "sp-session-nav-heading sp-session-more-heading sp-session-label", "More tools", "أدوات إضافية");
    if (hasConfiguredGroups) nav.appendChild(moreTitle);
    groupLabels.forEach(function (heading) {
      const groupId = heading.dataset.spSessionEn;
      const groupKey = Object.keys(window.SafePermitNav.groups).find(function (name) {
        return window.SafePermitNav.groups[name][0] === groupId;
      });
      if (!groupKey) return;
      const contents = secondaryLinks.filter(function (link) { return link.dataset.spNavGroup === groupKey; });
      if (!contents.length) return;
      const detail = element("details", "sp-session-group");
      detail.dataset.spSessionGroup = groupKey;
      const summary = element("summary", "sp-session-group-toggle");
      summary.append(icon((window.SafePermitNav.groupIcons && window.SafePermitNav.groupIcons[groupKey]) || "permits"));
      summary.append(localized("span", "sp-session-group-name sp-session-label", heading.dataset.spSessionEn, heading.dataset.spSessionAr));
      const caret = element("span", "sp-session-caret");
      caret.setAttribute("aria-hidden", "true");
      caret.textContent = "⌄";
      summary.append(caret);
      detail.append(summary);
      const list = element("div", "sp-session-group-links");
      contents.forEach(function (link) { list.appendChild(link); });
      detail.append(list);
      nav.append(detail);
    });
    // Retain the page's original sidebar links if the central navigation fails to load.
    if (!hasConfiguredGroups) nav.replaceChildren(...links);

    // A keyboard-friendly page/tool finder. This searches only navigation labels,
    // not private permit records or backend data.
    const searchButton = element("button", "sp-session-search");
    searchButton.type = "button";
    searchButton.append(icon("inspection"), localized("span", "sp-session-label", "Quick Find", "بحث سريع"));
    const searchKey = element("kbd", "sp-session-search-key sp-session-label");
    searchKey.textContent = "Ctrl K";
    searchButton.append(searchKey);
    sidebar.insertBefore(searchButton, nav);
    const searchDialog = element("div", "sp-session-search-dialog");
    searchDialog.hidden = true;
    searchDialog.setAttribute("role", "dialog");
    searchDialog.setAttribute("aria-modal", "true");
    searchDialog.setAttribute("aria-label", "Find a page, tool or permit");
    const searchBox = element("div", "sp-session-search-box");
    const searchInput = element("input", "sp-session-search-input");
    searchInput.type = "search";
    searchInput.autocomplete = "off";
    searchInput.spellcheck = false;
    searchInput.setAttribute("aria-label", "Search pages and tools");
    const searchClose = element("button", "sp-session-search-close");
    searchClose.type = "button";
    searchClose.textContent = "×";
    const searchResults = element("div", "sp-session-search-results");
    searchResults.setAttribute("role", "navigation");
    const searchEmpty = element("p", "sp-session-search-empty");
    searchEmpty.setAttribute("role", "status");
    searchBox.append(searchInput, searchClose, searchResults, searchEmpty);
    searchDialog.append(searchBox);
    document.body.append(searchDialog);
    let searchSelection = 0;
    let resultLinks = [];
    let permitCache = null;
    // Recent pages and favorites: navigation conveniences stored on this device only.
    const favoritesKey = "safePermitFavorites:" + role;
    const recentKey = "safePermitRecent:" + role;
    function readList(key) {
      try { const value = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(value) ? value.filter(function (x) { return typeof x === "string"; }) : []; }
      catch (_) { return []; }
    }
    function writeList(key, list) { try { localStorage.setItem(key, JSON.stringify(list)); } catch (_) {} }
    function navId(link) { return link.dataset.spNavId || link.getAttribute("href"); }
    function isArabic() { return document.documentElement.lang === "ar"; }
    function searchLabel(link) {
      return isArabic() ? (link.dataset.spNavAr || link.textContent.trim()) : (link.dataset.spNavEn || link.textContent.trim());
    }
    function permitTitle(permit) {
      const info = permit.basicInfo || {};
      return String(info.workTitle || permit.workTitle || permit.title || "").trim();
    }
    function heading(className, english, arabic) {
      const node = localized("p", className, english, arabic);
      node.textContent = isArabic() ? arabic : english;
      return node;
    }
    // Permit lookup reads the same local demo repository the pages use. It is not access control.
    function loadPermits() {
      const repo = window.SafePermitData && window.SafePermitData.repository;
      if (!repo || typeof repo.listKnownPermits !== "function") { permitCache = []; return; }
      repo.listKnownPermits().then(function (list) {
        permitCache = Array.isArray(list) ? list : [];
        if (!searchDialog.hidden) renderSearch();
      }).catch(function () { permitCache = []; });
    }
    function renderSearch() {
      const ar = isArabic();
      const query = searchInput.value.trim().toLocaleLowerCase();
      const favorites = readList(favoritesKey);
      const pages = links.filter(function (link) {
        return !query || [link.dataset.spNavEn, link.dataset.spNavAr].some(function (value) {
          return String(value || "").toLocaleLowerCase().includes(query);
        });
      }).slice(0, 10);
      searchResults.textContent = "";
      resultLinks = [];
      function addRow(href, iconName, nodes, extra) {
        const row = element("div", "sp-session-search-row");
        const item = element("a", "sp-session-search-result");
        item.href = href;
        item.append(icon(iconName));
        nodes.forEach(function (node) { item.append(node); });
        const index = resultLinks.length;
        item.addEventListener("mouseenter", function () { searchSelection = index; updateSearchSelection(); });
        row.append(item);
        if (extra) row.append(extra);
        searchResults.append(row);
        resultLinks.push(item);
      }
      if (pages.length) searchResults.append(heading("sp-session-search-section", "Pages and tools", "الصفحات والأدوات"));
      pages.forEach(function (link) {
        const id = navId(link), on = favorites.indexOf(id) >= 0;
        const star = element("button", "sp-session-star");
        star.type = "button";
        star.setAttribute("aria-pressed", String(on));
        const label = searchLabel(link);
        star.setAttribute("aria-label", (on ? (ar ? "إزالة من المفضلة: " : "Remove from favorites: ") : (ar ? "إضافة إلى المفضلة: " : "Add to favorites: ")) + label);
        star.append(icon("star"));
        star.addEventListener("click", function () { toggleFavorite(id); renderSearch(); const again = searchResults.querySelectorAll(".sp-session-star")[pages.indexOf(link)]; if (again) again.focus(); });
        const span = element("span");
        span.textContent = label;
        addRow(link.href, routeIcon(link), [span], star);
      });
      let permits = [];
      if (query.length >= 2 && Array.isArray(permitCache) && window.SafePermitNav && window.SafePermitNav.permitRoute) {
        permits = permitCache.filter(function (permit) {
          return permit && permit.id != null && [permit.id, permitTitle(permit)].some(function (value) { return String(value || "").toLocaleLowerCase().includes(query); });
        }).slice(0, 6);
      }
      if (permits.length) {
        searchResults.append(heading("sp-session-search-section", "Permits · local demo records", "التصاريح · سجلات تجريبية محلية"));
        permits.forEach(function (permit) {
          const id = element("strong");
          id.textContent = String(permit.id);
          id.setAttribute("data-i18n-ignore", "");
          const sub = element("span", "sp-session-search-sub");
          sub.textContent = [permitTitle(permit), permit.status].filter(Boolean).join(" · ");
          sub.setAttribute("data-i18n-ignore", "");
          addRow(new URL(window.SafePermitNav.permitRoute(role, permit.id, permit.status), projectRoot).href, "permits", [id, sub]);
        });
        searchResults.append(heading("sp-session-search-note", "Found in this browser only. Opening a record still goes through the page checks; this list is not access control.", "موجودة في هذا المتصفح فقط. يمرّ فتح السجل عبر فحوص الصفحة نفسها؛ هذه القائمة ليست تحكمًا في الوصول."));
      }
      searchSelection = Math.min(searchSelection, Math.max(0, resultLinks.length - 1));
      updateSearchSelection();
      searchEmpty.textContent = resultLinks.length ? "" : (ar ? "لا توجد نتائج. جرّب كلمة أخرى." : "No matching pages or permits. Try another keyword.");
      searchEmpty.hidden = !!resultLinks.length;
    }
    function updateSearchSelection() {
      resultLinks.forEach(function (item, index) {
        const on = index === searchSelection;
        item.classList.toggle("is-selected", on);
        if (on && item.scrollIntoView) item.scrollIntoView({ block: "nearest" });
      });
    }
    function closeSearch() {
      if (searchDialog.hidden) return;
      searchDialog.hidden = true;
      document.body.classList.remove("sp-session-search-open");
      searchButton.focus();
    }
    function openSearch() {
      closeAll(false);
      searchDialog.hidden = false;
      document.body.classList.add("sp-session-search-open");
      searchInput.value = "";
      searchSelection = 0;
      permitCache = null;
      loadPermits();
      renderSearch();
      searchInput.focus();
    }
    searchButton.addEventListener("click", openSearch);
    searchClose.addEventListener("click", closeSearch);
    searchDialog.addEventListener("pointerdown", function (event) { if (event.target === searchDialog) closeSearch(); });
    searchInput.addEventListener("input", function () { searchSelection = 0; renderSearch(); });
    searchDialog.addEventListener("keydown", function (event) {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeSearch(); }
      else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (resultLinks.length) searchSelection = (searchSelection + (event.key === "ArrowDown" ? 1 : -1) + resultLinks.length) % resultLinks.length;
        updateSearchSelection();
      } else if (event.key === "Enter" && document.activeElement === searchInput && resultLinks.length) {
        event.preventDefault();
        resultLinks[searchSelection].click();
      } else if (event.key === "Tab") {
        const tabbable = [searchInput].concat(Array.from(searchResults.querySelectorAll("a, button")), [searchClose]);
        const index = tabbable.indexOf(document.activeElement);
        if (event.shiftKey && index === 0) { event.preventDefault(); searchClose.focus(); }
        if (!event.shiftKey && index === tabbable.length - 1) { event.preventDefault(); searchInput.focus(); }
      }
    });
    document.addEventListener("keydown", function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (searchDialog.hidden) openSearch(); else closeSearch();
      }
    });

    // Recent and favorite pages, at the end of the sidebar (icons only while the rail is collapsed).
    const memory = element("div", "sp-session-memory");
    function memoryLink(source) {
      const link = element("a", "sp-session-link sp-session-memory-link");
      link.href = source.href;
      const label = localized("span", "sp-session-label", source.dataset.spNavEn || source.textContent.trim(), source.dataset.spNavAr || source.textContent.trim());
      label.textContent = searchLabel(source);
      link.append(icon(routeIcon(source)), label);
      link.setAttribute("aria-label", searchLabel(source));
      link.title = searchLabel(source);
      return link;
    }
    function toggleFavorite(id) {
      const list = readList(favoritesKey);
      const at = list.indexOf(id);
      if (at >= 0) list.splice(at, 1); else list.unshift(id);
      writeList(favoritesKey, list.slice(0, 5));
      renderMemory();
    }
    function renderMemory() {
      memory.textContent = "";
      const current = links.find(function (link) { return link.classList.contains("is-active"); });
      const byId = function (id) { return links.find(function (link) { return navId(link) === id; }); };
      const favorites = readList(favoritesKey).map(byId).filter(Boolean);
      const recent = readList(recentKey).map(byId).filter(function (link) { return link && link !== current && favorites.indexOf(link) < 0; }).slice(0, 4);
      if (favorites.length) {
        memory.append(heading("sp-session-nav-heading sp-session-label", "Favorites", "المفضلة"));
        favorites.forEach(function (link) { memory.append(memoryLink(link)); });
      }
      if (recent.length) {
        memory.append(heading("sp-session-nav-heading sp-session-label", "Recent", "الأخيرة"));
        recent.forEach(function (link) { memory.append(memoryLink(link)); });
      }
      memory.hidden = !favorites.length && !recent.length;
    }
    function remember() {
      const current = links.find(function (link) { return link.classList.contains("is-active"); });
      if (!current) return;
      const id = navId(current);
      if (id === "home" || id === "dashboard") return;
      writeList(recentKey, [id].concat(readList(recentKey).filter(function (x) { return x !== id; })).slice(0, 6));
    }
    if (hasConfiguredGroups) nav.append(memory);

    const workspace = element("button", "sp-session-workspace");
    workspace.type = "button";
    const mark = element("img", "sp-session-mark");
    mark.src = window.SafePermitPaths ? window.SafePermitPaths.logo : new URL("assets/images/logo/logo-mark.png", projectRoot).href;
    mark.alt = "";
    const brandText = element("span", "sp-session-label sp-session-brand-text");
    const brandName = element("strong");
    brandName.textContent = "SafePermit";
    brandName.setAttribute("data-i18n-ignore", "");
    brandText.append(brandName, localized("small", "", roleNames[role][0], roleNames[role][1]));
    workspace.append(mark, brandText, icon("chevrons"));
    top.prepend(workspace);

    const footer = element("div", "sp-session-footer");
    const pinButton = element("button", "sp-session-link sp-session-pin");
    pinButton.type = "button";
    const pinLabel = localized("span", "sp-session-label", "Pin sidebar", "تثبيت القائمة");
    pinButton.append(icon("pin"), pinLabel);
    const account = element("button", profile.className + " sp-session-account");
    account.type = "button";
    while (profile.firstChild) account.appendChild(profile.firstChild);
    profile.remove();
    const avatar = account.querySelector('[class*="avatar"]');
    if (avatar) avatar.classList.add("sp-session-avatar");
    Array.from(account.children).forEach(function (node) { if (node !== avatar) node.classList.add("sp-session-label", "sp-session-account-text"); });
    account.append(icon("chevrons"));
    footer.append(pinButton, account);
    sidebar.appendChild(footer);

    const workspacePanel = element("section", "sp-session-dropdown");
    const workspaceTitle = localized("h2", "sp-session-dropdown-title", "Your workspace", "مساحة عملك");
    workspacePanel.appendChild(workspaceTitle);
    const accountPanel = element("section", "sp-session-dropdown");
    const accountTitle = localized("h2", "sp-session-dropdown-title", "Account & preferences", "الحساب والتفضيلات");
    const accountName = element("strong", "sp-session-dropdown-name");
    const accountEmail = element("span", "sp-session-dropdown-email");
    accountName.setAttribute("data-i18n-ignore", "");
    accountEmail.setAttribute("data-i18n-ignore", "");
    accountPanel.append(accountTitle, accountName, accountEmail);

    function addPanelLink(panel, path, iconName, english, arabic) {
      const link = element("a", "sp-session-dropdown-link");
      link.href = new URL(path, projectRoot).href;
      link.append(icon(iconName), localized("span", "", english, arabic));
      panel.appendChild(link);
      return link;
    }

    addPanelLink(workspacePanel, role + "/dashboard/", "dashboard", "Dashboard", "لوحة التحكم");
    if (role === "admin") {
      addPanelLink(workspacePanel, "admin/users/", "users", "Manage users", "إدارة المستخدمين");
      addPanelLink(workspacePanel, "admin/sites-areas/", "sites", "Sites & Areas", "المواقع والمناطق");
      addPanelLink(workspacePanel, "admin/settings/", "settings", "Settings", "الإعدادات");
    }
    addPanelLink(accountPanel, role + "/profile/", "profile", "Open profile", "فتح الملف الشخصي");
    const tools = sidebar.querySelector("[data-sp-role-sidebar-tools]");
    if (tools) accountPanel.appendChild(tools);
    const tip = Array.from(sidebar.children).find(function (node) { return /(?:__tip|__support)$/.test(node.className); });
    if (tip) {
      tip.classList.add("sp-session-workspace-info");
      workspacePanel.appendChild(tip);
    }
    const signOut = element("button", "sp-session-dropdown-link sp-session-signout");
    signOut.type = "button";
    signOut.append(icon("logout"), localized("span", "", "Sign out", "تسجيل الخروج"));
    accountPanel.appendChild(signOut);

    function syncExpanded() {
      // Only keyboard focus keeps the rail open; a mouse click on "Unpin" must let it collapse (v13.6).
      let focused = sidebar.contains(document.activeElement);
      if (focused) { try { focused = document.activeElement.matches(":focus-visible"); } catch (_) {} }
      const expanded = !desktop.matches || pinned || hovered || focused || dropdowns.some(function (item) { return !item.panel.hidden; });
      sidebar.classList.toggle("is-expanded", expanded);
      shell.classList.toggle("is-sidebar-expanded", expanded);
      sidebar.setAttribute("data-collapsed", String(!expanded));
      pinButton.setAttribute("aria-pressed", String(pinned));
    }

    function positionPanel(item) {
      if (item.panel.hidden) return;
      const rect = item.trigger.getBoundingClientRect();
      const rail = sidebar.getBoundingClientRect();
      const rtl = document.documentElement.dir === "rtl";
      const margin = 12;
      const panelWidth = item.panel.getBoundingClientRect().width;
      let left = desktop.matches ? (rtl ? rail.left - panelWidth - 8 : rail.right + 8) : (rtl ? rail.right - panelWidth : rail.left + margin);
      left = Math.max(margin, Math.min(left, window.innerWidth - panelWidth - margin));
      const panelHeight = item.panel.getBoundingClientRect().height;
      const topPosition = Math.max(margin, Math.min(rect.top, window.innerHeight - panelHeight - margin));
      item.panel.style.left = left + "px";
      item.panel.style.top = topPosition + "px";
    }

    function closeDropdown(item, restoreFocus) {
      item.panel.hidden = true;
      item.trigger.setAttribute("aria-expanded", "false");
      if (restoreFocus) item.trigger.focus();
      syncExpanded();
    }

    function closeAll(restoreFocus) {
      dropdowns.forEach(function (item) { if (!item.panel.hidden) closeDropdown(item, restoreFocus); });
    }

    function syncMobile() {
      const closed = !desktop.matches && !sidebar.classList.contains("is-open");
      sidebar.inert = closed;
      if (closed) {
        sidebar.setAttribute("aria-hidden", "true");
        closeAll(false);
      } else sidebar.removeAttribute("aria-hidden");
      if (mobileOpen) {
        mobileOpen.setAttribute("aria-label", document.documentElement.lang === "ar" ? "فتح قائمة التنقل" : "Open navigation menu");
        mobileOpen.setAttribute("aria-controls", sidebar.id);
        mobileOpen.setAttribute("aria-expanded", String(!closed));
      }
    }

    function openDropdown(item, focusLast) {
      closeAll(false);
      accountName.textContent = account.querySelector("strong").textContent;
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem("safePermit" + role[0].toUpperCase() + role.slice(1) + "Profile") || "null"); } catch (error) {}
      accountEmail.textContent = saved && typeof saved.email === "string" ? saved.email : "";
      accountEmail.hidden = !accountEmail.textContent;
      item.panel.hidden = false;
      item.trigger.setAttribute("aria-expanded", "true");
      syncExpanded();
      positionPanel(item);
      const controls = Array.from(item.panel.querySelectorAll("a[href],button:not([disabled])"));
      const target = focusLast ? controls[controls.length - 1] : controls[0];
      if (target) target.focus();
    }

    function dropdown(trigger, panel, suffix) {
      panel.id = sidebar.id + "-" + suffix;
      panel.hidden = true;
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-modal", "false");
      panel.setAttribute("aria-labelledby", panel.id + "-title");
      panel.querySelector("h2").id = panel.id + "-title";
      panel.setAttribute("data-sp-session-panel", "");
      trigger.setAttribute("aria-controls", panel.id);
      trigger.setAttribute("aria-haspopup", "dialog");
      trigger.setAttribute("aria-expanded", "false");
      document.body.appendChild(panel);
      const item = { trigger: trigger, panel: panel };
      dropdowns.push(item);
      trigger.addEventListener("click", function () { if (panel.hidden) openDropdown(item); else closeDropdown(item, true); });
      trigger.addEventListener("keydown", function (event) {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          openDropdown(item, event.key === "ArrowUp");
        }
      });
      panel.addEventListener("keydown", function (event) {
        const controls = Array.from(panel.querySelectorAll("a[href],button:not([disabled])"));
        const index = controls.indexOf(document.activeElement);
        if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Home" || event.key === "End") {
          event.preventDefault();
          const next = event.key === "Home" ? 0 : event.key === "End" ? controls.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + controls.length) % controls.length;
          if (controls[next]) controls[next].focus();
        } else if (event.key === "Tab" && ((event.shiftKey && index === 0) || (!event.shiftKey && index === controls.length - 1))) {
          // Return to the trigger, then let normal Tab order leave the dropdown.
          closeDropdown(item, true);
          if (!desktop.matches) event.preventDefault();
        }
      });
      return item;
    }

    dropdown(workspace, workspacePanel, "workspace");
    dropdown(account, accountPanel, "account");
    pinButton.addEventListener("click", function () {
      pinned = !pinned;
      try { localStorage.setItem("safePermitSidebarPinned:" + role, String(pinned)); } catch (_) {}
      syncExpanded(); updateLabels();
    });
    sidebar.addEventListener("pointerenter", function (event) { if (event.pointerType !== "touch") { hovered = true; syncExpanded(); } });
    sidebar.addEventListener("pointerleave", function () { hovered = false; syncExpanded(); });
    sidebar.addEventListener("focusout", function () { window.setTimeout(syncExpanded, 0); });
    document.addEventListener("focusin", function (event) {
      if (!sidebar.contains(event.target) && !dropdowns.some(function (item) { return item.panel.contains(event.target); })) closeAll(false);
      syncExpanded();
    });
    document.addEventListener("pointerdown", function (event) {
      if (!dropdowns.some(function (item) { return item.trigger.contains(event.target) || item.panel.contains(event.target); })) closeAll(false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        const open = dropdowns.find(function (item) { return !item.panel.hidden; });
        if (open) { event.preventDefault(); event.stopImmediatePropagation(); closeDropdown(open, true); }
        else if (!desktop.matches && sidebar.classList.contains("is-open") && mobileClose) {
          event.preventDefault();
          mobileClose.click();
          if (mobileOpen) mobileOpen.focus();
        }
      } else if (event.key === "Tab" && !desktop.matches && sidebar.classList.contains("is-open") && !dropdowns.some(function (item) { return !item.panel.hidden; })) {
        const controls = Array.from(sidebar.querySelectorAll("a[href],button:not([disabled])")).filter(function (node) { return node.getClientRects().length > 0; });
        const first = controls[0];
        const last = controls[controls.length - 1];
        if ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        }
      }
    }, true);
    signOut.addEventListener("click", function () {
      const request = new CustomEvent("safepermit:signout", { cancelable: true, detail: { role: role } });
      if (!document.dispatchEvent(request)) return;
      // This project currently has demo authentication; clear only its role key.
      try { localStorage.removeItem("safePermitCurrentRole"); } catch (error) {}
      window.location.href = new URL("auth/login/", projectRoot).href;
    });

    function updateLabels() {
      const arabic = document.documentElement.lang === "ar";
      if (window.SafePermitNav && nav.hasAttribute("data-sp-nav-rendered")) {
        window.SafePermitNav.localize(sidebar);
        window.SafePermitNav.renderBreadcrumb(sidebar, role, projectRoot, links.find(function (link) { return link.classList.contains("is-active"); }) || null);
      }
      [sidebar, workspacePanel, accountPanel].forEach(function (scope) {
        scope.querySelectorAll("[data-sp-session-en]").forEach(function (node) { node.textContent = arabic ? node.dataset.spSessionAr : node.dataset.spSessionEn; });
      });
      links.forEach(function (link) {
        const text = link.querySelector(".sp-session-label").textContent.trim();
        link.setAttribute("aria-label", text);
        link.title = text;
      });
      workspace.setAttribute("aria-label", arabic ? "خيارات مساحة العمل" : "Workspace options");
      account.setAttribute("aria-label", (arabic ? "خيارات الحساب: " : "Account options: ") + account.querySelector("strong").textContent.trim());
      const pinText = arabic ? (pinned ? "إلغاء تثبيت القائمة" : "تثبيت القائمة") : (pinned ? "Unpin sidebar" : "Pin sidebar");
      pinLabel.textContent = pinText;
      pinButton.setAttribute("aria-label", pinText);
      pinButton.title = pinText;
      const ar = document.documentElement.lang === "ar";
      searchDialog.setAttribute("aria-label", ar ? "البحث عن صفحة أو أداة أو تصريح" : "Find a page, tool or permit");
      if (mobileOpen) mobileOpen.setAttribute("aria-label", ar ? "فتح قائمة التنقل" : "Open navigation menu");
      searchInput.setAttribute("aria-label", ar ? "البحث في الصفحات والأدوات والتصاريح" : "Search pages, tools and permits");
      searchResults.setAttribute("aria-label", ar ? "نتائج البحث" : "Search results");
      searchInput.placeholder = ar ? "ابحث عن صفحة أو رقم تصريح..." : "Search pages or a permit ID...";
      searchClose.setAttribute("aria-label", ar ? "إغلاق البحث" : "Close search");
      if (!searchDialog.hidden) renderSearch();
      renderMemory();
      dropdowns.forEach(positionPanel);
    }

    function updateActive() {
      if (window.SafePermitNav && nav.hasAttribute("data-sp-nav-rendered")) {
        const current = window.SafePermitNav.activeItem(links, window.location);
        links.forEach(function (link) {
          link.classList.toggle("is-active", link === current);
          if (link === current) link.setAttribute("aria-current", "page");
          else link.removeAttribute("aria-current");
        });
        window.SafePermitNav.renderBreadcrumb(sidebar, role, projectRoot, current);
        nav.querySelectorAll(".sp-session-group").forEach(function (group) {
          if (current && group.contains(current)) group.open = true;
        });
        return;
      }
      const normalizePath = function (value) { return value.replace(/\/index\.html$/, "/").replace(/\/$/, ""); };
      const current = normalizePath(window.location.pathname);
      const hashMatch = window.location.hash && links.find(function (link) { return normalizePath(link.pathname) === current && link.hash === window.location.hash; });
      const pathMatch = links.find(function (link) { return !link.hash && normalizePath(link.pathname) === current; });
      const active = hashMatch || pathMatch || originalActive;
      links.forEach(function (link) {
        link.classList.toggle("is-active", link === active);
        if (link === active) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      });
    }

    function onResize() { syncExpanded(); syncMobile(); dropdowns.forEach(positionPanel); }
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", function () { dropdowns.forEach(positionPanel); }, { passive: true });
    window.addEventListener("hashchange", updateActive);
    window.addEventListener("popstate", updateActive);
    window.addEventListener("safepermit:viewchange", updateActive);
    document.addEventListener("safepermit:languagechange", function () { updateLabels(); window.setTimeout(updateLabels, 0); });
    document.addEventListener("safepermit:i18nready", updateLabels);
    desktop.addEventListener("change", function () { hovered = false; closeAll(false); syncExpanded(); syncMobile(); });
    new MutationObserver(syncMobile).observe(sidebar, { attributes: true, attributeFilter: ["class"] });
    if (mobileOpen) mobileOpen.addEventListener("click", function () { if (!desktop.matches) window.setTimeout(function () { syncMobile(); workspace.focus(); }, 0); });
    shell.addEventListener("transitionend", function (event) { if (event.target === shell && event.propertyName === "grid-template-columns") dropdowns.forEach(positionPanel); });
    if (window.SafePermitI18n) {
      [sidebar, workspacePanel, accountPanel].forEach(function (scope) { window.SafePermitI18n.apply(scope); });
    }
    updateActive();
    remember();
    updateLabels();
    syncExpanded();
    syncMobile();
    const controller = Object.freeze({
      element: sidebar,
      expand: function () { pinned = true; syncExpanded(); updateLabels(); },
      collapse: function () { pinned = false; closeAll(false); if (sidebar.contains(document.activeElement)) document.activeElement.blur(); hovered = false; syncExpanded(); updateLabels(); }
    });
    instances.set(sidebar, controller);
    return controller;
  }

  function initAll() {
    return Array.from(document.querySelectorAll("#workerSidebar,#supervisorSidebar,#safetySidebar,#adminSidebar")).map(init).filter(Boolean);
  }

  window.SafePermitSessionSidebar = Object.freeze({ init: init, initAll: initAll });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAll, { once: true });
  else initAll();
})();
