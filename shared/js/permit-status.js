/* SafePermit v13.1 — shared four-layer permit status.
 * Each layer is evaluated separately and never inferred from another:
 *   1. lifecycle — the stored status string (a record, not an authorization)
 *   2. validity  — the recorded end date/time checked against "now"
 *   3. approvals — documented decision evidence (SafePermitData.hasApprovalEvidence /
 *                  hasCoherentApprovalTrail); a status alone is never shown as approved
 *   4. blockers  — the integrated safety review (SafePermitWorkflow.getReview)
 * Demo only: a backend must recompute all four layers before any work is authorized.
 */
(function (root) {
  "use strict";

  const ROLES = ["supervisor", "safety", "admin"];
  const ROLE_LABEL = { supervisor: "Supervisor", safety: "Safety Officer", admin: "Admin", worker: "Worker" };
  const STAGE_STATUS = { supervisor: "Pending Supervisor Review", safety: "Pending Safety Review", admin: "Pending Admin Approval" };
  // How far through the approval chain a stored status claims to be (number of approvals it implies).
  const IMPLIED = {
    "Pending Supervisor Review": 0, "Pending Safety Review": 1, "Pending Admin Approval": 2,
    "Approved": 3, "Active": 3, "Closed": 3
  };
  const TERMINAL = new Set(["Rejected", "Closed", "Cancelled", "Canceled"]);

  // Integrated-review blocker text (safety-workflow.js) → where it is resolved.
  const BLOCKER_SECTIONS = [
    { match: /^Active stop-work case$/, section: "stopworks", label: "Stop-Work Center" },
    { match: /^Unverified safety gates$/, section: "gates", label: "Permit Safety Gates" },
    { match: /^LOTO isolation verification required$/, section: "isolations", label: "Digital LOTO" },
    { match: /^Safety Passport competency verification required$/, section: "passports", label: "Safety Passports" },
    { match: /^High residual risk requires HSE review$/, section: "risks", label: "Risk Register" },
    { match: /^SIMOPS conflict review required$/, section: "conflicts", label: "SIMOPS Conflicts" },
    { match: /^Permit stopped — authorized resume required$/, page: "resume", label: "Controlled resume" },
    { match: /^Pending resumption authorization$/, page: "resume", label: "Controlled resume" }
  ];

  const text = (v) => String(v == null ? "" : v).trim();

  function endOf(permit) {
    const b = (permit && permit.basicInfo) || {};
    if (b.endDate || b.endTime) return b.endDate && b.endTime ? b.endDate + "T" + b.endTime : "";
    return text(permit && (permit.end || permit.endDateTime));
  }

  // Same fail-closed rules as Admin activation and the QR page: a complete, real calendar date and time.
  function checkValidity(permit, now) {
    const end = endOf(permit);
    const checkedAt = new Date(now).toISOString();
    if (!end) return { state: "missing", end: "", checkedAt };
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?$/.test(end)) return { state: "invalid", end, checkedAt };
    const p = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(end);
    const [y, mo, d, h, mi, s] = [+p[1], +p[2], +p[3], +p[4], +p[5], +(p[6] || 0)];
    const cal = new Date(Date.UTC(y, mo - 1, d));
    if (cal.getUTCFullYear() !== y || cal.getUTCMonth() !== mo - 1 || cal.getUTCDate() !== d || h > 23 || mi > 59 || s > 59) {
      return { state: "invalid", end, checkedAt };
    }
    const expiresAt = Date.parse(end);
    if (!Number.isFinite(expiresAt)) return { state: "invalid", end, checkedAt };
    return { state: expiresAt > now ? "valid" : "expired", end, expiresAt, checkedAt };
  }

  function lifecycleOf(permit) {
    const status = text(permit && permit.status) || "Unknown";
    let tone = "neutral";
    if (/^Pending /.test(status)) tone = "info";
    else if (status === "Returned for Correction") tone = "warning";
    else if (status === "Rejected" || status === "Stopped") tone = "danger";
    // Approved/Active stay neutral on purpose: the stored word is not evidence.
    return { status, tone, previousStatus: text(permit && permit.previousStatusBeforeStop) };
  }

  function approvalsOf(permit, data) {
    const status = text(permit && permit.status);
    const reference = status === "Stopped" ? text(permit.previousStatusBeforeStop) : status;
    const implied = Object.prototype.hasOwnProperty.call(IMPLIED, reference) ? IMPLIED[reference] : 0;
    const floor = permit && permit.resubmittedAt != null ? Date.parse(permit.resubmittedAt) : -Infinity;
    const steps = ROLES.map(function (role, index) {
      const record = permit && permit[role + "Decision"];
      const at = record && Date.parse(record.reviewedAt);
      const current = !record || !Number.isFinite(at) || !Number.isFinite(floor) || at >= floor;
      const step = { role, label: ROLE_LABEL[role], state: "not-reached", reviewer: "", reviewedAt: "" };
      if (data && data.hasApprovalEvidence(permit, role) && current) {
        step.state = "documented";
        step.reviewer = text(record.reviewer);
        step.reviewedAt = record.reviewedAt;
      } else if (record && current && record.decision === "return" && status === "Returned for Correction") {
        step.state = "returned";
        step.reviewer = text(record.reviewer);
        step.reviewedAt = text(record.reviewedAt);
      } else if (record && current && record.decision === "reject" && status === "Rejected") {
        step.state = "rejected";
        step.reviewer = text(record.reviewer);
        step.reviewedAt = text(record.reviewedAt);
      } else if (record && record.decision === "approve" && !current) {
        step.state = "stale";
      } else if (index < implied) {
        // The stored status claims this approval happened, but there is no documented evidence.
        step.state = "missing";
      } else if (reference === STAGE_STATUS[role] && status !== "Stopped") {
        step.state = "awaiting";
      }
      return step;
    });
    const documented = steps.filter(s => s.state === "documented").map(s => s.role);
    const coherent = !documented.length || !!(data && data.hasCoherentApprovalTrail(permit, documented));
    return { steps, documented: documented.length, total: ROLES.length, coherent,
      complete: documented.length === ROLES.length && coherent };
  }

  function blockersOf(review) {
    if (!review || !Array.isArray(review.blockers)) return { state: "unavailable", items: [] };
    const items = review.blockers.map(function (raw) {
      const blocker = text(raw);
      const hit = BLOCKER_SECTIONS.find(b => b.match.test(blocker));
      return { text: blocker, section: hit && hit.section || "", page: hit && hit.page || "", resolver: hit ? hit.label : "" };
    });
    const clear = !items.length && review.eligibleForDemoApproval === true;
    return { state: clear ? "clear" : "blocked", items };
  }

  function evaluate(permit, options) {
    const opts = options || {};
    const now = Number.isFinite(opts.now) ? opts.now : Date.now();
    const data = opts.data || root.SafePermitData || null;
    if (!permit || !text(permit.id)) {
      return { found: false, permitId: text(opts.permitId), checkedAt: new Date(now).toISOString() };
    }
    const blockers = opts.reviewError ? { state: "unavailable", items: [] } : blockersOf(opts.review);
    return {
      found: true,
      permitId: text(permit.id),
      terminal: TERMINAL.has(text(permit.status)),
      lifecycle: lifecycleOf(permit),
      validity: checkValidity(permit, now),
      approvals: approvalsOf(permit, data),
      blockers,
      checkedAt: new Date(now).toISOString()
    };
  }

  // Reasons a permit cannot proceed, derived only from the four layers (dashboards reuse this).
  // Each reason is {code, text, role?, section?, page?, resolver?}; text is a fixed English phrase.
  function problems(model) {
    if (!model || !model.found) return [{ code: "unavailable", text: "Permit record unavailable" }];
    const out = [];
    const status = model.lifecycle.status;
    const claimsApproval = status === "Approved" || status === "Active";
    if (claimsApproval && model.validity.state === "expired") out.push({ code: "expired", text: "Expired" });
    if (claimsApproval && (model.validity.state === "missing" || model.validity.state === "invalid")) out.push({ code: "expiry", text: "Expiry not verifiable" });
    model.approvals.steps.forEach(function (s) {
      if (s.state === "missing") out.push({ code: "evidence", text: "Evidence missing", role: s.label });
    });
    if (!model.approvals.coherent) out.push({ code: "trail", text: "Approval order or timing is not coherent" });
    if (model.blockers.state === "unavailable") out.push({ code: "review", text: "Integrated safety review unavailable" });
    model.blockers.items.forEach(b => out.push({ code: "blocker", text: b.text, section: b.section, page: b.page, resolver: b.resolver }));
    return out;
  }

  function formatDate(value) {
    const t = typeof value === "number" ? value : Date.parse(value);
    if (!Number.isFinite(t)) return "";
    return new Date(t).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
  }

  async function load(permitId, options) {
    const opts = options || {};
    const id = text(permitId);
    const data = root.SafePermitData;
    let permit = null;
    if (id && data && typeof data.readKnownPermits === "function") {
      permit = data.readKnownPermits().find(p => p && text(p.id) === id) || null;
    }
    let review = null, reviewError = false;
    if (permit) {
      try {
        if (!root.SafePermitWorkflow || typeof root.SafePermitWorkflow.getReview !== "function") throw new Error("unavailable");
        review = await root.SafePermitWorkflow.getReview(id);
      } catch (_) { reviewError = true; }
    }
    return evaluate(permit, { review, reviewError, now: opts.now, permitId: id });
  }

  /* ---------------- DOM rendering ---------------- */

  const STEP_TEXT = {
    documented: "Documented", missing: "Evidence missing", stale: "From an earlier submission",
    awaiting: "Awaiting review", returned: "Returned for Correction", rejected: "Rejected", "not-reached": "Not reached"
  };
  const STEP_TONE = { documented: "success", missing: "danger", stale: "warning", awaiting: "info", returned: "warning", rejected: "danger", "not-reached": "muted" };
  const VALIDITY = {
    valid: ["In date", "success"], expired: ["Expired", "danger"],
    missing: ["No expiry recorded", "danger"], invalid: ["Expiry unreadable", "danger"]
  };

  function el(tag, cls, value) {
    const node = root.document.createElement(tag);
    if (cls) node.className = cls;
    if (value != null && value !== "") node.textContent = String(value);
    return node;
  }
  function pair(label, value) {
    const row = el("div", "sp-pstatus__pair");
    row.append(el("span", "", label), el("strong", "", value));
    return row;
  }
  function layer(index, name, tone, value) {
    const card = el("article", "sp-pstatus__layer");
    card.dataset.tone = tone;
    const head = el("div", "sp-pstatus__layer-head");
    head.append(el("span", "sp-pstatus__index", index), el("span", "sp-pstatus__name", name));
    card.append(head, el("strong", "sp-pstatus__value", value));
    return card;
  }
  function resolverHref(item, permitId) {
    const base = root.SafePermitPaths && root.SafePermitPaths.projectRoot;
    if (!base) return "";
    if (item.page === "resume") return new URL("safety/controlled-resume/?id=" + encodeURIComponent(permitId), base).href;
    if (item.section) return new URL("safety/risk-command-center/?id=" + encodeURIComponent(permitId) + "#" + item.section, base).href;
    return "";
  }

  function render(container, model, options) {
    if (!container) return;
    const viewer = (options && options.role) || container.dataset.role || "worker";
    container.replaceChildren();
    container.classList.add("sp-pstatus");
    container.dataset.state = model.found ? "loaded" : "missing";

    const head = el("header", "sp-pstatus__head");
    head.append(el("span", "sp-pstatus__eyebrow", "Permit status"));
    head.append(el("h2", "", "Four-layer status"));
    head.append(el("p", "sp-pstatus__note", "Each layer is checked separately. A stored status alone is never treated as approved."));
    container.append(head);

    if (!model.found) {
      const empty = el("p", "sp-pstatus__empty", "No stored record for this permit in this browser. Status, validity, approvals and blockers cannot be verified.");
      container.append(empty);
      apply(container);
      return;
    }

    const grid = el("div", "sp-pstatus__layers");

    // 1. Lifecycle
    const life = layer("1", "Stored lifecycle state", model.lifecycle.tone, model.lifecycle.status);
    life.dataset.layer = "lifecycle";
    life.append(el("p", "sp-pstatus__detail", "Stored record only — not proof of authorization."));
    if (model.lifecycle.previousStatus) life.append(pair("Previous status", model.lifecycle.previousStatus));
    grid.append(life);

    // 2. Validity
    const v = VALIDITY[model.validity.state] || VALIDITY.invalid;
    const valid = layer("2", "Current validity", v[1], v[0]);
    valid.dataset.layer = "validity";
    if (model.validity.state === "valid" || model.validity.state === "expired") {
      valid.append(pair(model.validity.state === "valid" ? "Expires" : "Expired on", formatDate(model.validity.expiresAt)));
    } else {
      valid.append(el("p", "sp-pstatus__detail", "Validity cannot be verified."));
    }
    valid.append(pair("Checked", formatDate(model.checkedAt)));
    grid.append(valid);

    // 3. Documented approvals
    const ap = model.approvals;
    const apTone = !ap.coherent || ap.steps.some(s => s.state === "missing") ? "danger" : ap.complete ? "success" : "info";
    const approvals = layer("3", "Documented approvals", apTone, "");
    approvals.dataset.layer = "approvals";
    const count = el("strong", "sp-pstatus__value");
    count.append(el("span", "sp-pstatus__num", ap.documented + " / " + ap.total), el("span", "", "documented"));
    approvals.querySelector(".sp-pstatus__value").replaceWith(count);
    const list = el("ol", "sp-pstatus__steps");
    ap.steps.forEach(function (s) {
      const li = el("li", "sp-pstatus__step");
      li.dataset.tone = STEP_TONE[s.state];
      li.dataset.step = s.state;
      li.append(el("span", "sp-pstatus__step-role", s.label), el("span", "sp-pstatus__step-state", STEP_TEXT[s.state]));
      if (s.reviewer || s.reviewedAt) {
        const meta = el("span", "sp-pstatus__step-meta");
        if (s.reviewer) {
          // Reviewer names are user data: never run them through the translation table.
          const who = el("span", "", s.reviewer);
          who.setAttribute("data-i18n-ignore", "");
          meta.append(who);
        }
        if (s.reviewedAt) meta.append(el("span", "", formatDate(s.reviewedAt)));
        li.append(meta);
      }
      list.append(li);
    });
    approvals.append(list);
    if (!ap.coherent) approvals.append(el("p", "sp-pstatus__detail sp-pstatus__detail--alert", "Approval order or timing is not coherent with the current submission."));
    grid.append(approvals);

    // 4. Integrated safety blockers
    const b = model.blockers;
    const bValue = b.state === "clear" ? "None recorded" : b.state === "unavailable" ? "Review unavailable" : String(b.items.length);
    const blockers = layer("4", "Safety blockers", b.state === "clear" ? "success" : "danger", bValue);
    blockers.dataset.layer = "blockers";
    if (b.state === "unavailable") {
      blockers.append(el("p", "sp-pstatus__detail", "The integrated safety review could not run. Treat the permit as not cleared."));
    } else if (b.state === "clear") {
      blockers.append(el("p", "sp-pstatus__detail", "The integrated safety review found no open blocker. This is not an authorization."));
    } else {
      const ul = el("ul", "sp-pstatus__blockers");
      b.items.forEach(function (item) {
        const li = el("li", "sp-pstatus__blocker");
        // Blocker text comes from the review engine (fixed English phrases with Arabic runtime entries).
        li.append(el("span", "sp-pstatus__blocker-text", item.text));
        if (item.resolver) {
          const href = viewer === "safety" ? resolverHref(item, model.permitId) : "";
          if (href) {
            const a = el("a", "sp-pstatus__resolve", item.resolver);
            a.href = href;
            li.append(a);
          } else {
            const who = el("span", "sp-pstatus__resolver");
            who.append(el("span", "", "Resolved by Safety Officer"), el("span", "", item.resolver));
            li.append(who);
          }
        }
        ul.append(li);
      });
      blockers.append(ul);
    }
    grid.append(blockers);

    container.append(grid);
    apply(container);
  }

  function apply(scope) {
    if (root.SafePermitI18n && typeof root.SafePermitI18n.apply === "function") root.SafePermitI18n.apply(scope);
  }

  function pageId(container) {
    try {
      const fromUrl = new URLSearchParams(root.location.search).get("id");
      if (fromUrl) return fromUrl;
    } catch (_) { /* no URL support */ }
    if (container && container.dataset.permitId) return container.dataset.permitId;
    const shown = root.document.getElementById("permitId");
    return shown ? text(shown.textContent) : "";
  }

  function mount(container, options) {
    if (!container) return null;
    let seq = 0;
    async function refresh() {
      const mine = ++seq;
      const model = await load(pageId(container), options);
      if (mine === seq) render(container, model, options);
      return model;
    }
    root.addEventListener("safepermit:permits-updated", refresh);
    root.addEventListener("safepermit:safety-updated", refresh);
    root.addEventListener("storage", refresh);
    return refresh();
  }

  function autoMount() {
    root.document.querySelectorAll("[data-sp-permit-status]").forEach(function (node) {
      mount(node, { role: node.dataset.role });
    });
  }

  root.SafePermitStatus = Object.freeze({ evaluate, problems, checkValidity, load, render, mount, formatDate, resolverHref, BLOCKER_SECTIONS, ROLE_LABEL });

  if (root.document && typeof root.document.querySelectorAll === "function") {
    if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", autoMount, { once: true });
    else autoMount();
  }
})(typeof window !== "undefined" ? window : globalThis);
