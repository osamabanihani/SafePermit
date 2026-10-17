/* WORKER — My Permit Journey. A station rail through the real lifecycle, with the correction loop
 * (Returned → resubmit), Stopped and Rejected as branches. Station counts are stored statuses;
 * "your move" = the role-dashboard rule nextActor() === worker; "blocked" = recorded reasons. */
(function (root) {
  "use strict";
  const C = root.SafePermitCockpit;
  if (!C) return;
  const { el, num, svg, tr } = C;
  const MAIN = ["draft", "supervisor", "safety", "admin", "approved", "active", "closed"];
  const BRANCH = { returned: 1.5, rejected: 3, stopped: 5 }; // column (0-based) each branch hangs under

  function groups(ctx) {
    const g = {};
    ctx.permits.forEach(function (p) {
      const k = ctx.D.stageOf(p);
      (g[k] = g[k] || []).push(p);
    });
    return g;
  }
  function counts(ctx, list) {
    let mine = 0, blocked = 0;
    (list || []).forEach(function (p) {
      const info = ctx.info(String(p.id));
      if (info.action) mine++;
      if ((info.action && !info.action.ready) || info.blocked) blocked++;
    });
    return { mine, blocked };
  }

  function station(ctx, key, list, opts) {
    const n = (list || []).length;
    const c = counts(ctx, list);
    const b = el("button", "spj-station" + (opts && opts.branch ? " spj-station--branch" : ""));
    b.type = "button";
    b.dataset.spcSelect = key;
    b.dataset.stage = key;
    if (!n) b.dataset.empty = "true";
    if (c.mine) b.dataset.mine = "true";
    if (c.blocked) b.dataset.blocked = "true";
    const label = ctx.D.stageLabel(key);
    b.setAttribute("aria-label", C.tv(label) + ": " + n);
    b.setAttribute("data-spc-tip", C.tv(label) + " · " + n);
    const marker = el("span", "spj-marker");
    marker.setAttribute("aria-hidden", "true");
    b.append(marker, num(n, "spj-count"), el("span", "spj-label", label));
    const flags = el("span", "spj-flags");
    if (c.mine) { const m = C.mark("ready", tr("Your move")); m.prepend(num(c.mine)); flags.append(m); }
    if (c.blocked) { const m = C.mark("blocked", tr("Blocked")); m.prepend(num(c.blocked)); flags.append(m); }
    b.append(flags);
    return b;
  }

  function render(host, ctx, opts) {
    const g = groups(ctx);
    const wrap = el("div", "spj" + (opts && opts.first && !ctx.reduced ? " is-intro" : ""));
    if (!ctx.all.length) {
      wrap.append(empty(ctx));
      host.append(wrap);
      return;
    }
    const rail = el("div", "spj-rail");
    rail.setAttribute("role", "group");
    rail.setAttribute("aria-label", "Permit stages");
    MAIN.forEach((k, i) => { const s = station(ctx, k, g[k]); s.style.setProperty("--i", i); rail.append(s); });
    // Track and branch loops are drawn in one SVG in percentages of the rail width.
    const track = svg("svg", { class: "spj-track", viewBox: "0 0 700 120", preserveAspectRatio: "none", "aria-hidden": "true", focusable: "false" });
    const x = col => (col + 0.5) * 100;
    track.append(svg("line", { class: "spj-track__base", x1: x(0), y1: 22, x2: x(6), y2: 22, "vector-effect": "non-scaling-stroke" }));
    // Progress tint up to the furthest occupied main stage (where work has actually reached).
    const furthest = MAIN.reduce((m, k, i) => ((g[k] || []).length ? i : m), -1);
    if (furthest > 0) track.append(svg("line", { class: "spj-track__lit", x1: x(0), y1: 22, x2: x(furthest), y2: 22, "vector-effect": "non-scaling-stroke", pathLength: 100 }));
    // Branches hang below the station labels (y 84 → 100): Returned loops back into Supervisor review on resubmit.
    track.append(svg("path", { class: "spj-loop" + ((g.returned || []).length ? " is-live" : ""), d: "M " + x(2) + " 84 C " + x(2) + " 96, " + x(1.75) + " 100, " + x(1.5) + " 100", "vector-effect": "non-scaling-stroke", pathLength: 100 }));
    track.append(svg("path", { class: "spj-loop spj-loop--back" + ((g.returned || []).length ? " is-live" : ""), d: "M " + x(1.5) + " 100 C " + x(1.25) + " 100, " + x(1) + " 96, " + x(1) + " 84", "vector-effect": "non-scaling-stroke", pathLength: 100, "marker-end": "url(#spjArrow)" }));
    track.append(svg("path", { class: "spj-branch" + ((g.stopped || []).length ? " is-live" : ""), d: "M " + x(5) + " 84 L " + x(5) + " 100", "vector-effect": "non-scaling-stroke", pathLength: 100 }));
    track.append(svg("path", { class: "spj-branch spj-branch--end" + ((g.rejected || []).length ? " is-live" : ""), d: "M " + x(3) + " 84 L " + x(3) + " 100", "vector-effect": "non-scaling-stroke", pathLength: 100 }));
    const defs = svg("defs", {});
    const arrow = svg("marker", { id: "spjArrow", viewBox: "0 0 8 8", refX: "4", refY: "4", markerWidth: "6", markerHeight: "6", orient: "auto-start-reverse" });
    arrow.append(svg("path", { d: "M0 0L8 4L0 8z" }));
    defs.append(arrow);
    track.prepend(defs);
    const branches = el("div", "spj-branches");
    Object.keys(BRANCH).forEach(function (k) {
      const s = station(ctx, k, g[k], { branch: true });
      s.style.setProperty("--col", BRANCH[k]);
      branches.append(s);
    });
    const other = g.other || [];
    wrap.append(track, rail, branches);
    if (other.length) {
      const o = el("button", "spj-other");
      o.type = "button";
      o.dataset.spcSelect = "other";
      o.append(num(other.length), el("span", "", tr("with another status")));
      wrap.append(o);
    }
    host.append(wrap);
    ctx.roving(wrap, ".spj-station, .spj-other");
    if (opts && opts.first && !ctx.reduced) requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.remove("is-intro")));
  }

  function empty(ctx) {
    const box = el("div", "spc-emptystate");
    box.append(el("p", "spc-emptystate__title", tr("No permits stored in this browser yet.")),
      el("p", "spc-emptystate__text", tr("Your journey appears here as soon as you save or submit a permit. Each stage then shows where your permits stand and what needs you.")));
    const a = el("a", "spc-emptystate__action", tr("Create a new permit"));
    a.href = ctx.url("worker/create-permit/basic-info/");
    box.append(a);
    return box;
  }

  function resolve(key, ctx) {
    const list = ctx.permits.filter(p => ctx.D.stageOf(p) === key);
    const notes = {
      draft: tr("Not yet submitted. Complete the permit steps and submit it for supervisor review."),
      returned: tr("A reviewer returned these permits. Open one to read the comment and correct it."),
      supervisor: tr("Waiting for the Supervisor's operational review."),
      safety: tr("Waiting for the Safety Officer's review."),
      admin: tr("Waiting for the Admin's final approval."),
      approved: tr("Approved. The Admin activates a permit before work starts."),
      active: tr("Work may proceed under site controls while the permit stays in date."),
      stopped: tr("Work was stopped. The Safety Officer decides when it may resume."),
      rejected: tr("Rejected or cancelled permits stay here for the record."),
      closed: tr("Completed and closed."),
      other: tr("Permits whose stored status is not part of the standard lifecycle.")
    };
    if (key === "other") return { title: tr("Other status"), note: notes.other, permits: list };
    return { title: ctx.D.stageLabel(key), note: notes[key] || "", permits: list };
  }

  function highlight(host, key) {
    host.querySelectorAll("[data-spc-select]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.spcSelect === key)));
  }

  function motion(ctx) {
    const live = ctx.all.filter(p => ["supervisor", "safety", "admin"].indexOf(ctx.D.stageOf(p)) >= 0);
    const waiting = ctx.model.waiting.length;
    const facts = [];
    if (live.length) facts.push({ value: live.length, label: tr("in review"), glyph: "◷" });
    if (waiting) facts.push({ value: waiting, label: tr("waiting on another role"), glyph: "◷" });
    const active = ctx.all.filter(p => ctx.D.stageOf(p) === "active").length;
    if (active) facts.push({ value: active, label: tr("active"), glyph: "✓", tone: "ok" });
    const returned = ctx.all.filter(p => ctx.D.stageOf(p) === "returned").length;
    if (returned) facts.push({ value: returned, label: tr("returned for correction"), glyph: "↺", tone: "accent" });
    return facts;
  }

  function table(ctx) {
    return {
      caption: tr("Permits by stage"),
      columns: [
        { label: tr("Permit"), value: p => p.id, data: true, link: p => ctx.href(String(p.id), p.status) },
        { label: tr("Title"), value: p => ctx.D.titleOf(p), data: true },
        { label: tr("Stage"), value: p => ctx.D.stageLabel(ctx.D.stageOf(p)) },
        { label: tr("Status"), value: p => p.status },
        { label: tr("Needs you"), value: p => (ctx.info(String(p.id)).action ? tr("Yes") : tr("No")) },
        { label: tr("Blocked reasons"), value: p => { const i = ctx.info(String(p.id)); return ((i.action && !i.action.ready && i.action.reasons) || (i.blocked && i.blocked.reasons) || []).map(r => r.text).join("; "); } }
      ],
      rows: ctx.permits.slice().sort((a, b) => ctx.D.STAGES.concat(ctx.D.BRANCHES).findIndex(s => s.key === ctx.D.stageOf(a)) - ctx.D.STAGES.concat(ctx.D.BRANCHES).findIndex(s => s.key === ctx.D.stageOf(b)))
    };
  }

  C.register("worker", {
    code: "W · 01", title: tr("My Permit Journey"),
    subtitle: tr("Where each permit stands, and which stage is waiting for you."),
    render, resolve, highlight, motion, table
  });
})(typeof window !== "undefined" ? window : globalThis);
