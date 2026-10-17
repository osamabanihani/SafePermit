(function () {
  if (window.__SafePermitMotionLoaded) {
    return;
  }

  window.__SafePermitMotionLoaded = true;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const navSessionKey = "safePermitNavMotionState";
  const pageTransitionSessionKey = "safePermitPageTransition";
  let pageTransitionBusy = false;
  document.documentElement.classList.add("sp-motion-enabled");

  function revealElement(element) {
    if (!element) {
      return;
    }

    element.classList.add("is-sp-visible");
  }

  function prepareStagger() {
    document.querySelectorAll("[data-sp-stagger]").forEach(function (container) {
      const gap = Number(container.getAttribute("data-sp-stagger")) || 80;

      container.querySelectorAll(":scope > [data-sp-reveal]").forEach(function (item, index) {
        item.style.setProperty("--sp-motion-delay", Math.min(index * gap, 320) + "ms");
      });
    });
  }

  function initReveals() {
    const items = Array.from(document.querySelectorAll("[data-sp-reveal]"));

    if (!items.length) {
      return;
    }

    prepareStagger();

    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      items.forEach(revealElement);
      return;
    }

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) {
            return;
          }

          revealElement(entry.target);
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -6% 0px"
      }
    );

    items.forEach(function (item) {
      observer.observe(item);
    });
  }

  function restartClass(element, className) {
    if (!element) {
      return;
    }

    element.classList.remove(className);

    if (reducedMotion.matches) {
      element.classList.add(className);
      return;
    }

    void element.offsetWidth;
    requestAnimationFrame(function () {
      element.classList.add(className);
    });
  }

  /* Page Transition System */
  function readPageTransitionState() {
    try {
      const value = JSON.parse(
        sessionStorage.getItem(pageTransitionSessionKey) || "null"
      );

      if (!value || Date.now() - Number(value.time || 0) > 4000) {
        return null;
      }

      return value;
    } catch (error) {
      return null;
    }
  }

  function writePageTransitionState(target) {
    try {
      sessionStorage.setItem(
        pageTransitionSessionKey,
        JSON.stringify({
          target: target,
          time: Date.now()
        })
      );
    } catch (error) {
      return;
    }
  }

  function clearPageTransitionState() {
    try {
      sessionStorage.removeItem(pageTransitionSessionKey);
    } catch (error) {
      return;
    }
  }

  function ensurePageTransitionLayer() {
    let layer = document.querySelector(".sp-page-transition");

    if (layer) {
      return layer;
    }

    layer = document.createElement("div");
    layer.className = "sp-page-transition";
    layer.setAttribute("aria-hidden", "true");
    layer.innerHTML = '<span class="sp-page-transition__line"></span>';
    document.body.appendChild(layer);

    return layer;
  }

  function pageTransitionTarget(value) {
    try {
      return new URL(value, window.location.href);
    } catch (error) {
      return null;
    }
  }

  function canUsePageTransition(event, link) {
    if (
      !link ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      link.target === "_blank" ||
      link.hasAttribute("download") ||
      link.hasAttribute("data-sp-no-page-transition")
    ) {
      return false;
    }

    const target = pageTransitionTarget(link.href);

    if (!target || target.origin !== window.location.origin) {
      return false;
    }

    const current = new URL(window.location.href);

    if (target.href === current.href) {
      return false;
    }

    if (
      target.pathname === current.pathname &&
      target.search === current.search &&
      target.hash !== current.hash
    ) {
      return false;
    }

    return true;
  }

  function navigateWithTransition(value, delay) {
    const target = pageTransitionTarget(value);

    if (!target) {
      return false;
    }

    if (
      reducedMotion.matches ||
      target.origin !== window.location.origin
    ) {
      window.location.href = target.href;
      return true;
    }

    if (pageTransitionBusy) {
      return true;
    }

    pageTransitionBusy = true;
    writePageTransitionState(target.href);

    const layer = ensurePageTransitionLayer();
    layer.classList.remove("is-sp-page-arriving");
    void layer.offsetWidth;
    layer.classList.add("is-sp-page-leaving");
    document.body.classList.add("sp-page-leaving");

    window.setTimeout(function () {
      window.location.href = target.href;
    }, Number(delay) || 270);

    return true;
  }

  function initPageTransitions() {
    if (roleFromPath()) document.body.classList.add("sp-role-subtle-transition");
    if (document.body.dataset.spPageTransition === "ready") {
      return;
    }

    document.body.dataset.spPageTransition = "ready";
    const layer = ensurePageTransitionLayer();
    const incoming = readPageTransitionState();

    if (incoming && !reducedMotion.matches) {
      layer.classList.add("is-sp-page-arriving");
      document.body.classList.add("sp-page-arriving");

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          document.documentElement.classList.remove("sp-page-booting");
          layer.classList.remove("is-sp-page-arriving");

          window.setTimeout(function () {
            document.body.classList.remove("sp-page-arriving");
          }, 430);
        });
      });
    } else {
      document.documentElement.classList.remove("sp-page-booting");
    }

    clearPageTransitionState();

    document.addEventListener("click", function (event) {
      const link = event.target.closest("a[href]");

      if (
        !link ||
        link.hasAttribute("data-sp-nav-motion-item") ||
        !canUsePageTransition(event, link)
      ) {
        return;
      }

      // v13.6: role workspaces navigate natively and immediately (no artificial delay);
      // the incoming page fades its content in instead. Public pages keep their transition.
      if (roleFromPath()) {
        return;
      }

      event.preventDefault();
      navigateWithTransition(link.href, 270);
    });

    window.addEventListener("pageshow", function () {
      pageTransitionBusy = false;
      document.documentElement.classList.remove("sp-page-booting");
      document.body.classList.remove("sp-page-leaving", "sp-page-arriving");
      layer.classList.remove("is-sp-page-leaving", "is-sp-page-arriving");
    });
  }

  function roleFromPath() {
    const path = window.location.pathname.toLowerCase();

    if (path.includes("/worker/")) return "worker";
    if (path.includes("/supervisor/")) return "supervisor";
    if (path.includes("/safety/")) return "safety";
    if (path.includes("/admin/")) return "admin";

    return "";
  }

  function safeReadNavState() {
    try {
      const value = JSON.parse(sessionStorage.getItem(navSessionKey) || "null");

      if (!value || Date.now() - Number(value.time || 0) > 2600) {
        return null;
      }

      return value;
    } catch (error) {
      return null;
    }
  }

  function safeWriteNavState(value) {
    try {
      sessionStorage.setItem(navSessionKey, JSON.stringify(value));
    } catch (error) {
      return;
    }
  }

  function normalizeUrl(value) {
    try {
      const url = new URL(value, window.location.href);
      let path = url.pathname.replace(/index\.html$/i, "");

      if (!path.endsWith("/")) {
        path += "/";
      }

      return path;
    } catch (error) {
      return "";
    }
  }

  function currentNavItem(items) {
    const explicit = items.find(function (item) {
      return item.classList.contains("is-active");
    });

    if (explicit) {
      return explicit;
    }

    const current = normalizeUrl(window.location.href);

    return items.find(function (item) {
      return normalizeUrl(item.href) === current;
    }) || null;
  }

  function canAnimateNavigation(event, link) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      link.target === "_blank" ||
      link.hasAttribute("download")
    ) {
      return false;
    }

    try {
      const target = new URL(link.href, window.location.href);

      return target.origin === window.location.origin && target.href !== window.location.href;
    } catch (error) {
      return false;
    }
  }

  function setSidebarIndicator(nav, indicator, item, animate) {
    if (!nav || !indicator || !item) {
      return;
    }

    if (!animate) {
      indicator.classList.add("is-sp-nav-no-transition");
    }

    indicator.style.setProperty("--sp-side-y", item.offsetTop + "px");
    indicator.style.setProperty("--sp-side-h", item.offsetHeight + "px");

    if (!animate) {
      requestAnimationFrame(function () {
        indicator.classList.remove("is-sp-nav-no-transition");
      });
    }
  }

  function initSidebarMotion() {
    const sidebar = document.querySelector(
      'aside[id$="Sidebar"], aside[class*="-sidebar"]'
    );

    if (!sidebar || sidebar.dataset.spSideMotion === "ready") {
      return;
    }

    const nav = sidebar.querySelector("nav");

    if (!nav) {
      return;
    }

    const items = Array.from(nav.querySelectorAll("a[href]"));

    if (!items.length) {
      return;
    }

    sidebar.dataset.spSideMotion = "ready";
    nav.dataset.spNavMotion = "ready";

    items.forEach(function (item, index) {
      item.dataset.spNavMotionItem = "";
      item.style.setProperty("--sp-nav-item-index", String(index));
    });

    const indicator = document.createElement("span");
    indicator.className = "sp-side-nav-indicator";
    indicator.setAttribute("aria-hidden", "true");
    nav.prepend(indicator);

    const active = currentNavItem(items);
    const activeIndex = active ? items.indexOf(active) : -1;
    const role = roleFromPath();
    const prior = safeReadNavState();

    if (
      active &&
      prior &&
      prior.role === role &&
      Number.isInteger(prior.fromIndex) &&
      items[prior.fromIndex] &&
      prior.fromIndex !== activeIndex &&
      !reducedMotion.matches
    ) {
      setSidebarIndicator(nav, indicator, items[prior.fromIndex], false);

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          setSidebarIndicator(nav, indicator, active, true);
          active.classList.add("is-sp-nav-arriving");

          window.setTimeout(function () {
            active.classList.remove("is-sp-nav-arriving");
          }, 620);
        });
      });
    } else if (active) {
      setSidebarIndicator(nav, indicator, active, false);
    }

    try {
      sessionStorage.removeItem(navSessionKey);
    } catch (error) {
      // Ignore unavailable session storage.
    }

    items.forEach(function (item, index) {
      item.addEventListener("mouseenter", function () {
        sidebar.style.setProperty("--sp-nav-hover-index", String(index));
      });

      item.addEventListener("click", function (event) {
        if (!canAnimateNavigation(event, item)) {
          if (item === active) {
            restartClass(item, "is-sp-nav-arriving");
          }
          return;
        }

        const current = currentNavItem(items);
        const fromIndex = current ? items.indexOf(current) : activeIndex;

        safeWriteNavState({
          role: role,
          fromIndex: fromIndex < 0 ? index : fromIndex,
          toIndex: index,
          time: Date.now()
        });

        items.forEach(function (candidate) {
          candidate.classList.remove("is-sp-nav-committing");
        });

        item.classList.add("is-sp-nav-committing");
        setSidebarIndicator(nav, indicator, item, !reducedMotion.matches);

        if (reducedMotion.matches || roleFromPath()) {
          return;
        }

        event.preventDefault();

        navigateWithTransition(item.href, 270);
      });
    });

    const openButton = document.getElementById("sidebarOpen");
    const closeButton = document.getElementById("sidebarClose");
    const overlay = document.querySelector('[id$="Overlay"], [class*="-overlay"]');

    function markOpening() {
      sidebar.classList.remove("is-sp-drawer-opening");
      void sidebar.offsetWidth;
      sidebar.classList.add("is-sp-drawer-opening");

      items.forEach(function (item, index) {
        item.style.setProperty("--sp-drawer-item-delay", Math.min(index * 42, 260) + "ms");
      });

      if (openButton) {
        openButton.setAttribute("aria-expanded", "true");
      }

      window.setTimeout(function () {
        sidebar.classList.remove("is-sp-drawer-opening");
      }, 760);
    }

    function markClosed() {
      if (openButton) {
        openButton.setAttribute("aria-expanded", "false");
      }
    }

    if (openButton) {
      openButton.setAttribute("aria-expanded", "false");
      openButton.addEventListener("click", markOpening);
    }

    if (closeButton) {
      closeButton.addEventListener("click", markClosed);
    }

    if (overlay) {
      overlay.addEventListener("click", markClosed);
    }

    window.addEventListener("resize", function () {
      if (window.innerWidth > 820) {
        markClosed();
      }

      const current = currentNavItem(items);
      if (current) {
        setSidebarIndicator(nav, indicator, current, false);
      }
    });
  }

  function navbarItemFromSection(links) {
    if (!links.length) {
      return null;
    }

    const sections = ["workflow", "features", "roles"]
      .map(function (id) {
        return document.getElementById(id);
      })
      .filter(Boolean);

    let sectionId = "";

    sections.forEach(function (section) {
      if (section.getBoundingClientRect().top <= 190) {
        sectionId = section.id;
      }
    });

    if (!sectionId) {
      return links.find(function (link) {
        return link.hasAttribute("data-sp-nav-home");
      }) || links[0];
    }

    return links.find(function (link) {
      return new URL(link.href, window.location.href).hash === "#" + sectionId;
    }) || links[0];
  }

  function setNavbarIndicator(container, indicator, item, animate) {
    if (!container || !indicator || !item || window.innerWidth <= 820) {
      return;
    }

    if (!animate) {
      indicator.classList.add("is-sp-nav-no-transition");
    }

    indicator.style.setProperty("--sp-top-x", item.offsetLeft + "px");
    indicator.style.setProperty("--sp-top-w", item.offsetWidth + "px");

    if (!animate) {
      requestAnimationFrame(function () {
        indicator.classList.remove("is-sp-nav-no-transition");
      });
    }
  }

  function initNavbarMotion(host) {
    const scope = host || document.getElementById("shared-navbar");

    if (!scope || scope.dataset.spNavbarMotion === "ready") {
      return;
    }

    // The full-screen public menu owns its toggle and masked item animation.
    if (scope.dataset.variant === "home" && scope.querySelector("[data-sp-nav-overlay]")) return;

    const navbar = scope.querySelector("[data-sp-navbar]");
    const linksContainer = scope.querySelector("[data-sp-home-links]");
    const toggle = scope.querySelector("[data-sp-nav-toggle]");

    if (!navbar) {
      return;
    }

    scope.dataset.spNavbarMotion = "ready";
    navbar.dataset.spNavbarMotion = "ready";

    if (toggle) {
      toggle.dataset.spNavToggleMotion = "";
    }

    if (!linksContainer || scope.dataset.variant !== "home") {
      return;
    }

    const links = Array.from(linksContainer.querySelectorAll("a[href]"));

    if (!links.length) {
      return;
    }

    linksContainer.dataset.spTopNavMotion = "";

    const indicator = document.createElement("span");
    indicator.className = "sp-top-nav-indicator";
    indicator.setAttribute("aria-hidden", "true");
    linksContainer.prepend(indicator);

    function syncActive(animate) {
      const active = navbarItemFromSection(links);

      links.forEach(function (link) {
        link.classList.toggle("is-sp-scroll-active", link === active);
      });

      setNavbarIndicator(linksContainer, indicator, active, animate);
    }

    let ticking = false;

    function requestSync() {
      if (ticking) {
        return;
      }

      ticking = true;
      requestAnimationFrame(function () {
        syncActive(true);
        ticking = false;
      });
    }

    links.forEach(function (link) {
      link.addEventListener("click", function () {
        links.forEach(function (item) {
          item.classList.remove("is-sp-scroll-active");
        });

        link.classList.add("is-sp-scroll-active");
        setNavbarIndicator(linksContainer, indicator, link, true);
      });
    });

    syncActive(false);
    window.addEventListener("scroll", requestSync, { passive: true });
    window.addEventListener("resize", function () {
      syncActive(false);
    });
  }

  function watchSharedNavbar() {
    const host = document.getElementById("shared-navbar");

    if (!host) {
      return;
    }

    if (host.querySelector("[data-sp-navbar]")) {
      initNavbarMotion(host);
      return;
    }

    const observer = new MutationObserver(function () {
      if (!host.querySelector("[data-sp-navbar]")) {
        return;
      }

      observer.disconnect();
      initNavbarMotion(host);
    });

    observer.observe(host, { childList: true, subtree: true });
  }

  function initNavigationMotion() {
    initSidebarMotion();
    watchSharedNavbar();
  }


  /* Filters + Search + Empty States Motion System */
  const filterPageConfigs = [
    {
      match: "/worker/permits/",
      toolbar: ".permits-toolbar",
      search: "#permitSearch",
      controls: "#riskFilter, #sortFilter, [data-status-filter]",
      buttons: "[data-status-filter]",
      items: "#permitTableBody .permit-item, #permitCards .permit-item",
      containers: "#permitTableBody, #permitCards",
      empty: "#permitsEmpty",
      count: "#resultsCount"
    },
    {
      match: "/supervisor/review-queue/",
      toolbar: ".queue-toolbar",
      search: "#queueSearch",
      controls: "#riskFilter, #startFilter, #sortFilter",
      buttons: "",
      items: "#queueTableBody tr, #queueMobileList .queue-mobile-card",
      containers: "#queueTableBody, #queueMobileList",
      empty: "#queueEmpty",
      count: "#queueVisibleCount"
    },
    {
      match: "/supervisor/active-supervision/",
      toolbar: ".active-toolbar",
      search: "#activeSearch",
      controls: "#statusFilter, #riskFilter, #sortFilter",
      buttons: "",
      items: "#activeTableBody tr, #activeMobileList .active-mobile-card",
      containers: "#activeTableBody, #activeMobileList",
      empty: "#activeEmpty",
      count: "#activeVisibleCount"
    },
    {
      match: "/supervisor/history/",
      toolbar: ".history-toolbar",
      search: "#historySearch",
      controls: "#decisionFilter, #riskFilter, #sortFilter",
      buttons: "",
      items: "#historyTableBody tr, #historyMobileList .history-mobile-card",
      containers: "#historyTableBody, #historyMobileList",
      empty: "#historyEmpty",
      count: "#historyVisibleCount"
    },
    {
      match: "/safety/review-queue/",
      toolbar: ".safety-queue-toolbar",
      search: "#queueSearch",
      controls: "#riskFilter, #checklistFilter, #sortFilter",
      buttons: "",
      items: "#queueTableBody tr, #queueMobileList .safety-queue-mobile-card",
      containers: "#queueTableBody, #queueMobileList",
      empty: "#queueEmpty",
      count: "#queueVisibleCount"
    },
    {
      match: "/safety/risk-overview/",
      toolbar: ".risk-toolbar",
      search: "#riskSearch",
      controls: "#statusFilter, #sortFilter, [data-risk-filter]",
      buttons: "[data-risk-filter]",
      items: "#riskList .risk-card",
      containers: "#riskList",
      empty: "#riskEmpty",
      count: "#riskVisibleCount"
    },
    {
      match: "/safety/history/",
      toolbar: ".safety-history-toolbar",
      search: "#historySearch",
      controls: "#decisionFilter, #riskFilter, #sortFilter",
      buttons: "",
      items: "#historyTableBody tr, #historyMobileList .safety-history-mobile-card",
      containers: "#historyTableBody, #historyMobileList",
      empty: "#historyEmpty",
      count: "#historyVisibleCount"
    },
    {
      match: "/admin/pending-permits/",
      toolbar: ".admin-pending-toolbar",
      search: "#permitSearch",
      controls: "#riskFilter, #siteFilter, #startFilter, #sortFilter",
      buttons: "",
      items: "#pendingTableBody tr, #pendingMobileList .admin-pending-mobile-card",
      containers: "#pendingTableBody, #pendingMobileList",
      empty: "#pendingEmpty",
      count: "#pendingVisibleCount"
    },
    {
      match: "/admin/users/",
      toolbar: ".admin-users-toolbar",
      search: "#userSearch",
      controls: "#roleFilter, #statusFilter, #departmentFilter, #sortFilter",
      buttons: "",
      items: "#usersTableBody tr, #usersMobileList .admin-users-mobile-card",
      containers: "#usersTableBody, #usersMobileList",
      empty: "#usersEmpty",
      count: "#usersVisibleCount"
    },
    {
      match: "/admin/sites-areas/",
      toolbar: ".admin-sites-toolbar",
      search: "#siteSearch",
      controls: "#siteStatusFilter, #sortFilter",
      buttons: "",
      items: "#sitesList .admin-site-card",
      containers: "#sitesList",
      empty: "#sitesEmpty",
      count: "#visibleSitesCount"
    },
    {
      match: "/admin/permit-types/",
      toolbar: ".admin-types-toolbar",
      search: "#permitTypeSearch",
      controls: "#statusFilter, #controlFilter, #sortFilter",
      buttons: "",
      items: "#permitTypesList .admin-type-card",
      containers: "#permitTypesList",
      empty: "#permitTypesEmpty",
      count: "#visiblePermitTypesCount"
    },
    {
      match: "/admin/reports-audit/",
      toolbar: ".admin-audit-toolbar",
      search: "#auditSearch",
      controls: "#roleFilter, #decisionFilter, #statusFilter, #sortFilter",
      buttons: "",
      items: "#auditTableBody tr, #auditMobileList .admin-audit-mobile-card",
      containers: "#auditTableBody, #auditMobileList",
      empty: "#auditEmpty",
      count: "#auditResultCount"
    }
  ];

  function filterMotionConfig() {
    const path = window.location.pathname.toLowerCase();

    return filterPageConfigs.find(function (config) {
      return path.includes(config.match);
    }) || null;
  }

  function resultVisible(item) {
    return !item.hidden &&
      !item.classList.contains("is-hidden") &&
      window.getComputedStyle(item).display !== "none";
  }

  function fallbackDisplay(item) {
    const tag = item.tagName.toLowerCase();
    if (tag === "tr") return "table-row";
    if (tag === "li") return "list-item";
    if (tag === "tbody") return "table-row-group";
    return "block";
  }

  function initFilterSearchMotion() {
    const config = filterMotionConfig();

    if (!config) {
      return;
    }

    const root = document.querySelector("main") || document.body;

    if (!root || root.dataset.spFilterMotion === "ready") {
      return;
    }

    const search = config.search ? document.querySelector(config.search) : null;
    const toolbar = config.toolbar ? document.querySelector(config.toolbar) : null;
    const empty = config.empty ? document.querySelector(config.empty) : null;
    const count = config.count ? document.querySelector(config.count) : null;
    const controls = config.controls
      ? Array.from(document.querySelectorAll(config.controls))
      : [];
    const buttons = config.buttons
      ? Array.from(document.querySelectorAll(config.buttons))
      : [];
    const containers = config.containers
      ? Array.from(document.querySelectorAll(config.containers))
      : [];

    if (!search && !controls.length) {
      return;
    }

    root.dataset.spFilterMotion = "ready";
    root.setAttribute("data-sp-filter-motion", "");

    if (toolbar) {
      toolbar.setAttribute("data-sp-filter-toolbar", "");
    }

    if (empty) {
      empty.setAttribute("data-sp-empty-state", "");
    }

    if (count) {
      count.setAttribute("data-sp-results-count", "");
    }

    const searchShell = search
      ? search.closest('[class*="search"]') || search.parentElement
      : null;

    if (searchShell) {
      searchShell.setAttribute("data-sp-search-shell", "");
      searchShell.classList.toggle(
        "is-sp-search-active",
        search.value.trim().length > 0
      );
    }

    controls.forEach(function (control) {
      control.setAttribute("data-sp-filter-control", "");
    });

    buttons.forEach(function (button) {
      button.setAttribute("data-sp-filter-button", "");
    });

    const itemState = new WeakMap();
    let sequence = 0;
    let countSnapshot = count ? count.textContent : "";
    let emptyWasVisible = empty ? !empty.hidden : false;

    function getItems() {
      return Array.from(document.querySelectorAll(config.items));
    }

    function prepareItem(item, index, animateInitial) {
      item.setAttribute("data-sp-result-item", "");

      const visible = resultVisible(item);
      const display = visible
        ? window.getComputedStyle(item).display
        : fallbackDisplay(item);

      itemState.set(item, {
        visible: visible,
        display: display === "none" ? fallbackDisplay(item) : display
      });

      if (visible && animateInitial && !reducedMotion.matches) {
        item.style.setProperty(
          "--sp-result-delay",
          Math.min(index, 9) * 48 + "ms"
        );
        restartClass(item, "is-sp-result-entering");

        window.setTimeout(function () {
          item.classList.remove("is-sp-result-entering");
        }, 620 + Math.min(index, 9) * 48);
      }
    }

    function prepareAll(animateInitial) {
      getItems().forEach(function (item, index) {
        if (!item.hasAttribute("data-sp-result-item")) {
          prepareItem(item, index, animateInitial);
        } else {
          const state = itemState.get(item) || {};
          state.visible = resultVisible(item);
          if (state.visible) {
            const display = window.getComputedStyle(item).display;
            if (display !== "none") state.display = display;
          }
          itemState.set(item, state);
        }
      });
    }

    function animateVisibleRefresh() {
      if (reducedMotion.matches) return;

      const visibleItems = getItems().filter(resultVisible);
      visibleItems.forEach(function (item, index) {
        item.style.setProperty(
          "--sp-result-delay",
          Math.min(index, 9) * 38 + "ms"
        );
        restartClass(item, "is-sp-result-refreshed");
        window.setTimeout(function () {
          item.classList.remove("is-sp-result-refreshed");
        }, 520 + Math.min(index, 9) * 38);
      });
    }

    function syncEmptyMotion() {
      if (!empty) return;

      const visible = !empty.hidden &&
        !empty.classList.contains("is-hidden") &&
        window.getComputedStyle(empty).display !== "none";

      root.classList.toggle("is-sp-zero-results", visible);

      if (visible && !emptyWasVisible) {
        restartClass(empty, "is-sp-empty-entering");
        window.setTimeout(function () {
          empty.classList.remove("is-sp-empty-entering");
        }, 720);
      }

      emptyWasVisible = visible;
    }

    function syncCountMotion() {
      if (!count) return;

      const next = count.textContent;
      if (next === countSnapshot) return;

      countSnapshot = next;
      restartClass(count, "is-sp-count-updated");
      window.setTimeout(function () {
        count.classList.remove("is-sp-count-updated");
      }, 480);
    }

    function schedulePostFilterMotion() {
      sequence += 1;
      const current = sequence;

      window.setTimeout(function () {
        requestAnimationFrame(function () {
          if (current !== sequence) return;
          prepareAll(false);
          animateVisibleRefresh();
          syncEmptyMotion();
          syncCountMotion();
        });
      }, 0);
    }

    if (search) {
      search.addEventListener("input", function () {
        if (searchShell) {
          searchShell.classList.toggle(
            "is-sp-search-active",
            search.value.trim().length > 0
          );
          restartClass(searchShell, "is-sp-searching");
          window.setTimeout(function () {
            searchShell.classList.remove("is-sp-searching");
          }, 580);
        }

        schedulePostFilterMotion();
      }, true);
    }

    controls.forEach(function (control) {
      const eventName = control.tagName === "SELECT" ? "change" : "click";

      control.addEventListener(eventName, function () {
        restartClass(control, "is-sp-filter-changed");
        window.setTimeout(function () {
          control.classList.remove("is-sp-filter-changed");
        }, 500);
        schedulePostFilterMotion();
      }, true);
    });

    const observer = new MutationObserver(function (mutations) {
      let shouldSync = false;

      mutations.forEach(function (mutation) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach(function (node) {
            if (!(node instanceof Element)) return;

            if (node.matches && node.matches(config.items)) {
              prepareItem(node, 0, true);
            }

            if (node.querySelectorAll) {
              node.querySelectorAll(config.items).forEach(function (item, index) {
                if (!item.hasAttribute("data-sp-result-item")) {
                  prepareItem(item, index, true);
                }
              });
            }
          });

          shouldSync = true;
          return;
        }

        if (mutation.type === "attributes") {
          const target = mutation.target;

          if (target === empty) {
            shouldSync = true;
            return;
          }

          if (!target.matches || !target.matches(config.items)) {
            return;
          }

          const state = itemState.get(target) || {
            visible: false,
            display: fallbackDisplay(target)
          };
          const nextVisible = resultVisible(target);

          if (state.visible && !nextVisible && !reducedMotion.matches) {
            target.style.setProperty(
              "display",
              state.display || fallbackDisplay(target),
              "important"
            );
            restartClass(target, "is-sp-result-leaving");

            window.setTimeout(function () {
              target.classList.remove("is-sp-result-leaving");
              target.style.removeProperty("display");
            }, 210);
          } else if (!state.visible && nextVisible && !reducedMotion.matches) {
            target.style.removeProperty("display");
            target.style.setProperty("--sp-result-delay", "0ms");
            restartClass(target, "is-sp-result-entering");
            window.setTimeout(function () {
              target.classList.remove("is-sp-result-entering");
            }, 520);
          }

          state.visible = nextVisible;
          if (nextVisible) {
            const display = window.getComputedStyle(target).display;
            if (display !== "none") state.display = display;
          }
          itemState.set(target, state);
          shouldSync = true;
        }
      });

      if (shouldSync) {
        window.setTimeout(function () {
          syncEmptyMotion();
          syncCountMotion();
        }, 0);
      }
    });

    containers.forEach(function (container) {
      observer.observe(container, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "hidden"]
      });
    });

    if (empty && !containers.some(function (container) {
      return container.contains(empty);
    })) {
      observer.observe(empty, {
        attributes: true,
        attributeFilter: ["class", "hidden"]
      });
    }

    if (count) {
      observer.observe(count, {
        childList: true,
        characterData: true,
        subtree: true
      });
    }

    prepareAll(true);
    syncEmptyMotion();
  }


  /* Profile + Image Upload Interaction System */
  function initProfileMotion() {
    const form = document.getElementById("profileForm");
    const editButton = document.getElementById("editProfileButton");

    if (!form || !editButton || document.body.dataset.spProfileMotion === "ready") {
      return;
    }

    document.body.dataset.spProfileMotion = "ready";
    document.body.setAttribute("data-sp-profile-live", "");

    const cancelButton = document.getElementById("cancelEditButton");
    const actions = document.getElementById("profileActions");
    const message = document.getElementById("profileMessage");
    const fileInput =
      document.getElementById("profilePicture") ||
      document.getElementById("photoInput");
    const uploadTrigger =
      document.getElementById("uploadLabel") ||
      document.getElementById("changePhotoButton");
    const removeTrigger = document.getElementById("removePhotoButton");
    const photoError = document.getElementById("pictureError");
    const submitButton = form.querySelector('button[type="submit"]');
    const email = document.getElementById("email");
    const phone = document.getElementById("phone");

    const header = document.querySelector(
      ".profile-header, .admin-profile-header"
    );

    if (header) {
      header.setAttribute("data-profile-header", "");
    }

    const cardSelector = [
      ".profile-hero",
      ".profile-card",
      ".profile-side-card",
      ".admin-profile-card",
      ".admin-profile-side-card"
    ].join(",");

    const cards = Array.from(document.querySelectorAll(cardSelector));

    cards.forEach(function (card, index) {
      card.setAttribute("data-profile-card", "");
      card.style.setProperty("--profile-delay", Math.min(index * 75, 420) + "ms");
    });

    const formCard =
      form.closest(".profile-card, .admin-profile-card") ||
      form;

    form.setAttribute("data-profile-form", "");

    if (formCard) {
      formCard.setAttribute("data-profile-form-card", "");
    }

    if (actions) {
      actions.setAttribute("data-profile-actions", "");
    }

    if (message) {
      message.setAttribute("data-profile-message", "");
    }

    if (photoError) {
      photoError.setAttribute("data-profile-photo-error", "");
    }

    if (editButton) {
      editButton.setAttribute("data-profile-edit-button", "");
    }

    if (submitButton) {
      submitButton.setAttribute("data-profile-submit", "");
    }

    if (uploadTrigger) {
      uploadTrigger.setAttribute("data-profile-upload-trigger", "");
    }

    if (removeTrigger) {
      removeTrigger.setAttribute("data-profile-remove-trigger", "");
    }

    [email, phone].filter(Boolean).forEach(function (field) {
      field.setAttribute("data-profile-editable", "");
    });

    document
      .querySelectorAll('input[readonly], input[disabled]:not(#email):not(#phone):not([type="file"])')
      .forEach(function (field) {
        field.setAttribute("data-profile-readonly", "");
      });

    const avatarZones = [];

    function addAvatarZone(element) {
      if (!element || avatarZones.includes(element)) {
        return;
      }

      element.setAttribute("data-profile-avatar", "");
      avatarZones.push(element);
    }

    addAvatarZone(document.getElementById("profileAvatar"));
    addAvatarZone(document.querySelector(".profile-picture-preview"));
    addAvatarZone(document.querySelector(".profile-avatar"));
    addAvatarZone(document.querySelector(".admin-profile-avatar"));

    const sidebarAvatar =
      document.querySelector(".profile-mini__avatar") ||
      document.getElementById("sidebarAvatar") ||
      document.querySelector(".admin-mini-profile__avatar");

    if (sidebarAvatar) {
      sidebarAvatar.setAttribute("data-profile-side-avatar", "");
    }

    function clearPhotoProcessing() {
      avatarZones.forEach(function (zone) {
        zone.classList.remove("is-photo-processing");
      });

      if (uploadTrigger) {
        uploadTrigger.classList.remove("is-photo-reading");
      }
    }

    function confirmPhotoUpdate() {
      clearPhotoProcessing();

      avatarZones.forEach(function (zone) {
        restartClass(zone, "is-photo-updated");

        window.setTimeout(function () {
          zone.classList.remove("is-photo-updated");
        }, 860);
      });

      if (sidebarAvatar) {
        restartClass(sidebarAvatar, "is-sidebar-avatar-updated");

        window.setTimeout(function () {
          sidebarAvatar.classList.remove("is-sidebar-avatar-updated");
        }, 650);
      }
    }

    const primaryAvatarImage =
      document.getElementById("profileAvatarImage") ||
      document.getElementById("profileImage") ||
      document.getElementById("picturePreviewImage");

    if (primaryAvatarImage) {
      primaryAvatarImage.addEventListener("load", function () {
        if (!document.body.classList.contains("is-profile-editing")) {
          return;
        }

        confirmPhotoUpdate();
      });
    }

    function syncEditingState() {
      const editing = Boolean(
        (email && !email.disabled) ||
        (phone && !phone.disabled) ||
        (actions && !actions.hidden)
      );

      document.body.classList.toggle("is-profile-editing", editing);
    }

    function animateValidationErrors() {
      [email, phone].filter(Boolean).forEach(function (field) {
        if (!field.classList.contains("is-invalid")) {
          return;
        }

        restartClass(field, "is-profile-field-error");

        window.setTimeout(function () {
          field.classList.remove("is-profile-field-error");
        }, 620);
      });

      if (photoError && photoError.textContent.trim()) {
        restartClass(photoError, "is-photo-error");

        window.setTimeout(function () {
          photoError.classList.remove("is-photo-error");
        }, 620);
      }
    }

    function animateMessageState() {
      if (!message || !message.textContent.trim()) {
        return;
      }

      message.classList.remove(
        "is-profile-message-success",
        "is-profile-message-error"
      );

      if (message.classList.contains("is-success")) {
        restartClass(message, "is-profile-message-success");

        window.setTimeout(function () {
          message.classList.remove("is-profile-message-success");
        }, 650);
      } else if (message.classList.contains("is-error")) {
        restartClass(message, "is-profile-message-error");

        window.setTimeout(function () {
          message.classList.remove("is-profile-message-error");
        }, 650);

        animateValidationErrors();
      }
    }

    editButton.addEventListener("click", function () {
      restartClass(editButton, "is-edit-activated");

      window.setTimeout(function () {
        editButton.classList.remove("is-edit-activated");
        syncEditingState();
      }, 0);
    }, true);

    if (cancelButton) {
      cancelButton.addEventListener("click", function () {
        window.setTimeout(function () {
          document.body.classList.remove("is-profile-editing");
          clearPhotoProcessing();
        }, 0);
      }, true);
    }

    if (fileInput) {
      fileInput.addEventListener("change", function () {
        const file = fileInput.files && fileInput.files[0];

        if (!file) {
          return;
        }

        avatarZones.forEach(function (zone) {
          zone.classList.add("is-photo-processing");
        });

        if (uploadTrigger) {
          uploadTrigger.classList.add("is-photo-reading");
        }

        window.setTimeout(function () {
          const hasError = Boolean(
            (photoError && photoError.textContent.trim()) ||
            (message && message.classList.contains("is-error"))
          );

          if (hasError) {
            clearPhotoProcessing();
            animateValidationErrors();
            animateMessageState();
          }
        }, 40);

        window.setTimeout(clearPhotoProcessing, 1800);
      }, true);
    }

    if (removeTrigger) {
      removeTrigger.addEventListener("click", function () {
        window.setTimeout(function () {
          clearPhotoProcessing();

          avatarZones.forEach(function (zone) {
            restartClass(zone, "is-photo-removed");

            window.setTimeout(function () {
              zone.classList.remove("is-photo-removed");
            }, 620);
          });

          if (sidebarAvatar) {
            restartClass(sidebarAvatar, "is-sidebar-avatar-updated");

            window.setTimeout(function () {
              sidebarAvatar.classList.remove("is-sidebar-avatar-updated");
            }, 650);
          }
        }, 0);
      }, true);
    }

    form.addEventListener("submit", function () {
      form.classList.remove("is-profile-saved");

      if (submitButton) {
        submitButton.classList.add("is-profile-saving");
      }

      window.setTimeout(function () {
        if (submitButton) {
          submitButton.classList.remove("is-profile-saving");
        }

        animateMessageState();

        if (message && message.classList.contains("is-success")) {
          form.classList.add("is-profile-saved");
          document.body.classList.remove("is-profile-editing");

          avatarZones.forEach(function (zone) {
            restartClass(zone, "is-profile-saved-pulse");

            window.setTimeout(function () {
              zone.classList.remove("is-profile-saved-pulse");
            }, 680);
          });

          window.setTimeout(function () {
            form.classList.remove("is-profile-saved");
          }, 900);
        } else {
          animateValidationErrors();
        }
      }, 40);
    }, true);

    if (actions && "MutationObserver" in window) {
      const actionObserver = new MutationObserver(syncEditingState);
      actionObserver.observe(actions, {
        attributes: true,
        attributeFilter: ["hidden"]
      });
    }

    syncEditingState();
  }

  window.SafePermitMotion = {
    reduced: function () {
      return reducedMotion.matches;
    },
    reveal: revealElement,
    restartClass: restartClass,
    navigate: navigateWithTransition,
    initPageTransitions: initPageTransitions,
    initNavigation: initNavigationMotion,
    initFilters: initFilterSearchMotion,
    initProfile: initProfileMotion
  };

  window.addEventListener("safepermit:navbarready", function (event) {
    initNavbarMotion(event.detail ? event.detail.host : null);
  });

  function init() {
    initPageTransitions();
    initReveals();
    initNavigationMotion();
    initFilterSearchMotion();
    initProfileMotion();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
