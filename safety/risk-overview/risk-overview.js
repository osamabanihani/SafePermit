(function () {
  const sidebar = document.getElementById("safetySidebar");
  const overlay = document.getElementById("safetyOverlay");
  const sidebarOpen = document.getElementById("sidebarOpen");
  const sidebarClose = document.getElementById("sidebarClose");

  const riskTabs = document.querySelectorAll("[data-risk-filter]");
  const search = document.getElementById("riskSearch");
  const statusFilter = document.getElementById("statusFilter");
  const sortFilter = document.getElementById("sortFilter");

  const list = document.getElementById("riskList");
  const emptyState = document.getElementById("riskEmpty");
  const visibleCount = document.getElementById("riskVisibleCount");

  const highCriticalCount = document.getElementById("highCriticalCount");
  const criticalCount = document.getElementById("criticalCount");
  const highCount = document.getElementById("highCount");
  const pendingSafetyCount = document.getElementById("pendingSafetyCount");

  const riskOrder = { critical: 2, high: 1 };
  let activeRiskFilter = "all";

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

  function getRisk(score) {
    const risk = window.SafePermitRiskEngine.classify(score);
    return risk ? { label: risk.level, className: risk.key }
      : { label: "Not calculated", className: "unrated" };
  }

  function titleCase(value) {
    return String(value || "")
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
  }

  function statusKey(status) {
    if (status === "Pending Safety Review") return "pending-safety";
    if (status === "Pending Admin Approval") return "pending-admin";
    if (status === "Approved") return "approved";
    if (status === "Active") return "active";
    return "";
  }

  function readSubmittedPermits() {
    let permits = [];

    try {
      const stored = JSON.parse(localStorage.getItem("safePermitSubmittedPermits") || "[]");
      if (Array.isArray(stored)) permits = stored.filter(Boolean);
    } catch (error) {
      permits = [];
    }

    try {
      const latest = JSON.parse(localStorage.getItem("safePermitSubmittedPermit") || "null");
      if (latest && latest.id && !permits.some(function (item) { return item.id === latest.id; })) {
        permits.unshift(latest);
      }
    } catch (error) {
    }

    return permits;
  }

  function addPermitCard(permit) {
    if (!permit || !permit.id) return;
    if (list.querySelector('[data-id="' + CSS.escape(String(permit.id)) + '"]')) return;

    const permitStatusKey = statusKey(permit.status);
    if (!permitStatusKey) return;

    const hazards = permit.riskAssessment && Array.isArray(permit.riskAssessment.hazards)
      ? permit.riskAssessment.hazards
      : [];

    const highestInitial = hazards.reduce(function (max, hazard) {
      return Math.max(max, Number(hazard.initialScore) || 0);
    }, 0);

    const highestResidual = hazards.reduce(function (max, hazard) {
      return Math.max(max, Number(hazard.residualScore) || 0);
    }, 0);

    const residualRisk = getRisk(highestResidual);
    if (residualRisk.className !== "critical" && residualRisk.className !== "high") return;

    const basic = permit.basicInfo || {};
    const worker = basic.workerName || "Omar Worker";
    const site = titleCase(basic.site) || "Site";
    const area = titleCase(basic.area) || "Area";
    const permitType = titleCase(basic.permitType) || "Permit";

    const checklistAnswers = permit.safetyChecklist && Array.isArray(permit.safetyChecklist.answers)
      ? permit.safetyChecklist.answers
      : [];

    const checklistAttention = checklistAnswers.some(function (item) {
      return String(item.answer || "").toLowerCase() === "no" ||
        (item.required && !item.answer);
    });

    const controls = hazards
      .map(function (hazard) { return hazard.controls; })
      .filter(Boolean)
      .slice(0, 2)
      .join(" ");

    const card = document.createElement("article");
    card.className = "risk-card";
    card.dataset.id = permit.id;
    card.dataset.worker = worker;
    card.dataset.location = site + " " + area;
    card.dataset.risk = residualRisk.className;
    card.dataset.score = String(highestResidual);
    card.dataset.status = permitStatusKey;
    card.dataset.startorder = String(Date.parse(basic.startDate || "") || Number.MAX_SAFE_INTEGER);

    const actionHref = permit.status === "Pending Safety Review"
      ? "../review-permit/?id=" + encodeURIComponent(permit.id)
      : "../permit-details/?id=" + encodeURIComponent(permit.id);

    const actionLabel = permit.status === "Pending Safety Review"
      ? "Review Permit"
      : "View Permit";

    card.innerHTML =
      '<div class="risk-card__main">' +
        '<div class="risk-card__title">' +
          '<div>' +
            '<span>' + escapeHTML(permit.id) + '</span>' +
            '<h2>' + escapeHTML(permitType) + '</h2>' +
            '<p>' + escapeHTML(worker) + ' · ' + escapeHTML(site) + ' · ' + escapeHTML(area) + '</p>' +
          '</div>' +
          '<span class="risk-badge risk-badge--' + residualRisk.className + '">' + escapeHTML(residualRisk.label) + '</span>' +
        '</div>' +
        '<div class="risk-card__scores">' +
          '<div><span>Initial Risk</span><strong>' + highestInitial + ' · ' + escapeHTML(getRisk(highestInitial).label) + '</strong></div>' +
          '<div><span>Residual Risk</span><strong class="risk-score-danger">' + highestResidual + ' · ' + escapeHTML(residualRisk.label) + '</strong></div>' +
          '<div><span>Risk Reduction</span><strong>' + Math.max(0, highestInitial - highestResidual) + ' points</strong></div>' +
        '</div>' +
        '<div class="risk-card__controls">' +
          '<span>Key Controls</span>' +
          '<p>' + escapeHTML(controls || "Review listed controls in the permit details.") + '</p>' +
        '</div>' +
      '</div>' +
      '<aside class="risk-card__side">' +
        '<div><span>Permit Status</span><strong class="risk-status' +
          (permit.status === "Active" ? ' risk-status--active' : '') + '">' +
          escapeHTML(permit.status || "Pending Safety Review") +
        '</strong></div>' +
        '<div><span>Work Start</span><strong>' +
          escapeHTML((basic.startDate || "Scheduled") + (basic.startTime ? " · " + basic.startTime : "")) +
        '</strong></div>' +
        '<div><span>Checklist</span><strong class="risk-checklist ' +
          (checklistAttention ? "risk-checklist--attention" : "risk-checklist--ready") + '">' +
          (checklistAttention ? "Needs Attention" : "Ready") +
        '</strong></div>' +
        '<a class="risk-action-button" href="' + actionHref + '"' +
          (permit.status === "Pending Safety Review" ? ' data-review-link' : '') +
        '>' + actionLabel + '</a>' +
      '</aside>';

    list.prepend(card);
  }

  function injectSubmittedPermits() {
    readSubmittedPermits().slice().reverse().forEach(addPermitCard);
  }

  function getCards() {
    return Array.from(list.querySelectorAll(".risk-card"));
  }

  function searchableText(card) {
    return (
      card.dataset.id + " " +
      card.dataset.worker + " " +
      card.dataset.location + " " +
      card.textContent
    ).toLowerCase();
  }

  function sortCards(cards) {
    const mode = sortFilter.value;

    return cards.sort(function (a, b) {
      if (mode === "risk") {
        const riskDifference = riskOrder[b.dataset.risk] - riskOrder[a.dataset.risk];
        if (riskDifference !== 0) return riskDifference;
        return Number(b.dataset.score) - Number(a.dataset.score);
      }
      if (mode === "score") return Number(b.dataset.score) - Number(a.dataset.score);
      if (mode === "start") return Number(a.dataset.startorder) - Number(b.dataset.startorder);
      if (mode === "id") return a.dataset.id.localeCompare(b.dataset.id);
      return 0;
    });
  }

  function updateSummary() {
    const cards = getCards();
    highCriticalCount.textContent = cards.length;
    criticalCount.textContent = cards.filter(function (card) { return card.dataset.risk === "critical"; }).length;
    highCount.textContent = cards.filter(function (card) { return card.dataset.risk === "high"; }).length;
    pendingSafetyCount.textContent = cards.filter(function (card) { return card.dataset.status === "pending-safety"; }).length;
  }

  function findStoredPermit(id) {
    return readSubmittedPermits().find(function (permit) {
      return permit && permit.id === id;
    }) || null;
  }

  function storeSelectedPermit(card) {
    const id = card.dataset.id;
    const permit = findStoredPermit(id);

    localStorage.setItem(
      "safePermitSafetySelectedPermit",
      JSON.stringify(
        permit || {
          id: id,
          source: "risk-overview",
          status: "Pending Safety Review"
        }
      )
    );
  }

  function bindReviewLinks() {
    document.querySelectorAll("[data-review-link]").forEach(function (link) {
      link.onclick = function () {
        const card = link.closest(".risk-card");
        if (card) storeSelectedPermit(card);
      };
    });
  }

  function applyFilters() {
    const cards = getCards();
    const term = search.value.trim().toLowerCase();
    const status = statusFilter.value;

    const filtered = cards.filter(function (card) {
      const matchesSearch = term === "" || searchableText(card).includes(term);
      const matchesRisk = activeRiskFilter === "all" || card.dataset.risk === activeRiskFilter;
      const matchesStatus = status === "all" || card.dataset.status === status;
      return matchesSearch && matchesRisk && matchesStatus;
    });

    const sorted = sortCards(filtered.slice());

    cards.forEach(function (card) { card.classList.add("is-hidden"); });
    sorted.forEach(function (card) {
      card.classList.remove("is-hidden");
      list.appendChild(card);
    });

    emptyState.hidden = sorted.length !== 0;
    visibleCount.textContent = sorted.length === 1 ? "1 permit shown" : sorted.length + " permits shown";
  }

  riskTabs.forEach(function (button) {
    button.addEventListener("click", function () {
      riskTabs.forEach(function (item) { item.classList.remove("is-active"); });
      button.classList.add("is-active");
      activeRiskFilter = button.dataset.riskFilter;
      applyFilters();
    });
  });

  search.addEventListener("input", applyFilters);
  statusFilter.addEventListener("change", applyFilters);
  sortFilter.addEventListener("change", applyFilters);

  injectSubmittedPermits();
  updateSummary();
  bindReviewLinks();
  applyFilters();
})();
