(function () {
  const form = document.getElementById("basicInfoForm");

  const sidebar = document.getElementById("workerSidebar");
  const overlay = document.getElementById("workerOverlay");
  const sidebarOpen = document.getElementById("sidebarOpen");
  const sidebarClose = document.getElementById("sidebarClose");

  const permitType = document.getElementById("permitType");
  const workTitle = document.getElementById("workTitle");
  const description = document.getElementById("description");

  const site = document.getElementById("site");
  const area = document.getElementById("area");

  const startDate = document.getElementById("startDate");
  const startTime = document.getElementById("startTime");
  const endDate = document.getElementById("endDate");
  const endTime = document.getElementById("endTime");

  const supervisor = document.getElementById("supervisor");
  const workerCount = document.getElementById("workerCount");

  const attachment = document.getElementById("attachment");
  const selectedFile = document.getElementById("selectedFile");
  const selectedFileName = document.getElementById("selectedFileName");
  const selectedFileSize = document.getElementById("selectedFileSize");
  const removeFile = document.getElementById("removeFile");

  const saveDraftButton = document.getElementById("saveDraftButton");
  const formMessage = document.getElementById("formMessage");
  const validationSummary = document.getElementById("validationSummary");
  const validationSummaryList = document.getElementById("validationSummaryList");
  const validationFields = [permitType, workTitle, description, site, area,
    startDate, startTime, endDate, endTime, supervisor, workerCount];
  let validationSubmitted = false;
  let validating = false;
  let continueTimer;

  function translated(message) {
    return window.SafePermitI18n ? window.SafePermitI18n.translateValue(message) : message;
  }

  function focusInvalid(input) {
    // Area stays disabled until a site is selected; its summary link must still be useful.
    const target = input.disabled ? site : input;
    target.focus({ preventScroll: true });
    target.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "center"
    });
  }

  function updateErrorSummary() {
    if (!validationSubmitted || validating) return;
    const invalid = validationFields.filter(input => input.getAttribute("aria-invalid") === "true");
    validationSummaryList.replaceChildren();
    document.getElementById("validationSummaryTitle").textContent = document.documentElement.lang === "ar"
      ? "يرجى تصحيح الحقول التالية قبل المتابعة." : "Correct these fields before continuing.";
    invalid.forEach(function (input) {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = "#" + input.id;
      link.textContent = document.getElementById(input.id + "Error").textContent;
      link.addEventListener("click", function (event) { event.preventDefault(); focusInvalid(input); });
      item.appendChild(link);
      validationSummaryList.appendChild(item);
    });
    validationSummary.hidden = invalid.length === 0;
  }

  validationFields.forEach(function (input) {
    const describedBy = new Set((input.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean));
    describedBy.add(input.id + "Error");
    input.setAttribute("aria-describedby", Array.from(describedBy).join(" "));
    input.setAttribute("aria-invalid", "false");
  });

  function refreshErrorLanguage() {
    validationFields.forEach(function (input) {
      const error = document.getElementById(input.id + "Error");
      if (error.dataset.validationMessage) error.textContent = translated(error.dataset.validationMessage);
    });
    updateErrorSummary();
  }
  document.addEventListener("safepermit:languagechange", refreshErrorLanguage);
  document.addEventListener("safepermit:i18nready", refreshErrorLanguage);

  const titleCounter = document.getElementById("titleCounter");
  const descriptionCounter = document.getElementById("descriptionCounter");

  const summaryType = document.getElementById("summaryType");
  const summaryTitle = document.getElementById("summaryTitle");
  const summaryLocation = document.getElementById("summaryLocation");
  const summarySchedule = document.getElementById("summarySchedule");
  const summarySupervisor = document.getElementById("summarySupervisor");

  const areasBySite = {
    "factory-a": [
      "Maintenance Room",
      "Production Floor",
      "Electrical Room"
    ],
    "plant-b": [
      "Utility Area",
      "Boiler Area",
      "Mechanical Workshop"
    ],
    "warehouse-1": [
      "Loading Bay",
      "Storage Zone A",
      "Storage Zone B"
    ],
    "warehouse-2": [
      "Roof Access",
      "Loading Area",
      "Maintenance Corner"
    ],
    "tank-farm": [
      "Tank 01",
      "Tank 04",
      "Pump Area"
    ]
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

  function setError(input, id, message) {
    const errorElement = document.getElementById(id);

    input.classList.add("is-invalid");
    input.setAttribute("aria-invalid", "true");
    errorElement.dataset.validationMessage = message;
    errorElement.textContent = translated(message);
    updateErrorSummary();
  }

  function clearError(input, id) {
    const errorElement = document.getElementById(id);

    input.classList.remove("is-invalid");
    input.setAttribute("aria-invalid", "false");
    delete errorElement.dataset.validationMessage;
    errorElement.textContent = "";
    updateErrorSummary();
  }

  function validateRequired(input, errorId, label) {
    if (input.value.trim() === "") {
      setError(input, errorId, label + " is required.");
      return false;
    }

    clearError(input, errorId);
    return true;
  }

  function validateWorkers() {
    const message = window.SafePermitData.validateWorkerCount(workerCount.value);
    if (message) {
      setError(workerCount, "workerCountError", message);
      return false;
    }

    clearError(workerCount, "workerCountError");
    return true;
  }

  function validateSchedule() {
    let valid = true;

    valid =
      validateRequired(startDate, "startDateError", "Start date") &&
      valid;

    valid =
      validateRequired(startTime, "startTimeError", "Start time") &&
      valid;

    valid =
      validateRequired(endDate, "endDateError", "End date") &&
      valid;

    valid =
      validateRequired(endTime, "endTimeError", "End time") &&
      valid;

    if (!valid) {
      return false;
    }

    const startValue = new Date(startDate.value + "T" + startTime.value);
    const endValue = new Date(endDate.value + "T" + endTime.value);

    if (endValue <= startValue) {
      setError(
        endDate,
        "endDateError",
        "End date and time must be after the start."
      );
      setError(
        endTime,
        "endTimeError",
        "End date and time must be after the start."
      );
      return false;
    }

    clearError(endDate, "endDateError");
    clearError(endTime, "endTimeError");

    return true;
  }

  function getSelectedText(select) {
    const option = select.options[select.selectedIndex];

    if (!option || option.value === "") {
      return "";
    }

    return option.textContent;
  }

  function updateAreaOptions() {
    const selectedSite = site.value;
    const areas = areasBySite[selectedSite] || [];

    area.innerHTML = "";

    if (areas.length === 0) {
      area.disabled = true;

      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Select site first";
      area.appendChild(option);

      updateSummary();
      return;
    }

    area.disabled = false;

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select area";
    area.appendChild(placeholder);

    areas.forEach(function (areaName) {
      const option = document.createElement("option");
      option.value = areaName.toLowerCase().replaceAll(" ", "-");
      option.textContent = areaName;
      area.appendChild(option);
    });

    updateSummary();
  }

  function formatDate(value) {
    if (!value) {
      return "";
    }

    const date = new Date(value + "T00:00:00");

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  function updateSummary() {
    const permitTypeText = getSelectedText(permitType);
    const siteText = getSelectedText(site);
    const areaText = getSelectedText(area);
    const supervisorText = getSelectedText(supervisor);

    summaryType.textContent =
      permitTypeText || "Not selected";

    summaryTitle.textContent =
      workTitle.value.trim() || "Not entered";

    if (siteText && areaText) {
      summaryLocation.textContent =
        siteText + " · " + areaText;
    } else if (siteText) {
      summaryLocation.textContent = siteText;
    } else {
      summaryLocation.textContent = "Not selected";
    }

    if (startDate.value && endDate.value) {
      summarySchedule.textContent =
        formatDate(startDate.value) +
        " → " +
        formatDate(endDate.value);
    } else {
      summarySchedule.textContent = "Not selected";
    }

    summarySupervisor.textContent =
      supervisorText || "Not selected";
  }


  function loadDraftIntoForm(draft) {
    permitType.value = draft.permitType || "";
    workTitle.value = draft.workTitle || "";
    description.value = draft.description || "";
    site.value = draft.site || "";
    updateAreaOptions();
    area.value = draft.area || "";
    startDate.value = draft.startDate || "";
    startTime.value = draft.startTime || "";
    endDate.value = draft.endDate || "";
    endTime.value = draft.endTime || "";
    supervisor.value = draft.supervisor || "";
    workerCount.value = draft.workerCount || "1";

    titleCounter.textContent = workTitle.value.length + " / 80";
    descriptionCounter.textContent = description.value.length + " / 500";
    updateSummary();
  }

  workTitle.addEventListener("input", function () {
    titleCounter.textContent =
      workTitle.value.length + " / 80";

    updateSummary();
  });

  description.addEventListener("input", function () {
    descriptionCounter.textContent =
      description.value.length + " / 500";
  });

  permitType.addEventListener("change", updateSummary);
  site.addEventListener("change", updateAreaOptions);
  area.addEventListener("change", updateSummary);
  startDate.addEventListener("change", updateSummary);
  endDate.addEventListener("change", updateSummary);
  supervisor.addEventListener("change", updateSummary);

  attachment.addEventListener("change", function () {
    const file = attachment.files[0];

    if (!file) {
      selectedFile.hidden = true;
      return;
    }

    const maximumSize = 5 * 1024 * 1024;

    if (file.size > maximumSize) {
      attachment.value = "";
      selectedFile.hidden = true;

      formMessage.className = "wizard-message is-error";
      formMessage.textContent =
        "Attachment must be 5 MB or smaller.";

      return;
    }

    selectedFileName.textContent = file.name;
    selectedFileSize.textContent =
      Math.max(1, Math.round(file.size / 1024)) + " KB";

    selectedFile.hidden = false;

    formMessage.className = "wizard-message";
    formMessage.textContent = "";
  });

  removeFile.addEventListener("click", function () {
    attachment.value = "";
    selectedFile.hidden = true;
  });

  function readDraft() {
    return {
      permitType: permitType.value, workTitle: workTitle.value,
      description: description.value, site: site.value, area: area.value,
      startDate: startDate.value, startTime: startTime.value,
      endDate: endDate.value, endTime: endTime.value,
      supervisor: supervisor.value, workerCount: workerCount.value
    };
  }
  function compatibleDraft(draft) {
    const matchesOption = input => !draft[input.id] || Array.from(input.options).some(option => option.value === draft[input.id]);
    return [permitType,site,supervisor].every(matchesOption) &&
      [startDate,startTime,endDate,endTime,workerCount].every(input => {
        if (!draft[input.id]) return true;
        const probe = input.cloneNode(false); probe.value = draft[input.id];
        return probe.value === draft[input.id];
      }) &&
      (!draft.area || (areasBySite[draft.site] || []).some(name => name.toLowerCase().replaceAll(' ', '-') === draft.area)) &&
      (!draft.workTitle || draft.workTitle.length <= 80) && (!draft.description || draft.description.length <= 500) &&
      [startDate,endDate].every(input => !draft[input.id] || /^\d{4}-\d{2}-\d{2}$/.test(draft[input.id])) &&
      [startTime,endTime].every(input => !draft[input.id] || /^\d{2}:\d{2}$/.test(draft[input.id]));
  }
  const draftRecovery = window.SafePermitDraft({form, fields:validationFields, read:readDraft, restore:loadDraftIntoForm, compatible:compatibleDraft});
  saveDraftButton.addEventListener("click", function () { draftRecovery.save(); });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    clearTimeout(continueTimer);
    if (draftRecovery.isBlocked()) return;
    validationSubmitted = true;
    validating = true;

    const errors = window.SafePermitData.validateBasicInfo(readDraft());
    validationFields.forEach(function (input) {
      if (errors[input.id]) setError(input, input.id + "Error", errors[input.id]);
      else clearError(input, input.id + "Error");
    });
    const valid = Object.keys(errors).length === 0;

    validating = false;
    updateErrorSummary();

    if (!valid) {
      formMessage.className = "wizard-message is-error";
      formMessage.textContent =
        "Please complete the required fields before continuing.";

      const firstInvalid = validationFields.find(input => input.getAttribute("aria-invalid") === "true");

      if (firstInvalid) {
        focusInvalid(firstInvalid);
      }

      return;
    }

    if (!draftRecovery.save()) return;
    formMessage.className = "wizard-message is-success";
    formMessage.textContent =
      "Basic information saved. Opening Risk Assessment...";

    const validatedDraft = JSON.stringify(readDraft());
    continueTimer = window.setTimeout(function () {
      if (JSON.stringify(readDraft()) !== validatedDraft) {
        formMessage.textContent = document.documentElement.lang === 'ar'
          ? 'تغيرت البيانات. اضغط متابعة مجددًا لإعادة التحقق.'
          : 'Information changed. Continue again to revalidate.';
        return;
      }
      draftRecovery.allowLeave();
      window.location.href = "../risk-assessment/";
    }, 500);
  });

  [
    [permitType, "permitTypeError", "Permit type"],
    [workTitle, "workTitleError", "Work title"],
    [description, "descriptionError", "Job description"],
    [site, "siteError", "Site"],
    [area, "areaError", "Area"],
    [supervisor, "supervisorError", "Supervisor"]
  ].forEach(function (item) {
    const input = item[0];
    const errorId = item[1];
    const label = item[2];

    input.addEventListener("change", function () {
      validateRequired(input, errorId, label);
    });
  });

  workerCount.addEventListener("input", validateWorkers);
  [startDate, startTime, endDate, endTime].forEach(function (input) {
    input.addEventListener("change", function () { if (validationSubmitted) validateSchedule(); });
  });

  updateSummary();
})();
