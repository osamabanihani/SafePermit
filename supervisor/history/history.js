(function () {
  const sidebar = document.getElementById("supervisorSidebar");
  const overlay = document.getElementById("supervisorOverlay");
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
    return "history-decision--" + escapeHTML(value);
  }

  function riskClass(value) {
    return "history-risk--" + escapeHTML(value);
  }

  function formatDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return {
        date: value,
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

  function escapeHTML(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function readStoredDecisions() {
    let decisions = [];

    try {
      decisions = JSON.parse(
        localStorage.getItem("safePermitSupervisorDecisions") || "[]"
      );

      if (!Array.isArray(decisions)) {
        decisions = [];
      }
    } catch (error) {
      decisions = [];
    }

    try {
      const latest = JSON.parse(
        localStorage.getItem("safePermitSupervisorDecision") || "null"
      );

      if (
        latest &&
        latest.permitId &&
        !decisions.some(function (item) {
          return (
            item.permitId === latest.permitId &&
            item.reviewedAt === latest.reviewedAt
          );
        })
      ) {
        decisions.unshift(latest);
      }
    } catch (error) {
    }

    return decisions;
  }

  function getSubmittedPermit(id) {
    let permits = [];

    try {
      permits = JSON.parse(
        localStorage.getItem("safePermitSubmittedPermits") || "[]"
      );

      if (!Array.isArray(permits)) {
        permits = [];
      }
    } catch (error) {
      permits = [];
    }

    let permit = permits.find(function (item) {
      return item && item.id === id;
    });

    if (permit) {
      return permit;
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

  function addStoredDecisions() {
    readStoredDecisions().forEach(function (data) {
      if (!data || !data.permitId || !data.decision) {
        return;
      }

      const existing = Array.from(
        tableBody.querySelectorAll("tr")
      ).find(function (row) {
        return (
          row.dataset.id === data.permitId &&
          row.dataset.date === data.reviewedAt
        );
      });

      if (existing) {
        return;
      }

      let worker = "Omar Worker";
      let risk = "medium";
      let permitType = "Permit Review";
      const permit = getSubmittedPermit(data.permitId);

      if (permit) {
        const basic = permit.basicInfo || {};
        worker = basic.workerName || "Omar Worker";
        permitType = basic.permitType || "Permit Review";

        if (
          permit.riskAssessment &&
          Array.isArray(permit.riskAssessment.hazards)
        ) {
          const highest = permit.riskAssessment.hazards.reduce(
            function (max, hazard) {
              return Math.max(
                max,
                Number(hazard.residualScore) || 0
              );
            },
            0
          );

          if (highest >= 17) {
            risk = "critical";
          } else if (highest >= 10) {
            risk = "high";
          } else if (highest >= 5) {
            risk = "medium";
          } else {
            risk = "low";
          }
        }
      }

      const display = formatDate(data.reviewedAt);
      const row = document.createElement("tr");

      row.dataset.id = data.permitId;
      row.dataset.worker = worker;
      row.dataset.risk = risk;
      row.dataset.decision = data.decision;
      row.dataset.date = data.reviewedAt || "";
      row.dataset.comment = data.comment || "No comment provided.";
      row.dataset.newStatus = data.newStatus || "";

      row.innerHTML =
        '<td><div class="history-permit">' +
          '<strong>' + escapeHTML(data.permitId) + '</strong>' +
          '<span>' + escapeHTML(permitType) + '</span>' +
        '</div></td>' +
        '<td>' + escapeHTML(worker) + '</td>' +
        '<td><span class="history-risk ' + riskClass(risk) + '">' +
          escapeHTML(risk.charAt(0).toUpperCase() + risk.slice(1)) +
        '</span></td>' +
        '<td><span class="history-decision ' + decisionClass(data.decision) + '">' +
          escapeHTML(decisionLabel(data.decision)) +
        '</span></td>' +
        '<td><div class="history-date">' +
          '<strong>' + escapeHTML(display.date) + '</strong>' +
          '<span>' + escapeHTML(display.time) + '</span>' +
        '</div></td>' +
        '<td><p class="history-comment">' +
          escapeHTML(data.comment || "No comment provided.") +
        '</p></td>' +
        '<td><button class="history-view-button" type="button" data-view-review>View Review</button></td>';

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

    modalRisk.textContent =
      row.dataset.risk.charAt(0).toUpperCase() +
      row.dataset.risk.slice(1);

    modalDecision.textContent =
      decisionLabel(row.dataset.decision);

    modalStatus.textContent =
      row.dataset.newStatus || "Recorded";

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
          openReviewModal(button.closest("tr"));
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
      const cells = row.querySelectorAll("td");

      const permitId = row.dataset.id;
      const permitType = cells[0].querySelector("span").textContent;
      const worker = row.dataset.worker;
      const risk = row.dataset.risk;
      const decision = row.dataset.decision;
      const display = formatDate(row.dataset.date);

      const card = document.createElement("article");
      card.className = "history-mobile-card";

      card.innerHTML =
        '<div class="history-mobile-card__top">' +
          '<div>' +
            '<strong>' + escapeHTML(permitId) + '</strong>' +
            '<p>' + escapeHTML(permitType) + ' · ' + escapeHTML(worker) + '</p>' +
          '</div>' +
          '<span class="history-risk ' + riskClass(risk) + '">' +
            escapeHTML(risk.charAt(0).toUpperCase() + risk.slice(1)) +
          '</span>' +
        '</div>' +
        '<div class="history-mobile-card__meta">' +
          '<span class="history-decision ' + decisionClass(decision) + '">' +
            escapeHTML(decisionLabel(decision)) +
          '</span>' +
        '</div>' +
        '<p class="history-mobile-card__comment">' +
          escapeHTML(row.dataset.comment || "No comment provided.") +
        '</p>' +
        '<div class="history-mobile-card__bottom">' +
          '<span class="history-date">' +
            '<strong>' + escapeHTML(display.date) + '</strong>' +
            '<span>' + escapeHTML(display.time) + '</span>' +
          '</span>' +
          '<button class="history-view-button" type="button">View Review</button>' +
        '</div>';

      card
        .querySelector(".history-view-button")
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
        term === "" || searchableText(row).includes(term);

      const matchesDecision =
        decision === "all" ||
        row.dataset.decision === decision;

      const matchesRisk =
        risk === "all" ||
        row.dataset.risk === risk;

      return matchesSearch && matchesDecision && matchesRisk;
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

  addStoredDecisions();
  updateSummary();
  bindReviewButtons();
  const requestedDecision = { returned: "return", approved: "approve", rejected: "reject" }[(new URLSearchParams(window.location.search).get("status") || "").toLowerCase()];
  if (requestedDecision) decisionFilter.value = requestedDecision;
  applyFilters();
})();
