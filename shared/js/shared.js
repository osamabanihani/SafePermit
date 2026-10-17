(function () {
  const script =
    document.currentScript ||
    document.querySelector('script[src*="/shared/js/shared.js"], script[src$="shared/js/shared.js"]');

  if (!script) {
    console.error("SafePermit shared.js could not determine its path.");
    return;
  }

  const resolved = window.SafePermitPaths;
  const jsBase = new URL("./", script.src);
  const sharedBase = resolved ? resolved.sharedBase : new URL("../", jsBase);
  const projectRoot = resolved ? resolved.projectRoot : new URL("../", sharedBase);
  const componentBase = resolved ? resolved.componentsBase : new URL("components/", sharedBase);

  const paths = {
    home: resolved ? resolved.home : new URL("index.html", projectRoot).href,
    workflow: resolved ? resolved.workflow : new URL("index.html#workflow", projectRoot).href,
    features: resolved ? resolved.features : new URL("index.html#features", projectRoot).href,
    roles: resolved ? resolved.roles : new URL("index.html#roles", projectRoot).href,
    about: resolved ? resolved.about : new URL("about/", projectRoot).href,
    contact: resolved ? resolved.contact : new URL("contact/", projectRoot).href,
    riskAssessmentInfo: resolved ? resolved.riskAssessmentInfo : new URL("resources/risk-assessment/", projectRoot).href,
    safetyReviewInfo: resolved ? resolved.safetyReviewInfo : new URL("resources/safety-review/", projectRoot).href,
    approvalTrackingInfo: resolved ? resolved.approvalTrackingInfo : new URL("resources/approval-tracking/", projectRoot).href,
    login: resolved ? resolved.login : new URL("auth/login/", projectRoot).href,
    logo: resolved ? resolved.logo : new URL("assets/images/logo/logo-mark.png", projectRoot).href
  };

  function ensureMotionLayer() {
    const motionCssUrl = new URL("../css/motion.css", jsBase).href;
    const motionJsUrl = new URL("motion.js", jsBase).href;

    const hasMotionCss = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some(function (link) {
      return link.href === motionCssUrl || /\/shared\/css\/motion\.css(?:$|[?#])/.test(link.href);
    });

    if (!hasMotionCss) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = motionCssUrl;
      link.setAttribute("data-sp-motion-style", "");
      document.head.appendChild(link);
    }

    const hasMotionScript = Array.from(document.scripts).some(function (item) {
      return item.src === motionJsUrl || /\/shared\/js\/motion\.js(?:$|[?#])/.test(item.src);
    });

    if (!hasMotionScript) {
      const motionScript = document.createElement("script");
      motionScript.src = motionJsUrl;
      motionScript.defer = true;
      motionScript.setAttribute("data-sp-motion-script", "");
      document.head.appendChild(motionScript);
    }
  }

  // The cinematic page owns its scene motion; the shared navbar still initializes normally.
  if (!document.body.classList.contains("sc-page")) ensureMotionLayer();

  let homeNavigationAssets;
  let iconAssets;
  function ensureIcons() {
    if (iconAssets) return iconAssets;
    const href = new URL("../css/icons.css", jsBase).href;
    if (!Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some(function (link) { return link.href === href; })) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    }
    iconAssets = window.SafePermitIcons ? Promise.resolve() : new Promise(function (resolve, reject) {
      const script = document.createElement("script");
      script.src = new URL("icons.js", jsBase).href;
      script.onload = resolve;
      script.onerror = function () { reject(new Error("Could not load the local icon set.")); };
      document.head.appendChild(script);
    });
    return iconAssets;
  }
  // Bump with every release so browsers do not keep serving older cached copies of loaded assets.
  const ASSET_VERSION = "13.2.4";
  function stylesheet(name) {
      const base = new URL("../css/" + name, jsBase).href;
      const href = base + "?v=" + ASSET_VERSION;
      // A page may already link the file (with or without a version): never load it twice.
      if (Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some(function (link) { return link.href.split("?")[0] === base; })) return Promise.resolve();
      return new Promise(function (resolve, reject) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        link.onload = resolve;
        link.onerror = function () { reject(new Error("Could not load " + name)); };
        document.head.appendChild(link);
      });
    }
    function javascript(name, available) {
      if (window[available]) return Promise.resolve();
      return new Promise(function (resolve, reject) {
        const item = document.createElement("script");
        item.src = new URL(name, jsBase).href + "?v=" + ASSET_VERSION;
        item.onload = resolve;
        item.onerror = function () { reject(new Error("Could not load " + name)); };
        document.head.appendChild(item);
      });
    }
  function ensureHomeNavigation() {
    if (homeNavigationAssets) return homeNavigationAssets;
    homeNavigationAssets = Promise.all([
      stylesheet("nav-overlay.css"), stylesheet("letter-swap.css"),
      javascript("letter-swap.js", "SafePermitLetterSwap").then(function () { return javascript("nav-overlay.js", "SafePermitNavOverlay"); })
    ]);
    return homeNavigationAssets;
  }

  // Slide Tabs (public navbar pill) and the animated public footer load only where they are used.
  let slideTabsAssets;
  function ensureSlideTabs() {
    if (!slideTabsAssets) slideTabsAssets = Promise.all([stylesheet("slide-tabs.css"), javascript("slide-tabs.js", "SafePermitSlideTabs")]);
    return slideTabsAssets;
  }
  let publicFooterAssets;
  function ensurePublicFooter() {
    if (!publicFooterAssets) publicFooterAssets = Promise.all([
      stylesheet("public-footer.css"),
      javascript("letter-swap.js", "SafePermitLetterSwap").then(function () { return javascript("public-footer.js", "SafePermitPublicFooter"); })
    ]);
    return publicFooterAssets;
  }

  // Route relative to the project root, so the rules also hold when the site is hosted in a subfolder.
  function relativeRoute() {
    const base = projectRoot.pathname;
    let route = window.location.pathname;
    route = route.indexOf(base) === 0 ? route.slice(base.length) : route.replace(/^\//, "");
    return decodeURIComponent(route).replace(/index\.html$/, "").toLowerCase();
  }
  // The animated public footer goes on every sidebar-free public page that has a shared footer host
  // (home, About, Contact, Resources, Sign In, Reset Password). Role workspaces keep footer.html.
  const PUBLIC_FOOTER_ROUTES = ["", "about/", "contact/", "resources/risk-assessment/", "resources/safety-review/", "resources/approval-tracking/", "auth/login/", "auth/reset-password/"];
  // A sidebar counts even when collapsed or hidden on mobile: check the layout, not visibility.
  function hasSidebar() {
    return !!document.querySelector('aside[id$="Sidebar"], [id$="-sidebar"], [class*="-sidebar"], [class^="sidebar"], [data-sp-session-sidebar], [data-sp-sidebar]');
  }
  function slideTabsEligible(route) {
    return !getRolePageConfig() && !/^archive\//.test(route) && !hasSidebar();
  }

  function ensureFavicon() {
    let favicon = document.querySelector('link[data-sp-favicon]');

    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      favicon.type = "image/svg+xml";
      favicon.setAttribute("data-sp-favicon", "");
      document.head.appendChild(favicon);
    }

    favicon.href = new URL("../icons/favicon.svg", jsBase).href;
  }

  async function inject(targetSelector, fileName) {
    const target = document.querySelector(targetSelector);
    if (!target) return null;

    try {
      // Revalidate shared markup so an edited component is never served from a stale cache.
      const response = await fetch(new URL(fileName, componentBase), { cache: "no-cache" });
      if (!response.ok) throw new Error("Could not load " + fileName);
      // Dev servers such as VS Code Live Server inject a live-reload <script> into every .html file they
      // serve, including these partials (before each </svg>). Parsed inside SVG markup it swallows the rest
      // of the component, so strip it: shared components never contain scripts of their own.
      const markup = (await response.text())
        .replace(/<!--\s*Code injected by live-server\s*-->/gi, "")
        .replace(/<script\b[\s\S]*?<\/script>/gi, "");
      target.innerHTML = markup;
      return target;
    } catch (error) {
      console.error(error);
      target.innerHTML =
        '<div style="padding:12px;font-family:Arial;color:#B94A48;">Shared component failed to load. Run the project with Live Server.</div>';
      return null;
    }
  }

  function applyLinks(scope) {
    if (!scope) return;

    scope.querySelectorAll("[data-sp-home-link]").forEach(function (item) {
      item.href = paths.home;
    });

    scope.querySelectorAll("[data-sp-nav-home]").forEach(function (item) {
      item.href = paths.home;
    });

    scope.querySelectorAll("[data-sp-secondary-home]").forEach(function (item) {
      item.href = paths.home;
    });

    scope.querySelectorAll("[data-sp-nav-workflow]").forEach(function (item) {
      item.href = paths.workflow;
    });

    scope.querySelectorAll("[data-sp-nav-features]").forEach(function (item) {
      item.href = paths.features;
    });

    scope.querySelectorAll("[data-sp-nav-roles]").forEach(function (item) {
      item.href = paths.roles;
    });

    scope.querySelectorAll("[data-sp-nav-resources]").forEach(function (item) {
      item.href = paths.riskAssessmentInfo;
    });

    scope.querySelectorAll("[data-sp-nav-about]").forEach(function (item) {
      item.href = paths.about;
    });

    scope.querySelectorAll("[data-sp-nav-contact]").forEach(function (item) {
      item.href = paths.contact;
    });

    scope.querySelectorAll("[data-sp-risk-assessment-info]").forEach(function (item) {
      item.href = paths.riskAssessmentInfo;
    });

    scope.querySelectorAll("[data-sp-safety-review-info]").forEach(function (item) {
      item.href = paths.safetyReviewInfo;
    });

    scope.querySelectorAll("[data-sp-approval-tracking-info]").forEach(function (item) {
      item.href = paths.approvalTrackingInfo;
    });

    scope.querySelectorAll("[data-sp-login-link]").forEach(function (item) {
      item.href = paths.login;
    });

    scope.querySelectorAll("[data-sp-logo]").forEach(function (item) {
      item.src = paths.logo;
    });

    scope.querySelectorAll("[data-sp-year]").forEach(function (item) {
      item.textContent = new Date().getFullYear();
    });
  }

  function markCurrentPublicNavigation(scope) {
    if (!scope) return;
    const route = relativeRoute();
    const hash = window.location.hash.toLowerCase();
    scope.querySelectorAll(".sp-navbar__link").forEach(function (link) { link.classList.remove("is-active"); link.removeAttribute("aria-current"); });
    // Only real matches are marked: authentication and error pages select nothing.
    let selector = "";
    let current = "page";
    if (route === "" || route === "home-preview.html") {
      const sections = { "#workflow": "[data-sp-nav-workflow]", "#features": "[data-sp-nav-features]", "#roles": "[data-sp-nav-roles]" };
      selector = sections[hash] || "[data-sp-nav-home]";
      if (sections[hash]) current = "location";
    } else if (route.indexOf("about/") === 0) selector = "[data-sp-nav-about]";
    else if (route.indexOf("contact/") === 0) selector = "[data-sp-nav-contact]";
    else if (route.indexOf("resources/") === 0) selector = "[data-sp-nav-resources]";
    const link = selector ? scope.querySelector(".sp-navbar__link" + selector) : null;
    if (link) { link.classList.add("is-active"); link.setAttribute("aria-current", current); }
    scope.dispatchEvent(new CustomEvent("safepermit:navactivechange", { detail: { link: link } }));
  }

  async function setupNavbar(host) {
    if (!host) return;

    const navbar = host.querySelector("[data-sp-navbar]");
    const toggle = host.querySelector("[data-sp-nav-toggle]");
    const links = host.querySelector("[data-sp-home-links]");
    const pageTitle = host.querySelector("[data-sp-page-title]");
    const secondaryHome = host.querySelector("[data-sp-secondary-home]");
    const variant = host.dataset.variant || "secondary";
    const title = host.dataset.title || "";

    applyLinks(host);
    markCurrentPublicNavigation(host);
    window.addEventListener("hashchange", function () { markCurrentPublicNavigation(host); });
    window.addEventListener("popstate", function () { markCurrentPublicNavigation(host); });

    if (variant === "home") {
      navbar.classList.add("sp-navbar--home");
      secondaryHome.style.display = "none";

    } else {
      links.style.display = "none";
      pageTitle.textContent = title;
      if (!title) pageTitle.style.display = "none";
    }

    if (toggle && links && variant === "home") {
      await ensureHomeNavigation();
      window.SafePermitNavOverlay.init(host);
    } else if (toggle) {
      toggle.style.display = "none";
    }
  }


  function getRolePageConfig() {
    const path = window.location.pathname.toLowerCase();
    if (path.includes("/worker/")) return { role: "worker", sidebarId: "workerSidebar", profile: new URL("worker/profile/", projectRoot).href };
    if (path.includes("/supervisor/")) return { role: "supervisor", sidebarId: "supervisorSidebar", profile: new URL("supervisor/profile/", projectRoot).href };
    if (path.includes("/safety/")) return { role: "safety", sidebarId: "safetySidebar", profile: new URL("safety/profile/", projectRoot).href };
    if (path.includes("/admin/")) return { role: "admin", sidebarId: "adminSidebar", profile: new URL("admin/profile/", projectRoot).href };
    return null;
  }

  function ensureRoleSidebarStyles() {
    if (document.querySelector('link[data-sp-role-sidebar-style]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = new URL("../css/role-sidebar-tools.css", jsBase).href;
    link.setAttribute("data-sp-role-sidebar-style", "");
    document.head.appendChild(link);
  }

  function ensureSessionSidebar() {
    if (window.SafePermitSessionSidebar) {
      window.SafePermitSessionSidebar.initAll();
      return;
    }
    if (document.querySelector("script[data-sp-session-script],script[data-sp-nav-script]")) return;
    const sidebarScript = document.createElement("script");
    sidebarScript.src = new URL("session-sidebar.js?v=13.6.0", jsBase).href;
    sidebarScript.setAttribute("data-sp-session-script", "");
    // The central role navigation must exist before the sidebar reads its links.
    if (window.SafePermitNav) { document.head.appendChild(sidebarScript); return; }
    const navScript = document.createElement("script");
    navScript.src = new URL("nav-config.js?v=13.6.0", jsBase).href;
    navScript.setAttribute("data-sp-nav-script", "");
    navScript.onload = navScript.onerror = function () { document.head.appendChild(sidebarScript); };
    document.head.appendChild(navScript);
  }

  function setupRoleSidebar() {
    const config = getRolePageConfig();
    if (!config) return false;
    ensureRoleSidebarStyles();
    const sidebar = document.getElementById(config.sidebarId);
    if (!sidebar) return true;


    if (!sidebar.querySelector("[data-sp-role-sidebar-tools]")) {
      const tools = document.createElement("div");
      tools.className = "sp-role-sidebar-tools";
      tools.setAttribute("data-sp-role-sidebar-tools", "");
      tools.innerHTML = '<span class="sp-role-sidebar-label" data-i18n-text="shared.sidebar.workspace_controls">Workspace controls</span>' +
        '<a class="sp-role-sidebar-home" data-sp-role-home><span class="sp-role-sidebar-home__icon" aria-hidden="true">⌂</span><span data-i18n-text="shared.sidebar.home">Home</span></a>' +
        '<span class="sp-role-sidebar-sublabel" data-i18n-text="shared.sidebar.language">Language</span>' +
        '<div class="sp-role-sidebar-preferences">' +
          '<button class="sp-role-sidebar-pref" data-sp-language-choice="en" type="button">EN</button>' +
          '<button class="sp-role-sidebar-pref" data-sp-language-choice="ar" type="button">AR</button>' +
        '</div>' +
        '<span class="sp-role-sidebar-sublabel" data-i18n-text="shared.sidebar.theme">Theme</span>' +
        '<div class="sp-role-sidebar-preferences">' +
          '<button class="sp-role-sidebar-pref" data-sp-theme-choice="light" type="button"><span aria-hidden="true">☀</span><span>Light</span></button>' +
          '<button class="sp-role-sidebar-pref" data-sp-theme-choice="dark" type="button"><span aria-hidden="true">☾</span><span>Dark</span></button>' +
        '</div>';
      const tip = Array.from(sidebar.children).find(function(el){ return /tip|support/i.test(el.className || ""); });
      if (tip) sidebar.insertBefore(tools, tip); else sidebar.appendChild(tools);
      const home = tools.querySelector("[data-sp-role-home]");
      if (home) home.href = paths.home;

      const syncChoices = function () {
        const language = window.SafePermitI18n && window.SafePermitI18n.getLanguage ? window.SafePermitI18n.getLanguage() : (document.documentElement.lang === "ar" ? "ar" : "en");
        const theme = window.SafePermitTheme && window.SafePermitTheme.getTheme ? window.SafePermitTheme.getTheme() : (document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
        tools.querySelectorAll("[data-sp-language-choice]").forEach(function(button){
          const active = button.dataset.spLanguageChoice === language;
          button.classList.toggle("is-active", active);
          button.setAttribute("aria-pressed", String(active));
        });
        tools.querySelectorAll("[data-sp-theme-choice]").forEach(function(button){
          const active = button.dataset.spThemeChoice === theme;
          button.classList.toggle("is-active", active);
          button.setAttribute("aria-pressed", String(active));
        });
      };

      tools.querySelectorAll("[data-sp-language-choice]").forEach(function(button){
        button.addEventListener("click", function(){ if (window.SafePermitI18n && window.SafePermitI18n.setLanguage) window.SafePermitI18n.setLanguage(button.dataset.spLanguageChoice); syncChoices(); });
      });
      tools.querySelectorAll("[data-sp-theme-choice]").forEach(function(button){
        button.addEventListener("click", function(){ if (window.SafePermitTheme && window.SafePermitTheme.setTheme) window.SafePermitTheme.setTheme(button.dataset.spThemeChoice); syncChoices(); });
      });
      document.addEventListener("safepermit:languagechange", syncChoices);
      document.addEventListener("safepermit:themechange", syncChoices);
      if (window.SafePermitI18n) window.SafePermitI18n.apply(tools);
      syncChoices();
    }

    const top = sidebar.firstElementChild;
    const profileBlock = top && Array.from(top.children).find(function(child){ return child.tagName !== "BUTTON"; });
    if (profileBlock && !profileBlock.dataset.spProfileBound) {
      profileBlock.dataset.spProfileBound = "true";
      profileBlock.classList.add("sp-role-profile-link");
      profileBlock.setAttribute("role", "link");
      profileBlock.setAttribute("tabindex", "0");
      profileBlock.setAttribute("aria-label", "Open profile");
      const go = function(){ window.location.href = config.profile; };
      profileBlock.addEventListener("click", go);
      profileBlock.addEventListener("keydown", function(event){ if(event.key === "Enter" || event.key === " "){ event.preventDefault(); go(); }});
    }
    return true;
  }

  function syncRoleProfileAvatar() {
    const path = window.location.pathname.toLowerCase();

    let config = null;

    if (path.includes("/worker/")) {
      config = {
        storageKey: "safePermitWorkerProfile",
        initials: "OW",
        selectors: [
          ".worker-profile__avatar",
          ".risk-profile__avatar",
          ".tracking-profile__avatar",
          ".details-profile__avatar",
          ".permits-profile__avatar",
          ".wizard-profile__avatar",
          ".review-profile__avatar",
          ".checklist-profile__avatar",
          ".notifications-profile__avatar"
        ]
      };
    } else if (path.includes("/supervisor/")) {
      config = {
        storageKey: "safePermitSupervisorProfile",
        initials: "AK",
        selectors: [
          ".supervisor-profile__avatar",
          ".history-profile__avatar",
          ".queue-profile__avatar",
          ".active-profile__avatar",
          ".permit-profile__avatar",
          ".review-profile__avatar",
          ".notifications-profile__avatar"
        ]
      };
    } else if (path.includes("/safety/")) {
      config = {
        storageKey: "safePermitSafetyProfile",
        initials: "SN",
        selectors: [
          ".safety-profile__avatar",
          ".risk-profile__avatar",
          ".permit-profile__avatar"
        ]
      };
    } else if (path.includes("/admin/")) {
      config = {
        storageKey: "safePermitAdminProfile",
        initials: "RH",
        selectors: [
          ".admin-profile__avatar"
        ]
      };
    }

    if (!config) return;

    let photo = "";
    let storedProfile = null;

    try {
      storedProfile = JSON.parse(localStorage.getItem(config.storageKey) || "null");
      photo = storedProfile && typeof storedProfile.photo === "string" ? storedProfile.photo : "";
    } catch (error) {
      photo = "";
      storedProfile = null;
    }

    if (path.includes("/admin/") && storedProfile && storedProfile.fullName) {
      const sidebar = document.getElementById("adminSidebar");
      const nameNode = sidebar && sidebar.querySelector("[class*='profile'] strong, [class*='mini-profile'] strong");
      if (nameNode) {
        nameNode.removeAttribute("data-i18n-text");
        nameNode.textContent = storedProfile.fullName;
      }
    }

    config.selectors.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (avatar) {
        if (photo) {
          avatar.textContent = "";
          avatar.style.backgroundImage = 'url("' + photo + '")';
          avatar.style.backgroundSize = "cover";
          avatar.style.backgroundPosition = "center";
          avatar.style.backgroundRepeat = "no-repeat";
        } else {
          avatar.style.backgroundImage = "";
          avatar.style.backgroundSize = "";
          avatar.style.backgroundPosition = "";
          avatar.style.backgroundRepeat = "";

          if (!avatar.querySelector("img")) {
            avatar.textContent = config.initials;
          }
        }
      });
    });
  }

  function setupGlobalMotion() {
    if (document.body.classList.contains("sc-page")) return;
    document.body.classList.add("sp-motion-ready");

    const selector = [
      "main article",
      "main [class$='-panel']",
      "main [class*='-stat-card']",
      "main [class*='-summary'] > *",
      "main [class*='-side-card']"
    ].join(",");

    const items = Array.from(document.querySelectorAll(selector))
      .filter(function (item) {
        return !item.hidden &&
          !item.closest("[hidden]") &&
          !item.classList.contains("sp-motion-item");
      })
      .slice(0, 22);

    items.forEach(function (item, index) {
      item.classList.add("sp-motion-item", "sp-polish-card");
      item.style.setProperty(
        "--sp-motion-delay",
        Math.min(index * 34, 340) + "ms"
      );
    });
  }

  async function init() {
    ensureFavicon();
    await ensureIcons();
    syncRoleProfileAvatar();
    setupGlobalMotion();

    const isRolePage = !!getRolePageConfig();
    if (isRolePage) {
      const navbarHost = document.querySelector("#shared-navbar");
      if (navbarHost) navbarHost.remove();
      setupRoleSidebar();
      ensureSessionSidebar();
      // Read-only contextual actions and URL-backed list preferences; no safety mutations.
      Promise.all([
        stylesheet("permit-qr.css"), stylesheet("permit-context.css"),
        javascript("permit-qr.js", "SafePermitPermitQR"),
        javascript("permit-context.js", "SafePermitContext")
      ]).catch(error => console.error("SafePermit permit context:", error));
      const footerHost = await inject("#shared-footer", "footer.html");
      applyLinks(footerHost);
      if (window.SafePermitI18n) window.SafePermitI18n.apply(footerHost);
      return;
    }

    const route = relativeRoute();
    const navbarHost = document.querySelector("#shared-navbar");
    const slideTabs = !!navbarHost && slideTabsEligible(route);
    // Authentication pages used the secondary bar, which hides the public links; eligible pages use the public bar.
    if (slideTabs && navbarHost.dataset.variant !== "home") {
      navbarHost.dataset.variant = "home";
      navbarHost.dataset.spUpgraded = "true";
    }
    const publicFooter = PUBLIC_FOOTER_ROUTES.indexOf(route) !== -1 && slideTabsEligible(route) && !!document.querySelector("#shared-footer");
    if (slideTabs) ensureSlideTabs().catch(function () {});
    if (publicFooter) ensurePublicFooter().catch(function () {});

    const results = await Promise.all([
      inject("#shared-navbar", "navbar.html"),
      inject("#shared-footer", publicFooter ? "public-footer.html" : "footer.html")
    ]);

    await setupNavbar(results[0]);
    if (window.SafePermitTheme) window.SafePermitTheme.bind(results[0]);
    if (window.SafePermitI18n) {
      window.SafePermitI18n.bind(results[0]);
      window.SafePermitI18n.apply(results[0]);
    }
    applyLinks(results[1]);
    if (window.SafePermitI18n) {
      window.SafePermitI18n.bind(results[1]);
      window.SafePermitI18n.apply(results[1]);
    }

    if (slideTabs && results[0]) {
      try {
        await ensureSlideTabs();
        window.SafePermitSlideTabs.init(results[0]);
      } catch (error) { console.error("SafePermit slide tabs:", error); }
    }
    if (publicFooter && results[1]) {
      try {
        await ensurePublicFooter();
        window.SafePermitPublicFooter.init(results[1].querySelector("[data-sp-public-footer]"));
      } catch (error) { console.error("SafePermit public footer:", error); }
    }

    window.dispatchEvent(new CustomEvent("safepermit:navbarready", {
      detail: { host: results[0] }
    }));
  }

  // Sample rows link to built-in permits that are not stored in this browser. Opening one adds demo=1, so the
  // permit page shows it under the labelled demo banner; a typed or stale link to a missing permit shows
  // "Permit not found" instead (shared/js/permit-state.js).
  function storedPermitIds() {
    const ids = new Set();
    try {
      const known = window.SafePermitData && window.SafePermitData.readKnownPermits ? window.SafePermitData.readKnownPermits() : null;
      const list = Array.isArray(known) ? known : JSON.parse(localStorage.getItem("safePermitSubmittedPermits") || "[]");
      (Array.isArray(list) ? list : []).forEach(function (permit) { if (permit && permit.id) ids.add(String(permit.id)); });
      const latest = JSON.parse(localStorage.getItem("safePermitSubmittedPermit") || "null");
      if (latest && latest.id) ids.add(String(latest.id));
    } catch (error) {}
    return ids;
  }

  document.addEventListener("click", function (event) {
    const link = event.target && event.target.closest ? event.target.closest("a[href]") : null;
    if (!link || !/\/(review-permit|permit-details|approval-tracking)\/(index\.html)?\?/.test(link.getAttribute("href") || "")) return;
    const url = new URL(link.href, window.location.href);
    const id = url.searchParams.get("id");
    if (!id || url.searchParams.has("demo") || storedPermitIds().has(id)) return;
    url.searchParams.set("demo", "1");
    link.href = url.href;
  }, true);

  window.addEventListener("storage", syncRoleProfileAvatar);
  document.addEventListener("safepermit:i18nready", syncRoleProfileAvatar);
  document.addEventListener("safepermit:languagechange", function(){ window.setTimeout(syncRoleProfileAvatar, 0); });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
