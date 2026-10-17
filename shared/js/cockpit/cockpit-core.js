/* SafePermit v13.6 — Operational Cockpit frame.
 * Renders the role dashboard model (shared/js/role-dashboard.js) as:
 *   Operational Focus (needs you · in motion · next step) → the role's signature visualization
 *   with a context panel, Chart/Table views, filters, saved views and CSV → one tabbed list panel.
 * Visualizations register with SafePermitCockpit.register(role, viz). Every figure comes from stored
 * records; nothing is sampled, smoothed or invented. Visibility here is never authorization.
 * English phrases are passed through tr() and translated by i18n.js runtime entries (ar.json).
 */
(function (root) {
  "use strict";
  const doc = root.document;
  const D = () => root.SafePermitCockpitData;
  const reduced = root.matchMedia ? root.matchMedia("(prefers-reduced-motion: reduce)") : { matches: true, addEventListener() {} };
  const registry = {};
  const states = new WeakMap();
  const tr = s => s; // marks an English UI phrase (translated by i18n runtime entries)
  // Translate one phrase now (for tooltips and labels that join a phrase with numbers).
  const tv = s => (root.SafePermitI18n && root.SafePermitI18n.translateValue ? root.SafePermitI18n.translateValue(s) : s);
  const ROLE_LABEL = { worker: "Worker", supervisor: "Supervisor", safety: "Safety Officer", admin: "Admin" };

  /* ---------- small DOM helpers ---------- */
  function el(tag, cls, value) {
    const node = doc.createElement(tag);
    if (cls) node.className = cls;
    if (value != null && value !== "") node.textContent = String(value);
    return node;
  }
  function data(tag, cls, value) { const n = el(tag, cls, value); n.setAttribute("data-i18n-ignore", ""); return n; }
  function num(value, cls) { return data("span", "spc-num" + (cls ? " " + cls : ""), value); }
  function svg(tag, attrs) {
    const node = doc.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.keys(attrs || {}).forEach(k => node.setAttribute(k, attrs[k]));
    return node;
  }
  function url(route) {
    const base = root.SafePermitPaths && root.SafePermitPaths.projectRoot;
    return base ? new URL(route, base).href : "../../" + route;
  }
  function detailHref(role, id, status) {
    const routes = root.SafePermitDashboard && root.SafePermitDashboard.DETAIL_ROUTE;
    return routes ? url(routes[role](encodeURIComponent(id), status || "")) : "#";
  }
  function translate(scope) { if (root.SafePermitI18n && typeof root.SafePermitI18n.apply === "function") root.SafePermitI18n.apply(scope); }
  const rtl = () => doc.documentElement.dir === "rtl";
  // Latin digits in both languages, matching the rest of the application.
  const locale = () => (doc.documentElement.lang === "ar" ? "ar-u-nu-latn" : "en-US");

  // Status glyphs: urgency never relies on color alone.
  const GLYPH = { ready: "●", blocked: "⊘", waiting: "◷", overdue: "▲", done: "✓", info: "○" };
  function mark(kind, label) {
    const m = el("span", "spc-mark spc-mark--" + kind);
    const g = el("span", "spc-mark__glyph", GLYPH[kind] || "");
    g.setAttribute("aria-hidden", "true");
    m.append(g, el("span", "spc-mark__label", label));
    return m;
  }

  /* ---------- roving focus for visualization controls (arrow keys, Home/End, RTL aware) ---------- */
  function roving(group, selector, options) {
    const opts = options || {};
    group.addEventListener("keydown", function (event) {
      const items = Array.from(group.querySelectorAll(selector)).filter(n => !n.disabled && n.getClientRects().length);
      const index = items.indexOf(doc.activeElement);
      if (index < 0) return;
      const cols = opts.columns || 0;
      let next = index;
      const forward = rtl() ? "ArrowLeft" : "ArrowRight", back = rtl() ? "ArrowRight" : "ArrowLeft";
      if (event.key === forward) next = Math.min(items.length - 1, index + 1);
      else if (event.key === back) next = Math.max(0, index - 1);
      else if (event.key === "ArrowDown") next = cols ? Math.min(items.length - 1, index + cols) : Math.min(items.length - 1, index + 1);
      else if (event.key === "ArrowUp") next = cols ? Math.max(0, index - cols) : Math.max(0, index - 1);
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = items.length - 1;
      else return;
      event.preventDefault();
      items[next].focus();
    });
  }

  /* ---------- tooltip (hover and keyboard focus) ---------- */
  let tip = null;
  function tooltip() {
    if (tip) return tip;
    tip = el("div", "spc-tip");
    tip.setAttribute("role", "tooltip");
    tip.hidden = true;
    doc.body.appendChild(tip);
    const show = function (target) {
      const host = target && target.closest && target.closest("[data-spc-tip]");
      if (!host) { tip.hidden = true; return; }
      tip.textContent = host.getAttribute("data-spc-tip");
      translate(tip);
      tip.hidden = false;
      const r = host.getBoundingClientRect(), t = tip.getBoundingClientRect();
      const left = Math.max(8, Math.min(root.innerWidth - t.width - 8, r.left + r.width / 2 - t.width / 2));
      const top = r.top - t.height - 8 > 8 ? r.top - t.height - 8 : r.bottom + 8;
      tip.style.left = left + "px";
      tip.style.top = top + "px";
    };
    doc.addEventListener("pointerover", e => show(e.target));
    doc.addEventListener("focusin", e => show(e.target));
    doc.addEventListener("focusout", () => { tip.hidden = true; });
    root.addEventListener("scroll", () => { tip.hidden = true; }, { passive: true });
    return tip;
  }

  /* ---------- greeting from the actual time of day ----------
   * v13.7: no personal name. The demo has no real signed-in user, so the greeting never invents one. */
  function setGreeting(role) {
    const h1 = doc.querySelector("[data-dash-header] h1");
    if (!h1 || !ROLE_LABEL[role] || !D()) return;
    const part = D().greetingKey(new Date().getHours());
    const key = "cockpit.greeting_" + part;
    if (h1.getAttribute("data-i18n-text") === key) return;
    h1.setAttribute("data-i18n-text", key);
    h1.textContent = { morning: "Good morning.", afternoon: "Good afternoon.", evening: "Good evening." }[part];
    if (root.SafePermitI18n && typeof root.SafePermitI18n.apply === "function") root.SafePermitI18n.apply(h1.parentNode);
  }

  /* ---------- context: one place the visualizations read from ---------- */
  function buildContext(state) {
    const { role, model, src } = state;
    const all = Array.isArray(src && src.permits) ? src.permits.filter(p => p && String(p.id || "").trim()) : [];
    const filtered = D().applyFilters(all, state.filters, Date.now());
    const byId = {};
    model.action.forEach(i => { (byId[i.id] = byId[i.id] || {}).action = i; });
    model.blocked.forEach(i => { (byId[i.id] = byId[i.id] || {}).blocked = i; });
    model.waiting.forEach(i => { (byId[i.id] = byId[i.id] || {}).waiting = i; });
    const now = Date.now();
    return {
      role, model, src, now, D: D(), all, permits: filtered, filtered: filtered.length !== all.length,
      reviews: (src && src.reviews) || {}, stops: (src && src.stops) || [], history: (src && src.history) || [],
      info: id => byId[id] || {},
      href: (id, status) => detailHref(role, id, status),
      url, el, data, num, svg, mark, tr, translate, roving, reduced: reduced.matches,
      select: key => selectKey(state, key, true),
      selected: () => state.selection
    };
  }

  /* ---------- permit rows used by the context panel and lists ---------- */
  function permitState(ctx, permit) {
    const info = ctx.info(String(permit.id));
    if (info.action) return info.action.ready ? { kind: "ready", label: tr("Ready"), next: info.action.next } : { kind: "blocked", label: tr("Blocked"), next: info.action.next };
    if (info.blocked) return { kind: "blocked", label: tr("Blocked") };
    if (info.waiting) return { kind: "waiting", label: tr("Waiting on"), who: info.waiting.waitingOn };
    return { kind: "info", label: "" };
  }
  function stageDots(ctx, permit) {
    const order = ["draft", "supervisor", "safety", "admin", "approved", "active"];
    const key = ctx.D.stageOf(permit);
    const at = order.indexOf(key);
    const wrap = el("span", "spc-dots");
    wrap.setAttribute("aria-hidden", "true");
    order.forEach(function (k, i) {
      const d = el("i", "spc-dots__dot");
      if (at >= 0 && i < at) d.classList.add("is-done");
      if (i === at) d.classList.add("is-here");
      wrap.append(d);
    });
    if (at < 0) wrap.classList.add("is-branch");
    return wrap;
  }
  function permitItem(ctx, permit, extra) {
    const li = el("li", "spc-item");
    const st = permitState(ctx, permit);
    li.dataset.kind = st.kind;
    const head = el("div", "spc-item__head");
    const id = data("a", "spc-item__id", permit.id);
    id.href = ctx.href(String(permit.id), permit.status);
    head.append(id);
    const title = ctx.D.titleOf(permit);
    if (title) head.append(data("span", "spc-item__title", title));
    li.append(head);
    const meta = el("div", "spc-item__meta");
    meta.append(stageDots(ctx, permit), el("span", "spc-item__status", String(permit.status || "Unknown")));
    if (st.label) {
      const m = mark(st.kind, st.label);
      if (st.who) m.append(el("span", "spc-mark__who", st.who));
      meta.append(m);
    }
    li.append(meta);
    if (st.next) {
      const next = el("p", "spc-item__next");
      next.append(el("span", "spc-item__next-label", tr("Next step")), el("span", "", st.next));
      li.append(next);
    }
    const info = ctx.info(String(permit.id));
    const reasons = (info.action && !info.action.ready && info.action.reasons) || (info.blocked && info.blocked.reasons) || [];
    if (reasons.length) {
      const ul = el("ul", "spc-item__reasons");
      reasons.slice(0, 4).forEach(function (r) {
        const rl = el("li", "");
        rl.append(el("span", "", r.text));
        if (r.role) rl.append(el("span", "spc-item__reason-role", r.role));
        const S = root.SafePermitStatus;
        const resolve = ctx.role === "safety" && S && r.resolver ? S.resolverHref(r, String(permit.id)) : "";
        if (resolve) { const sep = el("span", "spc-item__sep", " · "); sep.setAttribute("aria-hidden", "true"); const a = el("a", "spc-item__resolve", r.resolver); a.href = resolve; rl.append(sep, a); }
        ul.append(rl);
      });
      li.append(ul);
    }
    if (extra) li.append(extra);
    // The worker's only in-dashboard action is the existing correction flow on the permit page.
    if (ctx.role === "worker" && permit.status === "Returned for Correction") {
      const a = el("a", "spc-item__action", tr("Correct and resubmit"));
      a.href = ctx.href(String(permit.id), permit.status);
      li.append(a);
    } else {
      const a = el("a", "spc-item__action spc-item__action--quiet", tr("Open permit"));
      a.href = ctx.href(String(permit.id), permit.status);
      li.append(a);
    }
    return li;
  }

  /* ---------- Operational Focus ---------- */
  function renderFocus(state, ctx) {
    const host = state.dom.focus;
    host.replaceChildren();
    const model = ctx.model;
    // 1. Needs you
    const needs = el("section", "spc-focus__col spc-focus__col--needs");
    needs.setAttribute("aria-labelledby", "spc-needs-title");
    const h = el("h2", "spc-focus__kicker", tr("Needs you"));
    h.id = "spc-needs-title";
    const big = el("p", "spc-focus__figure");
    big.append(num(model.action.length));
    const ready = model.action.filter(i => i.ready).length;
    const blocked = model.action.length - ready;
    const split = el("p", "spc-focus__split");
    if (model.action.length) {
      const r = mark("ready", tr("Ready")); r.prepend(num(ready)); split.append(r);
      if (blocked) { const b = mark("blocked", tr("Blocked")); b.prepend(num(blocked)); split.append(b); }
    } else split.append(el("span", "spc-focus__calm", tr("Nothing needs your action right now.")));
    needs.append(h, big, split);
    if (model.action.length) {
      const ul = el("ul", "spc-focus__list");
      model.action.slice(0, 3).forEach(function (item) {
        const li = el("li", "");
        const a = el("a", "spc-focus__link");
        a.href = detailHref(ctx.role, item.id, item.status);
        a.dataset.kind = item.ready ? "ready" : "blocked";
        const g = el("span", "spc-focus__glyph", item.ready ? GLYPH.ready : GLYPH.blocked);
        g.setAttribute("aria-hidden", "true");
        a.append(g, data("span", "spc-focus__id", item.id), el("span", "spc-focus__why", item.ready ? item.next : (item.reasons[0] ? item.reasons[0].text : tr("Blocked"))));
        li.append(a);
        ul.append(li);
      });
      needs.append(ul);
      if (model.action.length > 3) {
        const more = el("button", "spc-focus__more");
        more.type = "button";
        more.append(el("span", "", tr("Show all")), num(model.action.length));
        more.addEventListener("click", () => selectKey(state, "needs", true));
        needs.append(more);
      }
    }
    // 2. In motion
    const motion = el("section", "spc-focus__col spc-focus__col--motion");
    motion.setAttribute("aria-labelledby", "spc-motion-title");
    const h2 = el("h2", "spc-focus__kicker", tr("In motion"));
    h2.id = "spc-motion-title";
    motion.append(h2);
    const viz = registry[ctx.role];
    const facts = viz && viz.motion ? viz.motion(ctx) : [];
    const dl = el("dl", "spc-focus__facts");
    facts.forEach(function (f) {
      const row = el("div", "spc-fact" + (f.tone ? " spc-fact--" + f.tone : ""));
      const dt = el("dt", "");
      if (f.glyph) { const g = el("span", "spc-fact__glyph", f.glyph); g.setAttribute("aria-hidden", "true"); dt.append(g); }
      dt.append(num(f.value));
      const dd = el("dd", "");
      (Array.isArray(f.label) ? f.label : [f.label]).forEach((part, i) => { if (i) dd.append(" "); dd.append(el("span", "", part)); });
      row.append(dt, dd);
      dl.append(row);
    });
    if (!facts.length) dl.append(el("p", "spc-focus__calm", tr("No permits are moving yet.")));
    motion.append(dl);
    // 3. Next step
    const next = el("section", "spc-focus__col spc-focus__col--next");
    next.setAttribute("aria-labelledby", "spc-next-title");
    const h3 = el("h2", "spc-focus__kicker", tr("Next step"));
    h3.id = "spc-next-title";
    const ol = el("ol", "spc-focus__steps");
    const tiles = model.tiles.slice();
    const lead = tiles.findIndex(t => t.count == null || t.count > 0);
    tiles.slice(0, 3).forEach(function (tile, i) {
      const li = el("li", "");
      const a = el("a", "spc-step" + (i === lead ? " is-lead" : ""));
      a.href = url(tile.route);
      a.append(el("span", "spc-step__label", tile.label));
      if (tile.count != null) a.append(num(tile.count, "spc-step__count"));
      if (tile.count === 0) a.dataset.empty = "true";
      li.append(a);
      ol.append(li);
    });
    next.append(h3, ol);
    host.append(needs, motion, next);
  }

  /* ---------- the deck: toolbar, visualization / table, context panel ---------- */
  function renderToolbar(state, ctx) {
    const bar = state.dom.toolbar;
    bar.replaceChildren();
    const f = state.filters;
    const facets = ctx.D.facets(ctx.all);
    // Filter popover
    const filterWrap = el("div", "spc-pop");
    const filterBtn = el("button", "spc-tool");
    filterBtn.type = "button";
    filterBtn.setAttribute("aria-expanded", String(!!state.open.filters));
    filterBtn.setAttribute("aria-controls", "spc-filter-panel");
    const activeCount = ["q", "site", "type", "risk", "range"].filter(k => f[k]).length;
    filterBtn.append(el("span", "", tr("Filter")));
    if (activeCount) filterBtn.append(num(activeCount, "spc-tool__badge"));
    filterBtn.addEventListener("click", () => { state.open.filters = !state.open.filters; state.open.views = false; renderToolbar(state, buildContext(state)); if (state.open.filters) { const i = bar.querySelector(".spc-filter input"); if (i) i.focus(); } });
    filterWrap.append(filterBtn);
    if (state.open.filters) {
      const panel = el("div", "spc-pop__panel spc-filter");
      panel.id = "spc-filter-panel";
      const search = el("label", "spc-field");
      search.append(el("span", "", tr("Search")));
      const input = el("input", "");
      input.type = "search"; input.value = f.q || ""; input.setAttribute("data-i18n-ignore", "");
      input.addEventListener("input", () => { f.q = input.value; refreshDeck(state); });
      search.append(input);
      panel.append(search);
      [["site", tr("Site"), facets.sites], ["type", tr("Permit type"), facets.types], ["risk", tr("Risk"), facets.risks]].forEach(function (spec) {
        const label = el("label", "spc-field");
        label.append(el("span", "", spec[1]));
        const sel = el("select", "");
        const any = el("option", "", tr("All")); any.value = ""; sel.append(any);
        spec[2].forEach(v => { const o = data("option", "", spec[0] === "risk" ? v.charAt(0).toUpperCase() + v.slice(1) : v); o.value = v; sel.append(o); });
        sel.value = f[spec[0]] || "";
        sel.disabled = !spec[2].length;
        sel.addEventListener("change", () => { f[spec[0]] = sel.value; refreshDeck(state); renderToolbar(state, buildContext(state)); });
        label.append(sel);
        panel.append(label);
      });
      const range = el("label", "spc-field");
      range.append(el("span", "", tr("Submitted")));
      const rs = el("select", "");
      [["", tr("Any time")], ["7", tr("Last 7 days")], ["30", tr("Last 30 days")], ["90", tr("Last 90 days")]].forEach(function (o) { const op = el("option", "", o[1]); op.value = o[0]; rs.append(op); });
      rs.value = f.range || "";
      rs.addEventListener("change", () => { f.range = rs.value; refreshDeck(state); renderToolbar(state, buildContext(state)); });
      range.append(rs);
      panel.append(range, el("p", "spc-field__note", tr("A date range excludes permits without a recorded submission time.")));
      const clear = el("button", "spc-link-button", tr("Clear filters"));
      clear.type = "button";
      clear.addEventListener("click", () => { state.filters = {}; refreshDeck(state); renderToolbar(state, buildContext(state)); });
      panel.append(clear);
      panel.addEventListener("keydown", e => { if (e.key === "Escape") { state.open.filters = false; renderToolbar(state, buildContext(state)); bar.querySelector(".spc-tool").focus(); } });
      filterWrap.append(panel);
    }
    bar.append(filterWrap);
    // Active chips
    const chips = el("div", "spc-chips");
    ["q", "site", "type", "risk", "range"].forEach(function (k) {
      if (!f[k]) return;
      const chip = el("button", "spc-chip");
      chip.type = "button";
      const value = k === "range" ? data("strong", "", f[k] + " d") : data("strong", "", f[k]);
      chip.append(el("span", "", { q: tr("Search"), site: tr("Site"), type: tr("Permit type"), risk: tr("Risk"), range: tr("Submitted") }[k]), value, el("span", "spc-chip__x", "×"));
      chip.setAttribute("aria-label", "Remove filter");
      chip.addEventListener("click", () => { delete f[k]; refreshDeck(state); renderToolbar(state, buildContext(state)); });
      chips.append(chip);
    });
    if (ctx.filtered) chips.append(el("span", "spc-chips__note", tr("Filtered view. Operational Focus always shows everything.")));
    bar.append(chips);
    // Saved views
    const viewsWrap = el("div", "spc-pop");
    const viewsBtn = el("button", "spc-tool", tr("Saved views"));
    viewsBtn.type = "button";
    viewsBtn.setAttribute("aria-expanded", String(!!state.open.views));
    viewsBtn.addEventListener("click", () => { state.open.views = !state.open.views; state.open.filters = false; renderToolbar(state, buildContext(state)); });
    viewsWrap.append(viewsBtn);
    if (state.open.views) {
      const panel = el("div", "spc-pop__panel spc-views");
      const views = ctx.D.readViews(root.localStorage, ctx.role);
      if (!views.length) panel.append(el("p", "spc-views__empty", tr("No saved views on this device yet.")));
      views.forEach(function (v, i) {
        const row = el("div", "spc-views__row");
        const apply = data("button", "spc-views__apply", v.name);
        apply.type = "button";
        apply.addEventListener("click", () => { state.filters = Object.assign({}, v.filters || {}); state.mode = v.mode === "table" ? "table" : "chart"; state.open.views = false; refreshDeck(state); renderToolbar(state, buildContext(state)); });
        const del = el("button", "spc-views__delete", "×");
        del.type = "button";
        del.setAttribute("aria-label", "Delete view");
        del.addEventListener("click", () => { views.splice(i, 1); ctx.D.writeViews(root.localStorage, ctx.role, views); renderToolbar(state, buildContext(state)); });
        row.append(apply, del);
        panel.append(row);
      });
      const form = el("form", "spc-views__save");
      const input = el("input", "");
      input.required = true; input.maxLength = 40; input.setAttribute("aria-label", "Name this view"); input.placeholder = "Name this view";
      const save = el("button", "spc-tool", tr("Save current view"));
      save.type = "submit";
      form.append(input, save);
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        const name = input.value.trim();
        if (!name) return;
        const list = ctx.D.readViews(root.localStorage, ctx.role).filter(v => v.name !== name);
        list.unshift({ name, filters: Object.assign({}, state.filters), mode: state.mode });
        ctx.D.writeViews(root.localStorage, ctx.role, list);
        renderToolbar(state, buildContext(state));
      });
      panel.append(form, el("p", "spc-views__note", tr("Views store filters only, on this device. They never store records.")));
      panel.addEventListener("keydown", e => { if (e.key === "Escape") { state.open.views = false; renderToolbar(state, buildContext(state)); } });
      viewsWrap.append(panel);
    }
    bar.append(viewsWrap);
    // Chart | Table
    const seg = el("div", "spc-seg");
    seg.setAttribute("role", "group");
    seg.setAttribute("aria-label", "View");
    ["chart", "table"].forEach(function (mode) {
      const b = el("button", "spc-seg__btn", mode === "chart" ? tr("Chart") : tr("Table"));
      b.type = "button";
      b.setAttribute("aria-pressed", String(state.mode === mode));
      b.addEventListener("click", () => { state.mode = mode; refreshDeck(state); renderToolbar(state, buildContext(state)); });
      seg.append(b);
    });
    bar.append(seg);
    // CSV
    const csv = el("button", "spc-tool", tr("Export CSV"));
    csv.type = "button";
    csv.addEventListener("click", () => exportCsv(state));
    bar.append(csv);
    translate(bar);
  }

  function tableSpec(state, ctx) {
    const viz = registry[state.role];
    return viz && viz.table ? viz.table(ctx) : { caption: "", columns: [], rows: [] };
  }
  function exportCsv(state) {
    const ctx = buildContext(state);
    const spec = tableSpec(state, ctx);
    const text = ctx.D.toCsv(spec.columns, spec.rows);
    const blob = new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" });
    const a = el("a", "");
    a.href = URL.createObjectURL(blob);
    a.download = "safepermit-" + state.role + "-" + new Date().toISOString().slice(0, 10) + ".csv";
    doc.body.append(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }
  function renderTable(host, spec) {
    host.replaceChildren();
    const wrap = el("div", "spc-table-wrap");
    wrap.tabIndex = 0;
    const table = el("table", "spc-table");
    if (spec.caption) table.append(el("caption", "", spec.caption));
    const thead = el("thead", ""), tr0 = el("tr", "");
    spec.columns.forEach(c => { const th = el("th", "", c.label); th.scope = "col"; tr0.append(th); });
    thead.append(tr0);
    const tbody = el("tbody", "");
    spec.rows.forEach(function (r) {
      const row = el("tr", "");
      spec.columns.forEach(function (c, i) {
        const v = typeof c.value === "function" ? c.value(r) : r[c.key];
        const cell = el(i === 0 ? "th" : "td", "");
        if (i === 0) cell.scope = "row";
        if (c.data) cell.setAttribute("data-i18n-ignore", "");
        if (c.link && c.link(r)) { const a = el("a", "", v); a.href = c.link(r); cell.append(a); }
        else cell.textContent = v == null ? "" : String(v);
        row.append(cell);
      });
      tbody.append(row);
    });
    if (!spec.rows.length) {
      const row = el("tr", ""), td = el("td", "spc-table__empty", tr("No records match this view."));
      td.colSpan = spec.columns.length || 1;
      row.append(td); tbody.append(row);
    }
    table.append(thead, tbody);
    wrap.append(table);
    host.append(wrap);
  }

  function selectKey(state, key, focusPanel) {
    state.selection = key ? { key } : null;
    renderPanel(state, buildContext(state), focusPanel);
    const viz = registry[state.role];
    if (viz && viz.highlight) viz.highlight(state.dom.stage, key);
  }

  function renderPanel(state, ctx, focus) {
    const panel = state.dom.panel;
    const viz = registry[state.role];
    let spec = null;
    if (state.selection && state.selection.key === "needs") {
      spec = { title: tr("Needs you"), note: tr("Permits where the next step is yours."), permits: ctx.model.action.map(i => ctx.all.find(p => String(p.id) === i.id)).filter(Boolean) };
    } else if (state.selection && viz && viz.resolve) spec = viz.resolve(state.selection.key, ctx);
    if (!spec) {
      // Default: what needs this role, so the panel is never empty decoration.
      spec = { title: tr("Needs you"), note: ctx.model.action.length ? tr("Select any part of the chart to see its records here.") : tr("Nothing needs your action right now. Select any part of the chart to see its records here."), permits: ctx.model.action.map(i => ctx.all.find(p => String(p.id) === i.id)).filter(Boolean), isDefault: true };
    }
    panel.replaceChildren();
    panel.classList.remove("is-entering"); void panel.offsetWidth; panel.classList.add("is-entering");
    const head = el("header", "spc-panel__head");
    const title = el("h3", "spc-panel__title", "");
    title.id = "spc-panel-title";
    title.tabIndex = -1;
    if (Array.isArray(spec.title)) spec.title.forEach(part => title.append(typeof part === "string" ? el("span", "", part) : part));
    else title.append(el("span", "", spec.title));
    const count = (spec.permits ? spec.permits.length : 0) + (spec.hazards ? spec.hazards.length : 0);
    head.append(title, num(count, "spc-panel__count"));
    if (!spec.isDefault) {
      const close = el("button", "spc-panel__close", "×");
      close.type = "button";
      close.setAttribute("aria-label", "Clear selection");
      close.addEventListener("click", () => { const from = state.lastTrigger; selectKey(state, null, false); if (from && from.isConnected) from.focus(); });
      head.append(close);
    }
    panel.append(head);
    if (spec.note) panel.append(el("p", "spc-panel__note", spec.note));
    if (spec.links && spec.links.length) {
      const nav = el("div", "spc-panel__links");
      spec.links.forEach(l => { const a = el("a", "spc-panel__link", l.label); a.href = url(l.route); nav.append(a); });
      panel.append(nav);
    }
    const list = el("ul", "spc-panel__list");
    (spec.hazards || []).forEach(row => list.append(viz.hazardItem(ctx, row)));
    (spec.permits || []).forEach(p => list.append(permitItem(ctx, p)));
    if (!count) list.append(el("li", "spc-panel__empty", spec.empty || tr("No records here.")));
    panel.append(list);
    translate(panel);
    if (focus) title.focus({ preventScroll: false });
  }

  function refreshDeck(state) {
    const ctx = buildContext(state);
    const viz = registry[state.role];
    state.dom.deck.dataset.mode = state.mode;
    if (state.mode === "table") renderTable(state.dom.stage, tableSpec(state, ctx));
    else if (viz) {
      state.dom.stage.replaceChildren();
      viz.render(state.dom.stage, ctx, { first: !state.drawn });
      state.drawn = true;
      if (state.selection && viz.highlight) viz.highlight(state.dom.stage, state.selection.key);
    }
    translate(state.dom.stage);
    renderPanel(state, ctx, false);
  }

  /* ---------- lists: blocked, waiting, recent (one panel with tabs) ---------- */
  function renderLists(state, ctx) {
    const host = state.dom.lists;
    host.replaceChildren();
    const tabs = [
      ["blocked", tr("Blocked and why"), ctx.model.blocked.length],
      ["waiting", tr("Waiting on another role"), ctx.model.waiting.length],
      ["recent", tr("Recent activity"), null]
    ];
    const list = el("div", "spc-tabs");
    list.setAttribute("role", "tablist");
    list.setAttribute("aria-label", "Lists");
    const body = el("div", "spc-tabpanel");
    body.setAttribute("role", "tabpanel");
    body.id = "spc-list-panel";
    tabs.forEach(function (t, i) {
      const b = el("button", "spc-tab");
      b.type = "button";
      b.id = "spc-tab-" + t[0];
      b.setAttribute("role", "tab");
      b.setAttribute("aria-controls", body.id);
      b.setAttribute("aria-selected", String(state.list === t[0]));
      b.tabIndex = state.list === t[0] ? 0 : -1;
      b.append(el("span", "", t[1]));
      if (t[2] != null) b.append(num(t[2], "spc-tab__count"));
      b.addEventListener("click", () => { state.list = t[0]; renderLists(state, buildContext(state)); host.querySelector("#spc-tab-" + t[0]).focus(); });
      list.append(b);
    });
    roving(list, ".spc-tab");
    body.setAttribute("aria-labelledby", "spc-tab-" + state.list);
    if (state.list === "recent") body.append(activity(state, ctx));
    else {
      const items = ctx.model[state.list];
      if (!items.length) body.append(el("p", "spc-empty", state.list === "blocked" ? tr("No live permit is blocked.") : tr("Nothing is waiting on another role.")));
      else {
        const ul = el("ul", "spc-panel__list spc-panel__list--grid");
        items.forEach(function (it) {
          const p = ctx.all.find(x => String(x.id) === it.id);
          if (p) ul.append(permitItem(ctx, p));
        });
        body.append(ul);
      }
    }
    host.append(list, body);
    translate(host);
  }
  function activity(state, ctx) {
    const wrap = el("div", "spc-activity");
    const evs = root.SafePermitDashboard.events(ctx.all, ctx.history, ctx.stops, 200);
    const days = ctx.D.activityByDay(evs, ctx.now, 14);
    const max = Math.max(1, ...days.map(d => d.count));
    const strip = el("div", "spc-activity__strip");
    strip.setAttribute("role", "group");
    strip.setAttribute("aria-label", "Recorded events per day, last 14 days");
    days.forEach(function (d) {
      const b = el("button", "spc-activity__day");
      b.type = "button";
      const date = new Date(d.start);
      const label = date.toLocaleDateString(locale(), { month: "short", day: "numeric" });
      b.setAttribute("data-spc-tip", label + " · " + d.count);
      b.setAttribute("aria-label", label + ": " + d.count);
      b.setAttribute("aria-pressed", String(state.day === d.start));
      b.style.setProperty("--h", (d.count / max).toFixed(3));
      if (!d.count) b.dataset.empty = "true";
      b.append(el("span", "spc-activity__bar"), data("span", "spc-activity__label", String(date.getDate())));
      b.addEventListener("click", () => { state.day = state.day === d.start ? null : d.start; renderLists(state, buildContext(state)); });
      strip.append(b);
    });
    roving(strip, ".spc-activity__day");
    wrap.append(strip, el("p", "spc-activity__note", tr("Only recorded submissions, decisions and stop-work records. Days without records stay empty.")));
    const shown = state.day ? (days.find(d => d.start === state.day) || { events: [] }).events : evs.slice(0, 12);
    if (!shown.length) { wrap.append(el("p", "spc-empty", tr("No recorded changes yet."))); return wrap; }
    const ol = el("ol", "spc-events");
    shown.forEach(function (ev) {
      const li = el("li", "spc-event");
      const time = el("time", "spc-event__when", root.SafePermitStatus.formatDate(ev.time));
      time.dateTime = ev.at;
      const id = data("a", "spc-event__id", ev.permitId);
      id.href = detailHref(ctx.role, ev.permitId, "");
      li.append(time, id, el("span", "spc-event__what", ev.what), el("span", "spc-event__who", ev.actor));
      ol.append(li);
    });
    wrap.append(ol);
    return wrap;
  }

  /* ---------- mount / render ---------- */
  function skeleton(container, role) {
    container.replaceChildren();
    container.classList.add("spc");
    container.dataset.role = role;
    const meta = el("p", "spc-meta");
    const badge = el("span", "spc-meta__badge", tr("Local demo data"));
    const note = el("span", "spc-meta__note", tr("Records stored in this browser. Not scoped to a signed-in user; real access control belongs on the server."));
    const count = el("span", "spc-meta__count");
    meta.append(badge, note, count);
    const focus = el("div", "spc-focus");
    focus.setAttribute("aria-label", "Operational focus");
    focus.setAttribute("role", "region");
    const deck = el("section", "spc-deck spc-deck--" + role);
    deck.setAttribute("aria-labelledby", "spc-deck-title");
    const head = el("header", "spc-deck__head");
    const titles = el("div", "spc-deck__titles");
    const viz = registry[role];
    const h = el("h2", "spc-deck__title", viz ? viz.title : "");
    h.id = "spc-deck-title";
    titles.append(el("span", "spc-deck__code", viz ? viz.code : ""), h, el("p", "spc-deck__sub", viz ? viz.subtitle : ""));
    const toolbar = el("div", "spc-toolbar");
    head.append(titles, toolbar);
    const body = el("div", "spc-deck__body");
    const stage = el("div", "spc-stage");
    const panel = el("aside", "spc-panel");
    panel.setAttribute("aria-labelledby", "spc-panel-title");
    panel.setAttribute("aria-live", "polite");
    body.append(stage, panel);
    deck.append(head, body);
    const lists = el("section", "spc-lists");
    lists.setAttribute("aria-label", "Permit lists");
    container.append(meta, focus, deck, lists);
    return { meta: count, focus, deck, toolbar, stage, panel, lists };
  }

  function render(container, model, role, src) {
    if (!D()) return false;
    let state = states.get(container);
    if (!state) {
      state = { role, filters: {}, mode: "chart", selection: null, list: "blocked", open: {}, drawn: false, day: null };
      state.dom = skeleton(container, role);
      states.set(container, state);
      tooltip();
      // Remember what opened a selection, so Escape / close can return focus there.
      container.addEventListener("click", e => { const t = e.target.closest("[data-spc-select]"); if (t) { state.lastTrigger = t; selectKey(state, t.getAttribute("data-spc-select"), false); } });
      container.addEventListener("keydown", e => { if (e.key === "Escape" && state.selection) { const from = state.lastTrigger; selectKey(state, null, false); if (from && from.isConnected) from.focus(); } });
      // Re-render so dates, weekday labels and chart text follow the new language.
      doc.addEventListener("safepermit:languagechange", () => { if (state.model) render(container, state.model, role, state.src); });
      doc.addEventListener("safepermit:i18nready", () => { if (state.model) render(container, state.model, role, state.src); });
    }
    state.model = model;
    state.src = src;
    container.dataset.state = "ready";
    container.classList.toggle("spc--reduced", reduced.matches);
    const ctx = buildContext(state);
    state.dom.meta.replaceChildren(el("span", "", tr("Stored permits:")), num(ctx.all.length));
    setGreeting(role);
    renderFocus(state, ctx);
    renderToolbar(state, ctx);
    refreshDeck(state);
    renderLists(state, ctx);
    translate(container);
    return true;
  }

  function register(role, viz) { registry[role] = viz; }

  root.SafePermitCockpit = Object.freeze({ render, register, el, data, num, svg, mark, tr, tv, roving, locale, GLYPH });
})(typeof window !== "undefined" ? window : globalThis);
