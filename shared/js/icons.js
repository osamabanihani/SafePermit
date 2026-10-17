/* Local industrial line icons. Existing elements, handlers, labels and data hooks stay in place. */
(function () {
  "use strict";
  if (window.SafePermitIcons) return;
  const ns = "http://www.w3.org/2000/svg";
  const paths = {
    helmet: '<path d="M5 16v-4a7 7 0 0 1 14 0v4M10 5v7M14 5v7"/><rect x="2" y="16" width="20" height="4" rx="1.5"/>',
    glasses: '<path d="M2 10h2M20 10h2M10 11h4"/><rect x="4" y="8" width="6" height="7" rx="2"/><rect x="14" y="8" width="6" height="7" rx="2"/>',
    gloves: '<path d="M8 13V5a1.5 1.5 0 0 1 3 0v7-8a1.5 1.5 0 0 1 3 0v8-6a1.5 1.5 0 0 1 3 0v7-4a1.5 1.5 0 0 1 3 0v8c0 3-2 5-5 5h-3c-2 0-3-1-4-3l-4-6a1.5 1.5 0 0 1 2-2Z"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/>',
    loto: '<rect x="3" y="11" width="10" height="10" rx="2"/><path d="M5 11V7a3 3 0 0 1 6 0v4M14 4h5l3 3v10h-6V4ZM17 7h.01"/>',
    permits: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 9h6M9 13h6M9 17h3"/>',
    review: '<rect x="4" y="4" width="13" height="17" rx="2"/><path d="M8 4V2h5v2M8 10h5M8 14h3"/><circle cx="17" cy="15" r="4"/><path d="m20 18 2 3"/>',
    risk: '<path d="m12 3 10 18H2ZM12 9v5M12 17h.01"/>',
    tracking: '<circle cx="5" cy="17" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="19" cy="17" r="2"/><path d="m6 15 5-7M13 8l5 7M7 17h10"/>',
    approval: '<path d="m12 2 9 4v6c0 5-4 8-9 10-5-2-9-5-9-10V6Z"/><path d="m8 12 3 3 5-6"/>',
    worker: '<path d="M7 9V7a5 5 0 0 1 10 0v2M10 3v4M14 3v4M5 9h14M8 11a4 4 0 0 0 8 0M4 22v-3c0-3 3-5 8-5s8 2 8 5v3M9 16v6M15 16v6M4 19h5M15 19h5"/>',
    supervisor: '<rect x="4" y="4" width="14" height="17" rx="2"/><path d="M8 4V2h6v2M8 9h6M8 13h3"/><circle cx="17" cy="16" r="4"/><path d="m20 19 2 2"/>',
    safety: '<path d="m12 2 9 4v6c0 5-4 8-9 10-5-2-9-5-9-10V6Z"/><path d="M8 12V9a4 4 0 0 1 8 0v3M6 12h12M10 6v3M14 6v3"/>',
    admin: '<path d="M5 3h10l4 4v7M15 3v4h4M5 3v18h7M8 11h5M8 15h3"/><circle cx="17" cy="17" r="4"/><path d="m15 17 1.5 1.5 2.5-3"/>',
    ai: '<rect x="5" y="5" width="14" height="14" rx="3"/><path d="M8 2v3M12 2v3M16 2v3M8 19v3M12 19v3M16 19v3M2 8h3M2 12h3M2 16h3M19 8h3M19 12h3M19 16h3m-7-1-3 2-3-2V9l3-1 3 1Z"/>',
    home: '<path d="M3 21V11l6 3V9l6 3V5h5v16ZM6 18h2M11 18h2M16 18h2M15 5h5"/>',
    dashboard: '<rect x="3" y="3" width="8" height="7" rx="1.5"/><rect x="15" y="3" width="6" height="7" rx="1.5"/><rect x="3" y="14" width="6" height="7" rx="1.5"/><path d="M13 21v-5M17 21v-8M21 21v-4"/>',
    create: '<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M9 4V2h6v2M12 9v8M8 13h8"/>',
    active: '<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>',
    history: '<path d="M3 11a9 9 0 1 1 2.5 7M3 3v8h7M12 7v5l3 2"/>',
    notifications: '<path d="M18 9a6 6 0 0 0-12 0c0 6-3 7-3 8h18c0-1-3-2-3-8M10 21h4M12 2v1"/>',
    profile: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2M10 15l2 3 2-3"/>',
    users: '<circle cx="8" cy="7" r="3"/><circle cx="18" cy="8" r="2.5"/><path d="M2 21v-3a6 6 0 0 1 12 0v3M16 14a5 5 0 0 1 6 5v2"/>',
    sites: '<path d="M20 9c0 6-8 13-8 13S4 15 4 9a8 8 0 1 1 16 0Z"/><path d="M8 12V8l4 2V7l4 2v3Z"/>',
    types: '<path d="M5 4h10l4 4v13H5ZM15 4v4h4M8 12h8M8 16h5M2 17V1h10"/>',
    reports: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 17v-4M12 17V8M16 17v-6"/>',
    settings: '<path d="M3 6h5M12 6h9M3 12h10M17 12h4M3 18h3M10 18h11"/><circle cx="10" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>',
    electric: '<path d="m13 2-9 12h7l-1 8 10-13h-7Z"/>',
    hot: '<path d="M13 2c1 6-5 7-5 11-2-1-2-3-2-3s-4 4-2 8c3 6 13 5 15-1 2-5-1-9-3-11 0 3-1 4-2 5 1-4 0-7-1-9Z"/>',
    height: '<path d="M8 2v20M16 2v20M8 6h8M8 11h8M8 16h8M8 21h8M3 9V3l-2 2M3 3l2 2"/>',
    confined: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 21V8h8v13M12 13h.01M8 3v3M16 3v3"/>',
    inspection: '<circle cx="10" cy="10" r="7"/><path d="m15 15 7 7M7 10l2 2 4-4"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 10v7M12 7h.01"/>',
    returned: '<path d="M9 5 3 11l6 6M3 11h10c5 0 8 3 8 8"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
    phone: '<path d="m8 3-4 1c-4 7 9 20 16 16l1-4-5-3-2 3c-3-1-5-3-6-6l3-2Z"/>',
    moon: '<path d="M20 15A8.5 8.5 0 0 1 9 4a8.5 8.5 0 1 0 11 11Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
    play: '<path d="m8 4 12 8L8 20Z"/>',
    pause: '<path d="M8 4v16M16 4v16"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    chevrons: '<path d="m8 9 4-4 4 4M8 15l4 4 4-4"/>',
    pin: '<path d="M8 3h8l-1 6 4 4v2h-6v7h-2v-7H5v-2l4-4Z"/>',
    logout: '<path d="M9 3H4v18h5M14 7l5 5-5 5M8 12h11"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>'
  };
  const aliases = { permit: "permits", ppe: "helmet", hazard: "risk", isolation: "loto", approvals: "approval", riskAssessment: "risk" };
  const selector = '[data-sp-icon],[data-sp-theme-icon],[class*="__icon"],[class$="-icon"],.permit-type-icon';
  const roles = { W: "worker", S: "supervisor", SO: "safety", A: "admin", PPE: "helmet", ISO: "lock", LOTO: "loto", TOOL: "settings", FIRE: "hot", GAS: "confined" };
  const glyphs = { "✓": "approval", "!": "risk", "⚡": "electric", "♨": "hot", "↥": "height", "□": "confined", "↩": "returned", "+": "create", "＋": "create", "✦": "ai", "⇢": "tracking", "◴": "history", "☾": "moon", "☀": "sun", "i": "info", "@": "mail" };
  const current = new WeakMap();

  function nameFor(element) {
    if (element.hasAttribute("data-sp-icon")) return element.dataset.spIcon;
    const raw = Array.from(element.childNodes).filter(function (node) { return node.nodeType === 3; }).map(function (node) { return node.nodeValue; }).join("").trim();
    if (/^\d+$/.test(raw)) return ""; // Count badges and real values remain readable.
    if (glyphs[raw]) return glyphs[raw];
    const classes = element.getAttribute("class") || "";
    if (/workflow__icon|role-card__icon|auth-role__icon/.test(classes)) {
      const key = (element.getAttribute("data-i18n-text") || "").match(/\.(w|s|so|a)(?:_\d+)?$/);
      if (key) return { w: "worker", s: "supervisor", so: "safety", a: "admin" }[key[1]];
    }
    const type = classes.match(/--(electrical|hot|height|confined|inspection|general)/);
    if (type) return { electrical: "electric", general: "permits" }[type[1]] || type[1];
    if (roles[raw]) return roles[raw];
    if (raw === "R") return /security/.test(classes) ? "lock" : "review";
    if (raw === "P") return "permits";
    if (raw === "U") return "users";
    if (raw === "T") return "history";
    if (/notice|info/.test(classes)) return "info";
    if (/danger|priority|alert|focus/.test(classes)) return "risk";
    if (/success|empty/.test(classes)) return "approval";
    if (/ai-/.test(classes)) return "ai";
    if (/security/.test(classes)) return "lock";
    if (/auth-input/.test(classes)) {
      const field = element.parentElement.querySelector("input");
      if (field) return field.type === "password" ? "lock" : "mail";
    }
    const link = element.closest("a[href]");
    if (link) {
      const href = link.getAttribute("href");
      const routes = [["create-permit", "create"], ["dashboard", "dashboard"], ["review", "review"], ["pending", "review"], ["active", "active"], ["tracking", "tracking"], ["risk", "risk"], ["history", "history"], ["notification", "notifications"], ["profile", "profile"], ["users", "users"], ["sites", "sites"], ["types", "types"], ["reports", "reports"], ["settings", "settings"], ["ai-assistant", "ai"], ["permits", "permits"]];
      const route = routes.find(function (item) { return href.indexOf(item[0]) !== -1; });
      if (route) return route[1];
    }
    return "";
  }
  function draw(svg, name) {
    const key = aliases[name] || name;
    if (!paths[key]) return false;
    if (svg.dataset.spIconDrawn === key && svg.children.length) return true;
    svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns", ns);
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.classList.add("sp-icon");
    svg.style.fill = "none";
    svg.style.stroke = "currentColor";
    svg.style.strokeWidth = "1.7";
    svg.style.strokeLinecap = "round";
    svg.style.strokeLinejoin = "round";
    svg.innerHTML = paths[key];
    svg.querySelectorAll("path,rect,circle").forEach(function (shape) { shape.setAttribute("vector-effect", "non-scaling-stroke"); });
    svg.dataset.spIconDrawn = key;
    return true;
  }
  function create(name, className) {
    const svg = document.createElementNS(ns, "svg");
    if (className) svg.setAttribute("class", className);
    svg.dataset.spIcon = name;
    draw(svg, name);
    return svg;
  }
  function render(element) {
    if (!/^(DIV|SPAN|svg)$/.test(element.tagName)) return;
    const previous = current.get(element);
    const raw = Array.from(element.childNodes).filter(function (node) { return node.nodeType === 3; }).map(function (node) { return node.nodeValue; }).join("").trim();
    const classes = element.getAttribute("class") || "";
    // Rendering removes the original glyph. Retain that semantic choice until page code changes it.
    if (previous && !raw && !element.hasAttribute("data-sp-icon") && previous.classes === classes && previous.svg.parentElement === element && element.children.length === 1) return;
    if (previous && /^\d+$/.test(raw)) {
      if (previous.aria === null) element.removeAttribute("aria-hidden");
      else element.setAttribute("aria-hidden", previous.aria);
      current.delete(element);
      return;
    }
    const name = nameFor(element);
    if (!name || !paths[aliases[name] || name]) return;
    if (element.namespaceURI === ns) { draw(element, name); return; }
    if (previous && previous.name === name && previous.svg.parentElement === element && element.children.length === 1) return;
    const svg = create(name);
    const aria = previous ? previous.aria : element.getAttribute("aria-hidden");
    element.replaceChildren(svg);
    element.setAttribute("aria-hidden", "true");
    current.set(element, { name: name, svg: svg, classes: classes, aria: aria });
  }
  function refresh(scope) {
    if (!scope) return;
    if (scope.matches && scope.matches(selector)) render(scope);
    if (scope.querySelectorAll) scope.querySelectorAll(selector).forEach(render);
  }
  function start() {
    refresh(document);
    const observer = new MutationObserver(function (records) {
      const roots = new Set();
      records.forEach(function (record) {
        const parent = record.target.nodeType === 1 ? record.target : record.target.parentElement;
        if (record.type === "attributes" && record.attributeName === "data-sp-icon") { roots.add(parent); return; }
        if (parent && parent.closest("svg.sp-icon")) return;
        if (parent && parent.matches(selector)) roots.add(parent);
        if (record.type === "childList") record.addedNodes.forEach(function (node) { if (node.nodeType === 1 && !node.matches("svg.sp-icon")) roots.add(node); });
      });
      roots.forEach(refresh);
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["class", "data-sp-icon"] });
  }
  window.SafePermitIcons = { create: create, refresh: refresh, names: Object.keys(paths) };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
