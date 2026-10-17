(function () {
  const sidebar = document.getElementById("supervisorSidebar");
  const overlay = document.getElementById("supervisorOverlay");
  const sidebarOpen = document.getElementById("sidebarOpen");
  const sidebarClose = document.getElementById("sidebarClose");

  const decisionInputs = document.querySelectorAll('input[name="decision"]');
  const comment = document.getElementById("reviewComment");
  const commentCount = document.getElementById("commentCount");
  const commentError = document.getElementById("commentError");
  const commentRequiredLabel = document.getElementById("commentRequiredLabel");
  const submitDecisionButton = document.getElementById("submitDecisionButton");
  const reviewMessage = document.getElementById("reviewMessage");

  const modal = document.getElementById("decisionModal");
  const modalIcon = document.getElementById("decisionModalIcon");
  const modalTitle = document.getElementById("decisionModalTitle");
  const modalText = document.getElementById("decisionModalText");

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

  const demoPermits = {
    "PTW-1042": demoPermit("PTW-1042", "confined", "Tank Internal Inspection", "Internal inspection and minor maintenance inside Tank 04 before return to service.", "Omar Worker", "tank-farm", "tank-04", "2026-10-06", "23:30", "2026-10-07", "02:30", 3, [
      hazard("Oxygen deficiency", 20, 17, "Continuous gas testing, forced ventilation, standby attendant, and rescue plan."),
      hazard("Restricted access and egress", 12, 6, "Dedicated attendant, clear access path, tripod and retrieval equipment available."),
      hazard("Unexpected process release", 15, 4, "Positive isolation, LOTO, drain and depressurize tank, verify isolation before entry.")
    ]),
    "PTW-1039": demoPermit("PTW-1039", "electrical", "Electrical Maintenance", "Planned electrical maintenance in the Factory A electrical room.", "Layla Hassan", "factory-a", "electrical-room", "2026-10-07", "08:00", "2026-10-07", "12:00", 2, [
      hazard("Unexpected energization", 16, 12, "Apply LOTO, verify zero energy, and restrict access to authorized personnel."),
      hazard("Arc flash exposure", 12, 6, "Use suitable PPE, insulated tools, and maintain approach boundaries.")
    ]),
    "PTW-1037": demoPermit("PTW-1037", "hot-work", "Hot Work - Pipe Repair", "Pipe repair requiring controlled hot-work activities in Plant B.", "Yazan Saleh", "plant-b", "utility-area", "2026-10-07", "10:00", "2026-10-07", "14:00", 4, [
      hazard("Fire and ignition", 12, 6, "Remove combustibles, provide fire watch, extinguishers, and gas testing."),
      hazard("Hot surfaces", 8, 4, "Use gloves, barriers, and cool-down controls before handling.")
    ]),
    "PTW-1034": demoPermit("PTW-1034", "general", "General Maintenance", "Routine maintenance work at Warehouse 1 loading bay.", "Rami Nasser", "warehouse-1", "loading-bay", "2026-10-08", "13:00", "2026-10-08", "16:00", 2, [
      hazard("Moving equipment", 6, 3, "Coordinate with operations and isolate the immediate work area.")
    ]),
    "PTW-1033": demoPermit("PTW-1033", "height", "Work at Height", "Roof access inspection and minor maintenance at Warehouse 2.", "Nour Ali", "warehouse-2", "roof-access", "2026-10-09", "07:30", "2026-10-09", "11:30", 3, [
      hazard("Fall from height", 12, 6, "Use full-body harnesses, approved anchors, controlled access, and an exclusion zone.")
    ])
  };

  function hazard(name, initialScore, residualScore, controls) {
    return {
      hazard: name,
      initialScore: initialScore,
      residualScore: residualScore,
      controls: controls
    };
  }

  function demoPermit(id, permitType, workTitle, description, workerName, site, area, startDate, startTime, endDate, endTime, workerCount, hazards) {
    return {
      id: id,
      basicInfo: {
        permitType: permitType,
        workTitle: workTitle,
        description: description,
        workerName: workerName,
        site: site,
        area: area,
        startDate: startDate,
        startTime: startTime,
        endDate: endDate,
        endTime: endTime,
        workerCount: workerCount,
        supervisor: "sup-001"
      },
      riskAssessment: { hazards: hazards },
      safetyChecklist: {
        answers: [
          { item: "ppe", answer: "yes", required: true },
          { item: "isolation", answer: "yes", required: true },
          { item: "loto", answer: "yes", required: true },
          { item: "barricade", answer: "yes", required: true },
          { item: "tools", answer: "yes", required: true },
          { item: "access", answer: "yes", required: true },
          { item: "emergency", answer: "yes", required: true },
          { item: "toolbox", answer: "yes", required: true }
        ],
        confirmed: true
      },
      status: "Pending Supervisor Review",
      submittedAt: "2026-10-06T18:00:00"
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

  function titleCase(value) {
    if (!value) return "—";
    return String(value)
      .replaceAll("-", " ")
      .replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
  }

  function formatDateTime(date, time) {
    if (!date && !time) return "—";
    if (!date) return time;
    const value = new Date(date + "T00:00:00");
    const dateText = Number.isNaN(value.getTime()) ? date : value.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return time ? dateText + " · " + time : dateText;
  }

  function riskLevel(score) {
    if (score <= 4) return { label: "Low", className: "low" };
    if (score <= 9) return { label: "Medium", className: "medium" };
    if (score <= 16) return { label: "High", className: "high" };
    return { label: "Critical", className: "critical" };
  }

  function readPermitById(id) {
    let permits = [];
    try {
      permits = JSON.parse(localStorage.getItem("safePermitSubmittedPermits") || "[]");
      if (!Array.isArray(permits)) permits = [];
    } catch (error) {
      permits = [];
    }

    let found = permits.find(function (permit) { return permit && permit.id === id; });
    if (found) return found;

    try {
      const latest = JSON.parse(localStorage.getItem("safePermitSubmittedPermit") || "null");
      if (latest && latest.id === id) return latest;
    } catch (error) {
    }

    // Built-in samples only in the labelled demo mode; never another permit in place of the requested one.
    return window.SafePermitPermitState && window.SafePermitPermitState.demoRequested() ? demoPermits[id] || null : null;
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

  if (sidebarOpen) sidebarOpen.addEventListener("click", openSidebar);
  if (sidebarClose) sidebarClose.addEventListener("click", closeSidebar);
  if (overlay) overlay.addEventListener("click", closeSidebar);

  window.addEventListener("resize", function () {
    if (window.innerWidth > 820) closeSidebar();
  });

  function getDecision() {
    const selected = document.querySelector('input[name="decision"]:checked');
    return selected ? selected.value : "";
  }

  function updateCommentRequirement() {
    const decision = getDecision();
    commentRequiredLabel.textContent = "(required)"; // Approval evidence requires a rationale.
    commentError.textContent = "";
    comment.classList.remove("is-invalid");
  }

  decisionInputs.forEach(function (input) { input.addEventListener("change", updateCommentRequirement); });
  updateCommentRequirement();

  comment.addEventListener("input", function () {
    commentCount.textContent = comment.value.length;
    if (comment.value.trim()) {
      commentError.textContent = "";
      comment.classList.remove("is-invalid");
    }
  });

  function renderPermit(permit) {
    const basic = permit.basicInfo || {};
    const hazards = permit.riskAssessment && Array.isArray(permit.riskAssessment.hazards) ? permit.riskAssessment.hazards : [];
    const answers = permit.safetyChecklist && Array.isArray(permit.safetyChecklist.answers) ? permit.safetyChecklist.answers : [];
    const permitType = permitTypeLabels[basic.permitType] || titleCase(basic.permitType);
    const site = siteLabels[basic.site] || titleCase(basic.site);
    const area = titleCase(basic.area);
    const worker = basic.workerName || "Omar Worker";
    const supervisor = supervisorLabels[basic.supervisor] || titleCase(basic.supervisor) || "Ahmad Khalil";

    document.getElementById("permitId").textContent = permit.id;
    document.getElementById("permitType").textContent = permitType;
    document.getElementById("workTitle").textContent = basic.workTitle || permitType;
    document.getElementById("workDescription").textContent = basic.description || "No description provided.";
    document.getElementById("workerMeta").textContent = "Worker: " + worker;
    document.getElementById("locationMeta").textContent = site + " · " + area;
    document.getElementById("scheduleMeta").textContent = formatDateTime(basic.startDate, basic.startTime) + " → " + formatDateTime(basic.endDate, basic.endTime);
    document.getElementById("heroStatus").textContent = permit.status || "Pending Supervisor Review";

    document.getElementById("infoPermitType").textContent = permitType;
    document.getElementById("infoWorker").textContent = worker;
    document.getElementById("infoSite").textContent = site;
    document.getElementById("infoArea").textContent = area;
    document.getElementById("infoStart").textContent = formatDateTime(basic.startDate, basic.startTime);
    document.getElementById("infoEnd").textContent = formatDateTime(basic.endDate, basic.endTime);
    document.getElementById("infoWorkers").textContent = basic.workerCount || "—";
    document.getElementById("infoSupervisor").textContent = supervisor;
    document.getElementById("sideWorker").textContent = worker;
    document.getElementById("sideStart").textContent = formatDateTime(basic.startDate, basic.startTime);

    let maxInitial = 0;
    let maxResidual = 0;
    const hazardList = document.getElementById("hazardList");
    hazardList.innerHTML = "";

    hazards.forEach(function (item, index) {
      const initialScore = Number(item.initialScore) || 0;
      const residualScore = Number(item.residualScore) || 0;
      maxInitial = Math.max(maxInitial, initialScore);
      maxResidual = Math.max(maxResidual, residualScore);
      const initial = riskLevel(initialScore);
      const residual = riskLevel(residualScore);
      const card = document.createElement("article");
      card.className = "review-hazard";
      card.innerHTML =
        '<div class="review-hazard__top"><strong>Hazard ' + (index + 1) + ' · ' + escapeHTML(item.hazard || "Unnamed hazard") + '</strong>' +
        '<div class="review-hazard__chips"><span class="review-risk review-risk--' + initial.className + '">Initial ' + initialScore + ' · ' + initial.label + '</span>' +
        '<span class="review-risk review-risk--' + residual.className + '">Residual ' + residualScore + ' · ' + residual.label + '</span></div></div>' +
        '<div class="review-hazard__control"><span>Control Measures</span><p>' + escapeHTML(item.controls || "—") + '</p></div>';
      hazardList.appendChild(card);
    });

    document.getElementById("hazardCount").textContent = hazards.length === 1 ? "1 hazard" : hazards.length + " hazards";
    const initial = riskLevel(maxInitial || 1);
    const residual = riskLevel(maxResidual || 1);
    document.getElementById("initialRiskSummary").textContent = maxInitial ? maxInitial + " · " + initial.label : "—";
    document.getElementById("residualRiskSummary").textContent = maxResidual ? maxResidual + " · " + residual.label : "—";

    const heroRisk = document.getElementById("heroRisk");
    heroRisk.textContent = initial.label;
    heroRisk.className = "review-risk review-risk--" + initial.className;
    const sideInitial = document.getElementById("sideInitialRisk");
    sideInitial.textContent = initial.label;
    sideInitial.className = "review-risk review-risk--" + initial.className;
    const sideResidual = document.getElementById("sideResidualRisk");
    sideResidual.textContent = residual.label;
    sideResidual.className = "review-risk review-risk--" + residual.className;

    const checklistList = document.getElementById("checklistList");
    checklistList.innerHTML = "";
    let answered = 0;

    answers.forEach(function (answer) {
      if (answer.answer) answered += 1;
      const row = document.createElement("div");
      row.className = "review-checklist-item";
      const value = answer.answer ? answer.answer.toUpperCase() : "—";
      const answerClass = answer.answer === "yes" ? "yes" : answer.answer === "no" ? "no" : "na";
      row.innerHTML = '<strong>' + escapeHTML(checklistLabels[answer.item] || titleCase(answer.item)) + '</strong><span class="review-answer review-answer--' + answerClass + '">' + escapeHTML(value) + '</span>';
      checklistList.appendChild(row);
    });

    document.getElementById("checklistCount").textContent = answered + " / " + answers.length + " answered";
  }

  const params = new URLSearchParams(window.location.search);
  const requestedId = params.get("id") || "";
  const currentPermit = requestedId ? readPermitById(requestedId) : null;
  if (!currentPermit) {
    submitDecisionButton.disabled = true;
    if (window.SafePermitPermitState) window.SafePermitPermitState.showNotFound({ id: requestedId, backHref: "../review-queue/", backLabel: "Back to Review Queue" });
  } else {
    if (currentPermit === demoPermits[requestedId] && window.SafePermitPermitState) window.SafePermitPermitState.showDemoBanner();
    renderPermit(currentPermit);
    if (window.SafePermitRoleAI) { window.SafePermitRoleAI.mount({ containerId: "aiRoleAssistant", role: "supervisor", permit: currentPermit }); }
    document.getElementById("queuePosition").textContent = "Selected from Review Queue";
  }

  function updateStoredPermit(decisionRecord) {
    let permits = [];
    try {
      permits = JSON.parse(localStorage.getItem("safePermitSubmittedPermits") || "[]");
      if (!Array.isArray(permits)) permits = [];
    } catch (error) {
      permits = [];
    }

    let matched = false;
    permits = permits.map(function (permit) {
      if (permit && permit.id === decisionRecord.permitId) {
        matched = true;
        permit.status = decisionRecord.newStatus;
        permit.supervisorDecision = decisionRecord;
      }
      return permit;
    });

    if (matched) {
      localStorage.setItem("safePermitSubmittedPermits", JSON.stringify(permits));
    }

    try {
      const latest = JSON.parse(localStorage.getItem("safePermitSubmittedPermit") || "null");
      if (latest && latest.id === decisionRecord.permitId) {
        latest.status = decisionRecord.newStatus;
        latest.supervisorDecision = decisionRecord;
        localStorage.setItem("safePermitSubmittedPermit", JSON.stringify(latest));
      }
    } catch (error) {
    }
  }

  function appendDecisionHistory(decisionRecord) {
    let history = [];
    try {
      history = JSON.parse(localStorage.getItem("safePermitSupervisorDecisions") || "[]");
      if (!Array.isArray(history)) history = [];
    } catch (error) {
      history = [];
    }

    history.unshift(decisionRecord);
    history = history.filter(function (item, index, all) {
      return index === all.findIndex(function (candidate) {
        return candidate.permitId === item.permitId && candidate.reviewedAt === item.reviewedAt;
      });
    });

    localStorage.setItem("safePermitSupervisorDecisions", JSON.stringify(history));
    localStorage.setItem("safePermitSupervisorDecision", JSON.stringify(decisionRecord));
  }

  async function saveDecision(decision) {
    if (decision === 'approve' && !window.SafePermitData?.getPermit(currentPermit.id)) {
      throw new Error('Canonical permit is required before approval.');
    }

    const statusMap = {
      approve: "Pending Safety Review",
      return: "Returned for Correction",
      reject: "Rejected"
    };

    const decisionRecord = {
      permitId: currentPermit.id,
      reviewer: "Ahmad Khalil",
      role: "Supervisor",
      decision: decision,
      comment: comment.value.trim(),
      previousStatus:
        currentPermit.status || "Pending Supervisor Review",
      newStatus: statusMap[decision],
      reviewedAt: new Date().toISOString()
    };

    if (decision === "approve" && window.SafePermitWorkflow) {
      const review = await window.SafePermitWorkflow.getReview(decisionRecord.permitId);
      if (!review.eligibleForDemoApproval) throw new Error(review.blockers.join("; "));
    }
    if (window.SafePermitData.getPermit(decisionRecord.permitId)) {
      await window.SafePermitData.repository.applyDecision(decisionRecord, "supervisor");
    } else {
      updateStoredPermit(decisionRecord); // Legacy demo-only fallback; backend must reject unknown permits.
    }
    appendDecisionHistory(decisionRecord);
    return statusMap[decision];
  }

  function showSuccess(decision, newStatus) {
    modalIcon.className = "review-modal__icon";
    modalIcon.style.background = "";
    modalIcon.style.color = "";

    if (decision === "approve") {
      modalIcon.textContent = "✓";
      modalTitle.textContent = "Permit moved to Safety Review.";
      modalText.textContent = "Your operational approval was recorded. The permit status is now " + newStatus + ".";
    } else if (decision === "return") {
      modalIcon.textContent = "↩";
      modalIcon.style.background = "var(--sp-warning-bg)";
      modalIcon.style.color = "var(--sp-warning)";
      modalTitle.textContent = "Permit returned for correction.";
      modalText.textContent = "The Worker must address your comment and resubmit the permit.";
    } else {
      modalIcon.textContent = "×";
      modalIcon.style.background = "var(--sp-danger-bg)";
      modalIcon.style.color = "var(--sp-danger)";
      modalTitle.textContent = "Permit rejected.";
      modalText.textContent = "The permit request has been rejected and will not move to Safety Review.";
    }

    window.SafePermitCompletion.open(modal, submitDecisionButton);
  }

  submitDecisionButton.addEventListener("click", async function () {
    reviewMessage.className = "review-message";
    reviewMessage.textContent = "";
    commentError.textContent = "";
    comment.classList.remove("is-invalid");

    const decision = getDecision();
    if (!decision) {
      reviewMessage.className = "review-message is-error";
      reviewMessage.textContent = "Select Approve, Return for Correction, or Reject.";
      return;
    }

    if (comment.value.trim().length < 5) { // Every decision, including approval, needs documented rationale.
      comment.classList.add("is-invalid");
      commentError.textContent = "Add a clear reason before submitting this decision.";
      comment.focus();
      return;
    }

    submitDecisionButton.disabled = true;
    let recorded = false;
    try {
      const newStatus = await saveDecision(decision);
      recorded = true;
      showSuccess(decision, newStatus);
    } catch (error) {
      reviewMessage.className = "review-message is-error";
      reviewMessage.textContent = "Decision not saved: " + (error.message || String(error));
    } finally {
      submitDecisionButton.disabled = recorded;
    }
  });

  /* Signature Decision Motion */
  const signatureDecisionCard = document.querySelector("[data-decision-stage]");
  const signatureDecisionFlow = document.querySelector("[data-decision-flow]");
  const signatureReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const signatureConfirmation = null;

  function signatureSelectedDecision() {
    const selected = document.querySelector('input[name="decision"]:checked');
    return selected ? selected.value : "";
  }

  function signatureReplay(element, className, duration) {
    if (!element) return;
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);

    if (duration) {
      window.setTimeout(function () {
        element.classList.remove(className);
      }, duration);
    }
  }

  function signatureUpdateDecisionState() {
    const decision = signatureSelectedDecision();

    if (!signatureDecisionCard) return;

    signatureDecisionCard.classList.remove(
      "has-decision",
      "decision-approve",
      "decision-return",
      "decision-reject"
    );

    document.querySelectorAll(".review-decision-option").forEach(function (item) {
      item.classList.remove("is-selected");
    });

    if (decision) {
      signatureDecisionCard.classList.add("has-decision", "decision-" + decision);

      const selectedInput = document.querySelector(
        'input[name="decision"][value="' + decision + '"]'
      );

      if (selectedInput) {
        const selectedOption = selectedInput.closest(".review-decision-option");
        if (selectedOption) selectedOption.classList.add("is-selected");
      }
    }

    const confirmationReady = signatureConfirmation ? signatureConfirmation.checked : true;

    submitDecisionButton.classList.toggle(
      "is-decision-ready",
      Boolean(decision && confirmationReady)
    );
  }

  function signatureStartFlow(decision) {
    if (!signatureDecisionFlow) return;

    signatureDecisionFlow.classList.remove(
      "decision-flow-approve",
      "decision-flow-return",
      "decision-flow-reject"
    );

    signatureDecisionFlow.classList.add(
      "is-decision-flow-active",
      "decision-flow-" + decision
    );
  }

  function signatureOpenModal(decision) {
    modal.classList.remove(
      "decision-modal-approve",
      "decision-modal-return",
      "decision-modal-reject",
      "is-open"
    );

    modal.classList.add("decision-modal-" + decision);

    if (signatureReducedMotion.matches) {
      modal.classList.add("is-open");
    } else {
      requestAnimationFrame(function () {
        modal.classList.add("is-open");
      });
    }
  }

  decisionInputs.forEach(function (input) {
    input.addEventListener("change", signatureUpdateDecisionState);
  });

  if (signatureConfirmation) {
    signatureConfirmation.addEventListener("change", function () {
      const label = signatureConfirmation.closest("label");
      if (label) {
        label.classList.toggle("is-confirmed", signatureConfirmation.checked);
      }

      signatureUpdateDecisionState();
    });
  }


  signatureUpdateDecisionState();

})();
