/* SUPERVISOR — Review Flow. Inbound (Pending Supervisor Review: ready / blocked by recorded reason),
 * time waiting in stage from submit/resubmit timestamps (unknown stays unknown), the supervisor's
 * recorded outcomes (returned / forwarded / completed / rejected) and upcoming decisions by planned start. */
(function (root) {
  "use strict";
  const C = root.SafePermitCockpit;
  if (!C) return;
  const { el, num, svg, tr } = C;

  function sets(ctx) {
    const D = ctx.D;
    const inbound = ctx.permits.filter(p => D.stageOf(p) === "supervisor");
    const ready = [], blocked = [];
    inbound.forEach(p => { const a = ctx.info(String(p.id)).action; (a && a.ready ? ready : blocked).push(p); });
    const decided = d => ctx.permits.filter(p => p.supervisorDecision && p.supervisorDecision.decision === d);
    const approved = decided("approve");
    const forwarded = approved.filter(p => ["safety", "admin"].indexOf(D.stageOf(p)) >= 0);
    const completed = approved.filter(p => ["approved", "active", "closed"].indexOf(D.stageOf(p)) >= 0);
    const returned = decided("return").filter(p => D.stageOf(p) === "returned");
    const rejected = decided("reject").filter(p => D.stageOf(p) === "rejected");
    // Age buckets for the inbound lane.
    const ages = {};
    D.AGE_BUCKETS.forEach(b => { ages[b.key] = []; });
    let oldest = null;
    inbound.forEach(function (p) {
      const e = D.enteredStage(p, ctx.now, ctx.stops);
      const ms = e.at == null ? NaN : ctx.now - e.at;
      ages[D.ageBucket(ms)].push(p);
      if (Number.isFinite(ms) && (oldest == null || ms > oldest.ms)) oldest = { ms, permit: p };
    });
    // Recorded blocking reasons, grouped.
    const reasons = {};
    blocked.forEach(function (p) {
      const a = ctx.info(String(p.id)).action;
      const seen = new Set();
      ((a && a.reasons) || []).forEach(function (r) {
        if (seen.has(r.text)) return; seen.add(r.text);
        (reasons[r.text] = reasons[r.text] || []).push(p);
      });
    });
    return { inbound, ready, blocked, forwarded, completed, returned, rejected, ages, oldest, reasons };
  }

  function laneButton(key, label, list, opts) {
    const b = el("button", "spf-lane spf-lane--" + key);
    b.type = "button";
    b.dataset.spcSelect = key;
    b.setAttribute("data-spc-tip", C.tv(label) + " · " + list.length);
    if (!list.length) b.dataset.empty = "true";
    const head = el("span", "spf-lane__head");
    if (opts && opts.glyph) { const g = el("span", "spf-lane__glyph", opts.glyph); g.setAttribute("aria-hidden", "true"); head.append(g); }
    head.append(el("span", "spf-lane__label", label));
    b.append(head, num(list.length, "spf-lane__count"));
    if (opts && opts.total != null) {
      const bar = el("span", "spf-lane__bar");
      bar.style.setProperty("--w", opts.total ? (list.length / opts.total).toFixed(3) : 0);
      bar.setAttribute("aria-hidden", "true");
      b.append(bar);
    }
    if (opts && opts.sub) b.append(opts.sub);
    return b;
  }

  function render(host, ctx, opts) {
    const s = sets(ctx);
    const wrap = el("div", "spf" + (opts && opts.first && !ctx.reduced ? " is-intro" : ""));
    if (!ctx.all.length) {
      const box = el("div", "spc-emptystate");
      box.append(el("p", "spc-emptystate__title", tr("No permits stored in this browser yet.")),
        el("p", "spc-emptystate__text", tr("Submitted permits flow in here. You will see what is ready to decide, what is blocked and how long each review has waited.")));
      wrap.append(box); host.append(wrap); return;
    }
    // Inbound column
    const inbound = el("section", "spf-col spf-col--in");
    inbound.setAttribute("aria-label", "Inbound reviews");
    const h = el("p", "spf-col__kicker");
    h.append(el("span", "", tr("Inbound")), num(s.inbound.length));
    inbound.append(h);
    const lanes = el("div", "spf-lanes");
    lanes.append(laneButton("ready", tr("Ready to decide"), s.ready, { glyph: "●", total: s.inbound.length }));
    const reasonChips = el("span", "spf-reasons");
    Object.keys(s.reasons).sort((a, b) => s.reasons[b].length - s.reasons[a].length).slice(0, 4).forEach(function (r) {
      const chip = el("span", "spf-reason");
      chip.append(el("span", "", r), num(s.reasons[r].length));
      reasonChips.append(chip);
    });
    lanes.append(laneButton("blocked", tr("Blocked"), s.blocked, { glyph: "⊘", total: s.inbound.length, sub: reasonChips }));
    inbound.append(lanes);
    // Age strip
    const ageWrap = el("div", "spf-age");
    const ageHead = el("p", "spf-age__head");
    ageHead.append(el("span", "", tr("Time waiting in review")));
    if (s.oldest) {
      const o = el("span", "spf-age__oldest" + (s.oldest.ms >= 24 * 3600000 ? " is-bottleneck" : ""));
      if (s.oldest.ms >= 24 * 3600000) { const g = el("span", "", "▲"); g.setAttribute("aria-hidden", "true"); o.append(g, el("span", "", tr("Bottleneck"))); }
      o.append(el("span", "", tr("Oldest")), C.data("strong", "", ctx.D.formatAge(s.oldest.ms)));
      ageHead.append(o);
    }
    const strip = el("div", "spf-age__strip");
    strip.setAttribute("role", "group");
    strip.setAttribute("aria-label", "Time waiting in review");
    const total = Math.max(1, s.inbound.length);
    ctx.D.AGE_BUCKETS.forEach(function (bucket) {
      const list = s.ages[bucket.key];
      if (!list.length && bucket.key === "unknown") return;
      const seg = el("button", "spf-age__seg spf-age__seg--" + bucket.key);
      seg.type = "button";
      seg.dataset.spcSelect = "age:" + bucket.key;
      seg.style.setProperty("--w", Math.max(list.length / total, list.length ? 0.08 : 0.04).toFixed(3));
      if (!list.length) seg.dataset.empty = "true";
      seg.setAttribute("data-spc-tip", C.tv(bucket.label) + " · " + list.length);
      seg.append(el("span", "spf-age__label", bucket.label), num(list.length));
      strip.append(seg);
    });
    ageWrap.append(ageHead, strip);
    inbound.append(ageWrap);
    // Conveyor connector
    const flow = svg("svg", { class: "spf-flow", viewBox: "0 0 60 200", preserveAspectRatio: "none", "aria-hidden": "true", focusable: "false" });
    [40, 100, 160].forEach(y => flow.append(svg("path", { d: "M 4 100 C 30 100, 30 " + y + ", 56 " + y, "vector-effect": "non-scaling-stroke", pathLength: 100 })));
    // Outcomes column
    const out = el("section", "spf-col spf-col--out");
    out.setAttribute("aria-label", "Your recorded decisions");
    const oh = el("p", "spf-col__kicker");
    oh.append(el("span", "", tr("Your recorded decisions")));
    out.append(oh);
    const fwdSub = el("span", "spf-lane__sub");
    const toSafety = s.forwarded.filter(p => ctx.D.stageOf(p) === "safety").length;
    const toAdmin = s.forwarded.length - toSafety;
    fwdSub.append(el("span", "", tr("At Safety")), num(toSafety), el("span", "", tr("At Admin")), num(toAdmin));
    out.append(
      laneButton("returned", tr("Returned, on the worker"), s.returned, { glyph: "↺" }),
      laneButton("forwarded", tr("Forwarded downstream"), s.forwarded, { glyph: "→", sub: fwdSub }),
      laneButton("completed", tr("Approved through to work"), s.completed, { glyph: "✓" }),
      laneButton("rejected", tr("Rejected"), s.rejected, { glyph: "×" })
    );
    const top = el("div", "spf-top");
    top.append(inbound, flow, out);
    wrap.append(top, upcoming(ctx, s));
    host.append(wrap);
    ctx.roving(wrap, "button[data-spc-select]");
    if (opts && opts.first && !ctx.reduced) requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.remove("is-intro")));
  }

  // Upcoming decisions: pending reviews placed by planned start over the next 7 days.
  function upcoming(ctx, s) {
    const box = el("section", "spf-up");
    box.setAttribute("aria-label", "Upcoming decisions");
    const head = el("p", "spf-up__head");
    head.append(el("span", "", tr("Upcoming decisions")), el("span", "spf-up__hint", tr("by planned start")));
    box.append(head);
    const day0 = new Date(ctx.now); day0.setHours(0, 0, 0, 0);
    const start = day0.getTime(), DAY = 86400000;
    const buckets = [{ key: "past", label: tr("Start passed"), list: [] }];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start + i * DAY);
      buckets.push({ key: "d" + i, label: i === 0 ? tr("Today") : i === 1 ? tr("Tomorrow") : d.toLocaleDateString(C.locale(), { weekday: "short", day: "numeric" }), list: [], dated: i > 1 });
    }
    buckets.push({ key: "later", label: tr("Later"), list: [] }, { key: "none", label: tr("No start date"), list: [] });
    s.inbound.forEach(function (p) {
      const ps = ctx.D.plannedStart(p, ctx.now);
      if (!ps) { buckets[buckets.length - 1].list.push(p); return; }
      const idx = Math.floor((ps.at - start) / DAY);
      if (ps.at < ctx.now && idx < 0) buckets[0].list.push(p);
      else if (idx >= 0 && idx < 7) buckets[idx + 1].list.push(p);
      else if (idx < 0) buckets[0].list.push(p);
      else buckets[buckets.length - 2].list.push(p);
    });
    const axis = el("div", "spf-up__axis");
    axis.setAttribute("role", "group");
    axis.setAttribute("aria-label", "Upcoming decisions by planned start");
    buckets.forEach(function (b) {
      if (!b.list.length && (b.key === "none" || b.key === "later" || b.key === "past")) return;
      const btn = el("button", "spf-up__slot spf-up__slot--" + b.key);
      btn.type = "button";
      btn.dataset.spcSelect = "start:" + b.key;
      if (!b.list.length) btn.dataset.empty = "true";
      const label = b.dated ? C.data("span", "spf-up__label", b.label) : el("span", "spf-up__label", b.label);
      const dots = el("span", "spf-up__dots");
      dots.setAttribute("aria-hidden", "true");
      b.list.slice(0, 6).forEach(function (p) {
        const a = ctx.info(String(p.id)).action;
        dots.append(el("i", "spf-up__dot" + (a && a.ready ? " is-ready" : " is-blocked")));
      });
      btn.append(dots, num(b.list.length), label);
      btn.setAttribute("data-spc-tip", C.tv(b.label) + " · " + b.list.length);
      axis.append(btn);
    });
    box.append(axis);
    return box;
  }

  function resolve(key, ctx) {
    const s = sets(ctx);
    const D = ctx.D;
    const map = {
      ready: [tr("Ready to decide"), tr("No blocker is recorded. Open a permit to review and decide."), s.ready],
      blocked: [tr("Blocked"), tr("These cannot be approved until the recorded reasons are resolved. You can still return or reject them."), s.blocked],
      returned: [tr("Returned, on the worker"), tr("You returned these. They come back to you after the worker resubmits."), s.returned],
      forwarded: [tr("Forwarded downstream"), tr("You approved these. They now wait on Safety or Admin."), s.forwarded],
      completed: [tr("Approved through to work"), tr("Every review is complete for these permits."), s.completed],
      rejected: [tr("Rejected"), "", s.rejected]
    };
    if (map[key]) return { title: map[key][0], note: map[key][1], permits: map[key][2], links: key === "ready" || key === "blocked" ? [{ label: tr("Open the review queue"), route: "supervisor/review-queue/" }] : null };
    if (key.indexOf("age:") === 0) {
      const b = key.slice(4), bucket = D.AGE_BUCKETS.find(x => x.key === b);
      return { title: [tr("Time waiting in review"), " · ", el("span", "", bucket ? bucket.label : "")], note: b === "unknown" ? tr("No submission time is recorded for these, so their waiting time is not estimated.") : tr("Measured from the recorded submission or resubmission time."), permits: s.ages[b] || [] };
    }
    if (key.indexOf("start:") === 0) {
      const b = key.slice(6);
      const day0 = new Date(ctx.now); day0.setHours(0, 0, 0, 0);
      const list = s.inbound.filter(function (p) {
        const ps = D.plannedStart(p, ctx.now);
        if (b === "none") return !ps;
        if (!ps) return false;
        const idx = Math.floor((ps.at - day0.getTime()) / 86400000);
        if (b === "past") return idx < 0;
        if (b === "later") return idx >= 7;
        return idx === Number(b.slice(1));
      });
      return { title: tr("Upcoming decisions"), note: b === "past" ? tr("The planned start has passed while the review is still pending.") : tr("Pending reviews by planned start date."), permits: list };
    }
    return null;
  }

  function highlight(host, key) {
    host.querySelectorAll("[data-spc-select]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.spcSelect === key)));
  }

  function motion(ctx) {
    const s = sets({ ...ctx, permits: ctx.all });
    const facts = [{ value: s.inbound.length, label: tr("pending your review"), glyph: "◷" }];
    if (s.oldest) facts.push({ value: ctx.D.formatAge(s.oldest.ms), label: tr("oldest wait"), glyph: s.oldest.ms >= 86400000 ? "▲" : "◷", tone: s.oldest.ms >= 86400000 ? "warn" : "" });
    if (s.returned.length) facts.push({ value: s.returned.length, label: tr("returned, on the worker"), glyph: "↺" });
    if (s.forwarded.length) facts.push({ value: s.forwarded.length, label: tr("forwarded downstream"), glyph: "→" });
    return facts;
  }

  function table(ctx) {
    const D = ctx.D;
    const rows = ctx.permits.filter(p => D.stageOf(p) === "supervisor" || p.supervisorDecision);
    return {
      caption: tr("Supervisor reviews"),
      columns: [
        { label: tr("Permit"), value: p => p.id, data: true, link: p => ctx.href(String(p.id), p.status) },
        { label: tr("Title"), value: p => D.titleOf(p), data: true },
        { label: tr("Status"), value: p => p.status },
        { label: tr("Lane"), value: p => { if (D.stageOf(p) === "supervisor") { const a = ctx.info(String(p.id)).action; return a && a.ready ? tr("Ready to decide") : tr("Blocked"); } const d = p.supervisorDecision && p.supervisorDecision.decision; return d === "return" ? tr("Returned, on the worker") : d === "reject" ? tr("Rejected") : ["approved", "active", "closed"].indexOf(D.stageOf(p)) >= 0 ? tr("Approved through to work") : tr("Forwarded downstream"); } },
        { label: tr("Waiting since"), value: p => { if (D.stageOf(p) !== "supervisor") return ""; const e = D.enteredStage(p, ctx.now, ctx.stops); return e.at == null ? tr("Unknown") : root.SafePermitStatus.formatDate(e.at); }, data: true },
        { label: tr("Planned start"), value: p => { const s = D.plannedStart(p, ctx.now); return s ? root.SafePermitStatus.formatDate(s.at) : ""; }, data: true },
        { label: tr("Blocked reasons"), value: p => { const a = ctx.info(String(p.id)).action; return a && !a.ready ? a.reasons.map(r => r.text).join("; ") : ""; } }
      ],
      rows
    };
  }

  C.register("supervisor", {
    code: "S · 02", title: tr("Review Flow"),
    subtitle: tr("What is ready, what is blocked and how long reviews have waited."),
    render, resolve, highlight, motion, table
  });
})(typeof window !== "undefined" ? window : globalThis);
