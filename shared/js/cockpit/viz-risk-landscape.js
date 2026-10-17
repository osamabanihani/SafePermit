/* SAFETY OFFICER — Risk Landscape. A 5×5 likelihood × severity matrix built from the hazards recorded in
 * each permit's risk assessment (initial and residual). Hazards with a score but no recorded likelihood and
 * severity are listed, never placed. Linked safety controls (LOTO, SIMOPS, Stop-Work, resume requests)
 * come from the integrated safety review of each permit (safety-workflow getReview), joined by permitId only. */
(function (root) {
  "use strict";
  const C = root.SafePermitCockpit;
  if (!C) return;
  const { el, num, svg, tr } = C;
  const viewState = { view: "residual", scope: "live" };
  const BAND_LETTER = { low: "L", medium: "M", high: "H", critical: "C" };
  const BAND_NAME = { low: "Low", medium: "Medium", high: "High", critical: "Critical" };

  function scoped(ctx) {
    const D = ctx.D;
    if (viewState.scope === "pending") return ctx.permits.filter(p => D.stageOf(p) === "safety");
    if (viewState.scope === "all") return ctx.permits;
    return ctx.permits.filter(p => D.LIVE.has(D.stageOf(p)));
  }

  /* Linked controls per permit, from the integrated review (null when the review is unavailable). */
  function controls(ctx, permits) {
    const out = { loto: [], simops: [], stop: [], resume: [], unavailable: [] };
    permits.forEach(function (p) {
      const id = String(p.id);
      const review = ctx.reviews[id];
      if (p.resumeRequest && p.resumeRequest.status === "Pending HSE Review") out.resume.push(p);
      if (!review || !review.counts) { out.unavailable.push(p); return; }
      const c = review.counts;
      if ((c.isolations || 0) + (c.missingIsolation || 0) > 0) out.loto.push(p);
      if ((c.simops || 0) > 0) out.simops.push(p);
      if ((c.stopworks || 0) > 0) out.stop.push(p);
    });
    return out;
  }
  function linkedBadges(ctx, permitId) {
    const review = ctx.reviews[permitId];
    const wrap = el("div", "spr-linked");
    wrap.append(el("span", "spr-linked__title", tr("Linked safety controls")));
    if (!review || !review.counts) { wrap.append(el("span", "spr-linked__na", tr("Integrated safety review unavailable"))); return wrap; }
    const c = review.counts;
    const add = (label, open, text, section) => {
      const b = el("span", "spr-linked__item" + (open ? " is-open" : ""));
      const g = el("span", "", open ? "⊘" : "✓"); g.setAttribute("aria-hidden", "true");
      b.append(g, el("span", "", label));
      if (text != null) b.append(num(text));
      if (open && section) { const a = el("a", "spr-linked__go", tr("Resolve")); a.href = ctx.url("safety/risk-command-center/#" + section); b.append(a); }
      wrap.append(b);
    };
    add(tr("LOTO verification"), (c.isolations || 0) + (c.missingIsolation || 0) > 0, (c.isolations || 0) + (c.missingIsolation || 0), "isolations");
    add(tr("SIMOPS conflicts"), (c.simops || 0) > 0, c.simops || 0, "conflicts");
    add(tr("Stop-work cases"), (c.stopworks || 0) > 0, c.stopworks || 0, "stopworks");
    return wrap;
  }

  function render(host, ctx, opts) {
    const D = ctx.D;
    const permits = scoped(ctx);
    const rows = D.hazardRows(permits);
    const wrap = el("div", "spr" + (opts && opts.first && !ctx.reduced ? " is-intro" : ""));
    // Controls: view and scope (segmented, plain buttons)
    const controlsBar = el("div", "spr-controls");
    const seg = (name, items, current, onPick) => {
      const g = el("div", "spc-seg spc-seg--small");
      g.setAttribute("role", "group");
      g.setAttribute("aria-label", name);
      items.forEach(function (it) {
        const b = el("button", "spc-seg__btn", it[1]);
        b.type = "button";
        b.setAttribute("aria-pressed", String(current === it[0]));
        b.addEventListener("click", () => { onPick(it[0]); host.replaceChildren(); render(host, ctx, {}); ctx.translate(host); });
        g.append(b);
      });
      return g;
    };
    controlsBar.append(
      seg("Matrix view", [["initial", tr("Initial")], ["residual", tr("Residual")], ["movement", tr("Movement")]], viewState.view, v => { viewState.view = v; }),
      seg("Permits in scope", [["live", tr("Live permits")], ["pending", tr("Pending safety review")], ["all", tr("All stored")]], viewState.scope, v => { viewState.scope = v; })
    );
    wrap.append(controlsBar);
    if (!rows.length) {
      const box = el("div", "spc-emptystate");
      box.append(el("p", "spc-emptystate__title", tr("No hazards recorded for permits in this scope.")),
        el("p", "spc-emptystate__text", tr("Hazards appear on the matrix once a permit's risk assessment records likelihood and severity.")));
      wrap.append(box);
    } else wrap.append(matrixFigure(ctx, rows));
    wrap.append(controlsRibbon(ctx, permits));
    host.append(wrap);
    if (opts && opts.first && !ctx.reduced) requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.remove("is-intro")));
  }

  function matrixFigure(ctx, rows) {
    const D = ctx.D;
    const view = viewState.view === "movement" ? "residual" : viewState.view;
    const m = D.matrix(rows, view);
    const fig = el("figure", "spr-figure");
    const grid = el("div", "spr-grid");
    grid.setAttribute("role", "grid");
    grid.setAttribute("aria-label", "Likelihood by severity");
    // Rows: likelihood 5 (top) → 1; columns: severity 1 → 5.
    for (let L = 5; L >= 1; L--) {
      const row = el("div", "spr-row");
      row.setAttribute("role", "row");
      const yl = el("span", "spr-axis spr-axis--y", String(L));
      yl.setAttribute("aria-hidden", "true");
      row.append(yl);
      for (let S = 1; S <= 5; S++) {
        const list = m.cells[L + "-" + S] || [];
        const score = L * S, band = D.band(score);
        const cell = el("button", "spr-cell spr-cell--" + band);
        cell.type = "button";
        cell.setAttribute("role", "gridcell");
        cell.dataset.spcSelect = "cell:" + view + ":" + L + "-" + S;
        cell.style.setProperty("--i", (5 - L) * 5 + (S - 1));
        if (!list.length) cell.dataset.empty = "true";
        if (view === "residual" && score >= 10 && list.length) cell.dataset.blocks = "true";
        cell.setAttribute("aria-label", C.tv("Likelihood") + " " + L + " · " + C.tv("Severity") + " " + S + " · " + score + " " + C.tv(BAND_NAME[band]) + " · " + C.tv("Hazards") + ": " + list.length);
        cell.setAttribute("data-spc-tip", "L" + L + " × S" + S + " = " + score + " · " + C.tv(BAND_NAME[band]) + " · " + C.tv("Hazards") + ": " + list.length);
        const letter = el("span", "spr-cell__band", BAND_LETTER[band]);
        letter.setAttribute("aria-hidden", "true");
        cell.append(letter);
        if (list.length) cell.append(num(list.length, "spr-cell__n"));
        row.append(cell);
      }
      grid.append(row);
    }
    const xa = el("div", "spr-row spr-row--axis");
    xa.setAttribute("aria-hidden", "true");
    xa.append(el("span", "spr-axis"));
    for (let S = 1; S <= 5; S++) xa.append(el("span", "spr-axis spr-axis--x", String(S)));
    grid.append(xa);
    const wrapGrid = el("div", "spr-gridwrap");
    wrapGrid.append(el("span", "spr-axislabel spr-axislabel--y", tr("Likelihood")), grid, el("span", "spr-axislabel spr-axislabel--x", tr("Severity")));
    // Movement: recorded initial → residual positions, drawn over the grid.
    if (viewState.view === "movement") {
      const over = svg("svg", { class: "spr-moves", viewBox: "0 0 500 500", preserveAspectRatio: "none", "aria-hidden": "true", focusable: "false" });
      const defs = svg("defs", {});
      const marker = svg("marker", { id: "sprArrow", viewBox: "0 0 8 8", refX: "6", refY: "4", markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse" });
      marker.append(svg("path", { d: "M0 0L8 4L0 8z" }));
      defs.append(marker); over.append(defs);
      const centre = (L, S) => ({ x: (S - 0.5) * 100, y: (5 - L + 0.5) * 100 });
      rows.forEach(function (r, i) {
        if (!r.initial.placed || !r.residual.placed) return;
        const a = centre(r.initial.likelihood, r.initial.severity), b = centre(r.residual.likelihood, r.residual.severity);
        const jitter = ((i % 5) - 2) * 6;
        if (a.x === b.x && a.y === b.y) { over.append(svg("circle", { class: "spr-move__still", cx: a.x + jitter, cy: a.y + jitter, r: 7 })); return; }
        over.append(svg("path", { class: "spr-move" + (r.residual.score >= r.initial.score ? " is-worse" : ""), d: "M " + (a.x + jitter) + " " + (a.y + jitter) + " L " + (b.x + jitter) + " " + (b.y + jitter), "marker-end": "url(#sprArrow)", "vector-effect": "non-scaling-stroke", pathLength: 100 }));
      });
      const gridOverlay = el("div", "spr-moves-host");
      gridOverlay.append(over);
      grid.append(gridOverlay);
    }
    fig.append(wrapGrid);
    // Legend and honesty notes
    const cap = el("figcaption", "spr-legend");
    ["low", "medium", "high", "critical"].forEach(function (b) {
      const k = el("span", "spr-key spr-key--" + b);
      k.append(el("i", "", BAND_LETTER[b]), el("span", "", BAND_NAME[b]));
      cap.append(k);
    });
    const blocking = rows.filter(r => r.blocksApproval);
    if (blocking.length) {
      const b = el("button", "spr-flag");
      b.type = "button";
      b.dataset.spcSelect = "blocking";
      const g = el("span", "", "⊘"); g.setAttribute("aria-hidden", "true");
      b.append(g, num(blocking.length), el("span", "", tr("hazards keep residual risk too high for approval")));
      cap.append(b);
    }
    if (m.unplaced.length) {
      const b = el("button", "spr-flag spr-flag--quiet");
      b.type = "button";
      b.dataset.spcSelect = "unplaced:" + view;
      b.append(num(m.unplaced.length), el("span", "", tr("score only, not placed")));
      b.setAttribute("data-spc-tip", "No likelihood and severity recorded, so these cannot be placed on the matrix.");
      cap.append(b);
    }
    fig.append(cap);
    ctx.roving(grid, ".spr-cell", { columns: 5 });
    return fig;
  }

  function controlsRibbon(ctx, permits) {
    const c = controls(ctx, permits);
    const ribbon = el("div", "spr-ribbon");
    ribbon.setAttribute("role", "group");
    ribbon.setAttribute("aria-label", "Linked safety controls");
    const head = el("p", "spr-ribbon__head");
    head.append(el("span", "", tr("Linked safety controls")), el("span", "spr-ribbon__hint", tr("permits in scope, joined by permit ID")));
    ribbon.append(head);
    const item = (key, label, list, glyph) => {
      const b = el("button", "spr-gauge" + (list.length ? " is-open" : ""));
      b.type = "button";
      b.dataset.spcSelect = "ctl:" + key;
      const g = el("span", "spr-gauge__glyph", list.length ? glyph : "✓");
      g.setAttribute("aria-hidden", "true");
      b.append(g, num(list.length, "spr-gauge__n"), el("span", "spr-gauge__label", label));
      ribbon.append(b);
    };
    item("loto", tr("LOTO verification open"), c.loto, "⊘");
    item("simops", tr("SIMOPS conflicts open"), c.simops, "⊘");
    item("stop", tr("Stop-work cases open"), c.stop, "⊘");
    item("resume", tr("Resume requests"), c.resume, "◷");
    if (c.unavailable.length) {
      const n = el("p", "spr-ribbon__na");
      n.append(num(c.unavailable.length), el("span", "", tr("permits without an available safety review")));
      ribbon.append(n);
    }
    ctx.roving(ribbon, ".spr-gauge");
    return ribbon;
  }

  function hazardItem(ctx, row) {
    const li = el("li", "spc-item spc-item--hazard");
    li.dataset.kind = row.blocksApproval ? "blocked" : "info";
    const head = el("div", "spc-item__head");
    head.append(C.data("strong", "spc-item__title", row.hazard));
    li.append(head);
    const meta = el("div", "spc-item__meta");
    const id = C.data("a", "spc-item__id", row.permitId);
    id.href = ctx.href(row.permitId, row.status);
    meta.append(id, el("span", "spc-item__status", row.status));
    li.append(meta);
    const scores = el("p", "spr-scores");
    const s = (label, v) => {
      const span = el("span", "spr-score spr-score--" + (v.band || "none"));
      span.append(el("span", "", label), num(v.score == null ? "—" : v.score));
      if (v.band) span.append(el("i", "", BAND_LETTER[v.band]));
      if (v.placed) span.append(C.data("small", "", "L" + v.likelihood + "×S" + v.severity));
      return span;
    };
    scores.append(s(tr("Initial"), row.initial), el("span", "spr-scores__arrow", "→"), s(tr("Residual"), row.residual));
    li.append(scores);
    if (row.blocksApproval) li.append(C.mark("blocked", tr("Residual risk too high for approval")));
    if (row.controls) { const p = el("p", "spr-controls-text"); p.append(el("span", "", tr("Controls")), C.data("span", "", row.controls)); li.append(p); }
    li.append(linkedBadges(ctx, row.permitId));
    return li;
  }

  function resolve(key, ctx) {
    const D = ctx.D;
    const permits = scoped(ctx);
    const rows = D.hazardRows(permits);
    if (key.indexOf("cell:") === 0) {
      const parts = key.split(":"), view = parts[1], LS = parts[2].split("-").map(Number);
      const list = rows.filter(r => r[view].placed && r[view].likelihood === LS[0] && r[view].severity === LS[1]);
      const score = LS[0] * LS[1];
      return { title: [el("span", "", view === "initial" ? tr("Initial") : tr("Residual")), " · ", C.data("span", "", "L" + LS[0] + " × S" + LS[1] + " = " + score)], note: tr("Hazards recorded at this likelihood and severity, with the safety controls linked to their permit."), hazards: list, empty: tr("No hazard is recorded in this cell.") };
    }
    if (key.indexOf("unplaced:") === 0) {
      const view = key.split(":")[1];
      return { title: tr("Score only, not placed"), note: tr("These hazards have a score but no recorded likelihood and severity, so they are not placed on the matrix."), hazards: rows.filter(r => !r[view].placed) };
    }
    if (key === "blocking") return { title: tr("Residual risk too high for approval"), note: tr("SafePermit approves a permit only when every residual score is below 10 and below its initial score."), hazards: rows.filter(r => r.blocksApproval) };
    if (key.indexOf("ctl:") === 0) {
      const c = controls(ctx, permits), k = key.slice(4);
      const meta = {
        loto: [tr("LOTO verification open"), tr("Permits with unverified or missing LOTO isolations."), "safety/risk-command-center/#isolations", tr("Open Digital LOTO")],
        simops: [tr("SIMOPS conflicts open"), tr("Permits with an unresolved simultaneous-operations conflict."), "safety/risk-command-center/#conflicts", tr("Open SIMOPS conflicts")],
        stop: [tr("Stop-work cases open"), tr("Permits with an open stop-work case."), "safety/risk-command-center/#stopworks", tr("Open the Stop-Work center")],
        resume: [tr("Resume requests"), tr("Stopped permits waiting for your resume decision."), "safety/controlled-resume/", tr("Open controlled resume")]
      }[k];
      return meta ? { title: meta[0], note: meta[1], permits: c[k] || [], links: [{ label: meta[3], route: meta[2] }] } : null;
    }
    return null;
  }

  function highlight(host, key) {
    host.querySelectorAll("[data-spc-select]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.spcSelect === key)));
  }

  function motion(ctx) {
    const D = ctx.D;
    const live = ctx.all.filter(p => D.LIVE.has(D.stageOf(p)));
    const rows = D.hazardRows(live);
    const pending = ctx.all.filter(p => D.stageOf(p) === "safety").length;
    const facts = [{ value: pending, label: tr("pending safety review"), glyph: "◷" }];
    const hi = rows.filter(r => r.residual.band === "high" || r.residual.band === "critical").length;
    facts.push({ value: hi, label: tr("hazards at High or Critical residual risk"), glyph: hi ? "▲" : "✓", tone: hi ? "warn" : "ok" });
    const c = controls(ctx, live);
    const open = c.loto.length + c.simops.length + c.stop.length;
    facts.push({ value: open, label: tr("live permits with open LOTO, SIMOPS or stop-work"), glyph: open ? "⊘" : "✓", tone: open ? "warn" : "ok" });
    return facts;
  }

  function table(ctx) {
    const rows = ctx.D.hazardRows(scoped(ctx));
    const fmt = v => (v.score == null ? "" : v.score + (v.band ? " " + BAND_NAME[v.band] : "") + (v.placed ? " (L" + v.likelihood + "×S" + v.severity + ")" : ""));
    return {
      caption: tr("Hazards in scope"),
      columns: [
        { label: tr("Permit"), value: r => r.permitId, data: true, link: r => ctx.href(r.permitId, r.status) },
        { label: tr("Hazard"), value: r => r.hazard, data: true },
        { label: tr("Status"), value: r => r.status },
        { label: tr("Initial"), value: r => fmt(r.initial), data: true },
        { label: tr("Residual"), value: r => fmt(r.residual), data: true },
        { label: tr("Blocks approval"), value: r => (r.blocksApproval ? tr("Yes") : tr("No")) },
        { label: tr("Controls"), value: r => r.controls, data: true }
      ],
      rows
    };
  }

  C.register("safety", {
    code: "SO · 03", title: tr("Risk Landscape"),
    subtitle: tr("Recorded hazards by likelihood and severity, with the safety controls linked to each permit."),
    render, resolve, highlight, motion, table, hazardItem
  });
})(typeof window !== "undefined" ? window : globalThis);
