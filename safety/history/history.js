(function () {
  const sidebar = document.getElementById("safetySidebar");
  const overlay = document.getElementById("safetyOverlay");
  const sidebarOpen = document.getElementById("sidebarOpen");
  const sidebarClose = document.getElementById("sidebarClose");

  const search = document.getElementById("historySearch");
  const decisionFilter = document.getElementById("decisionFilter");
  const riskFilter = document.getElementById("riskFilter");
  const sortFilter = document.getElementById("sortFilter");

  const tableBody = document.getElementById("historyTableBody");
  const mobileList = document.getElementById("historyMobileList");
  const emptyState = document.getElementById("historyEmpty");
  const visibleCount = document.getElementById("historyVisibleCount");

  const totalReviews = document.getElementById("totalReviews");
  const approvedCount = document.getElementById("approvedCount");
  const returnedCount = document.getElementById("returnedCount");
  const rejectedCount = document.getElementById("rejectedCount");

  const modal = document.getElementById("reviewModal");
  const modalTitle = document.getElementById("reviewModalTitle");
  const modalWorker = document.getElementById("modalWorker");
  const modalRisk = document.getElementById("modalRisk");
  const modalDecision = document.getElementById("modalDecision");
  const modalStatus = document.getElementById("modalStatus");
  const modalDate = document.getElementById("modalDate");
  const modalComment = document.getElementById("modalComment");

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

  function escapeHTML(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function decisionLabel(value) {
    if (value === "approve") {
      return "Approved";
    }

    if (value === "return") {
      return "Returned";
    }

    return "Rejected";
  }

  function decisionClass(value) {
    return "safety-decision--" + escapeHTML(value);
  }

  function riskClass(value) {
    return "safety-risk--" + escapeHTML(value);
  }

  function statusClass(value) {
    if (value === "Returned for Correction") {
      return "safety-status safety-status--warning";
    }

    if (value === "Rejected") {
      return "safety-status safety-status--danger";
    }

    return "safety-status";
  }

  function formatDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return {
        date: value || "—",
        time: ""
      };
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

  function getRiskFromPermit(permit) {
    const hazards =
      permit &&
      permit.riskAssessment &&
      Array.isArray(permit.riskAssessment.hazards)
        ? permit.riskAssessment.hazards
        : [];

    const highest = hazards.reduce(function (max, hazard) {
      return Math.max(
        max,
        Number(hazard.residualScore) || 0
      );
    }, 0);

    if (highest >= 17) {
      return "critical";
    }

    if (highest >= 10) {
      return "high";
    }

    if (highest >= 5) {
      return "medium";
    }

    return "low";
  }

  function getSubmittedPermit(id) {
    try {
      const permits = JSON.parse(
        localStorage.getItem("safePermitSubmittedPermits") || "[]"
      );

      if (Array.isArray(permits)) {
        const found = permits.find(function (permit) {
          return permit && permit.id === id;
        });

        if (found) {
          return found;
        }
      }
    } catch (error) {
    }

    try {
      const latest = JSON.parse(
        localStorage.getItem("safePermitSubmittedPermit") || "null"
      );

      if (latest && latest.id === id) {
        return latest;
      }
    } catch (error) {
    }

    return null;
  }

  function getPermitType(permit) {
    const value =
      permit &&
      permit.basicInfo
        ? permit.basicInfo.permitType
        : "";

    return permitTypeLabels[value] || titleCase(value) || "Permit Review";
  }

  function getWorker(permit) {
    if (
      permit &&
      permit.basicInfo &&
      permit.basicInfo.workerName
    ) {
      return permit.basicInfo.workerName;
    }

    return "Omar Worker";
  }

  function addStoredHistoryRecords() {
    const stored = localStorage.getItem("safePermitSafetyDecisionHistory");

    if (!stored) {
      return;
    }

    let history = [];

    try {
      const parsed = JSON.parse(stored);

      if (Array.isArray(parsed)) {
        history = parsed;
      }
    } catch (error) {
      return;
    }

    history.slice().reverse().forEach(function (record) {
      if (!record || !record.permitId || !record.decision) {
        return;
      }

      const exists = Array.from(
        tableBody.querySelectorAll("tr")
      ).some(function (row) {
        return (
          row.dataset.id === record.permitId &&
          row.dataset.date === record.reviewedAt
        );
      });

      if (exists) {
        return;
      }

      let worker = record.worker || "Omar Worker";
      let risk = record.residualRiskClass ||
        String(record.residualRisk || "").toLowerCase() ||
        "medium";
      let permitType = record.permitType || "Permit Review";

      const submitted = getSubmittedPermit(record.permitId);

      if (submitted) {
        if (!record.worker) worker = getWorker(submitted);
        if (!record.residualRiskClass && !record.residualRisk) {
          risk = getRiskFromPermit(submitted);
        }
        if (!record.permitType) permitType = getPermitType(submitted);
      }

      if (!["critical", "high", "medium", "low"].includes(risk)) {
        risk = "medium";
      }

      const display = formatDate(record.reviewedAt);
      const comment =
        record.comment || "No comment provided.";

      const row = document.createElement("tr");

      row.dataset.id = record.permitId;
      row.dataset.worker = worker;
      row.dataset.risk = risk;
      row.dataset.decision = record.decision;
      row.dataset.date = record.reviewedAt || "";
      row.dataset.comment = comment;
      row.dataset.newStatus = record.newStatus || "Recorded";

      row.innerHTML =
        '<td><div class="safety-history-permit">' +
          '<strong>' + escapeHTML(record.permitId) + '</strong>' +
          '<span>' + escapeHTML(permitType) + '</span>' +
        '</div></td>' +
        '<td>' + escapeHTML(worker) + '</td>' +
        '<td><span class="safety-risk ' + riskClass(risk) + '">' +
          escapeHTML(titleCase(risk)) +
        '</span></td>' +
        '<td><span class="safety-decision ' + decisionClass(record.decision) + '">' +
          escapeHTML(decisionLabel(record.decision)) +
        '</span></td>' +
        '<td><span class="' + statusClass(record.newStatus) + '">' +
          escapeHTML(record.newStatus || "Recorded") +
        '</span></td>' +
        '<td><div class="safety-history-date">' +
          '<strong>' + escapeHTML(display.date) + '</strong>' +
          '<span>' + escapeHTML(display.time) + '</span>' +
        '</div></td>' +
        '<td><p class="safety-history-comment">' +
          escapeHTML(comment) +
        '</p></td>' +
        '<td><button class="safety-view-button" type="button" data-view-review>View Review</button></td>';

      tableBody.prepend(row);
    });
  }

  function getRows() {
    return Array.from(tableBody.querySelectorAll("tr"));
  }

  function searchableText(row) {
    return (
      row.dataset.id + " " +
      row.dataset.worker + " " +
      row.dataset.comment + " " +
      row.dataset.newStatus + " " +
      row.textContent
    ).toLowerCase();
  }

  function sortRows(list) {
    const mode = sortFilter.value;

    return list.sort(function (a, b) {
      if (mode === "newest") {
        return (
          new Date(b.dataset.date).getTime() -
          new Date(a.dataset.date).getTime()
        );
      }

      if (mode === "oldest") {
        return (
          new Date(a.dataset.date).getTime() -
          new Date(b.dataset.date).getTime()
        );
      }

      if (mode === "risk") {
        return (
          riskOrder[b.dataset.risk] -
          riskOrder[a.dataset.risk]
        );
      }

      return 0;
    });
  }

  function updateSummary() {
    const rows = getRows();

    totalReviews.textContent = rows.length;

    approvedCount.textContent = rows.filter(function (row) {
      return row.dataset.decision === "approve";
    }).length;

    returnedCount.textContent = rows.filter(function (row) {
      return row.dataset.decision === "return";
    }).length;

    rejectedCount.textContent = rows.filter(function (row) {
      return row.dataset.decision === "reject";
    }).length;
  }

  function openReviewModal(row) {
    const display = formatDate(row.dataset.date);

    modalTitle.textContent = row.dataset.id;
    modalWorker.textContent = row.dataset.worker;
    modalRisk.textContent = titleCase(row.dataset.risk);
    modalDecision.textContent = decisionLabel(row.dataset.decision);
    modalStatus.textContent = row.dataset.newStatus || "Recorded";

    modalDate.textContent =
      display.date +
      (display.time ? " · " + display.time : "");

    modalComment.textContent =
      row.dataset.comment || "No comment provided.";

    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeReviewModal() {
    modal.hidden = true;
    document.body.style.overflow = "";
  }

  function bindReviewButtons() {
    document.querySelectorAll("[data-view-review]").forEach(
      function (button) {
        button.onclick = function () {
          const row = button.closest("tr");

          if (row) {
            openReviewModal(row);
          }
        };
      }
    );
  }

  document.querySelectorAll("[data-close-modal]").forEach(
    function (button) {
      button.addEventListener("click", closeReviewModal);
    }
  );

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !modal.hidden) {
      closeReviewModal();
    }
  });

  function buildMobileCards(list) {
    mobileList.innerHTML = "";

    list.forEach(function (row) {
      const permitType =
        row.querySelector(".safety-history-permit span").textContent;

      const display = formatDate(row.dataset.date);

      const card = document.createElement("article");
      card.className = "safety-history-mobile-card";

      card.innerHTML =
        '<div class="safety-history-mobile-card__top">' +
          '<div>' +
            '<strong>' + escapeHTML(row.dataset.id) + '</strong>' +
            '<p>' + escapeHTML(permitType) + ' · ' + escapeHTML(row.dataset.worker) + '</p>' +
          '</div>' +
          '<span class="safety-risk ' + riskClass(row.dataset.risk) + '">' +
            escapeHTML(titleCase(row.dataset.risk)) +
          '</span>' +
        '</div>' +
        '<div class="safety-history-mobile-card__meta">' +
          '<span class="safety-decision ' + decisionClass(row.dataset.decision) + '">' +
            escapeHTML(decisionLabel(row.dataset.decision)) +
          '</span>' +
          '<span class="' + statusClass(row.dataset.newStatus) + '">' +
            escapeHTML(row.dataset.newStatus) +
          '</span>' +
        '</div>' +
        '<p class="safety-history-mobile-card__comment">' +
          escapeHTML(row.dataset.comment) +
        '</p>' +
        '<div class="safety-history-mobile-card__bottom">' +
          '<span class="safety-history-date">' +
            '<strong>' + escapeHTML(display.date) + '</strong>' +
            '<span>' + escapeHTML(display.time) + '</span>' +
          '</span>' +
          '<button class="safety-view-button" type="button">View Review</button>' +
        '</div>';

      card
        .querySelector(".safety-view-button")
        .addEventListener("click", function () {
          openReviewModal(row);
        });

      mobileList.appendChild(card);
    });
  }

  function applyFilters() {
    const rows = getRows();

    const term = search.value.trim().toLowerCase();
    const decision = decisionFilter.value;
    const risk = riskFilter.value;

    const filtered = rows.filter(function (row) {
      const matchesSearch =
        term === "" ||
        searchableText(row).includes(term);

      const matchesDecision =
        decision === "all" ||
        row.dataset.decision === decision;

      const matchesRisk =
        risk === "all" ||
        row.dataset.risk === risk;

      return (
        matchesSearch &&
        matchesDecision &&
        matchesRisk
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
        ? "1 record shown"
        : sorted.length + " records shown";
  }

  search.addEventListener("input", applyFilters);
  decisionFilter.addEventListener("change", applyFilters);
  riskFilter.addEventListener("change", applyFilters);
  sortFilter.addEventListener("change", applyFilters);

  addStoredHistoryRecords();
  updateSummary();
  bindReviewButtons();
  applyFilters();
})();
