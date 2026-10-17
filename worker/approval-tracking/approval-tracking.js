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

  const demoPermits = {
    "PTW-1024": {
      id: "PTW-1024",
      basicInfo: { permitType: "electrical", workTitle: "Electrical Maintenance", site: "factory-a", area: "maintenance-room", supervisor: "sup-001" },
      riskAssessment: { hazards: [{ residualScore: 6 }] },
      status: "Pending Safety Review",
      submittedAt: "2026-10-05T09:40:00",
      supervisorDecision: { reviewer: "Ahmad Khalil", decision: "approve", newStatus: "Pending Safety Review", reviewedAt: "2026-10-05T10:10:00" }
    },
    "PTW-1019": {
      id: "PTW-1019",
      basicInfo: { permitType: "hot-work", workTitle: "Hot Work - Pipe Repair", site: "plant-b", area: "utility-area", supervisor: "sup-001" },
      riskAssessment: { hazards: [{ residualScore: 6 }] },
      status: "Approved",
      submittedAt: "2026-10-03T11:25:00",
      supervisorDecision: { reviewer: "Ahmad Khalil", decision: "approve", newStatus: "Pending Safety Review", reviewedAt: "2026-10-03T11:50:00" },
      safetyDecision: { reviewer: "Sarah Nasser", decision: "approve", newStatus: "Pending Admin Approval", reviewedAt: "2026-10-03T12:30:00" }
    },
    "PTW-1016": {
      id: "PTW-1016",
      basicInfo: { permitType: "height", workTitle: "Work at Height", site: "warehouse-2", area: "roof-access", supervisor: "sup-001" },
      riskAssessment: { hazards: [{ residualScore: 10 }] },
      status: "Returned for Correction",
      submittedAt: "2026-10-02T14:15:00",
      supervisorDecision: { reviewer: "Ahmad Khalil", decision: "return", comment: "Clarify the work-at-height controls before resubmission.", newStatus: "Returned for Correction", reviewedAt: "2026-10-02T14:45:00" }
    }
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
    return String(value == null ? "" : value)
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
      return "—";
    }

    if (score <= 4) {
      return "Low";
    }

    if (score <= 9) {
      return "Medium";
    }

    if (score <= 16) {
      return "High";
    }

    return "Critical";
  }

  function getHighestResidual(riskAssessment) {
    if (
      !riskAssessment ||
      !Array.isArray(riskAssessment.hazards)
    ) {
      return 0;
    }

    let highest = 0;

    riskAssessment.hazards.forEach(function (hazard) {
      highest = Math.max(
        highest,
        Number(hazard.residualScore) || 0
      );
    });

    return highest;
  }

  function resolveSubmittedPermit() {
    const params = new URLSearchParams(window.location.search);
    const requestedId = params.get("id");
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

    if (requestedId) {
      const found = permits.find(function (permit) {
        return permit && permit.id === requestedId;
      });

      if (found) {
        return found;
      }

      try {
        const latest = JSON.parse(
          localStorage.getItem("safePermitSubmittedPermit") || "null"
        );

        if (latest && latest.id === requestedId) {
          return latest;
        }
      } catch (error) {
      }

      if (demoPermits[requestedId] && window.SafePermitPermitState && window.SafePermitPermitState.demoRequested()) {
        return demoPermits[requestedId];
      }

      // Never substitute a different permit for an unknown requested ID.
      return { id: requestedId, notFound: true, basicInfo: {}, riskAssessment: {} };
    }

    const latest = parseStorage("safePermitSubmittedPermit");

    if (latest) {
      return latest;
    }

    // Nothing submitted in this browser: say so instead of presenting drafts as a submitted permit.
    return { id: "", notFound: true, basicInfo: {}, riskAssessment: {} };
  }

  function animateTrackingLifecycle(completed) {
    const progressFill = document.getElementById("progressLineFill");
    const progressTrack = progressFill ? progressFill.parentElement : null;
    const progressBadge = document.getElementById("progressBadge");
    const flow = document.getElementById("approvalFlow");
    const heroStatus = document.querySelector(".tracking-hero__status");
    const currentIcon = document.querySelector(".tracking-current-box__icon");
    const reduced =
      window.SafePermitMotion &&
      typeof window.SafePermitMotion.reduced === "function"
        ? window.SafePermitMotion.reduced()
        : window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const percentage = Math.max(0, Math.min(100, (completed / 4) * 100));

    if (flow) {
      flow.querySelectorAll(".tracking-step").forEach(function (step, index) {
        step.style.setProperty("--tracking-index", index);
      });
    }

    if (reduced) {
      if (progressFill) {
        progressFill.style.width = percentage + "%";
      }

      if (flow) {
        flow.classList.add("is-motion-sequenced");
      }

      return;
    }

    if (progressFill) {
      progressFill.style.width = "0%";
    }

    if (progressTrack) {
      progressTrack.classList.remove("is-motion-running");
    }

    if (progressBadge) {
      progressBadge.classList.remove("is-motion-pop");
    }

    if (flow) {
      flow.classList.remove("is-motion-sequenced");
    }

    if (heroStatus) {
      heroStatus.classList.remove("is-motion-status");
    }

    if (currentIcon) {
      currentIcon.classList.remove("is-motion-handoff");
    }

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (progressFill) {
          progressFill.style.width = percentage + "%";
        }

        if (progressTrack) {
          progressTrack.classList.add("is-motion-running");
        }

        if (progressBadge) {
          progressBadge.classList.add("is-motion-pop");
        }

        if (flow) {
          flow.classList.add("is-motion-sequenced");
        }

        if (heroStatus) {
          heroStatus.classList.add("is-motion-status");
        }

        if (currentIcon) {
          currentIcon.classList.add("is-motion-handoff");
        }
      });
    });
  }

  function animateTrackingHistory() {
    const history = document.getElementById("historyList");

    if (!history) {
      return;
    }

    const items = history.querySelectorAll(".tracking-history__item");

    items.forEach(function (item, index) {
      item.style.setProperty("--history-index", index);
    });

    history.classList.remove("is-motion-sequenced");

    const reduced =
      window.SafePermitMotion &&
      typeof window.SafePermitMotion.reduced === "function"
        ? window.SafePermitMotion.reduced()
        : window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      history.classList.add("is-motion-sequenced");
      return;
    }

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        history.classList.add("is-motion-sequenced");
      });
    });
  }

  function updateCurrentStageIcon(status, safetyDecision, adminDecision) {
    const icon = document.querySelector(".tracking-current-box__icon");

    if (!icon) {
      return;
    }

    let value = "2";

    if (status === "Pending Safety Review") {
      value = "3";
    } else if (status === "Pending Admin Approval") {
      value = "4";
    } else if (status === "Approved") {
      value = "✓";
    } else if (
      (status === "Returned for Correction" || status === "Rejected") &&
      adminDecision &&
      adminDecision.newStatus === status
    ) {
      value = "4";
    } else if (
      (status === "Returned for Correction" || status === "Rejected") &&
      safetyDecision &&
      safetyDecision.newStatus === status
    ) {
      value = "3";
    }

    icon.textContent = value;
  }

  function renderTracking() {
    const submitted = resolveSubmittedPermit();
    const permitState = window.SafePermitPermitState;

    if (submitted.notFound) {
      if (permitState) permitState.showNotFound({ id: submitted.id, backHref: "../permits/", backLabel: "Back to My Permits" });
    } else if (permitState && submitted === demoPermits[submitted.id]) {
      permitState.showDemoBanner();
    }

    const basic = submitted.basicInfo || {};
    const risk = submitted.riskAssessment || {};

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

    const status = submitted.notFound
      ? "Permit not found"
      : submitted.status || "Pending Supervisor Review";

    const submittedAt =
      formatTimestamp(submitted.submittedAt);

    const residualScore =
      getHighestResidual(risk);

    const residualText =
      residualScore
        ? riskLevel(residualScore) + " · " + residualScore
        : "—";

    document.getElementById("permitId").textContent =
      submitted.id || "PTW-0000";

    document.getElementById("permitType").textContent =
      permitType;

    document.getElementById("workTitle").textContent =
      basic.workTitle || "Approval Tracking";

    document.getElementById("locationText").textContent =
      site !== "—" && area !== "—"
        ? site + " · " + area
        : site;

    document.getElementById("submittedText").textContent =
      "Submitted " + submittedAt;

    document.getElementById("currentStatus").textContent =
      status;

    document.getElementById("sideStatus").textContent =
      status;

    document.getElementById("workerTimestamp").textContent =
      submittedAt;

    document.getElementById("historySubmitTime").textContent =
      submittedAt;

    document.getElementById("supervisorName").textContent =
      "Assigned reviewer: " + supervisor;

    document.getElementById("sideReviewer").textContent =
      supervisor;

    document.getElementById("summaryTitle").textContent =
      basic.workTitle || "—";

    document.getElementById("summaryLocation").textContent =
      site !== "—" && area !== "—"
        ? site + " · " + area
        : site;

    document.getElementById("summarySupervisor").textContent =
      supervisor;

    document.getElementById("summaryRisk").textContent =
      residualText;

    document.querySelectorAll(
      ".tracking-back-link, .tracking-open-details"
    ).forEach(function (link) {
      link.href = "../permit-details/?id=" + encodeURIComponent(submitted.id);
    });

    applyStatus(status, submittedAt, submitted);
  }

  function resetFlow() {
    const steps = document.querySelectorAll(".tracking-step");

    steps.forEach(function (step) {
      step.classList.remove("is-complete", "is-current");

      const state = step.querySelector(".tracking-state");

      if (state) {
        state.className = "tracking-state";
        state.textContent = "Waiting";
      }
    });
  }

  function setStepState(stage, state) {
    const step = document.querySelector(
      '.tracking-step[data-stage="' + stage + '"]'
    );

    if (!step) {
      return;
    }

    const stateBadge = step.querySelector(".tracking-state");

    if (state === "complete") {
      step.classList.add("is-complete");
      step.classList.remove("is-current");

      if (stateBadge) {
        stateBadge.className =
          "tracking-state tracking-state--complete";
        stateBadge.textContent = "Completed";
      }

      return;
    }

    if (state === "current") {
      step.classList.add("is-current");
      step.classList.remove("is-complete");

      if (stateBadge) {
        stateBadge.className =
          "tracking-state tracking-state--current";
        stateBadge.textContent = "Current";
      }
      return;
    }

    if (state === "unverified") {
      step.classList.remove("is-complete", "is-current");

      if (stateBadge) {
        stateBadge.className = "tracking-state";
        stateBadge.textContent = "Evidence missing";
      }
    }
  }

  // A stage counts as approved only with a documented, permit-linked decision.
  function hasEvidence(submitted, role) {
    return !!(window.SafePermitData && typeof window.SafePermitData.hasApprovalEvidence === "function" &&
      window.SafePermitData.hasApprovalEvidence(submitted, role));
  }

  function applyStatus(status, submittedAt, submitted) {
    resetFlow();

    setStepState("worker", "complete");

    const supervisorDecision = submitted.supervisorDecision || null;
    const safetyDecision = submitted.safetyDecision || null;
    const adminDecision = submitted.adminDecision || null;

    updateCurrentStageIcon(status, safetyDecision, adminDecision);

    let completed = 1;
    let missingEvidence = 0;
    let currentStage = "Supervisor Review";
    let nextStage = "Safety Review";
    let currentNote = "Waiting for Supervisor review";
    let currentReviewer = document.getElementById("sideReviewer").textContent;
    let reviewerRole = "Operational reviewer";
    let workerAction =
      "The permit is currently with the Supervisor. You will be notified when its status changes.";

    // Status alone is not approval evidence: only documented decisions count as completed.
    function approved(stage) {
      if (hasEvidence(submitted, stage)) {
        setStepState(stage, "complete");
        completed += 1;
      } else {
        setStepState(stage, "unverified");
        missingEvidence += 1;
      }
    }

    if (submitted.notFound) {
      resetFlow();
      completed = 0;
      currentStage = "Permit not found";
      nextStage = "—";
      currentNote = "No permit with this ID is stored in this browser demo.";
      currentReviewer = "—";
      reviewerRole = "—";
      workerAction = "Open the permit from My Permits. A different permit is never shown in its place.";
    } else if (status === "Pending Safety Review") {
      approved("supervisor");
      setStepState("safety", "current");

      currentStage = "Safety Review";
      nextStage = "Admin Approval";
      currentNote = "Supervisor approved · Waiting for Safety review";
      currentReviewer = "Safety Officer";
      reviewerRole = "Safety reviewer";
      workerAction =
        "The permit is currently with the Safety Officer. No worker action is required.";
    } else if (status === "Pending Admin Approval") {
      approved("supervisor");
      approved("safety");
      setStepState("admin", "current");

      currentStage = "Admin Approval";
      nextStage = "Final decision";
      currentNote = "Safety approved · Waiting for Admin approval";
      currentReviewer = "Admin";
      reviewerRole = "Final approver";
      workerAction =
        "The permit is at final approval. No worker action is required.";
    } else if (status === "Approved" || status === "Active" || status === "Closed") {
      approved("supervisor");
      approved("safety");
      approved("admin");

      currentStage = status;
      nextStage = status === "Approved" ? "Permit activation" : status === "Active" ? "Permit closure" : "No further action";
      currentNote = "All approval stages are complete";
      currentReviewer = "Completed";
      reviewerRole = "Workflow completed";
      workerAction =
        "This permit has completed the approval workflow.";
    } else if (status === "Stopped") {
      currentStage = "Stopped";
      nextStage = "Authorized resume review";
      currentNote = "Stop-Work in effect — work must not continue";
      currentReviewer = "HSE";
      reviewerRole = "Resume reviewer";
      workerAction = "Do not continue work. Resumption requires a documented, authorized HSE review.";
    } else if (status === "Returned for Correction") {
      if (adminDecision && adminDecision.newStatus === status) {
        approved("supervisor");
        approved("safety");
        setStepState("admin", "current");
        currentStage = "Returned by Admin";
        currentNote = "Admin returned the permit for correction";
        currentReviewer = "Admin";
        reviewerRole = "Final approver";
        workerAction =
          "Admin returned this permit. Review the final-approval comment, correct the permit, and resubmit it.";
      } else if (safetyDecision && safetyDecision.newStatus === status) {
        approved("supervisor");
        setStepState("safety", "current");
        currentStage = "Returned by Safety Officer";
        currentNote = "Safety Officer returned the permit for correction";
        currentReviewer = "Safety Officer";
        reviewerRole = "Safety reviewer";
        workerAction =
          "The Safety Officer returned this permit. Review the Safety comment, correct the permit, and resubmit it.";
      } else {
        setStepState("supervisor", "current");
        currentStage = "Returned by Supervisor";
        currentNote = "Supervisor returned the permit for correction";
        currentReviewer = supervisorDecision && supervisorDecision.reviewer
          ? supervisorDecision.reviewer
          : "Supervisor";
        reviewerRole = "Operational reviewer";
        workerAction =
          "The Supervisor returned this permit. Review the Supervisor comment, correct the permit, and resubmit it.";
      }

      nextStage = "Worker resubmission";
    } else if (status === "Rejected") {
      if (adminDecision && adminDecision.newStatus === status) {
        approved("supervisor");
        approved("safety");
        setStepState("admin", "current");
        currentStage = "Rejected by Admin";
        currentNote = "Admin rejected the permit";
        currentReviewer = "Admin";
        reviewerRole = "Final approver";
        workerAction =
          "This permit was rejected at final Admin approval. The approval workflow is closed.";
      } else if (safetyDecision && safetyDecision.newStatus === status) {
        approved("supervisor");
        setStepState("safety", "current");
        currentStage = "Rejected by Safety Officer";
        currentNote = "Safety Officer rejected the permit";
        currentReviewer = "Safety Officer";
        reviewerRole = "Safety reviewer";
        workerAction =
          "This permit was rejected by the Safety Officer and will not move to Admin Approval.";
      } else {
        setStepState("supervisor", "current");
        currentStage = "Rejected by Supervisor";
        currentNote = "Supervisor rejected the permit";
        currentReviewer = supervisorDecision && supervisorDecision.reviewer
          ? supervisorDecision.reviewer
          : "Supervisor";
        reviewerRole = "Operational reviewer";
        workerAction =
          "This permit was rejected by the Supervisor and will not move to Safety Review.";
      }

      nextStage = "No further approval";
    } else if (status === "Pending Supervisor Review") {
      setStepState("supervisor", "current");
    } else {
      currentStage = status;
      currentNote = "Unrecognized permit status — not verified";
    }

    if (missingEvidence) {
      currentNote = "Approval evidence missing — this status is not verified authorization";
    }

    document.getElementById("progressBadge").textContent =
      completed + " / 4 complete";

    document.getElementById("sideCurrentStage").textContent = currentStage;
    document.getElementById("sideNextStage").textContent = nextStage;
    document.getElementById("currentStageNote").textContent = currentNote;
    document.getElementById("sideReviewer").textContent = currentReviewer;
    const sideReviewerRole = document.getElementById("sideReviewerRole");
    if (sideReviewerRole) sideReviewerRole.textContent = reviewerRole;
    document.getElementById("workerActionText").textContent = workerAction;

    updateHistoryForStatus(status, submittedAt, submitted);
    animateTrackingLifecycle(completed);
  }

  function updateHistoryForStatus(status, submittedAt, submitted) {
    const history = document.getElementById("historyList");
    const submittedText = formatTimestamp(submittedAt);
    const supervisorDecision = submitted.supervisorDecision || null;
    const safetyDecision = submitted.safetyDecision || null;
    const adminDecision = submitted.adminDecision || null;

    history.innerHTML =
      '<article class="tracking-history__item">' +
        '<span class="tracking-history__dot is-success"></span>' +
        '<div><div class="tracking-history__top">' +
          '<strong>Permit submitted</strong>' +
          '<span>' + escapeHTML(submittedText) + '</span>' +
        '</div><p>Omar Worker submitted the permit for Supervisor Review.</p></div>' +
      '</article>';

    function addItem(title, state, text, dotClass) {
      history.innerHTML +=
        '<article class="tracking-history__item">' +
          '<span class="tracking-history__dot ' + escapeHTML(dotClass || "") + '"></span>' +
          '<div><div class="tracking-history__top">' +
            '<strong>' + escapeHTML(title) + '</strong>' +
            '<span>' + escapeHTML(state) + '</span>' +
          '</div><p>' + escapeHTML(text) + '</p></div>' +
        '</article>';
    }

    const workflowHistory = Array.isArray(submitted.workflowHistory)
      ? submitted.workflowHistory
      : [];

    workflowHistory.forEach(function (entry, index) {
      const previousStatus = entry && entry.status ? entry.status : "Previous review cycle";
      let actor = "Reviewer";
      let comment = "The permit was returned for correction before resubmission.";

      if (entry && entry.adminDecision && entry.adminDecision.newStatus === "Returned for Correction") {
        actor = "Admin";
        comment = entry.adminDecision.comment || comment;
      } else if (entry && entry.safetyDecision && entry.safetyDecision.newStatus === "Returned for Correction") {
        actor = "Safety Officer";
        comment = entry.safetyDecision.comment || comment;
      } else if (entry && entry.supervisorDecision && entry.supervisorDecision.newStatus === "Returned for Correction") {
        actor = "Supervisor";
        comment = entry.supervisorDecision.comment || comment;
      }

      addItem(
        "Revision " + (entry.revision || (index + 1)) + " · " + previousStatus,
        "Archived",
        actor + ": " + comment,
        ""
      );
    });

    if (submitted.resubmittedAt) {
      addItem(
        "Permit resubmitted",
        formatTimestamp(submitted.resubmittedAt),
        "The Worker corrected the permit and sent it back to Supervisor Review.",
        "is-success"
      );
    }

    function finishHistoryMotion() {
      animateTrackingHistory();
    }

    if (status === "Pending Supervisor Review") {
      addItem(
        "Pending Supervisor Review",
        "Current",
        "The permit is waiting for the assigned Supervisor to review it.",
        "is-current"
      );
      finishHistoryMotion();
      return;
    }

    if (submitted.notFound) {
      history.innerHTML = "";
      addItem("Permit not found", "—", "No permit with this ID is stored in this browser demo.", "");
      finishHistoryMotion();
      return;
    }

    // Approvals are listed only from documented decisions; a status alone is shown as missing evidence.
    function approvalItem(role, label, comment, fallback) {
      if (hasEvidence(submitted, role)) {
        addItem(label + " approved", "Completed", comment || fallback, "is-success");
      } else {
        addItem(label + " approval", "Evidence missing",
          "No documented, permit-linked decision is stored for this stage.", "");
      }
    }

    const decidedHere = function (decision) { return decision && decision.newStatus === status; };
    const supervisorPassed = !((status === "Returned for Correction" || status === "Rejected") &&
      !decidedHere(adminDecision) && !decidedHere(safetyDecision));

    if (status === "Stopped") {
      addItem("Stopped", "Current",
        "Stop-Work is in effect. Resumption requires a documented, authorized HSE review.", "is-current");
      finishHistoryMotion();
      return;
    }

    if (supervisorPassed) {
      approvalItem("supervisor", "Supervisor",
        supervisorDecision && supervisorDecision.comment, "The permit passed operational review.");
    }

    if (status === "Returned for Correction") {
      if (adminDecision && adminDecision.newStatus === status) {
        approvalItem("safety", "Safety Officer",
          safetyDecision && safetyDecision.comment, "The safety review was completed.");
        addItem(
          "Returned by Admin",
          "Worker action required",
          adminDecision.comment || "Admin returned the permit for correction.",
          "is-current"
        );
      } else if (safetyDecision && safetyDecision.newStatus === status) {
        addItem(
          "Returned by Safety Officer",
          "Worker action required",
          safetyDecision.comment || "The Safety Officer returned the permit for correction.",
          "is-current"
        );
      } else {
        addItem(
          "Returned by Supervisor",
          "Worker action required",
          (supervisorDecision && supervisorDecision.comment) ||
            "The Supervisor returned the permit for correction.",
          "is-current"
        );
      }
      finishHistoryMotion();
      return;
    }

    if (status === "Rejected") {
      if (adminDecision && adminDecision.newStatus === status) {
        approvalItem("safety", "Safety Officer",
          safetyDecision && safetyDecision.comment, "The safety review was completed.");
        addItem(
          "Rejected by Admin",
          "Closed",
          adminDecision.comment || "Admin rejected the permit during final approval.",
          ""
        );
      } else if (safetyDecision && safetyDecision.newStatus === status) {
        addItem(
          "Rejected by Safety Officer",
          "Closed",
          safetyDecision.comment || "The Safety Officer rejected the permit.",
          ""
        );
      } else {
        addItem(
          "Rejected by Supervisor",
          "Closed",
          (supervisorDecision && supervisorDecision.comment) ||
            "The Supervisor rejected the permit.",
          ""
        );
      }
      finishHistoryMotion();
      return;
    }

    if (status === "Pending Safety Review") {
      addItem(
        "Pending Safety Review",
        "Current",
        "The permit is waiting for Safety Officer review.",
        "is-current"
      );
      finishHistoryMotion();
      return;
    }

    approvalItem("safety", "Safety Officer",
      safetyDecision && safetyDecision.comment, "The safety review was completed.");

    if (status === "Pending Admin Approval") {
      addItem(
        "Pending Admin Approval",
        "Current",
        "The permit is waiting for final Admin approval.",
        "is-current"
      );
      finishHistoryMotion();
      return;
    }

    if (status === "Approved" || status === "Active" || status === "Closed") {
      approvalItem("admin", "Admin",
        adminDecision && adminDecision.comment, "Final Admin approval completed the workflow.");
    }

    finishHistoryMotion();
  }

  renderTracking();
})();
