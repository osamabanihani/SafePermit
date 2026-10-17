(function () {
  const sidebar = document.getElementById("safetySidebar");
  const overlay = document.getElementById("safetyOverlay");
  const sidebarOpen = document.getElementById("sidebarOpen");
  const sidebarClose = document.getElementById("sidebarClose");

  const decisionInputs = document.querySelectorAll(
    'input[name="safetyDecision"]'
  );

  const comment = document.getElementById("safetyComment");
  const commentCount = document.getElementById("commentCount");
  const commentError = document.getElementById("commentError");
  const commentRequiredLabel = document.getElementById("commentRequiredLabel");
  const confirmation = document.getElementById("safetyConfirmation");
  const submitDecisionButton = document.getElementById("submitDecisionButton");
  const reviewMessage = document.getElementById("reviewMessage");

  const modal = document.getElementById("decisionModal");
  const modalIcon = document.getElementById("decisionModalIcon");
  const modalTitle = document.getElementById("decisionModalTitle");
  const modalText = document.getElementById("decisionModalText");
  const modalStatus = document.getElementById("decisionModalStatus");

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

  const demoPermits = {
    "PTW-1042": {
      id: "PTW-1042",
      status: "Pending Safety Review",
      submittedAt: "2026-10-06T18:15:00",
      basicInfo: {
        permitType: "confined",
        workTitle: "Tank Internal Inspection",
        description:
          "Internal inspection and minor maintenance inside Tank 04 before return to service.",
        site: "tank-farm",
        area: "Tank 04",
        startDate: "2026-10-06",
        startTime: "23:30",
        endDate: "2026-10-07",
        endTime: "02:30",
        supervisor: "sup-001",
        workerName: "Omar Worker",
        workerCount: 3
      },
      riskAssessment: {
        hazards: [
          {
            hazard: "Oxygen deficiency",
            initialScore: 20,
            controls:
              "Continuous gas testing, forced ventilation, standby attendant, rescue plan, and confined-space entry equipment.",
            residualScore: 17
          },
          {
            hazard: "Restricted access and egress",
            initialScore: 12,
            controls:
              "Dedicated attendant, clear access path, tripod, retrieval equipment, and emergency communication.",
            residualScore: 6
          },
          {
            hazard: "Unexpected process release",
            initialScore: 15,
            controls:
              "Positive isolation, LOTO, drain and depressurize, then verify isolation before entry.",
            residualScore: 4
          }
        ]
      },
      safetyChecklist: {
        confirmed: true,
        answers: [
          { item: "Required PPE is available and suitable", required: true, answer: "Yes", comment: "" },
          { item: "Energy sources are isolated where required", required: true, answer: "Yes", comment: "" },
          { item: "LOTO requirements are confirmed", required: true, answer: "Yes", comment: "" },
          { item: "Work area is barricaded and identified", required: true, answer: "Yes", comment: "" },
          { item: "Tools and equipment are fit for use", required: true, answer: "Yes", comment: "" },
          { item: "Safe access and escape routes are available", required: true, answer: "Yes", comment: "" },
          { item: "Emergency arrangements are understood", required: true, answer: "Yes", comment: "" },
          { item: "Toolbox talk completed", required: true, answer: "Yes", comment: "" }
        ]
      },
      supervisorDecision: {
        reviewer: "Ahmad Khalil",
        decision: "approve",
        comment:
          "Operational scope verified. Team and work schedule are acceptable for Safety Review."
      }
    },

    "PTW-1039": {
      id: "PTW-1039",
      status: "Pending Safety Review",
      basicInfo: {
        permitType: "electrical",
        workTitle: "Electrical Panel Maintenance",
        description:
          "Inspection and maintenance of electrical distribution equipment under an approved isolation plan.",
        site: "factory-a",
        area: "Electrical Room",
        startDate: "2026-10-07",
        startTime: "08:00",
        endDate: "2026-10-07",
        endTime: "13:00",
        supervisor: "sup-001",
        workerName: "Layla Hassan",
        workerCount: 3
      },
      riskAssessment: {
        hazards: [
          {
            hazard: "Unexpected energization",
            initialScore: 16,
            controls:
              "Isolation, lockout/tagout, test for dead, and controlled access.",
            residualScore: 12
          },
          {
            hazard: "Arc flash",
            initialScore: 15,
            controls:
              "Correct arc-rated PPE, insulated tools, and exclusion boundary.",
            residualScore: 8
          }
        ]
      },
      safetyChecklist: {
        confirmed: true,
        answers: [
          { item: "Required PPE is available and suitable", required: true, answer: "Yes", comment: "" },
          { item: "Energy sources are isolated where required", required: true, answer: "Yes", comment: "" },
          { item: "LOTO requirements are confirmed", required: true, answer: "Yes", comment: "" },
          { item: "Emergency arrangements are understood", required: true, answer: "Yes", comment: "" }
        ]
      },
      supervisorDecision: {
        reviewer: "Ahmad Khalil",
        decision: "approve",
        comment: "Isolation plan and work team verified."
      }
    },

    "PTW-1037": {
      id: "PTW-1037",
      status: "Pending Safety Review",
      basicInfo: {
        permitType: "hot-work",
        workTitle: "Hot Work - Pipe Repair",
        description:
          "Controlled pipe repair using hot-work equipment in the Plant B utility area.",
        site: "plant-b",
        area: "Utility Area",
        startDate: "2026-10-07",
        startTime: "10:00",
        endDate: "2026-10-07",
        endTime: "15:00",
        supervisor: "sup-001",
        workerName: "Yazan Saleh",
        workerCount: 4
      },
      riskAssessment: {
        hazards: [
          {
            hazard: "Fire and ignition",
            initialScore: 12,
            controls:
              "Remove combustibles, provide extinguisher, maintain fire watch, and barricade area.",
            residualScore: 8
          },
          {
            hazard: "Hot surfaces",
            initialScore: 8,
            controls:
              "Heat-resistant PPE, cool-down time, and warning signs.",
            residualScore: 4
          }
        ]
      },
      safetyChecklist: {
        confirmed: true,
        answers: [
          { item: "Required PPE is available and suitable", required: true, answer: "Yes", comment: "" },
          { item: "Work area is barricaded and identified", required: true, answer: "Yes", comment: "" },
          { item: "Emergency arrangements are understood", required: true, answer: "Yes", comment: "" }
        ]
      },
      supervisorDecision: {
        reviewer: "Ahmad Khalil",
        decision: "approve",
        comment: "Operational scope and site coordination verified."
      }
    },

    "PTW-1033": {
      id: "PTW-1033",
      status: "Pending Safety Review",
      basicInfo: {
        permitType: "height",
        workTitle: "Roof Access Inspection",
        description:
          "Inspection activity on Warehouse 2 roof using approved access and fall protection.",
        site: "warehouse-2",
        area: "Roof Access",
        startDate: "2026-10-08",
        startTime: "07:30",
        endDate: "2026-10-08",
        endTime: "11:30",
        supervisor: "sup-001",
        workerName: "Nour Ali",
        workerCount: 2
      },
      riskAssessment: {
        hazards: [
          {
            hazard: "Fall from height",
            initialScore: 12,
            controls:
              "Full-body harness, approved anchors, controlled roof access, and exclusion zone.",
            residualScore: 6
          },
          {
            hazard: "Dropped objects",
            initialScore: 8,
            controls:
              "Tool lanyards and barricaded drop zone.",
            residualScore: 4
          }
        ]
      },
      safetyChecklist: {
        confirmed: true,
        answers: [
          { item: "Required PPE is available and suitable", required: true, answer: "Yes", comment: "" },
          { item: "Safe access and escape routes are available", required: true, answer: "Yes", comment: "" },
          { item: "Emergency arrangements are understood", required: true, answer: "Yes", comment: "" }
        ]
      },
      supervisorDecision: {
        reviewer: "Ahmad Khalil",
        decision: "approve",
        comment: "Roof access and team arrangements verified."
      }
    }
  };

  let currentPermit = null;
  let isDemoSample = false;

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

  function getPermitType(value) {
    return permitTypeLabels[value] || titleCase(value) || "Permit";
  }

  function getSite(value) {
    return siteLabels[value] || titleCase(value) || "Site";
  }

  function getSupervisor(value) {
    return supervisorLabels[value] || value || "Ahmad Khalil";
  }

  function getRisk(score) {
    const number = Number(score) || 0;
    // A missing or out-of-range score is not low risk (matches Admin Review).
    if (number < 1 || number > 25) return { label: "Not Assessed", className: "unknown" };

    if (number >= 17) {
      return { label: "Critical", className: "critical" };
    }

    if (number >= 10) {
      return { label: "High", className: "high" };
    }

    if (number >= 5) {
      return { label: "Medium", className: "medium" };
    }

    return { label: "Low", className: "low" };
  }

  function getHighestScore(hazards, field) {
    return hazards.reduce(function (max, hazard) {
      return Math.max(max, Number(hazard[field]) || 0);
    }, 0);
  }

  function formatDateTime(dateValue, timeValue) {
    if (!dateValue) {
      return timeValue || "—";
    }

    const date = new Date(dateValue + "T" + (timeValue || "00:00"));

    if (Number.isNaN(date.getTime())) {
      return dateValue + (timeValue ? " · " + timeValue : "");
    }

    return (
      date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric"
      }) +
      (timeValue ? " · " + timeValue : "")
    );
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getPermitFromStorageById(id) {
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
      const permit = JSON.parse(
        localStorage.getItem("safePermitSubmittedPermit") || "null"
      );

      if (permit && permit.id === id) {
        return permit;
      }
    } catch (error) {
    }

    try {
      const permit = JSON.parse(
        localStorage.getItem("safePermitSafetySelectedPermit") || "null"
      );

      if (permit && permit.id === id && permit.basicInfo) {
        return permit;
      }
    } catch (error) {
    }

    return null;
  }

  function resolvePermit() {
    const params = new URLSearchParams(window.location.search);
    const requestedId = params.get("id");

    if (requestedId) {
      const stored = getPermitFromStorageById(requestedId);

      if (stored) {
        return stored;
      }

      if (demoPermits[requestedId] && window.SafePermitPermitState && window.SafePermitPermitState.demoRequested()) {
        isDemoSample = true;
        return clone(demoPermits[requestedId]);
      }

      return null;
    }

    const selected = localStorage.getItem("safePermitSafetySelectedPermit");

    if (selected) {
      try {
        const parsed = JSON.parse(selected);

        if (parsed && parsed.id) {
          const full = getPermitFromStorageById(parsed.id);

          if (full) {
            return full;
          }
        }
      } catch (error) {
      }
    }

    return null;
  }

  function renderHazards(permit) {
    const hazards =
      permit.riskAssessment &&
      Array.isArray(permit.riskAssessment.hazards)
        ? permit.riskAssessment.hazards
        : [];

    const list = document.getElementById("hazardList");
    const hazardCount = document.getElementById("hazardCount");

    list.innerHTML = "";
    hazardCount.textContent =
      hazards.length === 1
        ? "1 hazard"
        : hazards.length + " hazards";

    if (hazards.length === 0) {
      list.innerHTML =
        '<article class="safety-hazard">' +
          '<div class="safety-hazard__control">' +
            '<span>Risk Assessment</span>' +
            '<p>No hazard records were found for this permit.</p>' +
          '</div>' +
        '</article>';

      return;
    }

    hazards.forEach(function (hazard, index) {
      const initialScore = Number(hazard.initialScore) || 0;
      const residualScore = Number(hazard.residualScore) || 0;

      const initialRisk = getRisk(initialScore);
      const residualRisk = getRisk(residualScore);

      const article = document.createElement("article");
      article.className = "safety-hazard";

      article.innerHTML =
        '<div class="safety-hazard__top">' +
          '<strong>Hazard ' + (index + 1) + ' · ' +
            escapeHTML(hazard.hazard || "Identified hazard") +
          '</strong>' +
          '<div class="safety-hazard__chips">' +
            '<span class="safety-risk safety-risk--' + initialRisk.className + '">' +
              'Initial ' + initialScore + ' · ' + initialRisk.label +
            '</span>' +
            '<span class="safety-risk safety-risk--' + residualRisk.className + '">' +
              'Residual ' + residualScore + ' · ' + residualRisk.label +
            '</span>' +
          '</div>' +
        '</div>' +
        '<div class="safety-hazard__control">' +
          '<span>Control Measures</span>' +
          '<p>' + escapeHTML(hazard.controls || "No control measures provided.") + '</p>' +
        '</div>';

      list.appendChild(article);
    });
  }

  function renderChecklist(permit) {
    const answers =
      permit.safetyChecklist &&
      Array.isArray(permit.safetyChecklist.answers)
        ? permit.safetyChecklist.answers
        : [];

    const list = document.getElementById("checklistList");
    const count = document.getElementById("checklistCount");

    list.innerHTML = "";

    const answered = answers.filter(function (item) {
      return item.answer;
    }).length;

    count.textContent = answered + " / " + answers.length + " answered";

    if (answers.length === 0) {
      list.innerHTML =
        '<div class="safety-checklist-item">' +
          '<div><strong>No checklist data available</strong>' +
          '<small>Safety verification required</small></div>' +
          '<span class="safety-answer safety-answer--no">MISSING</span>' +
        '</div>';

      return;
    }

    answers.forEach(function (item) {
      const value = String(item.answer || "").toLowerCase();

      let answerClass = "na";
      let label = "N/A";

      if (value === "yes") {
        answerClass = "yes";
        label = "YES";
      } else if (value === "no") {
        answerClass = "no";
        label = "NO";
      }

      const row = document.createElement("div");
      row.className = "safety-checklist-item";

      row.innerHTML =
        '<div>' +
          '<strong>' + escapeHTML(item.item || "Checklist item") + '</strong>' +
          '<small>' + (item.required ? "Mandatory" : "Optional") + '</small>' +
          (
            item.comment
              ? '<p class="safety-checklist-comment">' + escapeHTML(item.comment) + '</p>'
              : ''
          ) +
        '</div>' +
        '<span class="safety-answer safety-answer--' + answerClass + '">' +
          label +
        '</span>';

      list.appendChild(row);
    });
  }

  function checklistState(permit) {
    const answers =
      permit.safetyChecklist &&
      Array.isArray(permit.safetyChecklist.answers)
        ? permit.safetyChecklist.answers
        : [];

    const hasNo = answers.some(function (item) {
      return String(item.answer || "").toLowerCase() === "no";
    });

    const hasMissingRequired = answers.some(function (item) {
      return item.required && !item.answer;
    });

    return hasNo || hasMissingRequired
      ? "Needs Attention"
      : "Ready";
  }

  function renderPermit(permit) {
    const basic = permit.basicInfo || {};
    const hazards =
      permit.riskAssessment &&
      Array.isArray(permit.riskAssessment.hazards)
        ? permit.riskAssessment.hazards
        : [];

    const highestInitial = getHighestScore(hazards, "initialScore");
    const highestResidual = getHighestScore(hazards, "residualScore");

    const initialRisk = getRisk(highestInitial);
    const residualRisk = getRisk(highestResidual);

    const permitType = getPermitType(basic.permitType);
    const site = getSite(basic.site);
    const area = titleCase(basic.area) || "Area";
    const worker = basic.workerName || "Omar Worker";
    const supervisor =
      permit.supervisorDecision &&
      permit.supervisorDecision.reviewer
        ? permit.supervisorDecision.reviewer
        : getSupervisor(basic.supervisor);

    document.getElementById("permitId").textContent = permit.id;
    document.getElementById("permitType").textContent = permitType;
    document.getElementById("workTitle").textContent =
      basic.workTitle || permitType;
    document.getElementById("workDescription").textContent =
      basic.description || "No work description provided.";

    document.getElementById("workerMeta").textContent =
      "Worker: " + worker;

    document.getElementById("locationMeta").textContent =
      site + " · " + area;

    document.getElementById("scheduleMeta").textContent =
      formatDateTime(basic.startDate, basic.startTime) +
      " → " +
      formatDateTime(basic.endDate, basic.endTime);

    document.getElementById("permitStatus").textContent =
      permit.status || "Pending Safety Review";

    const heroRisk = document.getElementById("heroResidualRisk");
    heroRisk.textContent = residualRisk.label;
    heroRisk.className =
      "safety-risk safety-risk--" + residualRisk.className;

    document.getElementById("infoPermitType").textContent = permitType;
    document.getElementById("infoWorker").textContent = worker;
    document.getElementById("infoSite").textContent = site;
    document.getElementById("infoArea").textContent = area;
    document.getElementById("infoStart").textContent =
      formatDateTime(basic.startDate, basic.startTime);
    document.getElementById("infoEnd").textContent =
      formatDateTime(basic.endDate, basic.endTime);
    document.getElementById("infoWorkers").textContent =
      basic.workerCount || "—";
    document.getElementById("infoSupervisor").textContent = supervisor;

    document.getElementById("supervisorComment").textContent =
      permit.supervisorDecision &&
      permit.supervisorDecision.comment
        ? permit.supervisorDecision.comment
        : "Supervisor approved the permit for Safety Review.";

    document.getElementById("initialRiskSummary").textContent =
      highestInitial + " · " + initialRisk.label;

    document.getElementById("residualRiskSummary").textContent =
      highestResidual + " · " + residualRisk.label;

    const riskAlert = document.getElementById("riskAlert");

    if (
      residualRisk.className === "low" ||
      residualRisk.className === "medium"
    ) {
      riskAlert.classList.add("is-low");
      riskAlert.querySelector("strong").textContent =
        "Residual risk is reduced, but controls still require verification.";
      riskAlert.querySelector("p").textContent =
        "Confirm that the listed controls are practical and available before approving.";
    } else {
      riskAlert.classList.remove("is-low");
      riskAlert.querySelector("strong").textContent =
        "Elevated residual risk requires careful verification.";
      riskAlert.querySelector("p").textContent =
        "Confirm that the listed controls are practical, available, and sufficient before approving.";
    }

    document.getElementById("sideResidualRisk").textContent =
      residualRisk.label;
    document.getElementById("sideChecklistState").textContent =
      checklistState(permit);
    document.getElementById("sideWorker").textContent = worker;
    document.getElementById("sideSupervisor").textContent = supervisor;

    renderHazards(permit);
    renderChecklist(permit);

    const canReview = (permit.status || "Pending Safety Review") === "Pending Safety Review";

    decisionInputs.forEach(function (input) {
      input.disabled = !canReview;
    });

    confirmation.disabled = !canReview;
    comment.disabled = !canReview;
    submitDecisionButton.disabled = !canReview;

    if (!canReview) {
      reviewMessage.className = "safety-review-message is-error";
      reviewMessage.textContent = ["Draft", "Pending Supervisor Review"].includes(permit.status)
        ? "This permit has not reached Safety Review yet. Open it again after the Supervisor review is complete."
        : "This permit is no longer Pending Safety Review. Open it from the appropriate workflow stage instead.";
    }

    document.title = permit.id + " · Safety Review | SafePermit";
  }

  function getDecision() {
    const selected = document.querySelector(
      'input[name="safetyDecision"]:checked'
    );

    return selected ? selected.value : "";
  }

  function updateCommentRequirement() {
    const decision = getDecision();

    commentRequiredLabel.textContent = "(required)"; // Approval evidence requires a rationale.

    commentError.textContent = "";
    comment.classList.remove("is-invalid");
  }

  decisionInputs.forEach(function (input) {
    input.addEventListener("change", updateCommentRequirement);
  });
  updateCommentRequirement();

  comment.addEventListener("input", function () {
    commentCount.textContent = comment.value.length;

    if (comment.value.trim()) {
      commentError.textContent = "";
      comment.classList.remove("is-invalid");
    }
  });

  function getNewStatus(decision) {
    if (decision === "approve") {
      return "Pending Admin Approval";
    }

    if (decision === "return") {
      return "Returned for Correction";
    }

    return "Rejected";
  }

  function saveHistoryRecord(record) {
    const key = "safePermitSafetyDecisionHistory";
    let history = [];

    const stored = localStorage.getItem(key);

    if (stored) {
      try {
        const parsed = JSON.parse(stored);

        if (Array.isArray(parsed)) {
          history = parsed;
        }
      } catch (error) {
      }
    }

    history = history.filter(function (item) {
      return !(
        item.permitId === record.permitId &&
        item.reviewedAt === record.reviewedAt
      );
    });

    history.unshift(record);

    localStorage.setItem(key, JSON.stringify(history));
  }

  function updateSubmittedPermit(record) {
    try {
      let permits = JSON.parse(
        localStorage.getItem("safePermitSubmittedPermits") || "[]"
      );

      if (!Array.isArray(permits)) {
        permits = [];
      }

      let matched = false;

      permits = permits.map(function (permit) {
        if (!permit || permit.id !== record.permitId) {
          return permit;
        }

        matched = true;
        permit.status = record.newStatus;
        permit.safetyDecision = record;
        return permit;
      });

      if (matched) {
        localStorage.setItem(
          "safePermitSubmittedPermits",
          JSON.stringify(permits)
        );
      }
    } catch (error) {
    }

    try {
      const permit = JSON.parse(
        localStorage.getItem("safePermitSubmittedPermit") || "null"
      );

      if (permit && permit.id === record.permitId) {
        permit.status = record.newStatus;
        permit.safetyDecision = record;

        localStorage.setItem(
          "safePermitSubmittedPermit",
          JSON.stringify(permit)
        );
      }
    } catch (error) {
    }
  }

  async function saveDecision(decision) {
    if (decision === 'approve' && !window.SafePermitData?.getPermit(currentPermit.id)) {
      throw new Error('Canonical permit is required before approval.');
    }

    const newStatus = getNewStatus(decision);
    const basic = currentPermit.basicInfo || {};
    const hazards =
      currentPermit.riskAssessment &&
      Array.isArray(currentPermit.riskAssessment.hazards)
        ? currentPermit.riskAssessment.hazards
        : [];

    const residualScore = getHighestScore(hazards, "residualScore");
    const residualRisk = getRisk(residualScore);

    const record = {
      permitId: currentPermit.id,
      reviewer: "Sarah Nasser",
      role: "Safety Officer",
      decision: decision,
      comment: comment.value.trim(),
      previousStatus:
        currentPermit.status || "Pending Safety Review",
      newStatus: newStatus,
      reviewedAt: new Date().toISOString(),
      worker: basic.workerName || "Omar Worker",
      permitType: getPermitType(basic.permitType),
      site: getSite(basic.site),
      area: titleCase(basic.area) || "Area",
      residualRisk: residualRisk.label,
      residualRiskClass: residualRisk.className,
      residualScore: residualScore
    };


    if (decision === "approve" && window.SafePermitWorkflow) {
      const review = await window.SafePermitWorkflow.getReview(record.permitId);
      if (!review.eligibleForDemoApproval) throw new Error(review.blockers.join("; "));
    }
    if (window.SafePermitData.getPermit(record.permitId)) {
      await window.SafePermitData.repository.applyDecision(record, "safety");
    } else {
      // Promote an approved legacy demo permit to the canonical repository.
      // This persists the transition for BOTH Safety and Admin queues.
      const existing = window.SafePermitData.readKnownPermits().find(function (item) {
        return String(item.id) === String(record.permitId);
      });
      const initial = existing || currentPermit;
      if (initial.status !== "Pending Safety Review") {
        throw new Error("Invalid workflow transition: " + initial.status);
      }
      await window.SafePermitData.repository.savePermit(Object.assign({}, initial, {
        status: newStatus,
        safetyDecision: record
      }));
    }
    localStorage.setItem("safePermitSafetyDecision", JSON.stringify(record));
    saveHistoryRecord(record);

    currentPermit.status = newStatus;
    currentPermit.safetyDecision = record;

    localStorage.setItem(
      "safePermitSafetySelectedPermit",
      JSON.stringify(currentPermit)
    );

    return newStatus;
  }

  function showDecisionModal(decision, newStatus) {
    modalIcon.style.background = "";
    modalIcon.style.color = "";

    modalStatus.textContent = newStatus;

    if (decision === "approve") {
      modalIcon.textContent = "✓";
      modalTitle.textContent = "Permit moved to Admin Approval.";
      modalText.textContent =
        "Your Safety Review approval was recorded. Admin is now responsible for the final approval decision.";
    }

    if (decision === "return") {
      modalIcon.textContent = "↩";
      modalIcon.style.background = "var(--sp-warning-bg)";
      modalIcon.style.color = "var(--sp-warning)";
      modalTitle.textContent = "Permit returned for correction.";
      modalText.textContent =
        "The Worker must address the Safety Review comment and resubmit the permit through the workflow.";
    }

    if (decision === "reject") {
      modalIcon.textContent = "×";
      modalIcon.style.background = "var(--sp-danger-bg)";
      modalIcon.style.color = "var(--sp-danger)";
      modalTitle.textContent = "Permit rejected at Safety Review.";
      modalText.textContent =
        "The permit will not continue to Admin Approval.";
    }

    window.SafePermitCompletion.open(modal, submitDecisionButton);
  }

  submitDecisionButton.addEventListener("click", async function () {
    reviewMessage.className = "safety-review-message";
    reviewMessage.textContent = "";
    commentError.textContent = "";
    comment.classList.remove("is-invalid");

    const decision = getDecision();

    if (!decision) {
      reviewMessage.className =
        "safety-review-message is-error";
      reviewMessage.textContent =
        "Select Approve, Return for Correction, or Reject.";
      return;
    }

    if (!confirmation.checked) {
      reviewMessage.className =
        "safety-review-message is-error";
      reviewMessage.textContent =
        "Confirm that you reviewed the risk assessment and safety checklist.";
      return;
    }

    if (
      // Every decision, including approval, needs documented rationale.
      comment.value.trim().length < 5
    ) {
      comment.classList.add("is-invalid");
      commentError.textContent =
        "Add a clear safety reason before submitting this decision.";
      comment.focus();
      return;
    }

    submitDecisionButton.disabled = true;
    let recorded = false;
    try {
      const newStatus = await saveDecision(decision);
      recorded = true;
      showDecisionModal(decision, newStatus);
    } catch (error) {
      reviewMessage.className = "safety-review-message is-error";
      reviewMessage.textContent = "Decision not saved: " + (error.message || String(error));
    } finally {
      submitDecisionButton.disabled = recorded;
    }
  });

  currentPermit = resolvePermit();
  if (!currentPermit) {
    submitDecisionButton.disabled = true;
    if (window.SafePermitPermitState) window.SafePermitPermitState.showNotFound({ id: new URLSearchParams(location.search).get("id") || "", backHref: "../review-queue/", backLabel: "Back to Safety Queue" });
    return;
  }
  if (isDemoSample && window.SafePermitPermitState) window.SafePermitPermitState.showDemoBanner();
  renderPermit(currentPermit);
  if (window.SafePermitRoleAI) { window.SafePermitRoleAI.mount({ containerId: "aiRoleAssistant", role: "safety", permit: currentPermit }); }
})();
