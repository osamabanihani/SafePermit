(function () {
  const sidebar = document.getElementById("workerSidebar");
  const overlay = document.getElementById("workerOverlay");
  const sidebarOpen = document.getElementById("sidebarOpen");
  const sidebarClose = document.getElementById("sidebarClose");

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

  const supervisorLabels = {
    "sup-001": "Ahmad Khalil",
    "sup-002": "Sarah Nasser",
    "sup-003": "Yousef Hamdan"
  };

  const checklistLabels = {
    ppe: "Required PPE is available and suitable",
    isolation: "Energy sources are isolated where required",
    loto: "LOTO requirements are confirmed",
    barricade: "Work area is barricaded and identified",
    tools: "Tools and equipment are fit for use",
    access: "Safe access and escape routes are available",
    lighting: "Lighting is adequate for the work",
    emergency: "Emergency arrangements are understood",
    housekeeping: "Housekeeping is acceptable",
    toolbox: "Toolbox talk will be completed before work"
  };

  let currentPermit = null;

  function startCorrection(permit) {
    if (!permit || permit.status !== "Returned for Correction") {
      return;
    }

    const context = {
      id: permit.id,
      startedAt: new Date().toISOString(),
      originalPermit: permit
    };

    try {
      localStorage.setItem("safePermitDraftBasicInfo", JSON.stringify(permit.basicInfo || {}));
      localStorage.setItem("safePermitDraftRiskAssessment", JSON.stringify(permit.riskAssessment || { hazards: [] }));
      localStorage.setItem("safePermitDraftSafetyChecklist", JSON.stringify(permit.safetyChecklist || { answers: [], confirmed: false }));
      localStorage.setItem("safePermitCorrectionContext", JSON.stringify(context));
    } catch (error) {
      return;
    }

    window.location.href = "../create-permit/basic-info/?mode=correction&id=" + encodeURIComponent(permit.id || "");
  }

  const correctionAction = document.getElementById("correctionAction");
  if (correctionAction) {
    correctionAction.addEventListener("click", function (event) {
      event.preventDefault();
      startCorrection(currentPermit);
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

  function parseStorage(key) {
    const value = localStorage.getItem(key);

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }

  function escapeHTML(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function titleCase(value) {
    if (!value) {
      return "—";
    }

    return String(value)
      .replaceAll("-", " ")
      .replace(/\b\w/g, function (letter) {
        return letter.toUpperCase();
      });
  }

  function formatDateTime(date, time) {
    if (!date && !time) {
      return "—";
    }

    if (!date) {
      return time;
    }

    const value = new Date(date + "T00:00:00");

    const dateText = value.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });

    return time ? dateText + " · " + time : dateText;
  }

  function formatTimestamp(value) {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function riskLevel(score) {
    if (!score) {
      return {
        label: "—",
        className: ""
      };
    }

    if (score <= 4) {
      return {
        label: "Low",
        className: "details-risk-chip--low"
      };
    }

    if (score <= 9) {
      return {
        label: "Medium",
        className: "details-risk-chip--medium"
      };
    }

    if (score <= 16) {
      return {
        label: "High",
        className: "details-risk-chip--high"
      };
    }

    return {
      label: "Critical",
      className: "details-risk-chip--critical"
    };
  }

  const demoPermits = {
    "PTW-1024": {
      id: "PTW-1024",
      basicInfo: { permitType: "electrical", workTitle: "Electrical Maintenance", description: "Electrical maintenance work in the Factory A maintenance room.", site: "factory-a", area: "maintenance-room", startDate: "2026-10-05", startTime: "09:40", endDate: "2026-10-05", endTime: "13:30", supervisor: "sup-001", workerCount: 3 },
      riskAssessment: { hazards: [
        { hazard: "Unexpected energization", initialScore: 15, residualScore: 6, controls: "Apply LOTO, verify zero energy, use insulated tools, and restrict access." },
        { hazard: "Arc flash exposure", initialScore: 12, residualScore: 6, controls: "Use suitable PPE and maintain approach boundaries." }
      ]},
      safetyChecklist: { answers: [
        { item: "ppe", answer: "yes" }, { item: "isolation", answer: "yes" }, { item: "loto", answer: "yes" }, { item: "barricade", answer: "yes" }, { item: "tools", answer: "yes" }, { item: "access", answer: "yes" }, { item: "emergency", answer: "yes" }, { item: "toolbox", answer: "yes" }
      ]},
      status: "Pending Safety Review",
      submittedAt: "2026-10-05T09:40:00"
    },
    "PTW-1019": {
      id: "PTW-1019",
      basicInfo: { permitType: "hot-work", workTitle: "Hot Work - Pipe Repair", description: "Controlled hot-work pipe repair in Plant B utility area.", site: "plant-b", area: "utility-area", startDate: "2026-10-03", startTime: "11:25", endDate: "2026-10-03", endTime: "15:30", supervisor: "sup-001", workerCount: 4 },
      riskAssessment: { hazards: [
        { hazard: "Fire and ignition", initialScore: 12, residualScore: 6, controls: "Remove combustibles, provide fire watch, extinguishers, and gas testing." }
      ]},
      safetyChecklist: { answers: [
        { item: "ppe", answer: "yes" }, { item: "barricade", answer: "yes" }, { item: "tools", answer: "yes" }, { item: "access", answer: "yes" }, { item: "emergency", answer: "yes" }, { item: "toolbox", answer: "yes" }
      ]},
      status: "Approved",
      submittedAt: "2026-10-03T11:25:00"
    },
    "PTW-1016": {
      id: "PTW-1016",
      basicInfo: { permitType: "height", workTitle: "Work at Height", description: "Roof-access work at Warehouse 2.", site: "warehouse-2", area: "roof-access", startDate: "2026-10-02", startTime: "14:15", endDate: "2026-10-02", endTime: "18:00", supervisor: "sup-001", workerCount: 3 },
      riskAssessment: { hazards: [
        { hazard: "Fall from height", initialScore: 15, residualScore: 10, controls: "Use full-body harnesses, approved anchor points, controlled access, and an exclusion zone." }
      ]},
      safetyChecklist: { answers: [
        { item: "ppe", answer: "yes" }, { item: "barricade", answer: "yes" }, { item: "tools", answer: "yes" }, { item: "access", answer: "yes" }, { item: "emergency", answer: "yes" }, { item: "toolbox", answer: "yes" }
      ]},
      status: "Returned for Correction",
      submittedAt: "2026-10-02T14:15:00"
    },
    "PTW-1013": {
      id: "PTW-1013",
      basicInfo: { permitType: "confined", workTitle: "Confined Space Entry", description: "Inspection work inside Tank 04 at Tank Farm.", site: "tank-farm", area: "tank-04", startDate: "2026-10-01", startTime: "08:30", endDate: "2026-10-01", endTime: "12:00", supervisor: "sup-001", workerCount: 3 },
      riskAssessment: { hazards: [
        { hazard: "Oxygen deficiency", initialScore: 20, residualScore: 8, controls: "Continuous gas testing, ventilation, standby attendant, and rescue plan." }
      ]},
      safetyChecklist: { answers: [
        { item: "ppe", answer: "yes" }, { item: "isolation", answer: "yes" }, { item: "loto", answer: "yes" }, { item: "barricade", answer: "yes" }, { item: "access", answer: "yes" }, { item: "emergency", answer: "yes" }, { item: "toolbox", answer: "yes" }
      ]},
      status: "Pending Supervisor Review",
      submittedAt: "2026-10-01T08:30:00"
    },
    "PTW-1009": {
      id: "PTW-1009",
      basicInfo: { permitType: "general", workTitle: "Routine Inspection", description: "Routine inspection on the Factory A production floor.", site: "factory-a", area: "production-floor", startDate: "2026-09-29", startTime: "10:05", endDate: "2026-09-29", endTime: "12:00", supervisor: "sup-001", workerCount: 2 },
      riskAssessment: { hazards: [
        { hazard: "Slips and trips", initialScore: 4, residualScore: 2, controls: "Maintain housekeeping and keep access routes clear." }
      ]},
      safetyChecklist: { answers: [
        { item: "ppe", answer: "yes" }, { item: "tools", answer: "yes" }, { item: "access", answer: "yes" }, { item: "housekeeping", answer: "yes" }
      ]},
      status: "Approved",
      submittedAt: "2026-09-29T10:05:00"
    }
  };

  function findSubmittedPermit(id) {
    let permits = [];

    try {
      permits = JSON.parse(localStorage.getItem("safePermitSubmittedPermits") || "[]");
      if (!Array.isArray(permits)) permits = [];
    } catch (error) {
      permits = [];
    }

    let permit = permits.find(function (item) {
      return item && item.id === id;
    });

    if (permit) return permit;

    try {
      const latest = JSON.parse(localStorage.getItem("safePermitSubmittedPermit") || "null");
      if (latest && (!id || latest.id === id)) return latest;
    } catch (error) {
    }

    return null;
  }

  function renderApprovalFlow(submitted) {
    const steps = Array.from(
      document.querySelectorAll(".details-approval-step")
    );
    const lines = Array.from(
      document.querySelectorAll(".details-approval-line")
    );

    const stageNames = ["Worker", "Supervisor Review", "Safety Review", "Admin Approval"];
    const defaultNotes = ["Permit submitted", "Waiting", "Waiting", "Waiting"];

    steps.forEach(function (step, index) {
      step.classList.remove("is-complete", "is-current");

      const marker = step.querySelector(":scope > span");
      const note = step.querySelector("small");

      if (marker) marker.textContent = String(index + 1);
      if (note) note.textContent = defaultNotes[index];
    });

    lines.forEach(function (line) {
      line.classList.remove("is-complete");
    });

    function complete(index, noteText) {
      const step = steps[index];
      if (!step) return;
      step.classList.add("is-complete");
      const marker = step.querySelector(":scope > span");
      const note = step.querySelector("small");
      if (marker) marker.textContent = "✓";
      if (note) note.textContent = noteText || "Completed";
      if (index > 0 && lines[index - 1]) lines[index - 1].classList.add("is-complete");
    }

    function current(index, noteText) {
      const step = steps[index];
      if (!step) return;
      step.classList.add("is-current");
      const note = step.querySelector("small");
      if (note) note.textContent = noteText || "Current stage";
    }

    const status = submitted.status || "Pending Supervisor Review";
    const supervisorDecision = submitted.supervisorDecision || null;
    const safetyDecision = submitted.safetyDecision || null;
    const adminDecision = submitted.adminDecision || null;

    // A stage is shown as approved only with a documented, permit-linked decision.
    function approvedStep(index, role, noteText) {
      if (window.SafePermitData && typeof window.SafePermitData.hasApprovalEvidence === "function" &&
          window.SafePermitData.hasApprovalEvidence(submitted, role)) {
        complete(index, noteText);
        return;
      }
      const step = steps[index];
      const note = step && step.querySelector("small");
      if (note) note.textContent = "Evidence missing";
    }

    complete(0, "Permit submitted");

    if (status === "Stopped") {
      current(3, "Stopped — authorized resume required");
      return;
    }

    if (status === "Pending Supervisor Review") {
      current(1, "Current stage");
      return;
    }

    if (status === "Returned for Correction" || status === "Rejected") {
      if (adminDecision && adminDecision.newStatus === status) {
        approvedStep(1, "supervisor", "Supervisor approved");
        approvedStep(2, "safety", "Safety approved");
        current(3, status === "Rejected" ? "Rejected here" : "Returned here");
      } else if (safetyDecision && safetyDecision.newStatus === status) {
        approvedStep(1, "supervisor", "Supervisor approved");
        current(2, status === "Rejected" ? "Rejected here" : "Returned here");
      } else {
        current(1, status === "Rejected" ? "Rejected here" : "Returned here");
      }
      return;
    }

    approvedStep(1, "supervisor", "Supervisor approved");

    if (status === "Pending Safety Review") {
      current(2, "Current stage");
      return;
    }

    approvedStep(2, "safety", "Safety approved");

    if (status === "Pending Admin Approval") {
      current(3, "Current stage");
      return;
    }

    if (["Approved", "Active", "Completed", "Closed"].includes(status)) {
      approvedStep(3, "admin", status === "Approved" ? "Approved" : status);
      return;
    }

    current(3, "Current stage");
  }

  function renderPermit() {
    const params = new URLSearchParams(window.location.search);
    const requestedId = params.get("id");

    // A stored permit, or a built-in sample only in the labelled demo mode; never drafts dressed up as a permit.
    const permitState = window.SafePermitPermitState;
    const stored = requestedId ? findSubmittedPermit(requestedId) : parseStorage("safePermitSubmittedPermit");
    const sample = !stored && requestedId && permitState && permitState.demoRequested() ? demoPermits[requestedId] || null : null;
    const submitted = stored || sample;

    if (!submitted) {
      if (permitState) permitState.showNotFound({ id: requestedId || "", backHref: "../permits/", backLabel: "Back to My Permits" });
      return;
    }

    if (sample && permitState) permitState.showDemoBanner();

    currentPermit = submitted;

    const basic = submitted.basicInfo || {};
    const risk = submitted.riskAssessment || {};
    const checklist = submitted.safetyChecklist || {};

    const permitType =
      permitTypeLabels[basic.permitType] ||
      titleCase(basic.permitType);

    const site =
      siteLabels[basic.site] ||
      titleCase(basic.site);

    const area = titleCase(basic.area);

    const supervisor =
      supervisorLabels[basic.supervisor] ||
      titleCase(basic.supervisor);

    const status =
      submitted.status || "Pending Supervisor Review";

    document.getElementById("permitId").textContent =
      submitted.id || "PTW-0000";

    document.getElementById("permitType").textContent =
      permitType;

    document.getElementById("workTitle").textContent =
      basic.workTitle || "Permit Details";

    document.getElementById("workDescription").textContent =
      basic.description || "No work description available.";

    document.getElementById("locationText").textContent =
      site !== "—" && area !== "—"
        ? site + " · " + area
        : site;

    document.getElementById("scheduleText").textContent =
      formatDateTime(basic.startDate, basic.startTime) +
      " → " +
      formatDateTime(basic.endDate, basic.endTime);

    document.getElementById("permitStatus").textContent =
      status;

    document.getElementById("recordStatus").textContent =
      status;

    document.getElementById("infoPermitType").textContent =
      permitType;

    document.getElementById("infoSupervisor").textContent =
      supervisor;

    document.getElementById("infoSite").textContent =
      site;

    document.getElementById("infoArea").textContent =
      area;

    document.getElementById("infoStart").textContent =
      formatDateTime(basic.startDate, basic.startTime);

    document.getElementById("infoEnd").textContent =
      formatDateTime(basic.endDate, basic.endTime);

    document.getElementById("infoWorkers").textContent =
      basic.workerCount || "—";

    if (correctionAction) {
      correctionAction.hidden = status !== "Returned for Correction";
      correctionAction.setAttribute("aria-disabled", status === "Returned for Correction" ? "false" : "true");
    }

    const submittedText = formatTimestamp(submitted.resubmittedAt || submitted.submittedAt);

    document.getElementById("infoSubmitted").textContent =
      submittedText;

    document.getElementById("recordSubmitted").textContent =
      submittedText;

    document.querySelectorAll(
      ".details-track-link, .details-full-trail"
    ).forEach(function (link) {
      link.href = "../approval-tracking/?id=" + encodeURIComponent(submitted.id);
    });

    renderApprovalFlow(submitted);
    renderRisk(risk);
    renderChecklist(checklist);
  }

  function renderRisk(risk) {
    const hazards =
      risk && Array.isArray(risk.hazards)
        ? risk.hazards
        : [];

    const container = document.getElementById("hazardList");
    const empty = document.getElementById("hazardEmpty");

    document.getElementById("hazardCount").textContent =
      hazards.length === 1
        ? "1 hazard"
        : hazards.length + " hazards";

    if (hazards.length === 0) {
      empty.hidden = false;
      return;
    }

    empty.hidden = true;

    let maxInitial = 0;
    let maxResidual = 0;

    hazards.forEach(function (hazard, index) {
      const initialScore =
        Number(hazard.initialScore) || 0;

      const residualScore =
        Number(hazard.residualScore) || 0;

      maxInitial = Math.max(maxInitial, initialScore);
      maxResidual = Math.max(maxResidual, residualScore);

      const initial = riskLevel(initialScore);
      const residual = riskLevel(residualScore);

      const card = document.createElement("article");
      card.className = "details-hazard";

      card.innerHTML =
        '<div class="details-hazard__top">' +
          '<strong>Hazard ' + (index + 1) + ' · ' +
            escapeHTML(hazard.hazard || "Unnamed hazard") +
          '</strong>' +
          '<div class="details-hazard__chips">' +
            '<span class="details-risk-chip ' + initial.className + '">' +
              'Initial ' + (initialScore || "—") + ' · ' + initial.label +
            '</span>' +
            '<span class="details-risk-chip ' + residual.className + '">' +
              'Residual ' + (residualScore || "—") + ' · ' + residual.label +
            '</span>' +
          '</div>' +
        '</div>' +
        '<div class="details-hazard__control">' +
          '<span>Control Measures</span>' +
          '<p>' + escapeHTML(hazard.controls || "—") + '</p>' +
        '</div>';

      container.appendChild(card);
    });

    const initialLevel = riskLevel(maxInitial);
    const residualLevel = riskLevel(maxResidual);

    document.getElementById("highestInitialRisk").textContent =
      maxInitial
        ? maxInitial + " · " + initialLevel.label
        : "—";

    document.getElementById("highestResidualRisk").textContent =
      maxResidual
        ? maxResidual + " · " + residualLevel.label
        : "—";

    document.getElementById("residualRisk").textContent =
      maxResidual
        ? residualLevel.label + " · " + maxResidual
        : "—";
  }

  function renderChecklist(checklist) {
    const answers =
      checklist && Array.isArray(checklist.answers)
        ? checklist.answers
        : [];

    const container =
      document.getElementById("checklistList");

    const empty =
      document.getElementById("checklistEmpty");

    if (answers.length === 0) {
      empty.hidden = false;
      return;
    }

    empty.hidden = true;

    let complete = 0;

    answers.forEach(function (answer) {
      if (answer.answer) {
        complete += 1;
      }

      const row = document.createElement("div");
      row.className = "details-checklist-item";

      let className = "details-checklist-answer--na";

      if (answer.answer === "yes") {
        className = "details-checklist-answer--yes";
      }

      if (answer.answer === "no") {
        className = "details-checklist-answer--no";
      }

      const text =
        answer.answer
          ? answer.answer.toUpperCase()
          : "—";

      row.innerHTML =
        "<strong>" +
          escapeHTML(
            checklistLabels[answer.item] ||
            titleCase(answer.item)
          ) +
        "</strong>" +
        '<span class="details-checklist-answer ' +
          className +
        '">' +
          escapeHTML(text) +
        "</span>";

      container.appendChild(row);
    });

    document.getElementById("checklistCount").textContent =
      complete + " / " + answers.length + " complete";
  }

  renderPermit();
})();
