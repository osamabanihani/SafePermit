/* ADMIN — Operational Pulse. Columns show where permits are right now (current status, not throughput).
 * Ribbons between stages are recorded transitions only (submissions, decisions, stop-work, resume reviews),
 * their width = number of recorded events. "Accumulating" marks the stage holding the most permits waiting
 * over 24 h by recorded time. Final decision queue and exceptions come from the role-dashboard model. */
(function (root) {
  "use strict";
  const C = root.SafePermitCockpit;
  if (!C) return;
  const { el, num, svg, tr } = C;
  const COLS = ["draft", "supervisor", "safety", "admin", "approved", "active", "closed"];
  const BRANCH_COL = { returned: 1.5, rejected: 3.5, stopped: 5 };
  const DAY = 86400000;

  function groups(ctx) {
    const g = {};
    ctx.permits.forEach(p => { const k = ctx.D.stageOf(p); (g[k] = g[k] || []).push(p); });
    return g;
  }
  function accumulation(ctx, g) {
    let best = null;
    Object.keys(g).forEach(function (k) {
      if (["closed", "rejected", "other"].indexOf(k) >= 0) return;
      const aged = g[k].map(p => { const e = ctx.D.enteredStage(p, ctx.now, ctx.stops); return e.at == null ? null : ctx.now - e.at; }).filter(ms => ms != null);
      const over = aged.filter(ms => ms >= DAY).length;
      if (over && (!best || over > best.over)) best = { key: k, over, oldest: Math.max.apply(null, aged) };
    });
    return best;
  }
  function exceptions(ctx) {
    const S = root.SafePermitStatus;
    const out = { stopped: [], validity: [], notActivatable: [], blocked: [] };
    ctx.permits.forEach(function (p) {
      const k = ctx.D.stageOf(p), id = String(p.id);
      if (k === "stopped") out.stopped.push(p);
      if ((k === "approved" || k === "active") && S) {
        const v = S.checkValidity(p, ctx.now);
        if (v.state !== "valid") out.validity.push(p);
      }
      const a = ctx.info(id).action;
      if (k === "approved" && a && !a.ready) out.notActivatable.push(p);
      if (ctx.info(id).blocked && ctx.D.LIVE.has(k)) out.blocked.push(p);
    });
    return out;
  }

  function render(host, ctx, opts) {
    const D = ctx.D;
    const g = groups(ctx);
    const wrap = el("div", "spp" + (opts && opts.first && !ctx.reduced ? " is-intro" : ""));
    if (!ctx.all.length) {
      const box = el("div", "spc-emptystate spc-emptystate--dark");
      box.append(el("p", "spc-emptystate__title", tr("No permits stored in this browser yet.")),
        el("p", "spc-emptystate__text", tr("The pulse shows where permits sit across every stage and where work piles up, once permits exist.")));
      wrap.append(box); host.append(wrap); return;
    }
    const max = Math.max(1, ...COLS.concat(Object.keys(BRANCH_COL)).map(k => (g[k] || []).length));
    const acc = accumulation(ctx, g);
    const edges = D.transitions(ctx.permits, ctx.history, ctx.stops);
    const river = el("div", "spp-river");
    // Ribbons (drawn behind the columns, in a 700 × 300 space; columns centred at (i + .5) × 100).
    const H = 300;
    const ribbons = svg("svg", { class: "spp-ribbons", viewBox: "0 0 700 " + H, preserveAspectRatio: "none", focusable: "false" });
    const maxEdge = Math.max(1, ...Object.keys(edges).map(k => edges[k].count));
    const colX = k => ((COLS.indexOf(k) >= 0 ? COLS.indexOf(k) : BRANCH_COL[k]) + 0.5) * 100;
    Object.keys(edges).forEach(function (key) {
      const e = edges[key];
      const x1 = colX(e.from), x2 = colX(e.to);
      if (!Number.isFinite(x1) || !Number.isFinite(x2)) return;
      const w = 1.5 + (e.count / maxEdge) * 7;
      const toBranch = BRANCH_COL[e.to] != null, fromBranch = BRANCH_COL[e.from] != null;
      // Ribbons run under the column labels: forward flow as shallow arcs (y 226 → 244),
      // exits drop into the branch boxes (top at y 262), returns climb back to the baseline.
      let d;
      if (toBranch) d = "M " + x1 + " 226 C " + x1 + " 250, " + x2 + " 240, " + x2 + " 262";
      else if (fromBranch) d = "M " + x1 + " 262 C " + x1 + " 240, " + x2 + " 250, " + x2 + " 226";
      else d = "M " + x1 + " 226 C " + (x1 + (x2 - x1) * 0.3) + " 246, " + (x2 - (x2 - x1) * 0.3) + " 246, " + x2 + " 226";
      const kind = e.to === "returned" ? "return" : e.to === "rejected" ? "reject" : e.to === "stopped" ? "stop" : fromBranch ? "back" : "forward";
      const path = svg("path", { class: "spp-ribbon spp-ribbon--" + kind, d, "stroke-width": w.toFixed(1), "vector-effect": "non-scaling-stroke", pathLength: 100, tabindex: "0", role: "button" });
      const label = C.tv(D.stageLabel(e.from)) + " → " + C.tv(D.stageLabel(e.to)) + ": " + e.count;
      path.setAttribute("aria-label", label);
      path.setAttribute("data-spc-tip", label);
      path.setAttribute("data-spc-select", "edge:" + key);
      path.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); path.dispatchEvent(new MouseEvent("click", { bubbles: true })); } });
      ribbons.append(path);
    });
    const cols = el("div", "spp-cols");
    cols.setAttribute("role", "group");
    cols.setAttribute("aria-label", "Permits by stage");
    COLS.forEach(function (k, i) {
      const list = g[k] || [];
      const b = el("button", "spp-col" + (acc && acc.key === k ? " is-accumulating" : ""));
      b.type = "button";
      b.dataset.spcSelect = "stage:" + k;
      b.style.setProperty("--h", (list.length / max).toFixed(3));
      b.style.setProperty("--i", i);
      if (!list.length) b.dataset.empty = "true";
      b.setAttribute("data-spc-tip", C.tv(D.stageLabel(k)) + " · " + list.length);
      const bar = el("span", "spp-col__bar");
      bar.setAttribute("aria-hidden", "true");
      b.append(bar, num(list.length, "spp-col__n"), el("span", "spp-col__label", D.stageLabel(k)));
      if (acc && acc.key === k) {
        const flag = el("span", "spp-col__flag");
        const gl = el("span", "", "▲"); gl.setAttribute("aria-hidden", "true");
        flag.append(gl, el("span", "", tr("Accumulating")), num(acc.over), el("span", "", tr("over 24 h")));
        b.append(flag);
      }
      cols.append(b);
    });
    const branches = el("div", "spp-branches");
    Object.keys(BRANCH_COL).forEach(function (k) {
      const list = g[k] || [];
      const b = el("button", "spp-branch spp-branch--" + k);
      b.type = "button";
      b.dataset.spcSelect = "stage:" + k;
      b.style.setProperty("--col", BRANCH_COL[k]);
      if (!list.length) b.dataset.empty = "true";
      if (acc && acc.key === k) b.classList.add("is-accumulating");
      b.setAttribute("data-spc-tip", C.tv(D.stageLabel(k)) + " · " + list.length);
      b.append(num(list.length, "spp-branch__n"), el("span", "", D.stageLabel(k)));
      branches.append(b);
    });
    river.append(ribbons, cols, branches);
    const note = el("p", "spp-note");
    note.append(el("span", "", tr("Columns: where permits are now. Ribbons: recorded transitions only.")));
    if (!Object.keys(edges).length) note.append(el("span", "", tr("No transitions are recorded yet.")));
    wrap.append(river, note, rails(ctx));
    host.append(wrap);
    ctx.roving(cols, ".spp-col");
    if (opts && opts.first && !ctx.reduced) requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.remove("is-intro")));
  }

  function rails(ctx) {
    const box = el("div", "spp-rails");
    const queue = ctx.permits.filter(p => ctx.D.stageOf(p) === "admin");
    const ready = queue.filter(p => { const a = ctx.info(String(p.id)).action; return a && a.ready; });
    const ex = exceptions(ctx);
    const rail = (title, items) => {
      const sec = el("section", "spp-rail");
      sec.append(el("p", "spp-rail__title", title));
      const ul = el("div", "spp-rail__items");
      items.forEach(function (it) {
        // Ready work reads green; problems read red. Empty rows read as clear (✓).
        const b = el("button", "spp-chip" + (it.list.length ? (it.glyph === "●" ? " is-ready" : " is-open") : ""));
        b.type = "button";
        b.dataset.spcSelect = it.key;
        const gl = el("span", "spp-chip__glyph", it.list.length ? it.glyph : "✓");
        gl.setAttribute("aria-hidden", "true");
        b.append(gl, num(it.list.length), el("span", "", it.label));
        ul.append(b);
      });
      sec.append(ul);
      return sec;
    };
    box.append(
      rail(tr("Final decision queue"), [
        { key: "queue:ready", label: tr("Ready for final approval"), list: ready, glyph: "●" },
        { key: "queue:blocked", label: tr("Blocked at final approval"), list: queue.filter(p => ready.indexOf(p) < 0), glyph: "⊘" },
        { key: "queue:activate", label: tr("Approved, ready to activate"), list: ctx.permits.filter(p => ctx.D.stageOf(p) === "approved" && (ctx.info(String(p.id)).action || {}).ready), glyph: "●" }
      ]),
      rail(tr("Exceptions"), [
        { key: "ex:stopped", label: tr("Stopped"), list: ex.stopped, glyph: "⊘" },
        { key: "ex:validity", label: tr("Validity expired or not verifiable"), list: ex.validity, glyph: "▲" },
        { key: "ex:notActivatable", label: tr("Approved but not activatable"), list: ex.notActivatable, glyph: "⊘" },
        { key: "ex:blocked", label: tr("Blocked live permits"), list: ex.blocked, glyph: "⊘" }
      ])
    );
    ctx.roving(box, ".spp-chip");
    return box;
  }

  function resolve(key, ctx) {
    const D = ctx.D;
    if (key.indexOf("stage:") === 0) {
      const k = key.slice(6);
      const g = groups(ctx), acc = accumulation(ctx, g);
      let note = tr("Permits whose stored status places them here now.");
      if (acc && acc.key === k) note = tr("Work is accumulating here: the most permits waiting over 24 h by recorded time.");
      return { title: D.stageLabel(k), note, permits: g[k] || [] };
    }
    if (key.indexOf("edge:") === 0) {
      const e = D.transitions(ctx.permits, ctx.history, ctx.stops)[key.slice(5)];
      if (!e) return { title: tr("Recorded transitions"), permits: [] };
      return { title: [el("span", "", D.stageLabel(e.from)), " → ", el("span", "", D.stageLabel(e.to))], note: tr("Permits with a recorded transition on this path. The count includes repeated events."), permits: ctx.permits.filter(p => e.permits.indexOf(String(p.id)) >= 0) };
    }
    const queue = ctx.permits.filter(p => D.stageOf(p) === "admin");
    const isReady = p => { const a = ctx.info(String(p.id)).action; return !!(a && a.ready); };
    const ex = exceptions(ctx);
    const map = {
      "queue:ready": [tr("Ready for final approval"), tr("Every recorded check is clear. Open a permit to make the final decision."), queue.filter(isReady), "admin/pending-permits/"],
      "queue:blocked": [tr("Blocked at final approval"), tr("Resolve the recorded reasons, or return or reject the permit."), queue.filter(p => !isReady(p)), "admin/pending-permits/"],
      "queue:activate": [tr("Approved, ready to activate"), tr("Documented approvals, valid dates and a clear safety review."), ctx.permits.filter(p => D.stageOf(p) === "approved" && isReady(p)), "admin/active-permits/?status=approved"],
      "ex:stopped": [tr("Stopped"), tr("Work was stopped. Safety decides when it may resume."), ex.stopped, "admin/active-permits/?status=stopped"],
      "ex:validity": [tr("Validity expired or not verifiable"), tr("Approved or active permits whose end date and time has passed or is not a complete date."), ex.validity, null],
      "ex:notActivatable": [tr("Approved but not activatable"), tr("A recorded reason prevents activation."), ex.notActivatable, "admin/active-permits/?status=approved"],
      "ex:blocked": [tr("Blocked live permits"), tr("Live permits with a recorded reason they cannot proceed."), ex.blocked, null]
    };
    const m = map[key];
    if (!m) return null;
    return { title: m[0], note: m[1], permits: m[2], links: m[3] ? [{ label: tr("Open the list"), route: m[3] }] : null };
  }

  function highlight(host, key) {
    host.querySelectorAll("[data-spc-select]").forEach(function (b) {
      const on = b.getAttribute("data-spc-select") === key;
      if (b.tagName.toLowerCase() === "path") b.classList.toggle("is-selected", on);
      else b.setAttribute("aria-pressed", String(on));
    });
  }

  function motion(ctx) {
    const D = ctx.D;
    const g = groups({ ...ctx, permits: ctx.all });
    const live = ctx.all.filter(p => D.LIVE.has(D.stageOf(p))).length;
    const facts = [{ value: live, label: tr("live permits"), glyph: "◷" }];
    const acc = accumulation({ ...ctx, permits: ctx.all }, g);
    if (acc) facts.push({ value: acc.over, label: [tr("waiting over 24 h at"), D.stageLabel(acc.key)], glyph: "▲", tone: "warn" });
    const queue = (g.admin || []).length;
    facts.push({ value: queue, label: tr("in your final decision queue"), glyph: "●", tone: queue ? "accent" : "" });
    const stopped = (g.stopped || []).length;
    if (stopped) facts.push({ value: stopped, label: tr("stopped"), glyph: "⊘", tone: "warn" });
    return facts;
  }

  function table(ctx) {
    const D = ctx.D;
    const edges = D.transitions(ctx.permits, ctx.history, ctx.stops);
    const rows = COLS.concat(Object.keys(BRANCH_COL)).map(function (k) {
      const list = ctx.permits.filter(p => D.stageOf(p) === k);
      const aged = list.map(p => D.enteredStage(p, ctx.now, ctx.stops).at).filter(t => t != null);
      return {
        stage: D.stageLabel(k), count: list.length,
        over24: aged.filter(t => ctx.now - t >= DAY).length,
        unknownAge: list.length - aged.length,
        inbound: Object.keys(edges).filter(e => edges[e].to === k).reduce((n, e) => n + edges[e].count, 0),
        outbound: Object.keys(edges).filter(e => edges[e].from === k).reduce((n, e) => n + edges[e].count, 0)
      };
    });
    return {
      caption: tr("Permits by stage and recorded transitions"),
      columns: [
        { label: tr("Stage"), key: "stage" },
        { label: tr("Permits now"), key: "count", data: true },
        { label: tr("Waiting over 24 h"), key: "over24", data: true },
        { label: tr("Age unknown"), key: "unknownAge", data: true },
        { label: tr("Recorded transitions in"), key: "inbound", data: true },
        { label: tr("Recorded transitions out"), key: "outbound", data: true }
      ],
      rows
    };
  }

  C.register("admin", {
    code: "A · 04", title: tr("Operational Pulse"),
    subtitle: tr("Where permits are across every stage, where work accumulates and what needs a final decision."),
    render, resolve, highlight, motion, table
  });
})(typeof window !== "undefined" ? window : globalThis);
