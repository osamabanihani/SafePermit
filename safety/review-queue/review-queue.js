(function () {
  const sidebar = document.getElementById("safetySidebar");
  const overlay = document.getElementById("safetyOverlay");
  const sidebarOpen = document.getElementById("sidebarOpen");
  const sidebarClose = document.getElementById("sidebarClose");

  const search = document.getElementById("queueSearch");
  const riskFilter = document.getElementById("riskFilter");
  const checklistFilter = document.getElementById("checklistFilter");
  const sortFilter = document.getElementById("sortFilter");

  const tableBody = document.getElementById("queueTableBody");
  const mobileList = document.getElementById("queueMobileList");
  const emptyState = document.getElementById("queueEmpty");
  const visibleCount = document.getElementById("queueVisibleCount");

  const summaryWaiting = document.getElementById("summaryWaiting");
  const summaryPriority = document.getElementById("summaryPriority");
  const summaryChecklist = document.getElementById("summaryChecklist");
  const summarySoon = document.getElementById("summarySoon");
  const queueBadge = document.getElementById("queueBadge");

  const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 };

  const permitTypeLabels = {
    electrical: "Electrical Work",
    "hot-work": "Hot Work",
    height: "Work at Height",
    confined: "Confined Space Entry",
    excavation: "Excavation",
    general: "General Maintenance"
  };

  const siteLabels = {
    "factory-a": "Factory A",
    "plant-b": "Plant B",
    "warehouse-1": "Warehouse 1",
    "warehouse-2": "Warehouse 2",
    "tank-farm": "Tank Farm"
  };

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

  function escapeHTML(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function titleCase(value) {
    return String(value || "")
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
  }

  function getPermitType(value) {
    return permitTypeLabels[value] || titleCase(value) || "Permit";
  }

  function getSite(value) {
    return siteLabels[value] || titleCase(value) || "Site";
  }

  function highestResidual(permit) {
    const hazards = permit && permit.riskAssessment && Array.isArray(permit.riskAssessment.hazards)
      ? permit.riskAssessment.hazards
      : [];

    const score = hazards.reduce(function (max, hazard) {
      return Math.max(max, Number(hazard.residualScore) || 0);
    }, 0);

    if (score >= 17) return { score: score, label: "Critical", className: "critical" };
    if (score >= 10) return { score: score, label: "High", className: "high" };
    if (score >= 5) return { score: score, label: "Medium", className: "medium" };
    return { score: score, label: "Low", className: "low" };
  }

  function getChecklistState(permit) {
    const checklist = permit && permit.safetyChecklist && Array.isArray(permit.safetyChecklist.answers)
      ? permit.safetyChecklist.answers
      : [];

    const hasNo = checklist.some(function (item) {
      return String(item.answer || "").toLowerCase() === "no";
    });

    const hasMissingRequired = checklist.some(function (item) {
      return item.required && !item.answer;
    });

    return hasNo || hasMissingRequired ? "attention" : "ready";
  }

  function getWorkerName(permit) {
    return permit && permit.basicInfo && permit.basicInfo.workerName
      ? permit.basicInfo.workerName
      : "Omar Worker";
  }

  function getStartLabel(basic) {
    if (!basic || !basic.startDate) {
      return {
        category: "later",
        order: 9,
        label: "Scheduled",
        time: basic && basic.startTime ? basic.startTime : "—"
      };
    }

    const start = new Date(basic.startDate + "T" + (basic.startTime || "00:00"));
    const now = new Date();
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const difference = Math.round((startDay - today) / 86400000);

    if (difference === 0) {
      return { category: "today", order: 1, label: "Today", time: basic.startTime || "—" };
    }

    if (difference === 1) {
      return { category: "tomorrow", order: 2, label: "Tomorrow", time: basic.startTime || "—" };
    }

    return { category: "later", order: 3, label: basic.startDate, time: basic.startTime || "—" };
  }

  function readSubmittedPermits() {
    // Shared repository owns storage compatibility and deduplication.
    return window.SafePermitData.readPermits();
  }

  function addPermitRow(permit, submittedOrder) {
    if (!permit || !permit.id || permit.status !== "Pending Safety Review") return;

    if (tableBody.querySelector('tr[data-dynamic="true"][data-id="' + CSS.escape(String(permit.id)) + '"]')) return;
    const staticRow = Array.from(tableBody.querySelectorAll('tr:not([data-dynamic="true"])')).find(row => row.dataset.id === String(permit.id));
    if (staticRow && !staticRow.hidden) return;

    const basic = permit.basicInfo || {};
    const risk = highestResidual(permit);
    const checklist = getChecklistState(permit);
    const start = getStartLabel(basic);
    const type = getPermitType(basic.permitType);
    const site = getSite(basic.site);
    const area = titleCase(basic.area) || "Area";
    const worker = getWorkerName(permit);

    const row = document.createElement("tr");
    row.dataset.id = permit.id;
    row.dataset.worker = worker;
    row.dataset.location = site + " " + area;
    row.dataset.risk = risk.className;
    row.dataset.checklist = checklist;
    row.dataset.start = start.category;
    row.dataset.startorder = String(start.order);
    row.dataset.submitted = String(submittedOrder);
    row.dataset.dynamic = "true";

    row.innerHTML =
      '<td><div class="safety-queue-permit">' +
        '<strong>' + escapeHTML(permit.id) + '</strong>' +
        '<span>' + escapeHTML(type) + '</span>' +
      '</div></td>' +
      '<td>' + escapeHTML(worker) + '</td>' +
      '<td><div class="safety-queue-location">' +
        '<strong>' + escapeHTML(site) + '</strong>' +
        '<span>' + escapeHTML(area) + '</span>' +
      '</div></td>' +
      '<td><div class="safety-queue-risk-wrap">' +
        '<span class="safety-risk safety-risk--' + risk.className + '">' + escapeHTML(risk.label) + '</span>' +
        '<small>' + risk.score + ' residual score</small>' +
      '</div></td>' +
      '<td><span class="safety-checklist safety-checklist--' + checklist + '">' +
        (checklist === "ready" ? "Ready" : "Needs Attention") +
      '</span></td>' +
      '<td><span class="safety-status">Pending Safety Review</span></td>' +
      '<td><div class="safety-queue-date">' +
        '<strong>' + escapeHTML(start.label) + '</strong>' +
        '<span>' + escapeHTML(start.time) + '</span>' +
      '</div></td>' +
      '<td><a class="safety-review-button" href="../review-permit/?id=' + encodeURIComponent(permit.id) + '" data-review-link>Review</a></td>';

    tableBody.prepend(row);
  }

  function injectSubmittedPermits(permits) {

    permits.slice().reverse().forEach(function (permit, index) {
      addPermitRow(permit, 1000 + index);
    });
  }

  function getRows() {
    return Array.from(tableBody.querySelectorAll("tr")).filter(row => !row.hidden);
  }

  function searchableText(row) {
    return (
      row.dataset.id + " " +
      row.dataset.worker + " " +
      row.dataset.location + " " +
      row.textContent
    ).toLowerCase();
  }

  function sortRows(list) {
    const mode = sortFilter.value;

    return list.sort(function (a, b) {
      if (mode === "priority") {
        const riskDifference = riskOrder[b.dataset.risk] - riskOrder[a.dataset.risk];
        if (riskDifference !== 0) return riskDifference;
        return Number(a.dataset.startorder) - Number(b.dataset.startorder);
      }

      if (mode === "newest") return Number(b.dataset.submitted) - Number(a.dataset.submitted);
      if (mode === "start") return Number(a.dataset.startorder) - Number(b.dataset.startorder);
      if (mode === "id") return a.dataset.id.localeCompare(b.dataset.id);
      return 0;
    });
  }

  function findStoredPermit(id) {
    const permits = readSubmittedPermits();
    return permits.find(function (permit) { return permit && permit.id === id; }) || null;
  }

  function storeSelectedPermit(row) {
    const id = row.dataset.id;
    const permit = findStoredPermit(id);

    localStorage.setItem(
      "safePermitSafetySelectedPermit",
      JSON.stringify(
        permit || {
          id: id,
          source: "demo",
          status: "Pending Safety Review"
        }
      )
    );
  }

  function bindReviewLinks() {
    document.querySelectorAll("[data-review-link]").forEach(function (link) {
      link.onclick = function () {
        const row = link.closest("tr");
        if (row) storeSelectedPermit(row);
      };
    });
  }

  function buildMobileCards(list) {
    mobileList.innerHTML = "";

    list.forEach(function (row) {
      const cells = row.querySelectorAll("td");
      const id = row.dataset.id;
      const permitType = cells[0].querySelector("span").textContent;
      const worker = cells[1].textContent.trim();
      const site = cells[2].querySelector("strong").textContent;
      const area = cells[2].querySelector("span").textContent;
      const riskLabel = cells[3].querySelector(".safety-risk").textContent.trim();
      const checklistLabel = cells[4].textContent.trim();
      const startLabel = cells[6].querySelector("strong").textContent;
      const startTime = cells[6].querySelector("span").textContent;

      const card = document.createElement("article");
      card.className = "safety-queue-mobile-card";

      card.innerHTML =
        '<div class="safety-queue-mobile-card__top">' +
          '<div>' +
            '<strong>' + escapeHTML(id) + '</strong>' +
            '<p>' + escapeHTML(permitType) + ' · ' + escapeHTML(worker) + '</p>' +
          '</div>' +
          '<span class="safety-risk safety-risk--' + row.dataset.risk + '">' + escapeHTML(riskLabel) + '</span>' +
        '</div>' +
        '<div class="safety-queue-mobile-card__details">' +
          '<span>Location: ' + escapeHTML(site) + ' · ' + escapeHTML(area) + '</span>' +
          '<span>Starts: ' + escapeHTML(startLabel) + ' · ' + escapeHTML(startTime) + '</span>' +
        '</div>' +
        '<div class="safety-queue-mobile-card__badges">' +
          '<span class="safety-checklist safety-checklist--' + row.dataset.checklist + '">' + escapeHTML(checklistLabel) + '</span>' +
          '<span class="safety-status">Pending Safety Review</span>' +
        '</div>' +
        '<div class="safety-queue-mobile-card__bottom">' +
          '<span>Safety decision required</span>' +
          '<a class="safety-review-button" href="../review-permit/?id=' + encodeURIComponent(id) + '">Review Permit</a>' +
        '</div>';

      card.querySelector(".safety-review-button").addEventListener("click", function () {
        storeSelectedPermit(row);
      });

      mobileList.appendChild(card);
    });
  }

  function updateSummary() {
    const rows = getRows();
    const priority = rows.filter(function (row) {
      return row.dataset.risk === "critical" || row.dataset.risk === "high";
    }).length;
    const attention = rows.filter(function (row) { return row.dataset.checklist === "attention"; }).length;
    const soon = rows.filter(function (row) {
      return row.dataset.start === "today" || row.dataset.start === "tomorrow";
    }).length;

    summaryWaiting.textContent = rows.length;
    summaryPriority.textContent = priority;
    summaryChecklist.textContent = attention;
    summarySoon.textContent = soon;
    queueBadge.textContent = rows.length;
  }

  function applyFilters() {
    const rows = getRows();
    const term = search.value.trim().toLowerCase();
    const risk = riskFilter.value;
    const checklist = checklistFilter.value;

    const filtered = rows.filter(function (row) {
      const matchesSearch = term === "" || searchableText(row).includes(term);
      const matchesRisk = risk === "all" || row.dataset.risk === risk;
      const matchesChecklist = checklist === "all" || row.dataset.checklist === checklist;
      return matchesSearch && matchesRisk && matchesChecklist;
    });

    const sorted = sortRows(filtered.slice());

    rows.forEach(function (row) { row.classList.add("is-hidden"); });
    sorted.forEach(function (row) {
      row.classList.remove("is-hidden");
      tableBody.appendChild(row);
    });

    buildMobileCards(sorted);
    emptyState.hidden = sorted.length !== 0;
    visibleCount.textContent = sorted.length === 1 ? "1 permit shown" : sorted.length + " permits shown";
  }

  search.addEventListener("input", applyFilters);
  riskFilter.addEventListener("change", applyFilters);
  checklistFilter.addEventListener("change", applyFilters);
  sortFilter.addEventListener("change", applyFilters);

  const queueState = window.SafePermitAsyncView.create(tableBody.closest("table") || tableBody);
  async function loadQueue() {
    queueState.set("loading", "Loading safety permits…");
    try {
      const permits = await window.SafePermitData.repository.listForReview("safety");
      tableBody.querySelectorAll('tr[data-dynamic="true"]').forEach(row => row.remove());
      // Static demo rows are not authoritative once a saved permit with that ID exists.
      const known = await window.SafePermitData.repository.listKnownPermits();
      const authoritative = new Map(known.map(item => [String(item.id), item]));
      tableBody.querySelectorAll('tr:not([data-dynamic="true"])').forEach(row => {
        const saved = authoritative.get(String(row.dataset.id));
        if (saved) row.hidden = saved.status !== "Pending Safety Review";
      });
      injectSubmittedPermits(permits);
      updateSummary();
      bindReviewLinks();
      applyFilters();
      queueState.set("ready");
    } catch (error) {
      console.error("Safety queue:", error);
      queueState.set("error", "Unable to refresh permits. Check storage and reload this page.");
      updateSummary();
      applyFilters();
    }
  }
  window.addEventListener("safepermit:permits-updated", loadQueue);
  loadQueue();
})();
