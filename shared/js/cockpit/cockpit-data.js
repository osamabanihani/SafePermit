/* SafePermit v13.6 — Operational Cockpit data layer.
 * Pure functions over records that already exist: permits (data-adapter), decision history keys,
 * Stop-Work records and the integrated safety review (safety-workflow getReview).
 * Nothing here invents values: a missing timestamp or likelihood/severity stays missing and is
 * reported as "unknown" / "not placed". Demo only: a backend must scope records to the signed-in user.
 */
(function (root) {
  "use strict";

  const text = v => String(v == null ? "" : v).trim();
  const statusOf = p => text(p && p.status) || "Unknown";

  // The approval chain in order, plus the branches a permit can leave it by.
  const STAGES = Object.freeze([
    { key: "draft", label: "Draft", statuses: ["Draft"] },
    { key: "supervisor", label: "Supervisor review", statuses: ["Pending Supervisor Review"] },
    { key: "safety", label: "Safety review", statuses: ["Pending Safety Review"] },
    { key: "admin", label: "Admin approval", statuses: ["Pending Admin Approval"] },
    { key: "approved", label: "Approved", statuses: ["Approved"] },
    { key: "active", label: "Active", statuses: ["Active"] },
    { key: "closed", label: "Closed", statuses: ["Closed"] }
  ]);
  const BRANCHES = Object.freeze([
    { key: "returned", label: "Returned for correction", statuses: ["Returned for Correction"] },
    { key: "stopped", label: "Stopped", statuses: ["Stopped"] },
    { key: "rejected", label: "Rejected", statuses: ["Rejected", "Cancelled", "Canceled"] }
  ]);
  const ALL = STAGES.concat(BRANCHES);
  const LIVE = new Set(["supervisor", "safety", "admin", "approved", "active", "returned", "stopped"]);
  const ROLE_STAGE = { supervisor: "supervisor", safety: "safety", admin: "admin" };

  function stageOf(permit) {
    const status = statusOf(permit);
    const hit = ALL.find(s => s.statuses.indexOf(status) >= 0);
    return hit ? hit.key : "other";
  }
  function stageLabel(key) {
    const hit = ALL.find(s => s.key === key);
    return hit ? hit.label : "Other status";
  }

  // A real, parseable instant that is not in the future; anything else is unknown.
  function instant(value, now) {
    if (value == null || value === "") return null;
    const t = typeof value === "number" ? value : Date.parse(value);
    if (!Number.isFinite(t)) return null;
    if (Number.isFinite(now) && t > now + 60000) return null;
    return t;
  }
  function decisionAt(permit, role, decision, now) {
    const record = permit && permit[role + "Decision"];
    if (!record || (decision && record.decision !== decision)) return null;
    return instant(record.reviewedAt, now);
  }

  /* When did the permit enter its current stage? Only from recorded timestamps.
   * stops: Stop-Work records (createdAt). Returns {at, source} or {at:null, source:""}. */
  function enteredStage(permit, now, stops) {
    const key = stageOf(permit);
    const pick = (at, source) => (at == null ? { at: null, source: "" } : { at, source });
    if (key === "supervisor") {
      const sub = instant(permit.submittedAt, now), re = instant(permit.resubmittedAt, now);
      if (re != null && (sub == null || re >= sub)) return pick(re, "resubmittedAt");
      return pick(sub, "submittedAt");
    }
    if (key === "safety") return pick(decisionAt(permit, "supervisor", "approve", now), "supervisorDecision.reviewedAt");
    if (key === "admin") return pick(decisionAt(permit, "safety", "approve", now), "safetyDecision.reviewedAt");
    if (key === "approved") return pick(decisionAt(permit, "admin", "approve", now), "adminDecision.reviewedAt");
    if (key === "returned" || key === "rejected") {
      const want = key === "returned" ? "return" : "reject";
      let best = null, source = "";
      ["supervisor", "safety", "admin"].forEach(function (role) {
        const at = decisionAt(permit, role, want, now);
        if (at != null && (best == null || at > best)) { best = at; source = role + "Decision.reviewedAt"; }
      });
      return pick(best, source);
    }
    if (key === "stopped") {
      const own = (stops || []).filter(s => s && text(s.permitId) === text(permit.id)).map(s => instant(s.createdAt, now)).filter(t => t != null);
      return pick(own.length ? Math.max.apply(null, own) : null, "stopwork.createdAt");
    }
    if (key === "draft") return pick(instant(permit.createdAt || permit.savedAt, now), "createdAt");
    return { at: null, source: "" }; // Active / Closed: no activation or closure time is recorded.
  }

  const HOUR = 3600000;
  function ageBucket(ms) {
    if (!Number.isFinite(ms) || ms < 0) return "unknown";
    return ms < 4 * HOUR ? "lt4h" : ms < 24 * HOUR ? "h4to24" : "gt24h";
  }
  const AGE_BUCKETS = Object.freeze([
    { key: "lt4h", label: "Under 4 h" }, { key: "h4to24", label: "4 to 24 h" },
    { key: "gt24h", label: "Over 24 h" }, { key: "unknown", label: "Age unknown" }
  ]);
  function formatAge(ms) {
    if (!Number.isFinite(ms) || ms < 0) return "";
    const h = ms / HOUR;
    if (h < 1) return Math.max(1, Math.round(ms / 60000)) + " min";
    if (h < 48) return Math.round(h) + " h";
    return Math.round(h / 24) + " d";
  }

  /* Hazard rows. Likelihood × severity is placed on the matrix only when both values were recorded. */
  const int5 = v => { const n = Number(v); return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null; };
  function band(score) {
    const engine = root.SafePermitRiskEngine;
    if (engine && engine.classify) { const c = engine.classify(score); return c ? c.key : ""; }
    const n = Number(score);
    if (!Number.isInteger(n) || n < 1 || n > 25) return "";
    return n <= 4 ? "low" : n <= 9 ? "medium" : n <= 16 ? "high" : "critical";
  }
  function hazardRows(permits) {
    const rows = [];
    (permits || []).forEach(function (p) {
      const hazards = p && p.riskAssessment && Array.isArray(p.riskAssessment.hazards) ? p.riskAssessment.hazards : [];
      hazards.forEach(function (h, index) {
        if (!h || typeof h !== "object") return;
        const iL = int5(h.initialLikelihood), iS = int5(h.initialSeverity), rL = int5(h.residualLikelihood), rS = int5(h.residualSeverity);
        const iScore = iL && iS ? iL * iS : (Number.isInteger(Number(h.initialScore)) ? Number(h.initialScore) : null);
        const rScore = rL && rS ? rL * rS : (Number.isInteger(Number(h.residualScore)) ? Number(h.residualScore) : null);
        rows.push({
          key: text(p.id) + "#" + index, permitId: text(p.id), title: titleOf(p), status: statusOf(p), stage: stageOf(p),
          hazard: text(h.hazard) || "Unnamed hazard", controls: text(h.controls),
          initial: { likelihood: iL, severity: iS, score: iScore, band: band(iScore), placed: !!(iL && iS) },
          residual: { likelihood: rL, severity: rS, score: rScore, band: band(rScore), placed: !!(rL && rS) },
          blocksApproval: rScore != null && (rScore >= 10 || (iScore != null && rScore >= iScore))
        });
      });
    });
    return rows;
  }
  // Matrix cells for one view ("initial" | "residual"): cell key "L-S" → rows.
  function matrix(rows, view) {
    const cells = {};
    const unplaced = [];
    rows.forEach(function (row) {
      const v = row[view];
      if (!v.placed) { unplaced.push(row); return; }
      const key = v.likelihood + "-" + v.severity;
      (cells[key] = cells[key] || []).push(row);
    });
    return { cells, unplaced };
  }

  // Overall permit risk: worst residual band from its assessment; otherwise the stored riskLevel, labelled as such.
  const BAND_ORDER = ["low", "medium", "high", "critical"];
  function riskOf(permit) {
    const rows = hazardRows([permit]).filter(r => r.residual.band);
    if (rows.length) {
      const worst = rows.reduce((a, r) => (BAND_ORDER.indexOf(r.residual.band) > BAND_ORDER.indexOf(a) ? r.residual.band : a), "low");
      return { key: worst, source: "assessment" };
    }
    const stored = text(permit && (permit.riskLevel || permit.risk)).toLowerCase();
    return BAND_ORDER.indexOf(stored) >= 0 ? { key: stored, source: "recorded" } : { key: "", source: "none" };
  }

  function titleOf(permit) {
    const b = (permit && permit.basicInfo) || {};
    return text(b.workTitle || (permit && (permit.workTitle || permit.title)) || b.permitType || (permit && permit.permitType));
  }
  function siteOf(permit) { const b = (permit && permit.basicInfo) || {}; return text(b.site || (permit && permit.site)); }
  function typeOf(permit) { const b = (permit && permit.basicInfo) || {}; return text(b.permitType || (permit && permit.permitType)); }
  function plannedStart(permit, now) {
    const b = (permit && permit.basicInfo) || {};
    const date = text(b.startDate || (permit && permit.startDate));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    const time = /^\d{2}:\d{2}$/.test(text(b.startTime)) ? text(b.startTime) : "";
    const t = Date.parse(date + "T" + (time || "00:00"));
    return Number.isFinite(t) ? { at: t, dateOnly: !time } : null;
  }

  /* Recorded transitions between stages. Each edge counts events that were actually stored:
   * submissions, resubmissions, role decisions (permit fields and decision history), stop-work
   * records and resume reviews. Edges carry the permit ids so a ribbon can drill down. */
  const DECISION_TARGET = { approve: { supervisor: "safety", safety: "admin", admin: "approved" }, return: "returned", reject: "rejected" };
  function transitions(permits, history, stops) {
    const edges = {};
    const seen = new Set();
    function add(from, to, permitId, at, kind) {
      if (!permitId) return;
      const stamp = Number.isFinite(at) ? at : "";
      const id = [permitId, from, to, kind, stamp].join("|");
      if (seen.has(id)) return;
      seen.add(id);
      const key = from + ">" + to;
      const edge = edges[key] || (edges[key] = { from, to, count: 0, permits: [], events: [] });
      edge.count++;
      if (edge.permits.indexOf(permitId) < 0) edge.permits.push(permitId);
      edge.events.push({ permitId, at: Number.isFinite(at) ? at : null, kind });
    }
    function decision(record, role) {
      if (!record || !role) return;
      const d = record.decision;
      const target = d === "approve" ? DECISION_TARGET.approve[role] : DECISION_TARGET[d];
      if (!target || typeof target !== "string") return;
      add(role, target, text(record.permitId), instant(record.reviewedAt), d);
    }
    (permits || []).forEach(function (p) {
      const id = text(p && p.id);
      if (!id) return;
      if (instant(p.submittedAt) != null) add("draft", "supervisor", id, instant(p.submittedAt), "submit");
      if (instant(p.resubmittedAt) != null) add("returned", "supervisor", id, instant(p.resubmittedAt), "resubmit");
      ["supervisor", "safety", "admin"].forEach(function (role) {
        const r = p[role + "Decision"];
        if (r) decision(Object.assign({}, r, { permitId: id }), role);
      });
      (Array.isArray(p.auditTrail) ? p.auditTrail : []).forEach(function (a) {
        if (a && a.type === "RESUME_REVIEW" && a.action === "approve" && a.to) {
          const to = stageOf({ status: a.to });
          add("stopped", to, id, instant(a.at), "resume");
        }
      });
    });
    const roleKey = { "Supervisor": "supervisor", "Safety Officer": "safety", "Admin": "admin" };
    (history || []).forEach(function (r) {
      if (!r) return;
      decision(r, roleKey[text(r.role)] || text(r.role).toLowerCase());
    });
    (stops || []).forEach(function (s) {
      if (s && text(s.permitId)) add("active", "stopped", text(s.permitId), instant(s.createdAt), "stop");
    });
    return edges;
  }

  /* Filters (migrated from the retired sample analytics, now applied to real records only). */
  function applyFilters(permits, f, now) {
    const filters = f || {};
    const q = text(filters.q).toLowerCase();
    const days = Number(filters.range);
    const since = Number.isFinite(days) && days > 0 ? (Number.isFinite(now) ? now : Date.now()) - days * 86400000 : null;
    return (permits || []).filter(function (p) {
      // Date range uses the recorded (re)submission time; permits without one are excluded, not guessed.
      if (since != null) {
        const at = Math.max(instant(p.submittedAt) || -Infinity, instant(p.resubmittedAt) || -Infinity);
        if (!Number.isFinite(at) || at < since) return false;
      }
      if (filters.site && siteOf(p) !== filters.site) return false;
      if (filters.type && typeOf(p) !== filters.type) return false;
      if (filters.risk && riskOf(p).key !== filters.risk) return false;
      if (q) {
        const hay = [p.id, titleOf(p), statusOf(p), siteOf(p), typeOf(p), (p.basicInfo || {}).area, p.workerName].map(text).join(" ").toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
  }
  function facets(permits) {
    const uniq = list => Array.from(new Set(list.filter(Boolean))).sort();
    return {
      sites: uniq((permits || []).map(siteOf)),
      types: uniq((permits || []).map(typeOf)),
      risks: BAND_ORDER.filter(k => (permits || []).some(p => riskOf(p).key === k))
    };
  }

  /* CSV (RFC 4180 quoting; formula-leading cells neutralised for spreadsheet safety). */
  function csvCell(value) {
    let s = value == null ? "" : String(value);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function toCsv(columns, rows) {
    const lines = [columns.map(c => csvCell(c.label)).join(",")];
    rows.forEach(r => lines.push(columns.map(c => csvCell(typeof c.value === "function" ? c.value(r) : r[c.key])).join(",")));
    return lines.join("\r\n");
  }

  /* Saved views (per role, this device only). Stored shape: [{name, filters, view}] — never records. */
  const VIEW_KEY = role => "safePermitCockpitViews:" + role;
  function readViews(storage, role) {
    try { const v = JSON.parse(storage.getItem(VIEW_KEY(role)) || "[]"); return Array.isArray(v) ? v.filter(x => x && text(x.name)) : []; }
    catch (_) { return []; }
  }
  function writeViews(storage, role, views) {
    try { storage.setItem(VIEW_KEY(role), JSON.stringify(views.slice(0, 12))); return true; } catch (_) { return false; }
  }

  /* Activity per day for the last `days` days, from recorded events only (no smoothing, no fill-in). */
  function activityByDay(events, now, days) {
    const n = days || 14;
    const end = new Date(now); end.setHours(0, 0, 0, 0);
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const start = end.getTime() - i * 86400000;
      out.push({ start, count: 0, events: [] });
    }
    (events || []).forEach(function (ev) {
      const t = ev && Number.isFinite(ev.time) ? ev.time : instant(ev && ev.at);
      if (t == null) return;
      const slot = out.find(d => t >= d.start && t < d.start + 86400000);
      if (slot) { slot.count++; slot.events.push(ev); }
    });
    return out;
  }

  function greetingKey(hour) {
    return hour >= 5 && hour < 12 ? "morning" : hour >= 12 && hour < 18 ? "afternoon" : "evening";
  }

  root.SafePermitCockpitData = Object.freeze({
    STAGES, BRANCHES, LIVE, ROLE_STAGE, AGE_BUCKETS, BAND_ORDER,
    stageOf, stageLabel, enteredStage, ageBucket, formatAge, instant,
    hazardRows, matrix, band, riskOf, titleOf, siteOf, typeOf, plannedStart,
    transitions, applyFilters, facets, toCsv, csvCell, readViews, writeViews, activityByDay, greetingKey
  });
})(typeof window !== "undefined" ? window : globalThis);
