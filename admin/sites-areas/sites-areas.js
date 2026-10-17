(function () {
  function escapeHTML(value) {return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  const sidebar = document.getElementById("adminSidebar");
  const overlay = document.getElementById("adminOverlay");
  const sidebarOpen = document.getElementById("sidebarOpen");
  const sidebarClose = document.getElementById("sidebarClose");

  const search = document.getElementById("siteSearch");
  const siteStatusFilter = document.getElementById("siteStatusFilter");
  const sortFilter = document.getElementById("sortFilter");
  const sitesList = document.getElementById("sitesList");
  const sitesEmpty = document.getElementById("sitesEmpty");
  const visibleSitesCount = document.getElementById("visibleSitesCount");

  const totalSites = document.getElementById("totalSites");
  const activeSites = document.getElementById("activeSites");
  const totalAreas = document.getElementById("totalAreas");
  const inactiveAreas = document.getElementById("inactiveAreas");

  const addSiteButton = document.getElementById("addSiteButton");

  const siteModal = document.getElementById("siteModal");
  const siteModalEyebrow = document.getElementById("siteModalEyebrow");
  const siteModalTitle = document.getElementById("siteModalTitle");
  const siteForm = document.getElementById("siteForm");
  const editingSiteId = document.getElementById("editingSiteId");
  const siteName = document.getElementById("siteName");
  const siteCode = document.getElementById("siteCode");
  const siteStatus = document.getElementById("siteStatus");
  const siteDescription = document.getElementById("siteDescription");

  const areaModal = document.getElementById("areaModal");
  const areaModalEyebrow = document.getElementById("areaModalEyebrow");
  const areaModalTitle = document.getElementById("areaModalTitle");
  const areaForm = document.getElementById("areaForm");
  const editingAreaId = document.getElementById("editingAreaId");
  const areaSite = document.getElementById("areaSite");
  const areaName = document.getElementById("areaName");
  const areaCode = document.getElementById("areaCode");
  const areaStatus = document.getElementById("areaStatus");

  const storageKey = "safePermitAdminSitesAreas";

  const defaultSites = [
    {
      id: "site-factory-a",
      name: "Factory A",
      code: "FAC-A",
      status: "Active",
      description: "Primary manufacturing facility",
      createdAt: "2026-08-01T08:00:00",
      areas: [
        { id: "area-electrical-room", name: "Electrical Room", code: "ELEC-RM", status: "Active" },
        { id: "area-line-2", name: "Line 2", code: "LINE-2", status: "Active" },
        { id: "area-loading-zone", name: "Loading Zone", code: "LOAD-Z", status: "Active" }
      ]
    },
    {
      id: "site-plant-b",
      name: "Plant B",
      code: "PLT-B",
      status: "Active",
      description: "Process and utility operations",
      createdAt: "2026-08-03T08:00:00",
      areas: [
        { id: "area-utility", name: "Utility Area", code: "UTIL", status: "Active" },
        { id: "area-compressor", name: "Compressor Area", code: "COMP", status: "Active" },
        { id: "area-workshop-b", name: "Maintenance Workshop", code: "MNT-B", status: "Active" }
      ]
    },
    {
      id: "site-warehouse-1",
      name: "Warehouse 1",
      code: "WH-1",
      status: "Active",
      description: "Main storage and loading facility",
      createdAt: "2026-08-10T08:00:00",
      areas: [
        { id: "area-loading-bay", name: "Loading Bay", code: "LOAD-BAY", status: "Active" },
        { id: "area-storage-a", name: "Storage Zone A", code: "ST-A", status: "Active" },
        { id: "area-dock-1", name: "Dock 1", code: "DOCK-1", status: "Inactive" }
      ]
    },
    {
      id: "site-warehouse-2",
      name: "Warehouse 2",
      code: "WH-2",
      status: "Active",
      description: "Secondary storage facility",
      createdAt: "2026-08-14T08:00:00",
      areas: [
        { id: "area-roof-access", name: "Roof Access", code: "ROOF", status: "Active" },
        { id: "area-storage-b", name: "Storage Zone B", code: "ST-B", status: "Active" },
        { id: "area-yard", name: "External Yard", code: "YARD", status: "Active" }
      ]
    },
    {
      id: "site-tank-farm",
      name: "Tank Farm",
      code: "TNK-F",
      status: "Active",
      description: "Tank and transfer operations",
      createdAt: "2026-08-20T08:00:00",
      areas: [
        { id: "area-tank-04", name: "Tank 04", code: "TNK-04", status: "Active" },
        { id: "area-pump-area", name: "Pump Area", code: "PUMP", status: "Active" },
        { id: "area-transfer-line", name: "Transfer Line", code: "TR-LN", status: "Active" }
      ]
    }
  ];

  let sites = [];

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

  function slug(value) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function loadSites() {
    const stored = localStorage.getItem(storageKey);

    if (!stored) {
      sites = clone(defaultSites);
      saveSites();
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      sites = Array.isArray(parsed) ? parsed : clone(defaultSites);
    } catch (error) {
      sites = clone(defaultSites);
    }
  }

  function saveSites() {
    localStorage.setItem(storageKey, JSON.stringify(sites));
  }

  function activeAreaCount(site) {
    return site.areas.filter(function (area) {
      return area.status === "Active";
    }).length;
  }

  function updateSummary() {
    const allAreas = sites.reduce(function (items, site) {
      return items.concat(site.areas);
    }, []);

    totalSites.textContent = sites.length;

    activeSites.textContent = sites.filter(function (site) {
      return site.status === "Active";
    }).length;

    totalAreas.textContent = allAreas.length;

    inactiveAreas.textContent = allAreas.filter(function (area) {
      return area.status === "Inactive";
    }).length;
  }

  function searchableText(site) {
    const areas = site.areas.map(function (area) {
      return area.name + " " + area.code;
    }).join(" ");

    return (
      site.name + " " +
      site.code + " " +
      site.description + " " +
      areas
    ).toLowerCase();
  }

  function getFilteredSites() {
    const term = search.value.trim().toLowerCase();
    const status = siteStatusFilter.value;

    const filtered = sites.filter(function (site) {
      const matchesSearch =
        term === "" ||
        searchableText(site).includes(term);

      const matchesStatus =
        status === "all" ||
        site.status === status;

      return matchesSearch && matchesStatus;
    });

    return filtered.sort(function (a, b) {
      if (sortFilter.value === "areas") {
        return b.areas.length - a.areas.length || a.name.localeCompare(b.name);
      }

      if (sortFilter.value === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      return a.name.localeCompare(b.name);
    });
  }

  function buildArea(area, site) {
    const item = document.createElement("article");
    item.className = "admin-area-item";

    item.innerHTML =
      '<div class="admin-area-item__top">' +
        '<div>' +
          '<strong>' + escapeHTML(area.name) + '</strong>' +
          '<small>' + escapeHTML(area.code) + '</small>' +
        '</div>' +
        '<span class="admin-location-status admin-location-status--' +
          escapeHTML(area.status.toLowerCase()) + '">' + escapeHTML(area.status) + '</span>' +
      '</div>' +
      '<div class="admin-area-item__actions">' +
        '<button class="admin-area-action" type="button" data-edit-area>Edit</button>' +
        '<button class="admin-area-action ' +
          (area.status === "Active" ? "admin-area-action--warning" : "admin-area-action--success") +
          '" type="button" data-toggle-area>' +
          (area.status === "Active" ? "Deactivate" : "Activate") +
        '</button>' +
      '</div>';

    item.querySelector("[data-edit-area]").addEventListener("click", function () {
      openAreaModal(site, area);
    });

    item.querySelector("[data-toggle-area]").addEventListener("click", function () {
      area.status = area.status === "Active" ? "Inactive" : "Active";
      saveSites();
      updateSummary();
      applyFilters();
    });

    return item;
  }

  function buildSiteCard(site) {
    const card = document.createElement("article");
    card.className = "admin-site-card";

    const header = document.createElement("div");
    header.className = "admin-site-card__header";

    header.innerHTML =
      '<div class="admin-site-card__identity">' +
        '<div class="admin-site-card__icon">S</div>' +
        '<div>' +
          '<strong>' + escapeHTML(site.name) + '</strong>' +
          '<span>' + escapeHTML(site.code) + '</span>' +
          '<small>' + escapeHTML(site.description || "No description") + '</small>' +
        '</div>' +
      '</div>' +
      '<div class="admin-site-card__meta">' +
        '<span class="admin-location-status admin-location-status--' +
          escapeHTML(site.status.toLowerCase()) + '">' + escapeHTML(site.status) + '</span>' +
        '<span class="admin-area-count">' + activeAreaCount(site) + ' active / ' + site.areas.length + ' areas</span>' +
        '<div class="admin-site-card__actions">' +
          '<button class="admin-site-action" type="button" data-edit-site>Edit Site</button>' +
          '<button class="admin-site-action ' +
            (site.status === "Active" ? "admin-site-action--warning" : "admin-site-action--success") +
            '" type="button" data-toggle-site>' +
            (site.status === "Active" ? "Deactivate" : "Activate") +
          '</button>' +
        '</div>' +
      '</div>';

    const areas = document.createElement("div");
    areas.className = "admin-areas";

    const heading = document.createElement("div");
    heading.className = "admin-areas__heading";
    heading.innerHTML =
      '<span>Areas</span>' +
      '<button class="admin-add-area-button" type="button">+ Add Area</button>';

    const areaList = document.createElement("div");
    areaList.className = "admin-areas-list";

    site.areas.forEach(function (area) {
      areaList.appendChild(buildArea(area, site));
    });

    if (site.areas.length === 0) {
      const empty = document.createElement("div");
      empty.className = "admin-area-item";
      empty.innerHTML =
        '<div class="admin-area-item__top"><div><strong>No areas yet</strong>' +
        '<small>Add the first work area for this site.</small></div></div>';
      areaList.appendChild(empty);
    }

    heading.querySelector(".admin-add-area-button").addEventListener("click", function () {
      openAreaModal(site, null);
    });

    header.querySelector("[data-edit-site]").addEventListener("click", function () {
      openSiteModal(site);
    });

    header.querySelector("[data-toggle-site]").addEventListener("click", function () {
      site.status = site.status === "Active" ? "Inactive" : "Active";
      saveSites();
      updateSummary();
      applyFilters();
    });

    areas.appendChild(heading);
    areas.appendChild(areaList);

    card.appendChild(header);
    card.appendChild(areas);

    return card;
  }

  function renderSites(list) {
    sitesList.innerHTML = "";

    list.forEach(function (site) {
      sitesList.appendChild(buildSiteCard(site));
    });

    sitesEmpty.hidden = list.length !== 0;

    visibleSitesCount.textContent =
      list.length === 1
        ? "1 site shown"
        : list.length + " sites shown";
  }

  function applyFilters() {
    renderSites(getFilteredSites());
  }

  function clearSiteErrors() {
    ["siteName", "siteCode", "siteStatus"].forEach(function (id) {
      document.getElementById(id).classList.remove("is-invalid");
    });

    ["siteNameError", "siteCodeError", "siteStatusError"].forEach(function (id) {
      document.getElementById(id).textContent = "";
    });
  }

  function clearAreaErrors() {
    ["areaSite", "areaName", "areaCode", "areaStatus"].forEach(function (id) {
      document.getElementById(id).classList.remove("is-invalid");
    });

    ["areaSiteError", "areaNameError", "areaCodeError", "areaStatusError"].forEach(function (id) {
      document.getElementById(id).textContent = "";
    });
  }

  function setError(field, errorId, message) {
    field.classList.add("is-invalid");
    document.getElementById(errorId).textContent = message;
  }

  function populateSiteSelect(selectedId) {
    areaSite.innerHTML = '<option value="">Select site</option>';

    sites.forEach(function (site) {
      const option = document.createElement("option");
      option.value = site.id;
      option.textContent = site.name + " · " + site.status;
      areaSite.appendChild(option);
    });

    if (selectedId) {
      areaSite.value = selectedId;
    }
  }

  function openSiteModal(site) {
    siteForm.reset();
    clearSiteErrors();

    if (site) {
      siteModalEyebrow.textContent = "Location details";
      siteModalTitle.textContent = "Edit Site";

      editingSiteId.value = site.id;
      siteName.value = site.name;
      siteCode.value = site.code;
      siteStatus.value = site.status;
      siteDescription.value = site.description || "";
    } else {
      siteModalEyebrow.textContent = "New location";
      siteModalTitle.textContent = "Add Site";

      editingSiteId.value = "";
      siteStatus.value = "Active";
    }

    siteModal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeSiteModal() {
    siteModal.hidden = true;
    document.body.style.overflow = "";
  }

  function openAreaModal(site, area) {
    areaForm.reset();
    clearAreaErrors();
    populateSiteSelect(site.id);

    if (area) {
      areaModalEyebrow.textContent = "Work area details";
      areaModalTitle.textContent = "Edit Area";

      editingAreaId.value = area.id;
      areaSite.value = site.id;
      areaName.value = area.name;
      areaCode.value = area.code;
      areaStatus.value = area.status;
    } else {
      areaModalEyebrow.textContent = "New work area";
      areaModalTitle.textContent = "Add Area";

      editingAreaId.value = "";
      areaStatus.value = "Active";
    }

    areaModal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeAreaModal() {
    areaModal.hidden = true;
    document.body.style.overflow = "";
  }

  function validateSiteForm() {
    clearSiteErrors();
    let valid = true;

    if (siteName.value.trim().length < 2) {
      setError(siteName, "siteNameError", "Enter a valid site name.");
      valid = false;
    }

    if (!siteCode.value.trim()) {
      setError(siteCode, "siteCodeError", "Site code is required.");
      valid = false;
    } else {
      const duplicate = sites.some(function (site) {
        return (
          site.code.toLowerCase() === siteCode.value.trim().toLowerCase() &&
          site.id !== editingSiteId.value
        );
      });

      if (duplicate) {
        setError(siteCode, "siteCodeError", "This Site Code already exists.");
        valid = false;
      }
    }

    if (!siteStatus.value) {
      setError(siteStatus, "siteStatusError", "Select a status.");
      valid = false;
    }

    return valid;
  }

  function validateAreaForm() {
    clearAreaErrors();
    let valid = true;

    const selectedSite = sites.find(function (site) {
      return site.id === areaSite.value;
    });

    if (!selectedSite) {
      setError(areaSite, "areaSiteError", "Select a site.");
      valid = false;
    }

    if (areaName.value.trim().length < 2) {
      setError(areaName, "areaNameError", "Enter a valid area name.");
      valid = false;
    }

    if (!areaCode.value.trim()) {
      setError(areaCode, "areaCodeError", "Area code is required.");
      valid = false;
    } else {
      const duplicate = sites.some(function (site) {
        return site.areas.some(function (area) {
          return (
            area.code.toLowerCase() === areaCode.value.trim().toLowerCase() &&
            area.id !== editingAreaId.value
          );
        });
      });

      if (duplicate) {
        setError(areaCode, "areaCodeError", "This Area Code already exists.");
        valid = false;
      }
    }

    if (!areaStatus.value) {
      setError(areaStatus, "areaStatusError", "Select a status.");
      valid = false;
    }

    return valid;
  }

  function saveSiteFromForm() {
    const existingId = editingSiteId.value;

    if (existingId) {
      const site = sites.find(function (item) {
        return item.id === existingId;
      });

      if (site) {
        site.name = siteName.value.trim();
        site.code = siteCode.value.trim().toUpperCase();
        site.status = siteStatus.value;
        site.description = siteDescription.value.trim();
      }
    } else {
      const newId = "site-" + slug(siteCode.value || siteName.value) + "-" + Date.now();

      sites.unshift({
        id: newId,
        name: siteName.value.trim(),
        code: siteCode.value.trim().toUpperCase(),
        status: siteStatus.value,
        description: siteDescription.value.trim(),
        createdAt: new Date().toISOString(),
        areas: []
      });
    }

    saveSites();
    updateSummary();
    applyFilters();
  }

  function saveAreaFromForm() {
    const targetSite = sites.find(function (site) {
      return site.id === areaSite.value;
    });

    if (!targetSite) return;

    const currentAreaId = editingAreaId.value;

    if (currentAreaId) {
      let sourceSite = null;
      let area = null;

      sites.forEach(function (site) {
        const match = site.areas.find(function (item) {
          return item.id === currentAreaId;
        });

        if (match) {
          sourceSite = site;
          area = match;
        }
      });

      if (area) {
        area.name = areaName.value.trim();
        area.code = areaCode.value.trim().toUpperCase();
        area.status = areaStatus.value;

        if (sourceSite && sourceSite.id !== targetSite.id) {
          sourceSite.areas = sourceSite.areas.filter(function (item) {
            return item.id !== currentAreaId;
          });

          targetSite.areas.push(area);
        }
      }
    } else {
      targetSite.areas.push({
        id: "area-" + slug(areaCode.value || areaName.value) + "-" + Date.now(),
        name: areaName.value.trim(),
        code: areaCode.value.trim().toUpperCase(),
        status: areaStatus.value
      });
    }

    saveSites();
    updateSummary();
    applyFilters();
  }

  addSiteButton.addEventListener("click", function () {
    openSiteModal(null);
  });

  document.querySelectorAll("[data-close-site-modal]").forEach(function (button) {
    button.addEventListener("click", closeSiteModal);
  });

  document.querySelectorAll("[data-close-area-modal]").forEach(function (button) {
    button.addEventListener("click", closeAreaModal);
  });

  siteForm.addEventListener("submit", function (event) {
    event.preventDefault();

    if (!validateSiteForm()) return;

    saveSiteFromForm();
    closeSiteModal();
  });

  areaForm.addEventListener("submit", function (event) {
    event.preventDefault();

    if (!validateAreaForm()) return;

    saveAreaFromForm();
    closeAreaModal();
  });

  search.addEventListener("input", applyFilters);
  siteStatusFilter.addEventListener("change", applyFilters);
  sortFilter.addEventListener("change", applyFilters);

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;

    if (!siteModal.hidden) closeSiteModal();
    if (!areaModal.hidden) closeAreaModal();
  });

  loadSites();
  updateSummary();
  applyFilters();
})();
