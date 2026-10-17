/* SafePermit v13.1 — role dashboards built only from stored records.
 * Every dashboard answers five questions: what needs my action, what can I do now,
 * what is blocked and why, what waits on another role, and what changed recently.
 * Sources: SafePermitData.repository (permits), SafePermitWorkflow.getReview (blockers),
 * the decision history keys, and Stop-Work records. No sample data, no fixed numbers.
 * Demo only: a backend must scope these lists to the signed-in user.
 */
(function (root) {
  "use strict";

  const ROLE_LABEL = { worker: "Worker", supervisor: "Supervisor", safety: "Safety Officer", admin: "Admin" };
  const STAGE = { supervisor: "Pending Supervisor Review", safety: "Pending Safety Review", admin: "Pending Admin Approval" };
  const TERMINAL = new Set(["Rejected", "Closed", "Cancelled", "Canceled"]);
  const HISTORY_KEYS = [
    ["safePermitSupervisorDecisions", "Supervisor"],
    ["safePermitSupervisorDecisionHistory", "Supervisor"],
    ["safePermitSafetyDecisionHistory", "Safety Officer"],
    ["safePermitAdminDecisionHistory", "Admin"]
  ];
  const DECISION_TEXT = { approve: "Approved", return: "Returned for Correction", reject: "Rejected" };
  const RECENT_LIMIT = 8;

  const text = v => String(v == null ? "" : v).trim();
  const statusOf = p => text(p && p.status) || "Unknown";

  // Who must act next, from the stored status only (the blockers say whether they can).
  function nextActor(permit) {
    const status = statusOf(permit);
    if (status === "Draft" || status === "Returned for Correction") return "worker";
    if (status === STAGE.supervisor) return "supervisor";
    if (status === STAGE.safety) return "safety";
    if (status === STAGE.admin || status === "Approved") return "admin";
    if (status === "Stopped") return "safety";
    return "";
  }

  function titleOf(permit) {
    const b = (permit && permit.basicInfo) || {};
    return text(b.workTitle || permit.workTitle || permit.title || b.permitType || permit.permitType);
  }

  function readArray(storage, key) {
    try {
      const value = JSON.parse(storage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (_) { return []; }
  }

  function readHistory(storage) {
    if (!storage) return [];
    const out = [];
    HISTORY_KEYS.forEach(function (entry) {
      readArray(storage, entry[0]).forEach(function (r) {
        if (r && typeof r === "object") out.push(Object.assign({}, r, { role: text(r.role) || entry[1] }));
      });
    });
    return out;
  }

  // Ready = nothing in the four layers stops the next step.
  function adminCanActivate(permit, model, data) {
    return !!(model.approvals.complete && model.validity.state === "valid" && model.blockers.state === "clear" &&
      data && data.hasCompleteChecklist(permit) && data.hasAcceptableRisk(permit));
  }
  const RESUME_CODES = new Set(["Permit stopped — authorized resume required", "Pending resumption authorization"]);

  function itemFor(permit, model, problems, extra) {
    return Object.assign({
      id: text(permit.id), title: titleOf(permit), status: statusOf(permit),
      reasons: problems, ready: problems.length === 0
    }, extra || {});
  }

  function events(permits, history, stops, limit) {
    const list = [];
    const seen = new Set();
    function push(at, permitId, actor, what) {
      const t = Date.parse(at);
      if (!Number.isFinite(t) || !text(permitId)) return;
      const key = [text(permitId), actor, what, t].join("|");
      if (seen.has(key)) return;
      seen.add(key);
      list.push({ at: new Date(t).toISOString(), time: t, permitId: text(permitId), actor, what });
    }
    function decision(r, fallbackRole) {
      if (!r || !DECISION_TEXT[r.decision]) return;
      push(r.reviewedAt, r.permitId, text(r.role) || fallbackRole, DECISION_TEXT[r.decision]);
    }
    permits.forEach(function (p) {
      if (p.submittedAt) push(p.submittedAt, p.id, "Worker", "Submitted");
      if (p.resubmittedAt) push(p.resubmittedAt, p.id, "Worker", "Resubmitted");
      decision(p.supervisorDecision, "Supervisor");
      decision(p.safetyDecision, "Safety Officer");
      decision(p.adminDecision, "Admin");
      if (p.resumeRequest && p.resumeRequest.createdAt) push(p.resumeRequest.createdAt, p.id, "Safety Officer", "Resume requested");
      (Array.isArray(p.auditTrail) ? p.auditTrail : []).forEach(function (a) {
        if (a && a.type === "RESUME_REVIEW") push(a.at, p.id, "Safety Officer", a.action === "approve" ? "Resume approved" : "Resume rejected");
      });
    });
    history.forEach(r => decision(r, r.role));
    (stops || []).forEach(s => s && push(s.createdAt, s.permitId, "Safety Officer", "Stop-work recorded"));
    return list.sort((a, b) => b.time - a.time).slice(0, Number.isInteger(limit) && limit > 0 ? limit : RECENT_LIMIT);
  }

  /* build(role, permits, reviews, options) — pure; reviews maps permit id → review (null = unavailable). */
  function build(role, permits, reviews, options) {
    const opts = options || {};
    const S = opts.status || root.SafePermitStatus;
    const data = opts.data || root.SafePermitData;
    const now = Number.isFinite(opts.now) ? opts.now : Date.now();
    const list = (Array.isArray(permits) ? permits : []).filter(p => p && text(p.id));
    const out = { role, total: list.length, action: [], blocked: [], waiting: [], recent: [], tiles: [] };
    const counts = { ready: 0, blockedAtStage: 0, activeClear: 0, active: 0, resumeRequests: 0, activatable: 0, returnedReady: 0, blockedAll: 0 };

    list.forEach(function (permit) {
      const id = text(permit.id);
      const review = reviews && Object.prototype.hasOwnProperty.call(reviews, id) ? reviews[id] : null;
      const model = S.evaluate(permit, { review, reviewError: review == null, now, data });
      const problems = S.problems(model);
      const status = statusOf(permit);
      // Approval and activation also require the permit's own evidence (data-adapter rules).
      if (data && (STAGE.supervisor === status || STAGE.safety === status || STAGE.admin === status || status === "Approved" || status === "Active")) {
        if (!data.hasCompleteChecklist(permit)) problems.push({ code: "checklist", text: "Safety checklist incomplete" });
        if (!data.hasAcceptableRisk(permit)) problems.push({ code: "risk", text: "Risk assessment incomplete or not acceptable" });
      }
      const actor = nextActor(permit);
      const live = !TERMINAL.has(status) && status !== "Draft";

      if (status === "Active") {
        counts.active++;
        if (!problems.length && model.approvals.complete) counts.activeClear++;
      }

      // 1. Needs my action
      if (actor === role) {
        let ready = problems.length === 0;
        let next = "";
        // A draft has never been submitted: it is completed, not corrected (v13.6 fix).
        if (role === "worker") next = status === "Draft" ? "Complete and submit" : "Correct and resubmit";
        else if (role === "admin" && status === "Approved") {
          ready = adminCanActivate(permit, model, data);
          next = "Activate";
          if (ready) counts.activatable++;
        } else if (role === "safety" && status === "Stopped") {
          const pending = permit.resumeRequest && permit.resumeRequest.status === "Pending HSE Review";
          // The stop itself is what is being decided; any other blocker still applies.
          ready = !!pending && problems.every(p => p.code === "blocker" && RESUME_CODES.has(p.text));
          next = pending ? "Decide resume request" : "Close the stop-work case";
          if (pending) counts.resumeRequests++;
        } else {
          next = "Review and decide";
        }
        if (status === STAGE[role]) { if (ready) counts.ready++; else counts.blockedAtStage++; }
        if (role === "worker" && ready) counts.returnedReady++;
        out.action.push(itemFor(permit, model, problems, { ready, next }));
      }

      // 3. Blocked and why (every live permit, whoever must resolve it)
      if (live && problems.length) {
        counts.blockedAll++;
        out.blocked.push(itemFor(permit, model, problems));
      }

      // 4. Waiting on another role
      if (live && actor && actor !== role) {
        out.waiting.push(itemFor(permit, model, problems, { waitingOn: ROLE_LABEL[actor], waitingRole: actor }));
      }
    });

    out.action.sort((a, b) => Number(b.ready) - Number(a.ready));
    out.waiting.sort((a, b) => a.waitingOn.localeCompare(b.waitingOn));
    out.recent = events(list, Array.isArray(opts.history) ? opts.history : [], opts.stops);
    out.tiles = tilesFor(role, counts);
    out.counts = counts;
    return out;
  }

  // 2. What I can do now — enabled actions with counts computed above.
  function tilesFor(role, c) {
    const t = (label, route, count) => ({ label, route, count: count == null ? null : count });
    if (role === "worker") return [
      t("Create a new permit", "worker/create-permit/basic-info/"),
      t("Correct returned permits", "worker/permits/?status=returned", c.returnedReady),
      t("Active permits in date with documented approvals", "worker/permits/?status=active", c.activeClear)
    ];
    if (role === "supervisor") return [
      t("Decide permits ready for review", "supervisor/review-queue/", c.ready),
      t("Return or reject blocked permits", "supervisor/review-queue/", c.blockedAtStage),
      t("Follow active work", "supervisor/active-supervision/", c.active)
    ];
    if (role === "safety") return [
      t("Decide permits ready for safety review", "safety/review-queue/", c.ready),
      t("Return or reject blocked permits", "safety/review-queue/", c.blockedAtStage),
      t("Decide resume requests", "safety/controlled-resume/", c.resumeRequests),
      t("Resolve blockers in the Command Center", "safety/risk-command-center/", c.blockedAll)
    ];
    return [
      t("Give final approval", "admin/pending-permits/", c.ready),
      t("Return or reject blocked permits", "admin/pending-permits/", c.blockedAtStage),
      t("Activate documented approved permits", "admin/active-permits/?status=approved", c.activatable)
    ];
  }

  /* ---------------- DOM ---------------- */

  const DETAIL_ROUTE = {
    worker: id => "worker/permit-details/?id=" + id,
    supervisor: (id, status) => (status === STAGE.supervisor ? "supervisor/review-permit/?id=" : "supervisor/permit-details/?id=") + id,
    safety: (id, status) => status === STAGE.safety ? "safety/review-permit/?id=" + id :
      status === "Stopped" ? "safety/controlled-resume/?id=" + id : "safety/permit-details/?id=" + id,
    admin: (id, status) => status === STAGE.admin ? "admin/review-permit/?id=" + id :
      status === "Approved" ? "admin/active-permits/?status=approved&q=" + id : "admin/review-permit/?id=" + id
  };
  const PANELS = [
    ["action", "Needs my action", "Permits where the next step is yours."],
    ["can", "What I can do now", "Actions available to you, counted from stored records."],
    ["blocked", "Blocked and why", "Live permits that cannot proceed, with the reason recorded for each."],
    ["waiting", "Waiting on another role", "Permits whose next step belongs to someone else."],
    ["recent", "Recent changes", "Latest submissions, decisions and stop-work records."]
  ];
  const EMPTY = {
    action: "Nothing needs your action right now.",
    blocked: "No live permit is blocked.",
    waiting: "Nothing is waiting on another role.",
    recent: "No recorded changes yet."
  };

  function el(tag, cls, value) {
    const node = root.document.createElement(tag);
    if (cls) node.className = cls;
    if (value != null && value !== "") node.textContent = String(value);
    return node;
  }
  function url(route) {
    const base = root.SafePermitPaths && root.SafePermitPaths.projectRoot;
    return base ? new URL(route, base).href : "../../" + route;
  }
  function userText(tag, cls, value) {
    // Titles and IDs are record data: never run them through the translation table.
    const node = el(tag, cls, value);
    node.setAttribute("data-i18n-ignore", "");
    return node;
  }

  function reasonList(item, role) {
    const ul = el("ul", "sp-rdash__reasons");
    item.reasons.forEach(function (r) {
      const li = el("li", "");
      li.append(el("span", "", r.text));
      if (r.role) li.append(el("span", "sp-rdash__reason-role", r.role));
      if (r.resolver) {
        const S = root.SafePermitStatus;
        const href = role === "safety" && S ? S.resolverHref(r, item.id) : "";
        if (href) { const a = el("a", "sp-rdash__resolve", r.resolver); a.href = href; li.append(a); }
        else li.append(el("span", "sp-rdash__resolver", r.resolver));
      }
      ul.append(li);
    });
    return ul;
  }

  function permitRow(item, role, kind) {
    const li = el("li", "sp-rdash__item");
    li.dataset.tone = kind === "blocked" || (kind === "action" && !item.ready) ? "danger" : kind === "action" ? "ready" : "neutral";
    const top = el("div", "sp-rdash__item-top");
    const link = userText("a", "sp-rdash__id", item.id);
    link.href = url(DETAIL_ROUTE[role](encodeURIComponent(item.id), item.status));
    top.append(link);
    if (item.title) top.append(userText("span", "sp-rdash__title", item.title));
    li.append(top);
    const meta = el("div", "sp-rdash__meta");
    meta.append(el("span", "sp-rdash__status", item.status));
    if (kind === "action") meta.append(el("span", "sp-rdash__tag sp-rdash__tag--" + (item.ready ? "ready" : "blocked"), item.ready ? item.next : "Blocked"));
    if (kind === "waiting") {
      const w = el("span", "sp-rdash__tag");
      w.append(el("span", "", "Waiting on"), el("span", "", item.waitingOn));
      meta.append(w);
      if (item.reasons.length) meta.append(el("span", "sp-rdash__tag sp-rdash__tag--blocked", "Blocked"));
    }
    li.append(meta);
    if ((kind === "blocked" || (kind === "action" && !item.ready)) && item.reasons.length) li.append(reasonList(item, role));
    return li;
  }

  function panel(key, title, hint, count) {
    const section = el("section", "sp-rdash__panel sp-rdash__panel--" + key);
    section.id = "dash-" + key;
    section.setAttribute("aria-labelledby", "dash-" + key + "-title");
    const head = el("header", "sp-rdash__panel-head");
    const h = el("h2", "", title);
    h.id = "dash-" + key + "-title";
    const n = el("span", "sp-rdash__count", count == null ? "" : String(count));
    n.setAttribute("data-i18n-ignore", "");
    head.append(h, n);
    section.append(head, el("p", "sp-rdash__hint", hint));
    return section;
  }

  function render(container, model, role) {
    container.replaceChildren();
    container.dataset.state = "ready";
    const counts = { action: model.action.length, can: null, blocked: model.blocked.length, waiting: model.waiting.length, recent: model.recent.length };

    const summary = el("nav", "sp-rdash__summary");
    summary.setAttribute("aria-label", "Dashboard sections");
    PANELS.forEach(function (p) {
      if (p[0] === "can") return;
      const a = el("a", "sp-rdash__chip");
      a.href = "#dash-" + p[0];
      const num = el("strong", "", String(counts[p[0]]));
      num.setAttribute("data-i18n-ignore", "");
      a.append(num, el("span", "", p[1]));
      summary.append(a);
    });
    container.append(summary);

    const grid = el("div", "sp-rdash__grid");
    PANELS.forEach(function (p) {
      const section = panel(p[0], p[1], p[2], counts[p[0]]);
      if (p[0] === "can") {
        const ul = el("ul", "sp-rdash__tiles");
        model.tiles.forEach(function (tile) {
          const li = el("li", "");
          const a = el("a", "sp-rdash__tile");
          a.href = url(tile.route);
          a.append(el("span", "sp-rdash__tile-label", tile.label));
          if (tile.count != null) {
            const n = el("strong", "sp-rdash__tile-count", String(tile.count));
            n.setAttribute("data-i18n-ignore", "");
            a.append(n);
            if (!tile.count) a.dataset.empty = "true";
          }
          li.append(a);
          ul.append(li);
        });
        section.append(ul);
      } else if (p[0] === "recent") {
        if (!model.recent.length) section.append(el("p", "sp-rdash__empty", EMPTY.recent));
        else {
          const ol = el("ol", "sp-rdash__events");
          model.recent.forEach(function (ev) {
            const li = el("li", "sp-rdash__event");
            const time = el("time", "sp-rdash__when", root.SafePermitStatus.formatDate(ev.time));
            time.dateTime = ev.at;
            const id = userText("a", "sp-rdash__id", ev.permitId);
            id.href = url(DETAIL_ROUTE[role](encodeURIComponent(ev.permitId), ""));
            li.append(time, id, el("span", "sp-rdash__what", ev.what), el("span", "sp-rdash__who", ev.actor));
            ol.append(li);
          });
          section.append(ol);
        }
      } else {
        const items = model[p[0]];
        if (!items.length) section.append(el("p", "sp-rdash__empty", EMPTY[p[0]]));
        else {
          const ul = el("ul", "sp-rdash__list");
          items.forEach(item => ul.append(permitRow(item, role, p[0])));
          section.append(ul);
        }
      }
      grid.append(section);
    });
    container.append(grid);

    const source = el("p", "sp-rdash__source");
    source.append(el("span", "", "Computed from permits stored in this browser (demo)."));
    const n = el("strong", "", String(model.total));
    n.setAttribute("data-i18n-ignore", "");
    source.append(el("span", "", "Stored permits:"), n);
    container.append(source);
    if (root.SafePermitI18n && typeof root.SafePermitI18n.apply === "function") root.SafePermitI18n.apply(container);
  }

  function renderError(container) {
    container.replaceChildren(el("p", "sp-rdash__empty", "Dashboard data could not be loaded. No figures are shown."));
    container.dataset.state = "error";
    if (root.SafePermitI18n && typeof root.SafePermitI18n.apply === "function") root.SafePermitI18n.apply(container);
  }

  async function collect() {
    const repo = root.SafePermitData && root.SafePermitData.repository;
    if (!repo) throw new Error("Permit repository unavailable");
    const permits = await repo.listKnownPermits();
    if (!Array.isArray(permits)) throw new Error("Repository returned an invalid permit list");
    const reviews = {};
    await Promise.all(permits.filter(p => p && text(p.id)).map(async function (p) {
      try {
        reviews[text(p.id)] = root.SafePermitWorkflow ? await root.SafePermitWorkflow.getReview(text(p.id)) : null;
      } catch (_) { reviews[text(p.id)] = null; }
    }));
    let stops = [];
    try { if (root.SafePermitSafety) stops = await root.SafePermitSafety.list("stopworks"); } catch (_) { stops = []; }
    return { permits, reviews, stops, history: readHistory(root.localStorage) };
  }

  function mount(container) {
    if (!container) return null;
    const role = container.dataset.role;
    let seq = 0;
    async function refresh() {
      const mine = ++seq;
      try {
        const src = await collect();
        if (mine !== seq) return null;
        const model = build(role, src.permits, src.reviews, { history: src.history, stops: src.stops });
        // v13.6: the Operational Cockpit renders the same model (plus the raw records it was built from).
        const cockpit = root.SafePermitCockpit;
        if (cockpit && typeof cockpit.render === "function") cockpit.render(container, model, role, src);
        else render(container, model, role);
        const count = root.document.getElementById("pendingCount");
        if (count) count.textContent = String(model.action.length);
        return model;
      } catch (error) {
        if (mine === seq) renderError(container);
        if (root.console) root.console.error("SafePermit dashboard:", error);
        return null;
      }
    }
    root.addEventListener("safepermit:permits-updated", refresh);
    root.addEventListener("safepermit:safety-updated", refresh);
    root.addEventListener("storage", refresh);
    return refresh();
  }

  root.SafePermitDashboard = Object.freeze({ build, nextActor, readHistory, events, tilesFor, mount, collect, DETAIL_ROUTE });

  if (root.document && typeof root.document.querySelectorAll === "function") {
    const start = () => root.document.querySelectorAll("[data-sp-role-dashboard]").forEach(mount);
    if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", start, { once: true });
    else start();
  }
})(typeof window !== "undefined" ? window : globalThis);
