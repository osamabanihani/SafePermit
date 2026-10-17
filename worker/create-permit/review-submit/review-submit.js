(function () {
  const submitConfirmation = document.getElementById("submitConfirmation");
  const confirmationError = document.getElementById("confirmationError");

  const submitButton = document.getElementById("submitPermitButton");
  const saveDraftButton = document.getElementById("saveDraftButton");
  const reviewMessage = document.getElementById("reviewMessage");
  const successModal = document.getElementById("successModal");
  const reviewMain = document.querySelector(".review-main");
  const confirmationCard = document.querySelector(".review-card--confirmation");
  const reviewStatusBox = document.getElementById("reviewStatusBox");
  const reviewApprovalFlow = document.getElementById("reviewApprovalFlow");

  const aiSafetyReviewCard = document.getElementById("aiSafetyReviewCard");
  const runAiSafetyReview = document.getElementById("runAiSafetyReview");
  const aiSafetyReviewResults = document.getElementById("aiSafetyReviewResults");
  const aiReviewFindings = document.getElementById("aiReviewFindings");
  const aiReviewStatus = document.getElementById("aiReviewStatus");
  const aiReviewTitle = document.getElementById("aiReviewTitle");
  const aiReviewSummary = document.getElementById("aiReviewSummary");
  const aiReviewSummaryIcon = document.getElementById("aiReviewSummaryIcon");
  const aiFindingCount = document.getElementById("aiFindingCount");
  const aiHazardCoverage = document.getElementById("aiHazardCoverage");
  const aiChecklistIssues = document.getElementById("aiChecklistIssues");
  const aiContextWork = document.getElementById("aiContextWork");
  const aiContextLocation = document.getElementById("aiContextLocation");
  const aiContextAssessment = document.getElementById("aiContextAssessment");
  let lastAiReviewReport = null;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const motion = window.SafePermitMotion || null;

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

  const aiSafetyRules = {
    electrical: {
      hazards: [
        { name: "Unexpected energization", aliases: ["energization", "live electrical", "live parts", "voltage", "electric shock"], control: "Apply LOTO, isolate all energy sources, and verify zero energy before work." },
        { name: "Arc flash", aliases: ["arc flash", "arc fault", "short circuit"], control: "Use arc-rated PPE, maintain safe approach distance, and verify equipment condition before work." },
        { name: "Unauthorized access", aliases: ["unauthorized access", "public access", "people entering", "access to work area"], control: "Barricade the work area and display clear warning signs." }
      ],
      checklist: ["ppe", "isolation", "loto", "barricade", "emergency"]
    },
    "hot-work": {
      hazards: [
        { name: "Fire or explosion", aliases: ["fire", "explosion", "flammable", "ignition"], control: "Remove or protect combustibles, provide a fire extinguisher, and maintain fire watch where required." },
        { name: "Fumes and smoke", aliases: ["fume", "smoke", "vapour", "vapor"], control: "Provide suitable ventilation and respiratory protection where required." },
        { name: "Hot surfaces and sparks", aliases: ["hot surface", "spark", "burn"], control: "Control sparks, protect nearby surfaces, and use suitable heat-resistant PPE." }
      ],
      checklist: ["ppe", "barricade", "tools", "emergency", "housekeeping"]
    },
    height: {
      hazards: [
        { name: "Fall from height", aliases: ["fall from height", "falling", "height", "edge"], control: "Use approved fall protection, secure anchor points, and verify the work platform before access." },
        { name: "Dropped objects", aliases: ["dropped object", "falling object", "tools falling"], control: "Use tool lanyards where appropriate and establish an exclusion zone below the work area." },
        { name: "Unsafe access", aliases: ["unsafe access", "ladder", "scaffold", "platform"], control: "Verify safe access equipment, inspection status, and stable footing before work." }
      ],
      checklist: ["ppe", "access", "barricade", "tools", "emergency"]
    },
    confined: {
      hazards: [
        { name: "Oxygen deficiency", aliases: ["oxygen", "low oxygen", "oxygen deficiency"], control: "Test the atmosphere before entry and provide continuous monitoring where required." },
        { name: "Toxic atmosphere", aliases: ["toxic", "gas", "vapour", "vapor", "atmosphere"], control: "Complete gas testing, provide ventilation, and use respiratory protection where required." },
        { name: "Entrapment or engulfment", aliases: ["entrapment", "engulfment", "confined", "rescue"], control: "Isolate hazards, maintain an entry attendant, and confirm a rescue plan before entry." }
      ],
      checklist: ["ppe", "isolation", "access", "emergency", "toolbox"]
    },
    excavation: {
      hazards: [
        { name: "Excavation collapse", aliases: ["collapse", "cave in", "trench"], control: "Provide suitable shoring or sloping and inspect excavation stability before entry." },
        { name: "Underground services", aliases: ["underground service", "buried cable", "pipeline", "utility"], control: "Confirm utility drawings, scan the area, and use controlled excavation methods." },
        { name: "Fall into excavation", aliases: ["fall into", "open excavation", "edge"], control: "Install barriers around the excavation and provide controlled access points." }
      ],
      checklist: ["barricade", "access", "emergency", "tools", "toolbox"]
    },
    general: {
      hazards: [
        { name: "Slips and trips", aliases: ["slip", "trip", "housekeeping"], control: "Keep access routes clear and maintain good housekeeping throughout the work." },
        { name: "Manual handling", aliases: ["manual handling", "lifting", "carrying"], control: "Plan the lift, use mechanical assistance where practical, and apply safe handling technique." },
        { name: "Unauthorized access", aliases: ["unauthorized access", "people entering", "access to work area"], control: "Define the work zone and restrict access to authorized personnel." }
      ],
      checklist: ["ppe", "tools", "access", "housekeeping", "toolbox"]
    }
  };

  function translateValue(value) {
    if (window.SafePermitI18n && typeof window.SafePermitI18n.translateValue === "function") {
      return window.SafePermitI18n.translateValue(value);
    }

    return value;
  }

  function t(key, fallback) {
    if (window.SafePermitI18n && typeof window.SafePermitI18n.t === "function") {
      const translated = window.SafePermitI18n.t(key);
      return translated && translated !== key ? translated : fallback;
    }

    return fallback;
  }

  function replay(element, className, duration) {
    if (!element) {
      return;
    }

    if (motion && typeof motion.restartClass === "function") {
      motion.restartClass(element, className);
    } else {
      element.classList.remove(className);
      void element.offsetWidth;
      element.classList.add(className);
    }

    if (duration) {
      window.setTimeout(function () {
        element.classList.remove(className);
      }, duration);
    }
  }

  function animateReviewSection(sectionName, ready, order) {
    const section = document.querySelector('[data-review-section="' + sectionName + '"]');

    if (!section || !ready) {
      return;
    }

    const delay = reducedMotion.matches ? 0 : 220 + order * 180;

    window.setTimeout(function () {
      section.classList.add("is-verifying");

      window.setTimeout(function () {
        section.classList.remove("is-verifying");
        section.classList.add("is-verified");
      }, reducedMotion.matches ? 0 : 700);
    }, delay);
  }

  function stageStaticReviewData() {
    document
      .querySelectorAll(
        ".review-details > div, .review-risk-summary > div, .review-checklist-summary > div"
      )
      .forEach(function (item, index) {
        item.style.setProperty("--data-delay", (index % 9) * 45 + "ms");
        item.classList.add("is-data-ready");
      });
  }

  function stageDynamicReviewItems() {
    document.querySelectorAll(".review-hazard").forEach(function (item, index) {
      item.style.setProperty("--item-delay", Math.min(index, 7) * 70 + "ms");
      item.classList.add("is-review-item-ready");
    });

    document.querySelectorAll(".review-checklist-item").forEach(function (item, index) {
      item.style.setProperty("--item-delay", Math.min(index, 9) * 45 + "ms");
      item.classList.add("is-review-item-ready");
    });
  }

  function setSubmissionReadiness(ready) {
    if (confirmationCard) {
      confirmationCard.classList.toggle("is-ready", ready);
    }

    submitButton.classList.toggle("is-ready", ready);
  }

  function startWorkflowHandoff() {
    if (reviewStatusBox) {
      replay(reviewStatusBox, "is-handoff", 900);
    }

    if (reviewApprovalFlow) {
      reviewApprovalFlow.classList.add("is-handoff");
    }

    document.querySelectorAll(".review-summary-card").forEach(function (card, index) {
      window.setTimeout(function () {
        replay(card, "is-summary-focus", 700);
      }, reducedMotion.matches ? 0 : index * 90);
    });
  }

  function openSuccessModal() {
    window.SafePermitCompletion.open(successModal, submitButton);
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

  function riskLevel(score) {
    if (score <= 4) {
      return {
        label: "Low",
        className: "review-risk-chip--low"
      };
    }

    if (score <= 9) {
      return {
        label: "Medium",
        className: "review-risk-chip--medium"
      };
    }

    if (score <= 16) {
      return {
        label: "High",
        className: "review-risk-chip--high"
      };
    }

    return {
      label: "Critical",
      className: "review-risk-chip--critical"
    };
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

  function renderBasicInfo() {
    const data = parseStorage("safePermitDraftBasicInfo");

    if (!data) {
      return false;
    }

    document.getElementById("reviewPermitType").textContent =
      permitTypeLabels[data.permitType] || data.permitType || "—";

    document.getElementById("reviewWorkTitle").textContent =
      data.workTitle || "—";

    document.getElementById("reviewDescription").textContent =
      data.description || "—";

    document.getElementById("reviewSite").textContent =
      siteLabels[data.site] || data.site || "—";

    document.getElementById("reviewArea").textContent =
      data.area
        ? data.area.replaceAll("-", " ").replace(/\b\w/g, function (letter) {
            return letter.toUpperCase();
          })
        : "—";

    document.getElementById("reviewStart").textContent =
      formatDateTime(data.startDate, data.startTime);

    document.getElementById("reviewEnd").textContent =
      formatDateTime(data.endDate, data.endTime);

    document.getElementById("reviewSupervisor").textContent =
      supervisorLabels[data.supervisor] || data.supervisor || "—";

    document.getElementById("reviewWorkerCount").textContent =
      data.workerCount || "—";

    return true;
  }

  function renderRiskAssessment() {
    const data = parseStorage("safePermitDraftRiskAssessment");
    const container = document.getElementById("reviewHazards");
    const empty = document.getElementById("riskEmpty");

    if (!data || !Array.isArray(data.hazards) || data.hazards.length === 0) {
      empty.hidden = false;
      return false;
    }

    empty.hidden = true;

    let highestInitial = 0;
    let highestResidual = 0;

    data.hazards.forEach(function (hazard, index) {
      highestInitial = Math.max(
        highestInitial,
        Number(hazard.initialScore) || 0
      );

      highestResidual = Math.max(
        highestResidual,
        Number(hazard.residualScore) || 0
      );

      const initial = riskLevel(Number(hazard.initialScore) || 0);
      const residual = riskLevel(Number(hazard.residualScore) || 0);

      const card = document.createElement("article");
      card.className = "review-hazard";

      card.innerHTML =
        '<div class="review-hazard__top">' +
          '<strong>Hazard ' + (index + 1) + ' · ' +
            escapeHTML(hazard.hazard || "Unnamed hazard") +
          '</strong>' +
          '<div class="review-hazard__scores">' +
            '<span class="review-risk-chip ' + initial.className + '">' +
              'Initial ' + (hazard.initialScore || "—") + ' · ' + initial.label +
            '</span>' +
            '<span class="review-risk-chip ' + residual.className + '">' +
              'Residual ' + (hazard.residualScore || "—") + ' · ' + residual.label +
            '</span>' +
          '</div>' +
        '</div>' +
        '<div class="review-hazard__control">' +
          '<span>Control Measures</span>' +
          '<p>' + escapeHTML(hazard.controls || "—") + '</p>' +
        '</div>';

      container.appendChild(card);
    });

    document.getElementById("reviewHazardCount").textContent =
      data.hazards.length;

    if (highestInitial) {
      const initialLevel = riskLevel(highestInitial);
      document.getElementById("reviewHighestInitial").textContent =
        highestInitial + " · " + initialLevel.label;
    }

    if (highestResidual) {
      const residualLevel = riskLevel(highestResidual);
      document.getElementById("reviewHighestResidual").textContent =
        highestResidual + " · " + residualLevel.label;
    }

    return true;
  }

  function renderChecklist() {
    const data = parseStorage("safePermitDraftSafetyChecklist");
    const container = document.getElementById("reviewChecklistList");
    const empty = document.getElementById("checklistEmpty");

    if (!data || !Array.isArray(data.answers) || data.answers.length === 0) {
      empty.hidden = false;
      return false;
    }

    empty.hidden = true;

    let answered = 0;
    let mandatoryTotal = 0;
    let mandatoryComplete = 0;
    let issues = 0;

    data.answers.forEach(function (answer) {
      if (answer.answer) {
        answered += 1;
      }

      if (answer.required) {
        mandatoryTotal += 1;

        if (answer.answer === "yes" || answer.answer === "na") {
          mandatoryComplete += 1;
        }
      }

      if (answer.answer === "no") {
        issues += 1;
      }

      const row = document.createElement("div");
      row.className = "review-checklist-item";

      const answerValue = answer.answer || "Not answered";
      const answerClass =
        answer.answer === "yes"
          ? "review-checklist-answer--yes"
          : answer.answer === "no"
          ? "review-checklist-answer--no"
          : "review-checklist-answer--na";

      row.innerHTML =
        "<strong>" +
          escapeHTML(checklistLabels[answer.item] || answer.item || "Checklist item") +
        "</strong>" +
        '<span class="review-checklist-answer ' + answerClass + '">' +
          escapeHTML(answerValue.toUpperCase()) +
        "</span>";

      container.appendChild(row);
    });

    document.getElementById("reviewChecklistAnswered").textContent =
      answered + " / " + data.answers.length;

    document.getElementById("reviewChecklistMandatory").textContent =
      mandatoryComplete + " / " + mandatoryTotal;

    document.getElementById("reviewChecklistIssues").textContent =
      issues;

    return data.confirmed === true && issues === 0;
  }

  function escapeHTML(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function currentPermitBundle() {
    return {
      basicInfo: parseStorage("safePermitDraftBasicInfo") || {},
      riskAssessment: parseStorage("safePermitDraftRiskAssessment") || { hazards: [] },
      safetyChecklist: parseStorage("safePermitDraftSafetyChecklist") || { answers: [] }
    };
  }

  function simpleFingerprint(bundle) {
    const source = JSON.stringify(bundle);
    let hash = 2166136261;

    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return String(hash >>> 0);
  }

  function normalizeForAi(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06ff ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getChecklistMap(answers) {
    const map = {};

    (Array.isArray(answers) ? answers : []).forEach(function (answer) {
      if (answer && answer.item) {
        map[answer.item] = answer;
      }
    });

    return map;
  }

  function hazardMatches(hazards, rule) {
    return hazards.some(function (hazard) {
      const haystack = normalizeForAi(
        (hazard && hazard.hazard ? hazard.hazard : "") + " " +
        (hazard && hazard.controls ? hazard.controls : "")
      );

      return rule.aliases.some(function (alias) {
        return haystack.includes(normalizeForAi(alias));
      });
    });
  }

  function addAiFinding(findings, finding) {
    const duplicate = findings.some(function (item) {
      return item.key === finding.key;
    });

    if (!duplicate) {
      findings.push(finding);
    }
  }

  function buildAiSafetyReviewReport() {
    const bundle = currentPermitBundle();
    const basic = bundle.basicInfo || {};
    const risk = bundle.riskAssessment || {};
    const checklist = bundle.safetyChecklist || {};
    const hazards = Array.isArray(risk.hazards) ? risk.hazards : [];
    const answers = Array.isArray(checklist.answers) ? checklist.answers : [];
    const answerMap = getChecklistMap(answers);
    const findings = [];
    const permitType = basic.permitType || "general";
    const rules = aiSafetyRules[permitType] || aiSafetyRules.general;

    const requiredBasic = [
      ["workTitle", "Work title"],
      ["description", "Job description"],
      ["site", "Site"],
      ["area", "Area"],
      ["supervisor", "Supervisor"],
      ["workerCount", "Worker count"]
    ];

    const missingBasic = requiredBasic
      .filter(function (item) { return !String(basic[item[0]] || "").trim(); })
      .map(function (item) { return item[1]; });

    if (missingBasic.length) {
      addAiFinding(findings, {
        key: "missing-basic",
        severity: "attention",
        typeKey: "worker.create_permit.review_submit.ai_missing_information",
        typeFallback: "Missing information",
        titleKey: "worker.create_permit.review_submit.ai_complete_basic_information",
        titleFallback: "Complete the permit basics before submission",
        body: t("worker.create_permit.review_submit.ai_missing_fields_prefix", "Missing fields:") + " " + missingBasic.map(translateValue).join(", ") + ".",
        whyKey: "worker.create_permit.review_submit.ai_missing_basic_why",
        whyFallback: "The review needs clear work, location, supervision, and staffing context before hazards can be assessed meaningfully.",
        action: { kind: "link", href: "../basic-info/", labelKey: "worker.create_permit.review_submit.edit_basic_info", labelFallback: "Edit Basic Info" }
      });
    }

    if (hazards.length === 0) {
      addAiFinding(findings, {
        key: "no-hazards",
        severity: "attention",
        typeKey: "worker.create_permit.review_submit.ai_risk_gap",
        typeFallback: "Risk gap",
        titleKey: "worker.create_permit.review_submit.ai_no_hazards_title",
        titleFallback: "No hazards are recorded",
        body: t("worker.create_permit.review_submit.ai_no_hazards_body", "Add the significant hazards for this task and assess both initial and residual risk."),
        whyKey: "worker.create_permit.review_submit.ai_no_hazards_why",
        whyFallback: "A permit cannot communicate the work risk if the hazard register is empty.",
        action: { kind: "link", href: "../risk-assessment/", labelKey: "worker.create_permit.review_submit.open_risk_assessment", labelFallback: "Open Risk Assessment" }
      });
    }

    hazards.forEach(function (hazard, index) {
      const hazardName = hazard && hazard.hazard ? hazard.hazard : "Hazard " + (index + 1);
      const initial = Number(hazard && hazard.initialScore) || 0;
      const residual = Number(hazard && hazard.residualScore) || 0;
      const controls = String(hazard && hazard.controls || "").trim();

      if (!controls) {
        addAiFinding(findings, {
          key: "controls-" + index,
          severity: "attention",
          typeKey: "worker.create_permit.review_submit.ai_control_gap",
          typeFallback: "Control gap",
          title: translateValue(hazardName) + ": " + t("worker.create_permit.review_submit.ai_controls_missing_suffix", "controls are missing"),
          body: t("worker.create_permit.review_submit.ai_add_controls_body", "Add specific control measures before relying on the residual-risk value."),
          whyKey: "worker.create_permit.review_submit.ai_controls_missing_why",
          whyFallback: "Residual risk should reflect controls that are actually defined and intended to be applied.",
          action: { kind: "link", href: "../risk-assessment/", labelKey: "worker.create_permit.review_submit.review_controls", labelFallback: "Review Controls" }
        });
      }

      if (!initial || !residual) {
        addAiFinding(findings, {
          key: "score-" + index,
          severity: "attention",
          typeKey: "worker.create_permit.review_submit.ai_scoring_gap",
          typeFallback: "Scoring gap",
          title: translateValue(hazardName) + ": " + t("worker.create_permit.review_submit.ai_risk_scores_incomplete_suffix", "risk scoring is incomplete"),
          body: t("worker.create_permit.review_submit.ai_complete_risk_scores_body", "Complete likelihood and severity for both initial and residual risk."),
          whyKey: "worker.create_permit.review_submit.ai_complete_scores_why",
          whyFallback: "Missing scores make it impossible to compare the risk before and after controls.",
          action: { kind: "link", href: "../risk-assessment/", labelKey: "worker.create_permit.review_submit.complete_scoring", labelFallback: "Complete Scoring" }
        });
      } else if (residual >= initial) {
        addAiFinding(findings, {
          key: "not-reduced-" + index,
          severity: "attention",
          typeKey: "worker.create_permit.review_submit.ai_residual_risk",
          typeFallback: "Residual risk",
          title: translateValue(hazardName) + ": " + t("worker.create_permit.review_submit.ai_risk_not_reduced_suffix", "risk is not reduced"),
          body: t("worker.create_permit.review_submit.ai_risk_not_reduced_body", "Residual risk is equal to or higher than initial risk. Recheck whether the controls are effective."),
          whyKey: "worker.create_permit.review_submit.ai_risk_not_reduced_why",
          whyFallback: "Control measures should normally reduce either likelihood, severity, or both when they are effective.",
          action: { kind: "link", href: "../risk-assessment/", labelKey: "worker.create_permit.review_submit.review_risk", labelFallback: "Review Risk" }
        });
      } else if (residual > 9) {
        addAiFinding(findings, {
          key: "residual-high-" + index,
          severity: "attention",
          typeKey: "worker.create_permit.review_submit.ai_residual_risk",
          typeFallback: "Residual risk",
          title: translateValue(hazardName) + ": " + t("worker.create_permit.review_submit.ai_residual_high_suffix", "residual risk remains high"),
          body: t("worker.create_permit.review_submit.ai_residual_high_body", "Consider stronger controls or additional review before submission."),
          whyKey: "worker.create_permit.review_submit.ai_residual_high_why",
          whyFallback: "A high residual risk deserves explicit attention even when controls have reduced the original score.",
          action: { kind: "link", href: "../risk-assessment/", labelKey: "worker.create_permit.review_submit.review_risk", labelFallback: "Review Risk" }
        });
      }
    });

    let coveredExpectedHazards = 0;

    rules.hazards.forEach(function (rule, index) {
      if (hazardMatches(hazards, rule)) {
        coveredExpectedHazards += 1;
        return;
      }

      addAiFinding(findings, {
        key: "suggest-hazard-" + index,
        severity: "suggestion",
        typeKey: "worker.create_permit.review_submit.ai_suggested_hazard",
        typeFallback: "Suggested hazard",
        title: translateValue(rule.name),
        body: t("worker.create_permit.review_submit.ai_hazard_not_obvious_body", "This hazard is commonly relevant to the selected permit type but is not obvious in the current assessment."),
        why: t("worker.create_permit.review_submit.ai_suggested_control_prefix", "Suggested control:") + " " + translateValue(rule.control),
        action: {
          kind: "add-hazard",
          labelKey: "worker.create_permit.review_submit.add_to_assessment",
          labelFallback: "Add to Assessment",
          hazard: rule.name,
          control: rule.control
        }
      });
    });

    let checklistIssues = 0;

    answers.forEach(function (answer) {
      if (!answer || !answer.item) return;

      if (answer.required && (!answer.answer || answer.answer === "no")) {
        checklistIssues += 1;
        addAiFinding(findings, {
          key: "checklist-" + answer.item,
          severity: "attention",
          typeKey: "worker.create_permit.review_submit.ai_checklist_gap",
          typeFallback: "Checklist gap",
          title: translateValue(checklistLabels[answer.item] || answer.item),
          body: answer.answer === "no"
            ? t("worker.create_permit.review_submit.ai_checklist_no_body", "This mandatory safety item is marked No and needs resolution before submission.")
            : t("worker.create_permit.review_submit.ai_checklist_unanswered_body", "This mandatory safety item has not been answered."),
          whyKey: "worker.create_permit.review_submit.ai_checklist_why",
          whyFallback: "Mandatory checklist rules are enforced independently of AI and cannot be overridden by suggestions.",
          action: { kind: "link", href: "../safety-checklist/", labelKey: "worker.create_permit.review_submit.review_checklist", labelFallback: "Review Checklist" }
        });
      }
    });

    rules.checklist.forEach(function (item) {
      const answer = answerMap[item];
      if (!answer || !answer.answer) {
        if (!findings.some(function (finding) { return finding.key === "checklist-" + item; })) {
          addAiFinding(findings, {
            key: "focus-checklist-" + item,
            severity: "info",
            typeKey: "worker.create_permit.review_submit.ai_review_focus",
            typeFallback: "Review focus",
            title: translateValue(checklistLabels[item] || item),
            body: t("worker.create_permit.review_submit.ai_focus_item_body", "Confirm this item because it is especially relevant to the selected permit type."),
            whyKey: "worker.create_permit.review_submit.ai_focus_item_why",
            whyFallback: "The selected permit type commonly relies on this control or readiness check.",
            action: { kind: "link", href: "../safety-checklist/", labelKey: "worker.create_permit.review_submit.review_checklist", labelFallback: "Review Checklist" }
          });
        }
      }
    });

    const attentionCount = findings.filter(function (item) { return item.severity === "attention"; }).length;
    const suggestionCount = findings.filter(function (item) { return item.severity === "suggestion"; }).length;

    return {
      fingerprint: simpleFingerprint(bundle),
      generatedAt: new Date().toISOString(),
      findings: findings,
      attentionCount: attentionCount,
      suggestionCount: suggestionCount,
      checklistIssues: checklistIssues,
      expectedHazards: rules.hazards.length,
      coveredExpectedHazards: coveredExpectedHazards,
      clear: attentionCount === 0 && suggestionCount === 0
    };
  }

  function updateAiPermitContext() {
    if (!aiContextWork) return;

    const bundle = currentPermitBundle();
    const basic = bundle.basicInfo || {};
    const hazards = bundle.riskAssessment && Array.isArray(bundle.riskAssessment.hazards)
      ? bundle.riskAssessment.hazards
      : [];
    const permitType = permitTypeLabels[basic.permitType] || basic.permitType || "—";
    const site = siteLabels[basic.site] || basic.site || "—";
    const area = basic.area ? basic.area.replaceAll("-", " ").replace(/\b\w/g, function (letter) { return letter.toUpperCase(); }) : "—";

    aiContextWork.textContent = permitType;
    aiContextLocation.textContent = site + (area !== "—" ? " · " + area : "");
    aiContextAssessment.textContent = hazards.length + " " + t("worker.create_permit.review_submit.hazards_lower", "hazards");
  }

  function aiFindingTypeLabel(finding) {
    return t(finding.typeKey, finding.typeFallback);
  }

  function buildAiFindingAction(finding) {
    if (!finding.action) return "";

    const label = t(finding.action.labelKey, finding.action.labelFallback);

    if (finding.action.kind === "add-hazard") {
      return '<button class="sp-btn sp-btn--secondary" type="button" data-ai-add-hazard data-hazard="' +
        escapeHTML(finding.action.hazard) + '" data-control="' + escapeHTML(finding.action.control) + '">' +
        escapeHTML(label) + '</button>';
    }

    return '<a class="sp-btn sp-btn--secondary" href="' + escapeHTML(finding.action.href) + '">' +
      escapeHTML(label) + '</a>';
  }

  function renderAiSafetyReview(report) {
    if (!aiSafetyReviewResults || !aiReviewFindings) return;

    lastAiReviewReport = report;
    aiSafetyReviewResults.hidden = false;
    aiReviewFindings.innerHTML = "";

    const findingCount = report.findings.length;
    aiFindingCount.textContent = String(findingCount);
    aiHazardCoverage.textContent = report.coveredExpectedHazards + " / " + report.expectedHazards;
    aiChecklistIssues.textContent = String(report.checklistIssues);

    const noActionableFindings = findingCount === 0;
    aiReviewSummaryIcon.classList.toggle("is-clear", noActionableFindings);
    aiReviewStatus.classList.toggle("is-clear", noActionableFindings);
    aiReviewSummaryIcon.textContent = noActionableFindings ? "✓" : "!";

    if (noActionableFindings) {
      aiReviewStatus.textContent = t("worker.create_permit.review_submit.ai_no_obvious_gaps", "No obvious gaps");
      aiReviewTitle.textContent = t("worker.create_permit.review_submit.ai_review_complete_title", "Automated review completed");
      aiReviewSummary.textContent = t("worker.create_permit.review_submit.ai_review_complete_summary", "No obvious gaps were found by this assistant. Human review is still required before work can be authorized.");

      aiReviewFindings.innerHTML =
        '<div class="review-ai__empty">' +
          '<strong>' + escapeHTML(t("worker.create_permit.review_submit.ai_no_obvious_gaps", "No obvious gaps found")) + '</strong>' +
          '<p>' + escapeHTML(t("worker.create_permit.review_submit.ai_no_gap_caution", "This is not a safety approval. Continue with the normal Supervisor, Safety Officer, and Admin review workflow.")) + '</p>' +
        '</div>';
    } else {
      aiReviewStatus.textContent = report.attentionCount
        ? t("worker.create_permit.review_submit.ai_attention_recommended", "Attention recommended")
        : t("worker.create_permit.review_submit.ai_suggestions_found", "Suggestions found");
      aiReviewTitle.textContent = report.attentionCount
        ? t("worker.create_permit.review_submit.ai_gaps_found_title", "Review the highlighted items before submission")
        : t("worker.create_permit.review_submit.ai_improvements_found_title", "Optional improvements were identified");
      aiReviewSummary.textContent = report.attentionCount
        ? t("worker.create_permit.review_submit.ai_gaps_found_summary", "The assistant found items that deserve worker attention. Mandatory rules are still enforced by the permit workflow itself.")
        : t("worker.create_permit.review_submit.ai_improvements_found_summary", "The current permit passed the assistant's basic consistency checks, with a few optional suggestions for review.");

      report.findings.forEach(function (finding) {
        const article = document.createElement("article");
        article.className = "review-ai__finding review-ai__finding--" + finding.severity;
        const title = finding.title || t(finding.titleKey, finding.titleFallback);
        const body = finding.body || t(finding.bodyKey, finding.bodyFallback);
        const why = finding.why || t(finding.whyKey, finding.whyFallback);
        const whyId = "aiWhy" + Math.random().toString(36).slice(2, 9);

        article.innerHTML =
          '<div class="review-ai__finding-main">' +
            '<span class="review-ai__finding-type">' + escapeHTML(aiFindingTypeLabel(finding)) + '</span>' +
            '<h4>' + escapeHTML(title) + '</h4>' +
            '<p>' + escapeHTML(body) + '</p>' +
            '<div class="review-ai__why" id="' + whyId + '" hidden>' + escapeHTML(why) + '</div>' +
          '</div>' +
          '<div class="review-ai__finding-actions">' +
            '<button class="review-ai__explain" type="button" data-ai-explain aria-controls="' + whyId + '" aria-expanded="false">' +
              escapeHTML(t("worker.create_permit.review_submit.why", "Why?")) +
            '</button>' +
            buildAiFindingAction(finding) +
          '</div>';

        aiReviewFindings.appendChild(article);
      });
    }

    localStorage.setItem("safePermitWorkerAiSafetyReview", JSON.stringify({
      fingerprint: report.fingerprint,
      generatedAt: report.generatedAt,
      findingCount: findingCount,
      attentionCount: report.attentionCount,
      suggestionCount: report.suggestionCount
    }));

    if (runAiSafetyReview) {
      const label = runAiSafetyReview.querySelector("span:last-child");
      if (label) {
        label.textContent = t("worker.create_permit.review_submit.rerun_ai_safety_review", "Re-run AI Safety Review");
      }
    }
  }

  function runWorkerAiSafetyReview() {
    if (!runAiSafetyReview || runAiSafetyReview.disabled) return;

    runAiSafetyReview.disabled = true;
    runAiSafetyReview.setAttribute("aria-busy", "true");

    if (aiSafetyReviewCard) {
      aiSafetyReviewCard.classList.add("is-analyzing");
    }

    const delay = reducedMotion.matches ? 0 : 900;

    window.setTimeout(function () {
      const report = buildAiSafetyReviewReport();
      renderAiSafetyReview(report);

      runAiSafetyReview.disabled = false;
      runAiSafetyReview.removeAttribute("aria-busy");

      if (aiSafetyReviewCard) {
        aiSafetyReviewCard.classList.remove("is-analyzing");
      }

      aiSafetyReviewResults.scrollIntoView({
        behavior: reducedMotion.matches ? "auto" : "smooth",
        block: "nearest"
      });
    }, delay);
  }

  function restoreAiSafetyReviewIfCurrent() {
    const stored = parseStorage("safePermitWorkerAiSafetyReview");
    if (!stored || !stored.fingerprint) return;

    const report = buildAiSafetyReviewReport();
    if (report.fingerprint === stored.fingerprint) {
      renderAiSafetyReview(report);
    }
  }

  function saveFinalDraft() {
    const payload = {
      basicInfo: parseStorage("safePermitDraftBasicInfo"),
      riskAssessment: parseStorage("safePermitDraftRiskAssessment"),
      safetyChecklist: parseStorage("safePermitDraftSafetyChecklist"),
      aiSafetyReview: parseStorage("safePermitWorkerAiSafetyReview"),
      status: "Draft",
      savedAt: new Date().toISOString()
    };

    localStorage.setItem(
      "safePermitCompleteDraft",
      JSON.stringify(payload)
    );

    reviewMessage.className = "review-message is-success";
    reviewMessage.textContent = translateValue("Complete permit draft saved locally.");
    replay(saveDraftButton, "is-sp-confirmed", 620);
  }

  let submissionPending = false, submissionRecorded = false;
  async function submitPermit() {
    if (submissionPending || submissionRecorded) return;
    confirmationError.textContent = "";
    reviewMessage.className = "review-message";
    reviewMessage.textContent = "";

    if (!submitConfirmation.checked) {
      confirmationError.textContent =
        translateValue("Confirm the permit information before submission.");

      replay(confirmationCard, "is-guided-error", 760);

      submitConfirmation.scrollIntoView({
        behavior: reducedMotion.matches ? "auto" : "smooth",
        block: "center"
      });

      submitConfirmation.focus();
      return;
    }

    const basicInfo = parseStorage("safePermitDraftBasicInfo");
    const riskAssessment = parseStorage("safePermitDraftRiskAssessment");
    const safetyChecklist = parseStorage("safePermitDraftSafetyChecklist");

    const basicErrors = window.SafePermitData.validateBasicInfo(basicInfo);
    if (Object.keys(basicErrors).length) {
      reviewMessage.className = 'review-message is-error';
      reviewMessage.setAttribute('role', 'alert');
      reviewMessage.tabIndex = -1;
      reviewMessage.textContent = document.documentElement.lang === 'ar'
        ? 'صحح المعلومات الأساسية قبل الإرسال. ' : 'Correct Basic Info before submitting. ';
      const list = document.createElement('ul');
      for (const [field, message] of Object.entries(basicErrors)) {
        const item = document.createElement('li'), link = document.createElement('a');
        link.href = '../basic-info/#' + field;
        link.textContent = translateValue(message);
        item.appendChild(link); list.appendChild(item);
      }
      reviewMessage.appendChild(list);
      reviewMessage.focus({preventScroll:true});
      return;
    }
    if (!basicInfo || !riskAssessment || !safetyChecklist) {
      reviewMessage.className = "review-message is-error";
      reviewMessage.textContent =
        translateValue(
          "Some permit data is missing. Return to the previous steps and complete the permit."
        );

      return;
    }

    const correctionContext = parseStorage("safePermitCorrectionContext");
    const originalPermit = correctionContext && correctionContext.originalPermit
      ? correctionContext.originalPermit
      : null;
    const now = new Date().toISOString();
    const isCorrection = Boolean(originalPermit && originalPermit.id);

    const receipt = parseStorage('safePermitSubmittedDraftReceipt');
    if (!isCorrection && receipt && receipt.basicRaw === JSON.stringify(basicInfo) &&
        window.SafePermitData.getPermit(receipt.permitId)) {
      reviewMessage.className = 'review-message is-error';
      reviewMessage.setAttribute('role', 'alert');
      reviewMessage.textContent = document.documentElement.lang === 'ar'
        ? 'أُرسلت هذه المسودة بالفعل. افتح التصريح من قائمتي أو ابدأ معلومات أساسية جديدة.'
        : 'This draft was already submitted. Open it from My Permits or start fresh Basic Info.';
      return;
    }



    // The correction context is a snapshot; re-check the live record so a permit that was
    // stopped or already resubmitted meanwhile is never reset to Pending Supervisor Review.
    if (isCorrection) {
      const live = window.SafePermitData && window.SafePermitData.getPermit(originalPermit.id);
      if (!live || live.status !== "Returned for Correction") {
        reviewMessage.className = "review-message is-error";
        reviewMessage.textContent = translateValue(
          "This permit is no longer awaiting correction. Open it from My Permits to see its current status."
        );
        return;
      }
    }

    const workflowHistory = isCorrection
      ? (Array.isArray(originalPermit.workflowHistory) ? originalPermit.workflowHistory.slice() : [])
      : [];

    if (isCorrection) {
      workflowHistory.push({
        revision: Number(originalPermit.revision) || 1,
        status: originalPermit.status || "Returned for Correction",
        supervisorDecision: originalPermit.supervisorDecision || null,
        safetyDecision: originalPermit.safetyDecision || null,
        adminDecision: originalPermit.adminDecision || null,
        archivedAt: now
      });
    }

    const permit = {
      id: isCorrection ? originalPermit.id : undefined,
      basicInfo: basicInfo,
      riskAssessment: riskAssessment,
      safetyChecklist: {...safetyChecklist,permitId:isCorrection ? originalPermit.id : null},
      aiSafetyReview: parseStorage("safePermitWorkerAiSafetyReview"),
      status: "Pending Supervisor Review",
      submittedAt: isCorrection ? (originalPermit.submittedAt || now) : now,
      resubmittedAt: isCorrection ? now : null,
      revision: isCorrection ? ((Number(originalPermit.revision) || 1) + 1) : 1,
      workflowHistory: workflowHistory,
      // Prior-cycle decisions are archived in workflowHistory and must not carry into this cycle.
      supervisorDecision: null,
      safetyDecision: null,
      adminDecision: null
    };

    permit.safetyChecklist.permitId = permit.id;
    submissionPending = true;
    submitButton.disabled = true;
    submitButton.setAttribute("aria-busy", "true");
    let saved;
    let consumed;
    try {
      consumed = {
        basicRaw: localStorage.getItem("safePermitDraftBasicInfo"),
        recoveryRaw: localStorage.getItem("safePermitDraftBasicInfo:recovery:v1"),
        correctionRaw: localStorage.getItem("safePermitCorrectionContext"),
        completeRaw: localStorage.getItem("safePermitCompleteDraft")
      };
      saved = isCorrection
        ? await window.SafePermitData.repository.resubmitPermit(permit)
        : await window.SafePermitData.repository.createPermit(permit);
    } catch (error) {
      submissionPending = false;
      submitButton.disabled = false;
      submitButton.removeAttribute("aria-busy");
      reviewMessage.className = "review-message is-error";
      reviewMessage.setAttribute("role", "alert");
      reviewMessage.textContent = document.documentElement.lang === "ar"
        ? "لم يُحفظ التصريح. بقيت بياناتك؛ راجع التخزين وأعد المحاولة. " + error.message
        : "Permit not saved. Your entries remain; review storage and retry. " + error.message;
      return;
    }
    submissionRecorded = true;
    submissionPending = false;
    // A receipt retires only consumed bytes, never another tab's newer work.
    // No Basic Info, recovery, Risk or Checklist payload is deleted here.
    try {
      let recoveryRaw = consumed.recoveryRaw;
      if (recoveryRaw) {
        const recovery = JSON.parse(recoveryRaw);
        const plain = value => { const copy = {...value}; delete copy._draftMeta; return JSON.stringify(copy); };
        if (recovery.base === consumed.basicRaw && plain(recovery.data) !== plain(basicInfo)) recoveryRaw = null;
      }
      localStorage.setItem("safePermitSubmittedDraftReceipt", JSON.stringify({permitId:saved.id, basicRaw:consumed.basicRaw, recoveryRaw}));
      for (const [key, raw] of [["safePermitCompleteDraft",consumed.completeRaw],["safePermitCorrectionContext",consumed.correctionRaw]]) {
        if (localStorage.getItem(key) === raw) localStorage.removeItem(key);
      }
    } catch (_) {
      reviewMessage.setAttribute("role", "status");
      reviewMessage.textContent = document.documentElement.lang === "ar"
        ? "حُفظ التصريح. تعذر تحديث حالة المسودة؛ لا تُعد الإرسال."
        : "Permit saved. Draft status could not be updated; do not resubmit.";
    }
    successModal.querySelectorAll('a[href]').forEach(link => {
      const url = new URL(link.href); url.searchParams.set('id', saved.id); link.href = url.href;
    });

    submitButton.disabled = true;
    submitButton.classList.remove("is-ready");
    submitButton.classList.add("is-submitting");
    submitButton.setAttribute("aria-busy", "true");

    if (reviewMain) {
      reviewMain.classList.add("is-submitting");
    }

    startWorkflowHandoff();

    const delay = reducedMotion.matches ? 0 : 980;

    window.setTimeout(function () {
      submitButton.classList.remove("is-submitting");
      submitButton.removeAttribute("aria-busy");

      if (reviewMain) {
        reviewMain.classList.remove("is-submitting");
      }

      openSuccessModal();
    }, delay);
  }

  if (runAiSafetyReview) {
    runAiSafetyReview.addEventListener("click", runWorkerAiSafetyReview);
  }

  if (aiReviewFindings) {
    aiReviewFindings.addEventListener("click", function (event) {
      const explainButton = event.target.closest("[data-ai-explain]");
      if (explainButton) {
        const targetId = explainButton.getAttribute("aria-controls");
        const target = targetId ? document.getElementById(targetId) : null;
        if (target) {
          const expanded = explainButton.getAttribute("aria-expanded") === "true";
          explainButton.setAttribute("aria-expanded", expanded ? "false" : "true");
          target.hidden = expanded;
        }
        return;
      }

      const addButton = event.target.closest("[data-ai-add-hazard]");
      if (addButton) {
        localStorage.setItem("safePermitAiPendingSuggestion", JSON.stringify({
          hazard: addButton.dataset.hazard || "",
          control: addButton.dataset.control || "",
          source: "worker-ai-safety-review",
          createdAt: new Date().toISOString()
        }));
        window.location.href = "../risk-assessment/";
      }
    });
  }

  saveDraftButton.addEventListener("click", saveFinalDraft);
  submitButton.addEventListener("click", submitPermit);

  submitConfirmation.addEventListener("change", function () {
    if (submitConfirmation.checked) {
      confirmationError.textContent = "";

      if (confirmationCard) {
        confirmationCard.classList.add("is-confirmed");
        replay(confirmationCard, "is-confirmed", 900);
      }

      setSubmissionReadiness(true);
    } else {
      if (confirmationCard) {
        confirmationCard.classList.remove("is-confirmed");
      }

      setSubmissionReadiness(false);
    }
  });

  const basicReady = renderBasicInfo();
  const riskReady = renderRiskAssessment();
  const checklistReady = renderChecklist();

  stageStaticReviewData();
  stageDynamicReviewItems();

  animateReviewSection("basic", basicReady, 0);
  animateReviewSection("risk", riskReady, 1);
  animateReviewSection("checklist", checklistReady, 2);

  if (!basicReady || !riskReady || !checklistReady) {
    reviewMessage.className = "review-message is-error";
    reviewMessage.textContent =
      translateValue(
        "Some previous-step data is missing or incomplete. Use Edit to review those sections."
      );
  }

  updateAiPermitContext();
  restoreAiSafetyReviewIfCurrent();

  document.addEventListener("safepermit:languagechange", function () {
    updateAiPermitContext();
    if (lastAiReviewReport && !aiSafetyReviewResults.hidden) {
      renderAiSafetyReview(buildAiSafetyReviewReport());
    }
  });

  setSubmissionReadiness(submitConfirmation.checked);
})();
