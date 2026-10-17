(function () {
  function escapeHTML(value) {return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  const sidebar = document.getElementById("adminSidebar");
  const overlay = document.getElementById("adminOverlay");
  const sidebarOpen = document.getElementById("sidebarOpen");
  const sidebarClose = document.getElementById("sidebarClose");

  const search = document.getElementById("permitSearch");
  const riskFilter = document.getElementById("riskFilter");
  const siteFilter = document.getElementById("siteFilter");
  const startFilter = document.getElementById("startFilter");
  const sortFilter = document.getElementById("sortFilter");

  const tableBody = document.getElementById("pendingTableBody");
  const mobileList = document.getElementById("pendingMobileList");
  const emptyState = document.getElementById("pendingEmpty");
  const visibleCount = document.getElementById("pendingVisibleCount");

  const summaryWaiting = document.getElementById("summaryWaiting");
  const summaryPriority = document.getElementById("summaryPriority");
  const summarySoon = document.getElementById("summarySoon");
  const summaryOldest = document.getElementById("summaryOldest");
  const pendingBadge = document.getElementById("pendingBadge");

  const riskOrder = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
  };

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

  if (sidebarOpen) {
    sidebarOpen.addEventListener("click", openSidebar);
  }

  if (sidebarClose) {
    sidebarClose.addEventListener("click", closeSidebar);
  }

  if (overlay) {
    overlay.addEventListener("click", closeSidebar);
  }

  window.addEventListener("resize", function () {
    if (window.innerWidth > 820) {
      closeSidebar();
    }
  });

  function titleCase(value) {
    return String(value || "")
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, function (letter) {
        return letter.toUpperCase();
      });
  }

  function getPermitType(value) {
    return permitTypeLabels[value] || titleCase(value) || "Permit";
  }

  function getSite(value) {
    return siteLabels[value] || titleCase(value) || "Site";
  }

  function getRisk(score) {
    const value = Number(score) || 0;

    if (value >= 17) {
      return { label: "Critical", className: "critical", score: value };
    }

    if (value >= 10) {
      return { label: "High", className: "high", score: value };
    }

    if (value >= 5) {
      return { label: "Medium", className: "medium", score: value };
    }

    return { label: "Low", className: "low", score: value };
  }

  function getHighestResidualRisk(permit) {
    const hazards = Array.isArray(permit?.riskAssessment?.hazards)
      ? permit.riskAssessment.hazards : [];
    const valid = hazards.map(h => Number(h.residualScore))
      .filter(score => Number.isFinite(score) && score > 0);
    // Missing assessment is not equivalent to low risk.
    if (!valid.length) return {label:"Not Assessed",className:"unknown",score:null};
    return getRisk(Math.max(...valid));
  }

  function getKnownPermits() {
    // Shared repository owns storage compatibility and deduplication.
    return window.SafePermitData.readKnownPermits();
  }

  // Display only the decisions present in the same permit record used by final review.
  function trailMarkup(permit) {
    const verify = window.SafePermitData?.hasApprovalEvidence;
    const supervisor = !!(verify && verify(permit,'supervisor'));
    const safety = !!(verify && verify(permit,'safety'));
    return '<span class="admin-trail-step' + (supervisor ? ' is-complete' : '') + '">Supervisor ' + (supervisor ? '✓' : '— Not documented') + '</span>' +
      '<span class="admin-trail-step' + (safety ? ' is-complete' : '') + '">Safety ' + (safety ? '✓' : '— Not documented') + '</span>';
  }

  function getStartInfo(basic) {
    if (!basic || !basic.startDate) {
      return {
        category: "later",
        order: 9,
        label: "Scheduled",
        time: basic && basic.startTime ? basic.startTime : "—"
      };
    }

    const now = new Date();
    const start = new Date(
      basic.startDate + "T" + (basic.startTime || "00:00")
    );

    if (Number.isNaN(start.getTime())) {
      return {
        category: "later",
        order: 9,
        label: basic.startDate,
        time: basic.startTime || "—"
      };
    }

    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const startDay = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate()
    );

    const difference = Math.round(
      (startDay - today) / 86400000
    );

    if (difference === 0) {
      return {
        category: "today",
        order: 1,
        label: "Today",
        time: basic.startTime || "—"
      };
    }

    if (difference === 1) {
      return {
        category: "tomorrow",
        order: 2,
        label: "Tomorrow",
        time: basic.startTime || "—"
      };
    }

    return {
      category: "later",
      order: 3,
      label: new Date(basic.startDate + "T00:00:00")
        .toLocaleDateString("en-US", {
          month: "short",
          day: "numeric"
        }),
      time: basic.startTime || "—"
    };
  }

  function getWaitingMinutes(permit) {
    const source =
      permit.safetyDecision &&
      permit.safetyDecision.reviewedAt
        ? permit.safetyDecision.reviewedAt
        : permit.submittedAt;

    if (!source) {
      return 0;
    }

    const then = new Date(source).getTime();
    const now = Date.now();

    if (Number.isNaN(then)) {
      return 0;
    }

    return Math.max(0, Math.floor((now - then) / 60000));
  }

  function formatWaiting(minutes) {
    if (minutes < 60) {
      return minutes + "m";
    }

    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;

    return hours + "h" + (remaining ? " " + remaining + "m" : "");
  }

  function buildDynamicRow(permit) {
    if (
      !permit ||
      permit.status !== "Pending Admin Approval" ||
      !permit.id
    ) {
      return null;
    }

    if (Array.from(tableBody.querySelectorAll('tr[data-dynamic="true"]'))
        .some(row=>row.dataset.id===String(permit.id))) {
      return null;
    }

    const basic = permit.basicInfo || {};
    const risk = getHighestResidualRisk(permit);
    const start = getStartInfo(basic);
    const waitingMinutes = getWaitingMinutes(permit);

    const worker = basic.workerName || "Omar Worker";
    const site = getSite(basic.site);
    const siteKey = basic.site || "other";
    const area = titleCase(basic.area) || "Area";
    const permitType = getPermitType(basic.permitType);

    const row = document.createElement("tr");

    row.dataset.id = permit.id;
    row.dataset.worker = worker;
    row.dataset.site = siteKey;
    row.dataset.location = site + " " + area;
    row.dataset.risk = risk.className;
    row.dataset.start = start.category;
    row.dataset.startorder = String(start.order);
    row.dataset.waitminutes = String(waitingMinutes);
    row.dataset.dynamic = "true";

    row.innerHTML =
      '<td><div class="admin-pending-permit">' +
        '<strong>' + escapeHTML(permit.id) + '</strong>' +
        '<span>' + escapeHTML(permitType) + '</span>' +
      '</div></td>' +
      '<td>' + escapeHTML(worker) + '</td>' +
      '<td><div class="admin-pending-location">' +
        '<strong>' + escapeHTML(site) + '</strong>' +
        '<span>' + escapeHTML(area) + '</span>' +
      '</div></td>' +
      '<td><div class="admin-pending-risk-wrap">' +
        '<span class="admin-risk admin-risk--' + risk.className + '">' +
          risk.label +
        '</span>' +
        '<small>' + (risk.score == null ? 'Assessment required' : risk.score + ' residual score') + '</small>' +
      '</div></td>' +
      '<td><div class="admin-approval-trail">' +
        trailMarkup(permit) +
      '</div></td>' +
      '<td><div class="admin-pending-date">' +
        '<strong>' + escapeHTML(start.label) + '</strong>' +
        '<span>' + escapeHTML(start.time) + '</span>' +
      '</div></td>' +
      '<td><div class="admin-pending-wait">' +
        '<strong>' + formatWaiting(waitingMinutes) + '</strong>' +
        '<span>Waiting</span>' +
      '</div></td>' +
      '<td><a class="admin-review-button" href="../review-permit/?id=' +
        encodeURIComponent(permit.id) +
      '" data-review-link>Review</a></td>';

    return row;
  }

  function injectStoredPermits() {
    const known = getKnownPermits();
    const authoritative = new Map(known.map(permit => [String(permit.id), permit]));
    tableBody.querySelectorAll('tr:not([data-dynamic="true"])').forEach(function (row) {
      if (authoritative.has(String(row.dataset.id))) row.hidden = true;
    });
    tableBody.querySelectorAll('tr[data-dynamic="true"]').forEach(row => row.remove());
    known.forEach(function (permit) {
      const row = buildDynamicRow(permit);
      if (row) tableBody.prepend(row);
    });
    tableBody.querySelectorAll('tr:not([data-dynamic="true"])').forEach(function(row) {
      const permit = authoritative.get(String(row.dataset.id));
      const trail = row.querySelector('.admin-approval-trail');
      if (trail) trail.innerHTML = trailMarkup(permit);
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

  function sortRows(rows) {
    const mode = sortFilter.value;

    return rows.sort(function (a, b) {
      if (mode === "priority") {
        const riskDifference =
          riskOrder[b.dataset.risk] -
          riskOrder[a.dataset.risk];

        if (riskDifference !== 0) {
          return riskDifference;
        }

        return (
          Number(b.dataset.waitminutes) -
          Number(a.dataset.waitminutes)
        );
      }

      if (mode === "waiting") {
        return (
          Number(b.dataset.waitminutes) -
          Number(a.dataset.waitminutes)
        );
      }

      if (mode === "start") {
        return (
          Number(a.dataset.startorder) -
          Number(b.dataset.startorder)
        );
      }

      if (mode === "id") {
        return a.dataset.id.localeCompare(b.dataset.id);
      }

      return 0;
    });
  }

  function storeSelectedPermit(row) {
    const id = row.dataset.id;

    const permit = getKnownPermits().find(function (item) {
      return item.id === id;
    });

    if (permit) {
      localStorage.setItem(
        "safePermitAdminSelectedPermit",
        JSON.stringify(permit)
      );
      return;
    }

    localStorage.setItem(
      "safePermitAdminSelectedPermit",
      JSON.stringify({
        id: id,
        source: "admin-pending-permits",
        status: "Pending Admin Approval"
      })
    );
  }

  function bindReviewLinks() {
    document.querySelectorAll("[data-review-link]").forEach(
      function (link) {
        link.onclick = function () {
          const row = link.closest("tr");

          if (row) {
            storeSelectedPermit(row);
          }
        };
      }
    );
  }

  function buildMobileCards(rows) {
    mobileList.innerHTML = "";

    rows.forEach(function (row) {
      const cells = row.querySelectorAll("td");

      const permitType =
        cells[0].querySelector("span").textContent;

      const location =
        cells[2].querySelector("strong").textContent +
        " · " +
        cells[2].querySelector("span").textContent;

      const riskLabel =
        cells[3].querySelector(".admin-risk").textContent.trim();

      const startLabel =
        cells[5].querySelector("strong").textContent;

      const startTime =
        cells[5].querySelector("span").textContent;

      const waiting =
        cells[6].querySelector("strong").textContent;

      const card = document.createElement("article");
      card.className = "admin-pending-mobile-card";

      card.innerHTML =
        '<div class="admin-pending-mobile-card__top">' +
          '<div>' +
            '<strong>' + escapeHTML(row.dataset.id) + '</strong>' +
            '<p>' + escapeHTML(permitType) + ' · ' + escapeHTML(row.dataset.worker) + '</p>' +
          '</div>' +
          '<span class="admin-risk admin-risk--' + escapeHTML(row.dataset.risk) + '">' +
            riskLabel +
          '</span>' +
        '</div>' +
        '<div class="admin-pending-mobile-card__details">' +
          '<span>Location: ' + escapeHTML(location) + '</span>' +
          '<span>Starts: ' + escapeHTML(startLabel) + ' · ' + escapeHTML(startTime) + '</span>' +
          '<span>Waiting: ' + escapeHTML(waiting) + '</span>' +
        '</div>' +
        '<div class="admin-pending-mobile-card__trail">' +
          cells[4].querySelector('.admin-approval-trail').innerHTML +
        '</div>' +
        '<div class="admin-pending-mobile-card__bottom">' +
          '<span>Final approval required</span>' +
          '<a class="admin-review-button" href="../review-permit/?id=' +
            encodeURIComponent(row.dataset.id) +
          '">Review Permit</a>' +
        '</div>';

      card
        .querySelector(".admin-review-button")
        .addEventListener("click", function () {
          storeSelectedPermit(row);
        });

      mobileList.appendChild(card);
    });
  }

  function updateSummary() {
    const rows = getRows();

    const priority = rows.filter(function (row) {
      return (
        row.dataset.risk === "high" ||
        row.dataset.risk === "critical"
      );
    }).length;

    const soon = rows.filter(function (row) {
      return (
        row.dataset.start === "today" ||
        row.dataset.start === "tomorrow"
      );
    }).length;

    const oldest = rows.reduce(function (max, row) {
      return Math.max(
        max,
        Number(row.dataset.waitminutes) || 0
      );
    }, 0);

    summaryWaiting.textContent = rows.length;
    summaryPriority.textContent = priority;
    summarySoon.textContent = soon;
    summaryOldest.textContent = formatWaiting(oldest);
    pendingBadge.textContent = rows.length;
  }

  function applyFilters() {
    const rows = getRows();

    const term = search.value.trim().toLowerCase();
    const risk = riskFilter.value;
    const site = siteFilter.value;
    const start = startFilter.value;

    const filtered = rows.filter(function (row) {
      const matchesSearch =
        term === "" ||
        searchableText(row).includes(term);

      const matchesRisk =
        risk === "all" ||
        row.dataset.risk === risk;

      const matchesSite =
        site === "all" ||
        row.dataset.site === site;

      const matchesStart =
        start === "all" ||
        row.dataset.start === start;

      return (
        matchesSearch &&
        matchesRisk &&
        matchesSite &&
        matchesStart
      );
    });

    const sorted = sortRows(filtered.slice());

    rows.forEach(function (row) {
      row.classList.add("is-hidden");
    });

    sorted.forEach(function (row) {
      row.classList.remove("is-hidden");
      tableBody.appendChild(row);
    });

    buildMobileCards(sorted);

    emptyState.hidden = sorted.length !== 0;

    visibleCount.textContent =
      sorted.length === 1
        ? "1 permit shown"
        : sorted.length + " permits shown";
  }

  search.addEventListener("input", applyFilters);
  riskFilter.addEventListener("change", applyFilters);
  siteFilter.addEventListener("change", applyFilters);
  startFilter.addEventListener("change", applyFilters);
  sortFilter.addEventListener("change", applyFilters);

  function refreshList(){
    tableBody.dataset.listState="loading";
    try {injectStoredPermits();updateSummary();bindReviewLinks();applyFilters();tableBody.dataset.listState="ready";}
    catch(_){tableBody.dataset.listState="error";}
  }
  refreshList();
  window.addEventListener("safepermit:permits-updated",refreshList);
  window.addEventListener("storage",refreshList);
})();
