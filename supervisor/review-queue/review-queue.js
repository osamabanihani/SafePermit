(function () {
  const sidebar = document.getElementById("supervisorSidebar");
  const overlay = document.getElementById("supervisorOverlay");
  const sidebarOpen = document.getElementById("sidebarOpen");
  const sidebarClose = document.getElementById("sidebarClose");

  const search = document.getElementById("queueSearch");
  const riskFilter = document.getElementById("riskFilter");
  const startFilter = document.getElementById("startFilter");
  const sortFilter = document.getElementById("sortFilter");

  const tableBody = document.getElementById("queueTableBody");
  const mobileList = document.getElementById("queueMobileList");
  const emptyState = document.getElementById("queueEmpty");
  const visibleCount = document.getElementById("queueVisibleCount");
  const queueBadge = document.getElementById("queueBadge");
  const summaryWaiting = document.getElementById("summaryWaiting");
  const summaryPriority = document.getElementById("summaryPriority");

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

  const riskOrder = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
  };

  function escapeHTML(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function titleCase(value) {
    if (!value) return "—";
    return String(value)
      .replaceAll("-", " ")
      .replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
  }

  function getHighestResidual(riskAssessment) {
    if (!riskAssessment || !Array.isArray(riskAssessment.hazards)) return 0;
    return riskAssessment.hazards.reduce(function (max, hazard) {
      return Math.max(max, Number(hazard.residualScore) || 0);
    }, 0);
  }

  function riskFromScore(score) {
    if (score >= 17) return "critical";
    if (score >= 10) return "high";
    if (score >= 5) return "medium";
    return "low";
  }

  function riskLabel(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function formatStart(basic) {
    if (!basic || !basic.startDate) return { day: "Scheduled", time: basic && basic.startTime ? basic.startTime : "—", category: "later" };

    const start = new Date(basic.startDate + "T" + (basic.startTime || "00:00"));
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());

    let day = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    let category = "later";

    if (startDay.getTime() === today.getTime()) {
      day = "Today";
      category = "today";
    } else if (startDay.getTime() === tomorrow.getTime()) {
      day = "Tomorrow";
      category = "tomorrow";
    }

    return { day: day, time: basic.startTime || "—", category: category };
  }

  function injectSubmittedPermits(permits) {
    const existingIds = new Set(
      Array.from(tableBody.querySelectorAll("tr[data-id]")).map(function (row) { return row.dataset.id; })
    );

    permits
      .filter(function (permit) {
        const supervisor = permit && permit.basicInfo ? permit.basicInfo.supervisor : "";
        return permit && permit.id && permit.status === "Pending Supervisor Review" &&
          (!supervisor || supervisor === "sup-001" || supervisor === "Ahmad Khalil");
      })
      .forEach(function (permit, index) {
        if (existingIds.has(permit.id)) return;

        const basic = permit.basicInfo || {};
        const score = getHighestResidual(permit.riskAssessment);
        const risk = riskFromScore(score);
        const start = formatStart(basic);
        const type = permitTypeLabels[basic.permitType] || titleCase(basic.permitType) || "Permit";
        const site = siteLabels[basic.site] || titleCase(basic.site);
        const area = titleCase(basic.area);
        const submitted = permit.submittedAt ? new Date(permit.submittedAt) : new Date();
        const waitMinutes = Math.max(0, Math.round((Date.now() - submitted.getTime()) / 60000));

        const row = document.createElement("tr");
        row.dataset.id = permit.id;
        row.dataset.worker = "Omar Worker";
        row.dataset.location = site + " " + area;
        row.dataset.risk = risk;
        row.dataset.start = start.category;
        row.dataset.wait = String(waitMinutes);
        row.dataset.submitted = String(100 + index);
        row.dataset.startorder = String(index);
        row.dataset.dynamic = "true";

        row.innerHTML =
          '<td><div class="queue-permit"><strong>' + escapeHTML(permit.id) + '</strong><span>' + escapeHTML(type) + '</span></div></td>' +
          '<td>Omar Worker</td>' +
          '<td><div class="queue-location"><strong>' + escapeHTML(site) + '</strong><span>' + escapeHTML(area) + '</span></div></td>' +
          '<td><span class="queue-risk queue-risk--' + risk + '">' + riskLabel(risk) + '</span></td>' +
          '<td><div class="queue-date"><strong>' + escapeHTML(start.day) + '</strong><span>' + escapeHTML(start.time) + '</span></div></td>' +
          '<td><span class="queue-wait">' + waitMinutes + 'm</span></td>' +
          '<td><a class="queue-review-button" href="../review-permit/?id=' + encodeURIComponent(permit.id) + '">Review</a></td>';

        tableBody.prepend(row);
        existingIds.add(permit.id);
      });
  }

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

  function getRows() {
    return Array.from(tableBody.querySelectorAll("tr"));
  }

  function getSearchText(row) {
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
        return Number(b.dataset.wait) - Number(a.dataset.wait);
      }
      if (mode === "oldest") return Number(b.dataset.wait) - Number(a.dataset.wait);
      if (mode === "newest") return Number(b.dataset.submitted) - Number(a.dataset.submitted);
      if (mode === "start") return Number(a.dataset.startorder) - Number(b.dataset.startorder);
      return 0;
    });
  }

  function buildMobileCards(visibleRows) {
    mobileList.innerHTML = "";

    visibleRows.forEach(function (row) {
      const cells = row.querySelectorAll("td");
      const permitId = row.dataset.id;
      const permitType = cells[0].querySelector("span").textContent;
      const worker = cells[1].textContent.trim();
      const locationStrong = cells[2].querySelector("strong").textContent;
      const locationSpan = cells[2].querySelector("span").textContent;
      const riskText = cells[3].textContent.trim();
      const startStrong = cells[4].querySelector("strong").textContent;
      const startSpan = cells[4].querySelector("span").textContent;
      const waitText = cells[5].textContent.trim();
      const riskClass = "queue-risk--" + row.dataset.risk;

      const card = document.createElement("article");
      card.className = "queue-mobile-card";
      card.innerHTML =
        '<div class="queue-mobile-card__top"><div><strong>' + escapeHTML(permitId) + '</strong><p>' + escapeHTML(permitType) + ' · ' + escapeHTML(worker) + '</p></div>' +
        '<span class="queue-risk ' + riskClass + '">' + escapeHTML(riskText) + '</span></div>' +
        '<div class="queue-mobile-card__details"><span>Location: ' + escapeHTML(locationStrong) + ' · ' + escapeHTML(locationSpan) + '</span><span>Starts: ' + escapeHTML(startStrong) + ' · ' + escapeHTML(startSpan) + '</span></div>' +
        '<div class="queue-mobile-card__bottom"><span class="queue-wait">Waiting ' + escapeHTML(waitText) + '</span>' +
        '<a class="queue-review-button" href="../review-permit/?id=' + encodeURIComponent(permitId) + '">Review</a></div>';
      mobileList.appendChild(card);
    });
  }

  function updateSummary() {
    const rows = getRows();
    if (summaryWaiting) summaryWaiting.textContent = rows.length;
    if (summaryPriority) {
      summaryPriority.textContent = rows.filter(function (row) {
        return row.dataset.risk === "high" || row.dataset.risk === "critical";
      }).length;
    }
    if (queueBadge) queueBadge.textContent = rows.length;
  }

  function applyQueue() {
    const term = search.value.trim().toLowerCase();
    const risk = riskFilter.value;
    const start = startFilter.value;
    const rows = getRows();

    const filtered = rows.filter(function (row) {
      return (term === "" || getSearchText(row).includes(term)) &&
        (risk === "all" || row.dataset.risk === risk) &&
        (start === "all" || row.dataset.start === start);
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

  search.addEventListener("input", applyQueue);
  riskFilter.addEventListener("change", applyQueue);
  startFilter.addEventListener("change", applyQueue);
  sortFilter.addEventListener("change", applyQueue);

  const queueState = window.SafePermitAsyncView.create(tableBody.closest("table") || tableBody);
  async function loadQueue() {
    queueState.set("loading", "Loading supervisor permits…");
    try {
      const permits = await window.SafePermitData.repository.listForReview("supervisor");
      tableBody.querySelectorAll('tr[data-dynamic="true"]').forEach(row => row.remove());
      injectSubmittedPermits(permits);
      updateSummary();
      applyQueue();
      queueState.set("ready");
    } catch (error) {
      console.error("Supervisor queue:", error);
      queueState.set("error", "Unable to refresh permits. Check storage and reload this page.");
      updateSummary();
      applyQueue();
    }
  }
  window.addEventListener("safepermit:permits-updated", loadQueue);
  loadQueue();
})();
