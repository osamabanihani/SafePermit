(function () {
  const sidebar = document.getElementById("supervisorSidebar");
  const overlay = document.getElementById("supervisorOverlay");
  const sidebarOpen = document.getElementById("sidebarOpen");
  const sidebarClose = document.getElementById("sidebarClose");

  const search = document.getElementById("activeSearch");
  const statusFilter = document.getElementById("statusFilter");
  const riskFilter = document.getElementById("riskFilter");
  const sortFilter = document.getElementById("sortFilter");

  const tableBody = document.getElementById("activeTableBody");
  const mobileList = document.getElementById("activeMobileList");
  const emptyState = document.getElementById("activeEmpty");
  const visibleCount = document.getElementById("activeVisibleCount");

  const rows = Array.from(tableBody.querySelectorAll("tr"));

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
        const riskDifference =
          riskOrder[b.dataset.risk] - riskOrder[a.dataset.risk];

        if (riskDifference !== 0) {
          return riskDifference;
        }

        return Number(a.dataset.endorder) - Number(b.dataset.endorder);
      }

      if (mode === "ending") {
        return Number(a.dataset.endorder) - Number(b.dataset.endorder);
      }

      if (mode === "starting") {
        return Number(a.dataset.startorder) - Number(b.dataset.startorder);
      }

      if (mode === "id") {
        return a.dataset.id.localeCompare(b.dataset.id);
      }

      return 0;
    });
  }

  function buildMobileCards(list) {
    mobileList.innerHTML = "";

    list.forEach(function (row) {
      const cells = row.querySelectorAll("td");

      const permitId = row.dataset.id;
      const permitType = cells[0].querySelector("span").textContent;
      const worker = cells[1].textContent.trim();

      const locationSite = cells[2].querySelector("strong").textContent;
      const locationArea = cells[2].querySelector("span").textContent;

      const riskText = cells[3].textContent.trim();
      const statusText = cells[4].textContent.trim();

      const scheduleStrong = cells[5].querySelector("strong").textContent;
      const scheduleSpan = cells[5].querySelector("span").textContent;

      const riskClass =
        row.dataset.risk === "critical"
          ? "active-risk--critical"
          : row.dataset.risk === "high"
          ? "active-risk--high"
          : row.dataset.risk === "medium"
          ? "active-risk--medium"
          : "active-risk--low";

      const statusClass =
        row.dataset.status === "starting"
          ? "active-status--scheduled"
          : "active-status--active";

      const card = document.createElement("article");
      card.className = "active-mobile-card";

      card.innerHTML =
        '<div class="active-mobile-card__top">' +
          '<div>' +
            '<strong>' + permitId + '</strong>' +
            '<p>' + permitType + ' · ' + worker + '</p>' +
          '</div>' +
          '<span class="active-risk ' + riskClass + '">' + riskText + '</span>' +
        '</div>' +
        '<div class="active-mobile-card__details">' +
          '<span>Location: ' + locationSite + ' · ' + locationArea + '</span>' +
          '<span>Schedule: ' + scheduleSpan + '</span>' +
          '<span>' + scheduleStrong + '</span>' +
        '</div>' +
        '<div class="active-mobile-card__bottom">' +
          '<span class="active-status ' + statusClass + '">' + statusText + '</span>' +
          '<a class="active-view-button" href="../permit-details/?id=' + permitId + '">View Permit</a>' +
        '</div>';

      mobileList.appendChild(card);
    });
  }

  function applyFilters() {
    const term = search.value.trim().toLowerCase();
    const status = statusFilter.value;
    const risk = riskFilter.value;

    const filtered = rows.filter(function (row) {
      const matchesSearch =
        term === "" || searchableText(row).includes(term);

      const matchesRisk =
        risk === "all" || row.dataset.risk === risk;

      let matchesStatus = true;

      if (status === "active") {
        matchesStatus =
          row.dataset.status === "active" ||
          row.dataset.status === "ending";
      } else if (status === "starting") {
        matchesStatus = row.dataset.status === "starting";
      } else if (status === "ending") {
        matchesStatus = row.dataset.status === "ending";
      }

      return matchesSearch && matchesRisk && matchesStatus;
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
  statusFilter.addEventListener("change", applyFilters);
  riskFilter.addEventListener("change", applyFilters);
  sortFilter.addEventListener("change", applyFilters);

  applyFilters();
})();
