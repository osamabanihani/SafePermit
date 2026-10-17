(function () {
  const sidebar = document.getElementById("adminSidebar");
  const overlay = document.getElementById("adminOverlay");
  const sidebarOpen = document.getElementById("sidebarOpen");
  const sidebarClose = document.getElementById("sidebarClose");

  const auditSearch = document.getElementById("auditSearch");
  const roleFilter = document.getElementById("roleFilter");
  const decisionFilter = document.getElementById("decisionFilter");
  const statusFilter = document.getElementById("statusFilter");
  const sortFilter = document.getElementById("sortFilter");

  const auditTableBody = document.getElementById("auditTableBody");
  const auditMobileList = document.getElementById("auditMobileList");
  const auditEmpty = document.getElementById("auditEmpty");
  const auditResultCount = document.getElementById("auditResultCount");
  const exportAuditButton = document.getElementById("exportAuditButton");

  const totalEvents = document.getElementById("totalEvents");
  const approvalEvents = document.getElementById("approvalEvents");
  const exceptionEvents = document.getElementById("exceptionEvents");
  const adminEvents = document.getElementById("adminEvents");

  const approvedBar = document.getElementById("approvedBar");
  const returnedBar = document.getElementById("returnedBar");
  const rejectedBar = document.getElementById("rejectedBar");
  const approvedBarValue = document.getElementById("approvedBarValue");
  const returnedBarValue = document.getElementById("returnedBarValue");
  const rejectedBarValue = document.getElementById("rejectedBarValue");
  const roleReport = document.getElementById("roleReport");

  const demoEvents = [
    {
      permitId: "PTW-1039",
      reviewer: "Rana Haddad",
      role: "Admin",
      decision: "close",
      comment: "Work completed and permit closure recorded by Admin.",
      previousStatus: "Active",
      newStatus: "Closed",
      reviewedAt: "2026-10-10T09:18:00"
    },
    {
      permitId: "PTW-1042",
      reviewer: "Rana Haddad",
      role: "Admin",
      decision: "activate",
      comment: "Approved permit activated for the authorized work window.",
      previousStatus: "Approved",
      newStatus: "Active",
      reviewedAt: "2026-10-10T08:24:00"
    },
    {
      permitId: "PTW-1045",
      reviewer: "Sarah Nasser",
      role: "Safety Officer",
      decision: "approve",
      comment: "Isolation, PPE, emergency arrangements, and residual risk controls verified.",
      previousStatus: "Pending Safety Review",
      newStatus: "Pending Admin Approval",
      reviewedAt: "2026-10-07T08:16:00"
    },
    {
      permitId: "PTW-1045",
      reviewer: "Ahmad Khalil",
      role: "Supervisor",
      decision: "approve",
      comment: "Operational scope, work team, and schedule verified.",
      previousStatus: "Pending Supervisor Review",
      newStatus: "Pending Safety Review",
      reviewedAt: "2026-10-07T07:42:00"
    },
    {
      permitId: "PTW-1041",
      reviewer: "Sarah Nasser",
      role: "Safety Officer",
      decision: "approve",
      comment: "Work-area controls and PPE verified.",
      previousStatus: "Pending Safety Review",
      newStatus: "Pending Admin Approval",
      reviewedAt: "2026-10-07T06:48:00"
    },
    {
      permitId: "PTW-1040",
      reviewer: "Sarah Nasser",
      role: "Safety Officer",
      decision: "approve",
      comment: "Controls verified and acceptable for final approval.",
      previousStatus: "Pending Safety Review",
      newStatus: "Pending Admin Approval",
      reviewedAt: "2026-10-06T18:32:00"
    },
    {
      permitId: "PTW-1036",
      reviewer: "Rana Haddad",
      role: "Admin",
      decision: "approve",
      comment: "Full approval trail verified. Final authorization granted.",
      previousStatus: "Pending Admin Approval",
      newStatus: "Approved",
      reviewedAt: "2026-10-06T17:50:00"
    },
    {
      permitId: "PTW-1024",
      reviewer: "Sarah Nasser",
      role: "Safety Officer",
      decision: "approve",
      comment: "Electrical controls verified.",
      previousStatus: "Pending Safety Review",
      newStatus: "Pending Admin Approval",
      reviewedAt: "2026-10-06T17:18:00"
    },
    {
      permitId: "PTW-1022",
      reviewer: "Rana Haddad",
      role: "Admin",
      decision: "return",
      comment: "Final work timing must be corrected before authorization.",
      previousStatus: "Pending Admin Approval",
      newStatus: "Returned for Correction",
      reviewedAt: "2026-10-06T16:40:00"
    },
    {
      permitId: "PTW-1016",
      reviewer: "Sarah Nasser",
      role: "Safety Officer",
      decision: "return",
      comment: "Fall-protection details require correction before safety approval.",
      previousStatus: "Pending Safety Review",
      newStatus: "Returned for Correction",
      reviewedAt: "2026-10-06T15:02:00"
    },
    {
      permitId: "PTW-1019",
      reviewer: "Sarah Nasser",
      role: "Safety Officer",
      decision: "approve",
      comment: "Fire-watch and hot-work controls verified.",
      previousStatus: "Pending Safety Review",
      newStatus: "Pending Admin Approval",
      reviewedAt: "2026-10-05T16:44:00"
    },
    {
      permitId: "PTW-1018",
      reviewer: "Ahmad Khalil",
      role: "Supervisor",
      decision: "return",
      comment: "Work scope and assigned crew must be clarified.",
      previousStatus: "Pending Supervisor Review",
      newStatus: "Returned for Correction",
      reviewedAt: "2026-10-05T14:28:00"
    },
    {
      permitId: "PTW-1014",
      reviewer: "Sarah Nasser",
      role: "Safety Officer",
      decision: "reject",
      comment: "Confined-space controls are not adequate for safe entry.",
      previousStatus: "Pending Safety Review",
      newStatus: "Rejected",
      reviewedAt: "2026-10-05T12:16:00"
    },
    {
      permitId: "PTW-1012",
      reviewer: "Rana Haddad",
      role: "Admin",
      decision: "reject",
      comment: "Approval trail contains unresolved safety requirements.",
      previousStatus: "Pending Admin Approval",
      newStatus: "Rejected",
      reviewedAt: "2026-10-05T11:20:00"
    },
    {
      permitId: "PTW-1009",
      reviewer: "Sarah Nasser",
      role: "Safety Officer",
      decision: "approve",
      comment: "Checklist and residual controls verified.",
      previousStatus: "Pending Safety Review",
      newStatus: "Pending Admin Approval",
      reviewedAt: "2026-10-04T14:20:00"
    },
    {
      permitId: "PTW-1008",
      reviewer: "Rana Haddad",
      role: "Admin",
      decision: "approve",
      comment: "Permit approved after complete workflow verification.",
      previousStatus: "Pending Admin Approval",
      newStatus: "Approved",
      reviewedAt: "2026-10-04T11:05:00"
    },
    {
      permitId: "PTW-1005",
      reviewer: "Sarah Nasser",
      role: "Safety Officer",
      decision: "approve",
      comment: "Electrical work controls verified.",
      previousStatus: "Pending Safety Review",
      newStatus: "Pending Admin Approval",
      reviewedAt: "2026-10-04T09:36:00"
    }
  ];

  let events = [];

  function openSidebar() {
    sidebar.classList.add("is-open");
    overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeSidebar() {
    sidebar.classList.remove("is-open");
    overlay.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  if (sidebarOpen) sidebarOpen.addEventListener("click", openSidebar);
  if (sidebarClose) sidebarClose.addEventListener("click", closeSidebar);
  if (overlay) overlay.addEventListener("click", closeSidebar);

  window.addEventListener("resize", function () {
    if (window.innerWidth > 820) closeSidebar();
  });

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeDecision(value) {
    const decision = String(value || "").toLowerCase();

    if (decision === "approved") return "approve";
    if (decision === "returned") return "return";
    if (decision === "rejected") return "reject";

    return decision;
  }

  function normalizeRecord(record, fallbackRole) {
    if (!record || !record.permitId) return null;

    return {
      permitId: record.permitId,
      reviewer: record.reviewer || "Unknown Reviewer",
      role: record.role || fallbackRole || "Unknown",
      decision: normalizeDecision(record.decision),
      comment: record.comment || "No comment recorded.",
      previousStatus: record.previousStatus || "—",
      newStatus: record.newStatus || "—",
      reviewedAt: record.reviewedAt || new Date().toISOString()
    };
  }

  function readArray(key, fallbackRole) {
    const stored = localStorage.getItem(key);
    if (!stored) return [];

    try {
      const parsed = JSON.parse(stored);

      if (!Array.isArray(parsed)) return [];

      return parsed
        .map(function (record) {
          return normalizeRecord(record, fallbackRole);
        })
        .filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  function readSingle(key, fallbackRole) {
    const stored = localStorage.getItem(key);
    if (!stored) return [];

    try {
      const parsed = JSON.parse(stored);
      const record = normalizeRecord(parsed, fallbackRole);

      return record ? [record] : [];
    } catch (error) {
      return [];
    }
  }

  function eventKey(event) {
    return [
      event.permitId,
      event.role,
      event.decision,
      event.newStatus,
      event.reviewedAt
    ].join("|");
  }

  function loadEvents() {
    const all = clone(demoEvents);

    all.push.apply(
      all,
      readArray("safePermitSupervisorDecisions", "Supervisor")
    );

    all.push.apply(
      all,
      readArray("safePermitSupervisorDecisionHistory", "Supervisor")
    );

    all.push.apply(
      all,
      readArray("safePermitSafetyDecisionHistory", "Safety Officer")
    );

    all.push.apply(
      all,
      readArray("safePermitAdminDecisionHistory", "Admin")
    );

    all.push.apply(
      all,
      readSingle("safePermitSupervisorDecision", "Supervisor")
    );

    all.push.apply(
      all,
      readSingle("safePermitSafetyDecision", "Safety Officer")
    );

    all.push.apply(
      all,
      readSingle("safePermitAdminDecision", "Admin")
    );

    const unique = new Map();

    all.forEach(function (event) {
      if (!event || !event.permitId) return;
      unique.set(eventKey(event), event);
    });

    events = Array.from(unique.values());
  }

  function decisionLabel(decision) {
    if (decision === "approve") return "Approved";
    if (decision === "return") return "Returned";
    if (decision === "reject") return "Rejected";
    if (decision === "activate") return "Activated";
    if (decision === "close") return "Closed";
    return "Updated";
  }

  function roleClass(role) {
    return String(role || "")
      .toLowerCase()
      .replace(/\s+/g, "-");
  }

  function formatDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return { date: "Unknown date", time: "—" };
    }

    return {
      date: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit"
      })
    };
  }

  function searchableText(event) {
    return (
      event.permitId + " " +
      event.reviewer + " " +
      event.role + " " +
      event.decision + " " +
      event.comment + " " +
      event.previousStatus + " " +
      event.newStatus
    ).toLowerCase();
  }

  function getFilteredEvents() {
    const term = auditSearch.value.trim().toLowerCase();
    const role = roleFilter.value;
    const decision = decisionFilter.value;
    const status = statusFilter.value;

    const filtered = events.filter(function (event) {
      const matchesSearch =
        term === "" ||
        searchableText(event).includes(term);

      const matchesRole =
        role === "all" ||
        event.role === role;

      const matchesDecision =
        decision === "all" ||
        event.decision === decision;

      const matchesStatus =
        status === "all" ||
        event.newStatus === status;

      return (
        matchesSearch &&
        matchesRole &&
        matchesDecision &&
        matchesStatus
      );
    });

    return filtered.sort(function (a, b) {
      if (sortFilter.value === "oldest") {
        return new Date(a.reviewedAt).getTime() - new Date(b.reviewedAt).getTime();
      }

      if (sortFilter.value === "permit") {
        return a.permitId.localeCompare(b.permitId);
      }

      return new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime();
    });
  }

  function appendCell(row, child) {
    const cell = document.createElement("td");

    if (typeof child === "string") {
      cell.textContent = child;
    } else {
      cell.appendChild(child);
    }

    row.appendChild(cell);
  }

  function buildAuditRow(event) {
    const row = document.createElement("tr");
    const time = formatDate(event.reviewedAt);

    const timeWrap = document.createElement("div");
    timeWrap.className = "admin-audit-time";

    const dateStrong = document.createElement("strong");
    dateStrong.textContent = time.date;

    const timeSpan = document.createElement("span");
    timeSpan.textContent = time.time;

    timeWrap.appendChild(dateStrong);
    timeWrap.appendChild(timeSpan);
    appendCell(row, timeWrap);

    appendCell(row, event.permitId);

    const user = document.createElement("div");
    user.className = "admin-audit-user";

    const userStrong = document.createElement("strong");
    userStrong.textContent = event.reviewer;

    const userSpan = document.createElement("span");
    userSpan.textContent = "Human reviewer";

    user.appendChild(userStrong);
    user.appendChild(userSpan);
    appendCell(row, user);

    const role = document.createElement("span");
    role.className =
      "admin-audit-role admin-audit-role--" + roleClass(event.role);
    role.textContent = event.role;
    appendCell(row, role);

    const decision = document.createElement("span");
    decision.className =
      "admin-audit-decision admin-audit-decision--" + event.decision;
    decision.textContent = decisionLabel(event.decision);
    appendCell(row, decision);

    const transition = document.createElement("div");
    transition.className = "admin-audit-transition";

    const from = document.createElement("span");
    from.textContent = event.previousStatus;

    const to = document.createElement("strong");
    to.textContent = "→ " + event.newStatus;

    transition.appendChild(from);
    transition.appendChild(to);
    appendCell(row, transition);

    const comment = document.createElement("div");
    comment.className = "admin-audit-comment";
    comment.textContent = event.comment;
    appendCell(row, comment);

    return row;
  }

  function buildMobileCard(event) {
    const card = document.createElement("article");
    card.className = "admin-audit-mobile-card";

    const time = formatDate(event.reviewedAt);

    const top = document.createElement("div");
    top.className = "admin-audit-mobile-card__top";

    const title = document.createElement("div");
    const strong = document.createElement("strong");
    strong.textContent = event.permitId + " · " + event.reviewer;

    const span = document.createElement("span");
    span.textContent = time.date + " · " + time.time;

    title.appendChild(strong);
    title.appendChild(span);

    const decision = document.createElement("span");
    decision.className =
      "admin-audit-decision admin-audit-decision--" + event.decision;
    decision.textContent = decisionLabel(event.decision);

    top.appendChild(title);
    top.appendChild(decision);

    const meta = document.createElement("div");
    meta.className = "admin-audit-mobile-card__meta";

    const role = document.createElement("span");
    role.className =
      "admin-audit-role admin-audit-role--" + roleClass(event.role);
    role.textContent = event.role;

    meta.appendChild(role);

    const transition = document.createElement("div");
    transition.className = "admin-audit-mobile-card__transition";
    transition.textContent =
      event.previousStatus + " → " + event.newStatus;

    const comment = document.createElement("div");
    comment.className = "admin-audit-mobile-card__comment";
    comment.textContent = event.comment;

    card.appendChild(top);
    card.appendChild(meta);
    card.appendChild(transition);
    card.appendChild(comment);

    return card;
  }

  function renderAudit(list) {
    auditTableBody.innerHTML = "";
    auditMobileList.innerHTML = "";

    list.forEach(function (event) {
      auditTableBody.appendChild(buildAuditRow(event));
      auditMobileList.appendChild(buildMobileCard(event));
    });

    auditEmpty.hidden = list.length !== 0;

    auditResultCount.textContent =
      list.length === 1
        ? "1 event"
        : list.length + " events";
  }

  function updateReports() {
    const approvals = events.filter(function (event) {
      return event.decision === "approve";
    }).length;

    const returned = events.filter(function (event) {
      return event.decision === "return";
    }).length;

    const rejected = events.filter(function (event) {
      return event.decision === "reject";
    }).length;

    const exceptions = returned + rejected;

    const adminCount = events.filter(function (event) {
      return event.role === "Admin";
    }).length;

    totalEvents.textContent = events.length;
    approvalEvents.textContent = approvals;
    exceptionEvents.textContent = exceptions;
    adminEvents.textContent = adminCount;

    approvedBarValue.textContent = approvals;
    returnedBarValue.textContent = returned;
    rejectedBarValue.textContent = rejected;

    const maxValue = Math.max(approvals, returned, rejected, 1);

    approvedBar.style.width = (approvals / maxValue * 100) + "%";
    returnedBar.style.width = (returned / maxValue * 100) + "%";
    rejectedBar.style.width = (rejected / maxValue * 100) + "%";

    const roles = [
      "Supervisor",
      "Safety Officer",
      "Admin"
    ];

    roleReport.innerHTML = "";

    roles.forEach(function (roleName) {
      const roleEvents = events.filter(function (event) {
        return event.role === roleName;
      });

      const approvalsForRole = roleEvents.filter(function (event) {
        return event.decision === "approve";
      }).length;

      const row = document.createElement("div");
      row.className = "admin-role-report__row";

      const text = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = roleName;

      const detail = document.createElement("span");
      detail.textContent =
        approvalsForRole +
        " approvals · " +
        (roleEvents.length - approvalsForRole) +
        " exceptions";

      text.appendChild(title);
      text.appendChild(detail);

      const count = document.createElement("span");
      count.className = "admin-role-count";
      count.textContent = roleEvents.length;

      row.appendChild(text);
      row.appendChild(count);
      roleReport.appendChild(row);
    });
  }

  function applyFilters() {
    renderAudit(getFilteredEvents());
  }

  function csvValue(value) {
    return '"' + String(value || "").replace(/"/g, '""') + '"';
  }

  function exportCsv() {
    const rows = getFilteredEvents();

    const headers = [
      "Date & Time",
      "Permit ID",
      "Reviewer",
      "Role",
      "Decision",
      "Previous Status",
      "New Status",
      "Comment"
    ];

    const lines = [
      headers.map(csvValue).join(",")
    ];

    rows.forEach(function (event) {
      lines.push(
        [
          event.reviewedAt,
          event.permitId,
          event.reviewer,
          event.role,
          decisionLabel(event.decision),
          event.previousStatus,
          event.newStatus,
          event.comment
        ].map(csvValue).join(",")
      );
    });

    const blob = new Blob(
      [lines.join("\n")],
      { type: "text/csv;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "safepermit-audit-report.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  auditSearch.addEventListener("input", applyFilters);
  roleFilter.addEventListener("change", applyFilters);
  decisionFilter.addEventListener("change", applyFilters);
  statusFilter.addEventListener("change", applyFilters);
  sortFilter.addEventListener("change", applyFilters);
  exportAuditButton.addEventListener("click", exportCsv);

  loadEvents();
  updateReports();
  applyFilters();
})();
