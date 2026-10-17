(function () {
  function escapeHTML(value) {return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  const sidebar = document.getElementById("adminSidebar");
  const overlay = document.getElementById("adminOverlay");
  const sidebarOpen = document.getElementById("sidebarOpen");
  const sidebarClose = document.getElementById("sidebarClose");

  const search = document.getElementById("permitTypeSearch");
  const statusFilter = document.getElementById("statusFilter");
  const controlFilter = document.getElementById("controlFilter");
  const sortFilter = document.getElementById("sortFilter");

  const permitTypesList = document.getElementById("permitTypesList");
  const permitTypesEmpty = document.getElementById("permitTypesEmpty");
  const visiblePermitTypesCount = document.getElementById("visiblePermitTypesCount");

  const totalPermitTypes = document.getElementById("totalPermitTypes");
  const activePermitTypes = document.getElementById("activePermitTypes");
  const safetyReviewTypes = document.getElementById("safetyReviewTypes");
  const highControlTypes = document.getElementById("highControlTypes");

  const addPermitTypeButton = document.getElementById("addPermitTypeButton");
  const permitTypeModal = document.getElementById("permitTypeModal");
  const permitTypeModalEyebrow = document.getElementById("permitTypeModalEyebrow");
  const permitTypeModalTitle = document.getElementById("permitTypeModalTitle");
  const permitTypeForm = document.getElementById("permitTypeForm");

  const editingPermitTypeId = document.getElementById("editingPermitTypeId");
  const permitTypeName = document.getElementById("permitTypeName");
  const permitTypeCode = document.getElementById("permitTypeCode");
  const permitTypeStatus = document.getElementById("permitTypeStatus");
  const permitTypeControl = document.getElementById("permitTypeControl");
  const permitTypeValidity = document.getElementById("permitTypeValidity");
  const permitTypeSafetyReview = document.getElementById("permitTypeSafetyReview");
  const permitTypeDescription = document.getElementById("permitTypeDescription");
  const permitTypeChecklist = document.getElementById("permitTypeChecklist");
  const permitTypeRiskAssessment = document.getElementById("permitTypeRiskAssessment");

  const storageKey = "safePermitAdminPermitTypes";

  const defaultPermitTypes = [
    {
      id: "electrical",
      name: "Electrical Work",
      code: "ELEC",
      status: "Active",
      controlLevel: "High",
      validityHours: 8,
      safetyReview: "Required",
      checklistRequired: true,
      riskAssessmentRequired: true,
      description: "Electrical installation, isolation, inspection, maintenance, and energized-system related work.",
      createdAt: "2026-08-01T08:00:00"
    },
    {
      id: "hot-work",
      name: "Hot Work",
      code: "HOT",
      status: "Active",
      controlLevel: "High",
      validityHours: 8,
      safetyReview: "Required",
      checklistRequired: true,
      riskAssessmentRequired: true,
      description: "Welding, cutting, grinding, brazing, and other work that can create heat, sparks, or ignition sources.",
      createdAt: "2026-08-01T08:05:00"
    },
    {
      id: "height",
      name: "Work at Height",
      code: "WAH",
      status: "Active",
      controlLevel: "High",
      validityHours: 8,
      safetyReview: "Required",
      checklistRequired: true,
      riskAssessmentRequired: true,
      description: "Work performed where a fall could cause injury and fall-prevention controls are required.",
      createdAt: "2026-08-01T08:10:00"
    },
    {
      id: "confined",
      name: "Confined Space Entry",
      code: "CSE",
      status: "Active",
      controlLevel: "High",
      validityHours: 4,
      safetyReview: "Required",
      checklistRequired: true,
      riskAssessmentRequired: true,
      description: "Entry into tanks, vessels, pits, chambers, or other restricted spaces requiring enhanced controls.",
      createdAt: "2026-08-01T08:15:00"
    },
    {
      id: "excavation",
      name: "Excavation",
      code: "EXC",
      status: "Active",
      controlLevel: "Standard",
      validityHours: 12,
      safetyReview: "Required",
      checklistRequired: true,
      riskAssessmentRequired: true,
      description: "Excavation, trenching, digging, and ground-disturbance activities.",
      createdAt: "2026-08-01T08:20:00"
    },
    {
      id: "general",
      name: "General Maintenance",
      code: "GEN",
      status: "Active",
      controlLevel: "Standard",
      validityHours: 12,
      safetyReview: "Required",
      checklistRequired: true,
      riskAssessmentRequired: true,
      description: "General maintenance activities that do not fall under a more specific permit category.",
      createdAt: "2026-08-01T08:25:00"
    }
  ];

  let permitTypes = [];

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

  function loadPermitTypes() {
    const stored = localStorage.getItem(storageKey);

    if (!stored) {
      permitTypes = clone(defaultPermitTypes);
      savePermitTypes();
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      permitTypes = Array.isArray(parsed) ? parsed : clone(defaultPermitTypes);
    } catch (error) {
      permitTypes = clone(defaultPermitTypes);
    }
  }

  function savePermitTypes() {
    localStorage.setItem(storageKey, JSON.stringify(permitTypes));
  }

  function updateSummary() {
    totalPermitTypes.textContent = permitTypes.length;

    activePermitTypes.textContent = permitTypes.filter(function (item) {
      return item.status === "Active";
    }).length;

    safetyReviewTypes.textContent = permitTypes.filter(function (item) {
      return item.safetyReview === "Required";
    }).length;

    highControlTypes.textContent = permitTypes.filter(function (item) {
      return item.controlLevel === "High";
    }).length;
  }

  function searchableText(item) {
    return (
      item.name + " " +
      item.code + " " +
      item.description + " " +
      item.controlLevel + " " +
      item.safetyReview
    ).toLowerCase();
  }

  function getFilteredPermitTypes() {
    const term = search.value.trim().toLowerCase();
    const status = statusFilter.value;
    const control = controlFilter.value;

    const filtered = permitTypes.filter(function (item) {
      const matchesSearch =
        term === "" ||
        searchableText(item).includes(term);

      const matchesStatus =
        status === "all" ||
        item.status === status;

      const matchesControl =
        control === "all" ||
        item.controlLevel === control;

      return matchesSearch && matchesStatus && matchesControl;
    });

    return filtered.sort(function (a, b) {
      if (sortFilter.value === "control") {
        const order = { High: 2, Standard: 1 };
        return order[b.controlLevel] - order[a.controlLevel] || a.name.localeCompare(b.name);
      }

      if (sortFilter.value === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      return a.name.localeCompare(b.name);
    });
  }

  function buildPermitTypeCard(item) {
    const card = document.createElement("article");
    card.className = "admin-type-card";

    const requirements = [];

    if (item.riskAssessmentRequired) {
      requirements.push("Risk Assessment");
    }

    if (item.checklistRequired) {
      requirements.push("Safety Checklist");
    }

    if (item.safetyReview === "Required") {
      requirements.push("Safety Review");
    }

    card.innerHTML =
      '<div class="admin-type-card__top">' +
        '<div class="admin-type-card__identity">' +
          '<div class="admin-type-card__icon">' + escapeHTML(item.code.slice(0, 3)) + '</div>' +
          '<div>' +
            '<strong>' + escapeHTML(item.name) + '</strong>' +
            '<span>' + escapeHTML(item.code) + '</span>' +
            '<small>' + escapeHTML(item.description) + '</small>' +
          '</div>' +
        '</div>' +
        '<div class="admin-type-card__badges">' +
          '<span class="admin-type-status admin-type-status--' + escapeHTML(item.status.toLowerCase()) + '">' + escapeHTML(item.status) + '</span>' +
          '<span class="admin-control-badge admin-control-badge--' + escapeHTML(item.controlLevel.toLowerCase()) + '">' +
            (item.controlLevel === "High" ? "High Control" : "Standard") +
          '</span>' +
        '</div>' +
      '</div>' +
      '<div class="admin-type-card__meta">' +
        '<div><span>Default Validity</span><strong>' + escapeHTML(item.validityHours) + ' hours</strong></div>' +
        '<div><span>Safety Review</span><strong>' + escapeHTML(item.safetyReview) + '</strong></div>' +
        '<div><span>Workflow</span><strong>Standard Approval Flow</strong></div>' +
      '</div>' +
      '<div class="admin-type-card__requirements">' +
        requirements.map(function (requirement) {
          return '<span class="admin-requirement">' + requirement + ' Required</span>';
        }).join("") +
      '</div>' +
      '<div class="admin-type-card__actions">' +
        '<button class="admin-type-action" type="button" data-edit-type>Edit Permit Type</button>' +
        '<button class="admin-type-action ' +
          (item.status === "Active" ? "admin-type-action--warning" : "admin-type-action--success") +
          '" type="button" data-toggle-type>' +
          (item.status === "Active" ? "Deactivate" : "Activate") +
        '</button>' +
      '</div>';

    card.querySelector("[data-edit-type]").addEventListener("click", function () {
      openPermitTypeModal(item);
    });

    card.querySelector("[data-toggle-type]").addEventListener("click", function () {
      item.status = item.status === "Active" ? "Inactive" : "Active";
      savePermitTypes();
      updateSummary();
      applyFilters();
    });

    return card;
  }

  function renderPermitTypes(list) {
    permitTypesList.innerHTML = "";

    list.forEach(function (item) {
      permitTypesList.appendChild(buildPermitTypeCard(item));
    });

    permitTypesEmpty.hidden = list.length !== 0;

    visiblePermitTypesCount.textContent =
      list.length === 1
        ? "1 permit type shown"
        : list.length + " permit types shown";
  }

  function applyFilters() {
    renderPermitTypes(getFilteredPermitTypes());
  }

  function clearErrors() {
    [
      "permitTypeName",
      "permitTypeCode",
      "permitTypeStatus",
      "permitTypeControl",
      "permitTypeValidity",
      "permitTypeSafetyReview",
      "permitTypeDescription"
    ].forEach(function (id) {
      document.getElementById(id).classList.remove("is-invalid");
    });

    [
      "permitTypeNameError",
      "permitTypeCodeError",
      "permitTypeStatusError",
      "permitTypeControlError",
      "permitTypeValidityError",
      "permitTypeSafetyReviewError",
      "permitTypeDescriptionError"
    ].forEach(function (id) {
      document.getElementById(id).textContent = "";
    });
  }

  function setError(field, errorId, message) {
    field.classList.add("is-invalid");
    document.getElementById(errorId).textContent = message;
  }

  function openPermitTypeModal(item) {
    permitTypeForm.reset();
    clearErrors();

    if (item) {
      permitTypeModalEyebrow.textContent = "Permit configuration";
      permitTypeModalTitle.textContent = "Edit Permit Type";

      editingPermitTypeId.value = item.id;
      permitTypeName.value = item.name;
      permitTypeCode.value = item.code;
      permitTypeStatus.value = item.status;
      permitTypeControl.value = item.controlLevel;
      permitTypeValidity.value = String(item.validityHours);
      permitTypeSafetyReview.value = item.safetyReview;
      permitTypeDescription.value = item.description;
      permitTypeChecklist.checked = Boolean(item.checklistRequired);
      permitTypeRiskAssessment.checked = Boolean(item.riskAssessmentRequired);
    } else {
      permitTypeModalEyebrow.textContent = "New permit category";
      permitTypeModalTitle.textContent = "Add Permit Type";

      editingPermitTypeId.value = "";
      permitTypeStatus.value = "Active";
      permitTypeControl.value = "Standard";
      permitTypeValidity.value = "8";
      permitTypeSafetyReview.value = "Required";
      permitTypeChecklist.checked = true;
      permitTypeRiskAssessment.checked = true;
    }

    permitTypeModal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closePermitTypeModal() {
    permitTypeModal.hidden = true;
    document.body.style.overflow = "";
  }

  function validateForm() {
    clearErrors();

    let valid = true;
    const currentId = editingPermitTypeId.value;

    if (permitTypeName.value.trim().length < 3) {
      setError(
        permitTypeName,
        "permitTypeNameError",
        "Enter a valid permit type name."
      );
      valid = false;
    }

    if (!permitTypeCode.value.trim()) {
      setError(
        permitTypeCode,
        "permitTypeCodeError",
        "Permit Type Code is required."
      );
      valid = false;
    } else {
      const duplicateCode = permitTypes.some(function (item) {
        return (
          item.code.toLowerCase() === permitTypeCode.value.trim().toLowerCase() &&
          item.id !== currentId
        );
      });

      if (duplicateCode) {
        setError(
          permitTypeCode,
          "permitTypeCodeError",
          "This Permit Type Code already exists."
        );
        valid = false;
      }
    }

    if (!permitTypeStatus.value) {
      setError(permitTypeStatus, "permitTypeStatusError", "Select a status.");
      valid = false;
    }

    if (!permitTypeControl.value) {
      setError(
        permitTypeControl,
        "permitTypeControlError",
        "Select a control level."
      );
      valid = false;
    }

    if (!permitTypeValidity.value) {
      setError(
        permitTypeValidity,
        "permitTypeValidityError",
        "Select default validity."
      );
      valid = false;
    }

    if (!permitTypeSafetyReview.value) {
      setError(
        permitTypeSafetyReview,
        "permitTypeSafetyReviewError",
        "Select a safety review option."
      );
      valid = false;
    }

    if (permitTypeDescription.value.trim().length < 10) {
      setError(
        permitTypeDescription,
        "permitTypeDescriptionError",
        "Add a short description of at least 10 characters."
      );
      valid = false;
    }

    return valid;
  }

  function savePermitTypeFromForm() {
    const currentId = editingPermitTypeId.value;

    const data = {
      name: permitTypeName.value.trim(),
      code: permitTypeCode.value.trim().toUpperCase(),
      status: permitTypeStatus.value,
      controlLevel: permitTypeControl.value,
      validityHours: Number(permitTypeValidity.value),
      safetyReview: permitTypeSafetyReview.value,
      checklistRequired: permitTypeChecklist.checked,
      riskAssessmentRequired: permitTypeRiskAssessment.checked,
      description: permitTypeDescription.value.trim()
    };

    if (currentId) {
      const item = permitTypes.find(function (permitType) {
        return permitType.id === currentId;
      });

      if (item) {
        Object.assign(item, data);
      }
    } else {
      permitTypes.unshift(
        Object.assign(
          {
            id: slug(data.name) + "-" + Date.now(),
            createdAt: new Date().toISOString()
          },
          data
        )
      );
    }

    savePermitTypes();
    updateSummary();
    applyFilters();
  }

  addPermitTypeButton.addEventListener("click", function () {
    openPermitTypeModal(null);
  });

  document.querySelectorAll("[data-close-type-modal]").forEach(function (button) {
    button.addEventListener("click", closePermitTypeModal);
  });

  permitTypeForm.addEventListener("submit", function (event) {
    event.preventDefault();

    if (!validateForm()) return;

    savePermitTypeFromForm();
    closePermitTypeModal();
  });

  search.addEventListener("input", applyFilters);
  statusFilter.addEventListener("change", applyFilters);
  controlFilter.addEventListener("change", applyFilters);
  sortFilter.addEventListener("change", applyFilters);

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !permitTypeModal.hidden) {
      closePermitTypeModal();
    }
  });

  loadPermitTypes();
  updateSummary();
  applyFilters();
})();
