(function () {
  const sidebar = document.getElementById("adminSidebar");
  const overlay = document.getElementById("adminOverlay");
  const sidebarOpen = document.getElementById("sidebarOpen");
  const sidebarClose = document.getElementById("sidebarClose");

  const decisionInputs = document.querySelectorAll('input[name="adminDecision"]');
  const comment = document.getElementById("adminComment");
  const commentCount = document.getElementById("commentCount");
  const commentError = document.getElementById("commentError");
  const commentRequiredLabel = document.getElementById("commentRequiredLabel");
  const confirmation = document.getElementById("adminConfirmation");
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
    general: "General Maintenance",
    mechanical: "Mechanical Maintenance"
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
    "PTW-1045": {
      id: "PTW-1045",
      status: "Pending Admin Approval",
      basicInfo: {
        permitType: "electrical",
        workTitle: "Electrical Panel Maintenance",
        description: "Inspection and maintenance of electrical distribution equipment under approved isolation controls.",
        site: "factory-a",
        area: "Electrical Room",
        startDate: "2026-10-07",
        startTime: "11:30",
        endDate: "2026-10-07",
        endTime: "15:30",
        supervisor: "sup-001",
        workerName: "Layla Hassan",
        workerCount: 3
      },
      riskAssessment: {
        hazards: [
          {
            hazard: "Unexpected energization",
            initialScore: 16,
            controls: "Electrical isolation, lockout/tagout, test for dead, controlled access, and authorized personnel only.",
            residualScore: 12
          },
          {
            hazard: "Arc flash",
            initialScore: 15,
            controls: "Arc-rated PPE, insulated tools, exclusion boundary, and emergency response readiness.",
            residualScore: 8
          }
        ]
      },
      safetyChecklist: {
        confirmed: true,
        answers: [
          { item: "Required PPE is available and suitable", required: true, answer: "Yes" },
          { item: "Energy sources are isolated where required", required: true, answer: "Yes" },
          { item: "LOTO requirements are confirmed", required: true, answer: "Yes" },
          { item: "Emergency arrangements are understood", required: true, answer: "Yes" }
        ]
      },
      supervisorDecision: {
        reviewer: "Ahmad Khalil",
        decision: "approve",
        comment: "Operational scope, work team, and schedule verified.",
        reviewedAt: "2026-10-07T07:42:00"
      },
      safetyDecision: {
        reviewer: "Sarah Nasser",
        decision: "approve",
        comment: "Isolation, PPE, emergency arrangements, and residual risk controls verified.",
        reviewedAt: "2026-10-07T08:16:00"
      }
    },

    "PTW-1044": {
      id: "PTW-1044",
      status: "Pending Admin Approval",
      basicInfo: {
        permitType: "mechanical",
        workTitle: "Pump Maintenance",
        description: "Mechanical maintenance and inspection of a process pump under isolation controls.",
        site: "tank-farm",
        area: "Pump Area",
        startDate: "2026-10-07",
        startTime: "14:00",
        endDate: "2026-10-07",
        endTime: "18:00",
        supervisor: "sup-001",
        workerName: "Omar Worker",
        workerCount: 3
      },
      riskAssessment: {
        hazards: [
          {
            hazard: "Stored mechanical energy",
            initialScore: 15,
            controls: "Mechanical isolation, LOTO, depressurization, and verification before work.",
            residualScore: 10
          },
          {
            hazard: "Pinch points",
            initialScore: 10,
            controls: "Machine isolation, hand protection, controlled tools, and a clear work zone.",
            residualScore: 6
          }
        ]
      },
      safetyChecklist: {
        confirmed: true,
        answers: [
          { item: "Required PPE is available and suitable", required: true, answer: "Yes" },
          { item: "Energy sources are isolated where required", required: true, answer: "Yes" },
          { item: "LOTO requirements are confirmed", required: true, answer: "Yes" },
          { item: "Toolbox talk completed", required: true, answer: "Yes" }
        ]
      },
      supervisorDecision: { reviewer: "Ahmad Khalil", decision: "approve", comment: "Scope and isolation planning verified." },
      safetyDecision: { reviewer: "Sarah Nasser", decision: "approve", comment: "Mechanical isolation and PPE controls verified." }
    },

    "PTW-1041": {
      id: "PTW-1041",
      status: "Pending Admin Approval",
      basicInfo: {
        permitType: "general",
        workTitle: "Loading Bay Maintenance",
        description: "Routine maintenance activities in the Warehouse 1 loading bay.",
        site: "warehouse-1",
        area: "Loading Bay",
        startDate: "2026-10-07",
        startTime: "16:00",
        endDate: "2026-10-07",
        endTime: "19:00",
        supervisor: "sup-001",
        workerName: "Sami Odeh",
        workerCount: 2
      },
      riskAssessment: {
        hazards: [
          {
            hazard: "Vehicle movement",
            initialScore: 10,
            controls: "Barricade work zone, use a spotter, warning signs, and traffic coordination.",
            residualScore: 7
          }
        ]
      },
      safetyChecklist: {
        confirmed: true,
        answers: [
          { item: "Required PPE is available and suitable", required: true, answer: "Yes" },
          { item: "Work area is barricaded and identified", required: true, answer: "Yes" },
          { item: "Emergency arrangements are understood", required: true, answer: "Yes" }
        ]
      },
      supervisorDecision: { reviewer: "Ahmad Khalil", decision: "approve", comment: "Operational coordination verified." },
      safetyDecision: { reviewer: "Sarah Nasser", decision: "approve", comment: "Work-area controls and PPE verified." }
    },

    "PTW-1038": {
      id: "PTW-1038",
      status: "Pending Admin Approval",
      basicInfo: {
        permitType: "hot-work",
        workTitle: "Hot Work - Pipe Repair",
        description: "Controlled hot-work pipe repair in the Plant B utility area.",
        site: "plant-b",
        area: "Utility Area",
        startDate: "2026-10-08",
        startTime: "08:30",
        endDate: "2026-10-08",
        endTime: "13:30",
        supervisor: "sup-001",
        workerName: "Yazan Saleh",
        workerCount: 4
      },
      riskAssessment: {
        hazards: [
          {
            hazard: "Fire and ignition",
            initialScore: 12,
            controls: "Remove combustibles, provide extinguisher, maintain fire watch, and barricade area.",
            residualScore: 8
          }
        ]
      },
      safetyChecklist: {
        confirmed: true,
        answers: [
          { item: "Required PPE is available and suitable", required: true, answer: "Yes" },
          { item: "Emergency arrangements are understood", required: true, answer: "Yes" },
          { item: "Toolbox talk completed", required: true, answer: "Yes" }
        ]
      },
      supervisorDecision: { reviewer: "Ahmad Khalil", decision: "approve", comment: "Scope and work coordination verified." },
      safetyDecision: { reviewer: "Sarah Nasser", decision: "approve", comment: "Fire-watch and hot-work controls verified." }
    },

    "PTW-1035": {
      id: "PTW-1035",
      status: "Pending Admin Approval",
      basicInfo: {
        permitType: "general",
        workTitle: "Line 2 General Maintenance",
        description: "General maintenance activity on Factory A production Line 2.",
        site: "factory-a",
        area: "Line 2",
        startDate: "2026-10-09",
        startTime: "07:00",
        endDate: "2026-10-09",
        endTime: "10:30",
        supervisor: "sup-001",
        workerName: "Rami Nasser",
        workerCount: 2
      },
      riskAssessment: {
        hazards: [
          {
            hazard: "Slips and trips",
            initialScore: 6,
            controls: "Maintain housekeeping, define work zone, and keep walkways clear.",
            residualScore: 4
          }
        ]
      },
      safetyChecklist: {
        confirmed: true,
        answers: [
          { item: "Required PPE is available and suitable", required: true, answer: "Yes" },
          { item: "Work area is barricaded and identified", required: true, answer: "Yes" },
          { item: "Tools and equipment are fit for use", required: true, answer: "Yes" }
        ]
      },
      supervisorDecision: { reviewer: "Ahmad Khalil", decision: "approve", comment: "Work scope verified." },
      safetyDecision: { reviewer: "Sarah Nasser", decision: "approve", comment: "Safety checklist and controls verified." }
    }
  };

  let currentPermit = null;

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

  function titleCase(value) {
    return String(value || "")
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, function (letter) {
        return letter.toUpperCase();
      });
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
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
    const number = Number(score);
    if (score == null || score === "" || !Number.isFinite(number) || number < 1 || number > 25) return {label:"Not Assessed",className:"unknown"};

    if (number >= 17) return { label: "Critical", className: "critical" };
    if (number >= 10) return { label: "High", className: "high" };
    if (number >= 5) return { label: "Medium", className: "medium" };
    return { label: "Low", className: "low" };
  }

  function getHighestScore(hazards, field) {
    return hazards.reduce(function (max, hazard) {
      const value = Number(hazard[field]);
      return Number.isFinite(value) && value >= 1 && value <= 25 ? Math.max(max, value) : max;
    }, 0);
  }

  function formatDateTime(dateValue, timeValue) {
    if (!dateValue) return timeValue || "—";

    const date = new Date(dateValue + "T" + (timeValue || "00:00"));

    if (Number.isNaN(date.getTime())) {
      return dateValue + (timeValue ? " · " + timeValue : "");
    }

    return (
      date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      (timeValue ? " · " + timeValue : "")
    );
  }

  function formatReviewTime(value, fallback) {
    if (!value) return fallback;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return fallback;

    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function getPermitFromStorageById(id) {
    const directKeys = [
      "safePermitSubmittedPermit",
      "safePermitAdminSelectedPermit"
    ];

    for (const key of directKeys) {
      const stored = localStorage.getItem(key);
      if (!stored) continue;

      try {
        const parsed = JSON.parse(stored);

        if (parsed && parsed.id === id && parsed.basicInfo) {
          return parsed;
        }
      } catch (error) {
      }
    }

    const arrayKeys = [
      "safePermitSubmittedPermits",
      "safePermitPermits"
    ];

    for (const key of arrayKeys) {
      const stored = localStorage.getItem(key);
      if (!stored) continue;

      try {
        const parsed = JSON.parse(stored);

        if (Array.isArray(parsed)) {
          const match = parsed.find(function (permit) {
            return permit && permit.id === id;
          });

          if (match) return match;
        }
      } catch (error) {
      }
    }

    return null;
  }

  let isDemoSample = false;

  function resolvePermit() {
    const params = new URLSearchParams(window.location.search);
    const requestedId = params.get("id");

    if (requestedId) {
      const stored = getPermitFromStorageById(requestedId);
      if (stored) return stored;
      if (demoPermits[requestedId] && window.SafePermitPermitState && window.SafePermitPermitState.demoRequested()) { isDemoSample = true; return clone(demoPermits[requestedId]); }
      return null; // Never silently substitute another permit for a requested ID.
    }

    const selected = localStorage.getItem("safePermitAdminSelectedPermit");

    if (selected) {
      try {
        const parsed = JSON.parse(selected);

        if (parsed && parsed.id) {
          const full = getPermitFromStorageById(parsed.id);
          if (full) return full;
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
    hazardCount.textContent = hazards.length === 1 ? "1 hazard" : hazards.length + " hazards";

    if (hazards.length === 0) {
      list.innerHTML =
        '<article class="admin-hazard"><div class="admin-hazard__control">' +
        '<span>Risk Assessment</span><p>No hazard records were found for this permit.</p>' +
        '</div></article>';
      return;
    }

    hazards.forEach(function (hazard, index) {
      const initialScore = Number(hazard.initialScore) || 0;
      const residualScore = Number(hazard.residualScore) || 0;
      const initialRisk = getRisk(initialScore || null);
      const residualRisk = getRisk(residualScore || null);

      const article = document.createElement("article");
      article.className = "admin-hazard";

      article.innerHTML =
        '<div class="admin-hazard__top">' +
          '<strong>Hazard ' + (index + 1) + ' · ' + escapeHTML(hazard.hazard || "Identified hazard") + '</strong>' +
          '<div class="admin-hazard__chips">' +
            '<span class="admin-risk admin-risk--' + initialRisk.className + '">Initial ' + initialScore + ' · ' + initialRisk.label + '</span>' +
            '<span class="admin-risk admin-risk--' + residualRisk.className + '">Residual ' + residualScore + ' · ' + residualRisk.label + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="admin-hazard__control"><span>Control Measures</span><p>' +
          escapeHTML(hazard.controls || "No control measures provided.") +
        '</p></div>';

      list.appendChild(article);
    });
  }

  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
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
        '<div class="admin-checklist-item"><div><strong>No checklist data available</strong>' +
        '<small>Verification required</small></div><span class="admin-answer admin-answer--no">MISSING</span></div>';
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
      row.className = "admin-checklist-item";

      row.innerHTML =
        '<div><strong>' + escapeHTML(item.item || "Checklist item") + '</strong>' +
        '<small>' + (item.required ? "Mandatory" : "Optional") + '</small></div>' +
        '<span class="admin-answer admin-answer--' + answerClass + '">' + label + '</span>';

      list.appendChild(row);
    });
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
    const initialRisk = getRisk(highestInitial || null);
    const residualRisk = getRisk(highestResidual || null);

    const permitType = getPermitType(basic.permitType);
    const site = getSite(basic.site);
    const area = titleCase(basic.area) || "Area";
    const worker = basic.workerName || "Omar Worker";

    const supervisor =
      permit.supervisorDecision && permit.supervisorDecision.reviewer
        ? permit.supervisorDecision.reviewer
        : getSupervisor(basic.supervisor);

    const safetyReviewer =
      permit.safetyDecision && permit.safetyDecision.reviewer
        ? permit.safetyDecision.reviewer
        : "Not recorded";

    document.getElementById("permitId").textContent = permit.id;
    document.getElementById("permitType").textContent = permitType;
    document.getElementById("workTitle").textContent = basic.workTitle || permitType;
    document.getElementById("workDescription").textContent = basic.description || "No work description provided.";

    document.getElementById("workerMeta").textContent = "Worker: " + worker;
    document.getElementById("locationMeta").textContent = site + " · " + area;
    document.getElementById("scheduleMeta").textContent =
      formatDateTime(basic.startDate, basic.startTime) + " → " +
      formatDateTime(basic.endDate, basic.endTime);

    document.getElementById("permitStatus").textContent = permit.status || "Pending Admin Approval";

    const heroRisk = document.getElementById("heroResidualRisk");
    heroRisk.textContent = residualRisk.label;
    heroRisk.className = "admin-risk admin-risk--" + residualRisk.className;

    document.getElementById("infoPermitType").textContent = permitType;
    document.getElementById("infoWorker").textContent = worker;
    document.getElementById("infoSite").textContent = site;
    document.getElementById("infoArea").textContent = area;
    document.getElementById("infoStart").textContent = formatDateTime(basic.startDate, basic.startTime);
    document.getElementById("infoEnd").textContent = formatDateTime(basic.endDate, basic.endTime);
    document.getElementById("infoWorkers").textContent = basic.workerCount || "—";
    document.getElementById("infoSupervisor").textContent = supervisor;

    document.getElementById("supervisorReviewer").textContent = permit.supervisorDecision && permit.supervisorDecision.decision === "approve" ? supervisor : "Not approved / not recorded";
    document.getElementById("supervisorComment").textContent =
      permit.supervisorDecision && permit.supervisorDecision.comment
        ? permit.supervisorDecision.comment
        : "Supervisor approval not documented.";

    document.getElementById("supervisorReviewedAt").textContent =
      formatReviewTime(
        permit.supervisorDecision && permit.supervisorDecision.reviewedAt,
        "Supervisor review completed"
      );

    document.getElementById("safetyReviewer").textContent = permit.safetyDecision && permit.safetyDecision.decision === "approve" ? safetyReviewer : "Not approved / not recorded";
    document.getElementById("safetyComment").textContent =
      permit.safetyDecision && permit.safetyDecision.comment
        ? permit.safetyDecision.comment
        : "Safety approval not documented.";

    document.getElementById("safetyReviewedAt").textContent =
      formatReviewTime(
        permit.safetyDecision && permit.safetyDecision.reviewedAt,
        "Safety review completed"
      );

    document.getElementById("initialRiskSummary").textContent =
      (highestInitial || "—") + " · " + initialRisk.label;

    document.getElementById("residualRiskSummary").textContent =
      (highestResidual || "—") + " · " + residualRisk.label;

    document.getElementById("sideResidualRisk").textContent = residualRisk.label;
    document.getElementById("sideWorker").textContent = worker;

    const riskAlert = document.getElementById("riskAlert");

    if (residualRisk.className === "low" || residualRisk.className === "medium") {
      riskAlert.classList.add("is-low");
      riskAlert.querySelector("strong").textContent =
        "Residual risk is controlled, but final review is still required.";
      riskAlert.querySelector("p").textContent =
        "Confirm the full approval trail and permit information before authorization.";
    } else {
      riskAlert.classList.remove("is-low");
      riskAlert.querySelector("strong").textContent =
        "Elevated residual risk requires deliberate final review.";
      riskAlert.querySelector("p").textContent =
        "Confirm that the approval trail is complete and the documented controls are acceptable.";
    }

    renderHazards(permit);
    renderChecklist(permit);
    document.title = permit.id + " · Admin Review | SafePermit";
  }

  function getDecision() {
    const selected = document.querySelector('input[name="adminDecision"]:checked');
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
    if (decision === "approve") return "Approved";
    if (decision === "return") return "Returned for Correction";
    return "Rejected";
  }

  function saveHistoryRecord(record) {
    const key = "safePermitAdminDecisionHistory";
    let history = [];

    const stored = localStorage.getItem(key);

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) history = parsed;
      } catch (error) {
      }
    }

    history.unshift(record);
    localStorage.setItem(key, JSON.stringify(history));
  }

  function updatePermitInStorage(record) {
    const singleKey = "safePermitSubmittedPermit";
    const single = localStorage.getItem(singleKey);

    if (single) {
      try {
        const permit = JSON.parse(single);

        if (permit && permit.id === record.permitId) {
          permit.status = record.newStatus;
          permit.adminDecision = record;
          localStorage.setItem(singleKey, JSON.stringify(permit));
        }
      } catch (error) {
      }
    }

    ["safePermitSubmittedPermits", "safePermitPermits"].forEach(function (key) {
      const stored = localStorage.getItem(key);
      if (!stored) return;

      try {
        const permits = JSON.parse(stored);
        if (!Array.isArray(permits)) return;

        let changed = false;

        const updated = permits.map(function (permit) {
          if (!permit || permit.id !== record.permitId) return permit;

          changed = true;

          return Object.assign({}, permit, {
            status: record.newStatus,
            adminDecision: record
          });
        });

        if (changed) {
          localStorage.setItem(key, JSON.stringify(updated));
        }
      } catch (error) {
      }
    });
  }

  async function saveDecision(decision) {
    const newStatus = getNewStatus(decision);

    const record = {
      permitId: currentPermit.id,
      reviewer: "Rana Haddad",
      role: "Admin",
      decision: decision,
      comment: comment.value.trim(),
      previousStatus: currentPermit.status || "Pending Admin Approval",
      newStatus: newStatus,
      reviewedAt: new Date().toISOString()
    };

    if (decision === "approve") {
      const data=window.SafePermitData;
      if (!data || !data.hasApprovalEvidence(currentPermit,'supervisor') ||
          !data.hasApprovalEvidence(currentPermit,'safety') ||
          !data.hasCoherentApprovalTrail(currentPermit,['supervisor','safety'])) {
        throw new Error("Documented Supervisor and Safety approvals are required.");
      }
      if (!data.hasCompleteChecklist(currentPermit)) {
        throw new Error("Complete and confirmed safety checklist is required.");
      }
      if (!data.hasAcceptableRisk(currentPermit)) {
        throw new Error("A complete, acceptable risk assessment is required.");
      }
      if (!data.getPermit(record.permitId)) {
        throw new Error("Canonical permit record is required for final approval.");
      }
      if (!window.SafePermitWorkflow || typeof window.SafePermitWorkflow.getReview !== 'function') {
        throw new Error("Integrated safety review is unavailable. Approval blocked.");
      }
      const review = await window.SafePermitWorkflow.getReview(record.permitId);
      if (!review || !Array.isArray(review.blockers) || review.blockers.length || review.eligibleForDemoApproval !== true) {
        throw new Error("Safety review blocked: "+(review?.blockers?.join('; ')||'Unverified clearance'));
      }
    }
    if (window.SafePermitData.getPermit(record.permitId)) {
      await window.SafePermitData.repository.applyDecision(record, "admin");
    } else {
      updatePermitInStorage(record); // Legacy demo-only fallback; backend must reject unknown permits.
    }
    localStorage.setItem("safePermitAdminDecision", JSON.stringify(record));
    saveHistoryRecord(record);

    currentPermit.status = newStatus;
    currentPermit.adminDecision = record;

    localStorage.setItem(
      "safePermitAdminSelectedPermit",
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
      modalTitle.textContent = "Permit approved.";
      modalText.textContent =
        "Final Admin approval was recorded. The permit is now Approved.";
    }

    if (decision === "return") {
      modalIcon.textContent = "↩";
      modalIcon.style.background = "var(--sp-warning-bg)";
      modalIcon.style.color = "var(--sp-warning)";
      modalTitle.textContent = "Permit returned for correction.";
      modalText.textContent =
        "The permit must be corrected and resubmitted through the approval workflow.";
    }

    if (decision === "reject") {
      modalIcon.textContent = "×";
      modalIcon.style.background = "var(--sp-danger-bg)";
      modalIcon.style.color = "var(--sp-danger)";
      modalTitle.textContent = "Permit rejected.";
      modalText.textContent =
        "The permit request has been stopped and will not proceed to authorization.";
    }

    window.SafePermitCompletion.open(modal, submitDecisionButton);
  }

  submitDecisionButton.addEventListener("click", async function () {
    reviewMessage.className = "admin-review-message";

    if (
      !currentPermit ||
      currentPermit.status !== "Pending Admin Approval"
    ) {
      reviewMessage.className =
        "admin-review-message is-error";
      reviewMessage.textContent =
        "This permit already has a final Admin decision and cannot be reviewed again.";
      return;
    }
    reviewMessage.textContent = "";
    commentError.textContent = "";
    comment.classList.remove("is-invalid");

    const decision = getDecision();

    if (!decision) {
      reviewMessage.className = "admin-review-message is-error";
      reviewMessage.textContent =
        "Select Approve Permit, Return for Correction, or Reject Permit.";
      return;
    }

    if (!confirmation.checked) {
      reviewMessage.className = "admin-review-message is-error";
      reviewMessage.textContent =
        "Confirm that you reviewed the complete permit and approval trail.";
      return;
    }

    if (
      // Every decision, including approval, needs documented rationale.
      comment.value.trim().length < 5
    ) {
      comment.classList.add("is-invalid");
      commentError.textContent =
        "Add a clear reason before submitting this final decision.";
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
      reviewMessage.className = "review-message is-error";
      reviewMessage.textContent = "Decision not saved: " + (error.message || String(error));
    } finally {
      submitDecisionButton.disabled = recorded;
    }
  });

  function lockCompletedPermit() {
    if (
      !currentPermit ||
      currentPermit.status === "Pending Admin Approval"
    ) {
      return;
    }

    decisionInputs.forEach(function (input) {
      input.disabled = true;
    });

    comment.disabled = true;
    confirmation.disabled = true;
    submitDecisionButton.disabled = true;

    reviewMessage.className = "admin-review-message";
    // A permit that has not reached this stage has no Admin decision yet; say so instead of implying one.
    const beforeAdminStage = ["Draft", "Pending Supervisor Review", "Pending Safety Review"].includes(currentPermit.status);
    reviewMessage.textContent = beforeAdminStage
      ? "This permit has not reached Admin Approval yet. Open it again after the Supervisor and Safety reviews are complete."
      : "Final Admin decision already recorded: " + currentPermit.status + ".";
  }

  currentPermit = resolvePermit();
  if (!currentPermit) {
    document.getElementById("workTitle").textContent = "Permit not found";
    document.getElementById("workDescription").textContent = "The requested permit is unavailable in this browser demo. No decision can be recorded.";
    document.getElementById("permitId").textContent = new URLSearchParams(location.search).get("id") || "Unknown";
    submitDecisionButton.disabled = true;
    decisionInputs.forEach(function(input){ input.disabled = true; });
    comment.disabled = true;
    confirmation.disabled = true;
    reviewMessage.textContent = "Permit not found — final review is unavailable.";
    if (window.SafePermitPermitState) window.SafePermitPermitState.showNotFound({ id: new URLSearchParams(location.search).get("id") || "", backHref: "../pending-permits/", backLabel: "Back to Pending Permits" });
    return;
  }
  if (isDemoSample && window.SafePermitPermitState) window.SafePermitPermitState.showDemoBanner();
  renderPermit(currentPermit);
  if (window.SafePermitRoleAI) { window.SafePermitRoleAI.mount({ containerId: "aiRoleAssistant", role: "admin", permit: currentPermit }); }
  lockCompletedPermit();

  /* Signature Decision Motion */
  const signatureDecisionCard = document.querySelector("[data-decision-stage]");
  const signatureDecisionFlow = document.querySelector("[data-decision-flow]");
  const signatureReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const signatureConfirmation = document.getElementById("adminConfirmation");

  function signatureSelectedDecision() {
    const selected = document.querySelector('input[name="adminDecision"]:checked');
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

    document.querySelectorAll(".admin-decision-option").forEach(function (item) {
      item.classList.remove("is-selected");
    });

    if (decision) {
      signatureDecisionCard.classList.add("has-decision", "decision-" + decision);

      const selectedInput = document.querySelector(
        'input[name="adminDecision"][value="' + decision + '"]'
      );

      if (selectedInput) {
        const selectedOption = selectedInput.closest(".admin-decision-option");
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
