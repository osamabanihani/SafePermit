(function () {
  const form = document.getElementById("riskForm");
  const hazardList = document.getElementById("hazardList");
  const hazardEmpty = document.getElementById("hazardEmpty");
  const hazardTemplate = document.getElementById("hazardTemplate");

  const addHazardButton = document.getElementById("addHazardButton");
  const saveRiskDraft = document.getElementById("saveRiskDraft");
  const formMessage = document.getElementById("formMessage");
  let draftSave, draftReadFailed = false;
  function readStoredDraft(key) {
    try { return localStorage.getItem(key); }
    catch (_) { draftReadFailed = true; return null; }
  }

  const hazardCount = document.getElementById("hazardCount");
  const highestInitial = document.getElementById("highestInitial");
  const highestResidual = document.getElementById("highestResidual");

  const generateSuggestions = document.getElementById("generateSuggestions");
  const aiSuggestions = document.getElementById("aiSuggestions");
  const aiWorkContext = document.getElementById("aiWorkContext");
  const aiCard = generateSuggestions ? generateSuggestions.closest(".risk-card--ai") : null;

  const sidebar = document.getElementById("workerSidebar");
  const overlay = document.getElementById("workerOverlay");
  const sidebarOpen = document.getElementById("sidebarOpen");
  const sidebarClose = document.getElementById("sidebarClose");

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const motion = window.SafePermitMotion || null;

  function translateValue(value) {
    if (window.SafePermitI18n && typeof window.SafePermitI18n.translateValue === "function") {
      return window.SafePermitI18n.translateValue(value);
    }

    return value;
  }

  function replay(element, className) {
    if (!element) {
      return;
    }

    if (motion && typeof motion.restartClass === "function") {
      motion.restartClass(element, className);
      return;
    }

    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
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

  function riskLevel(score) {
    const risk = window.SafePermitRiskEngine.classify(score);
    return risk ? { name: risk.level, className: "is-" + risk.key }
      : { name: "Not calculated", className: "" };
  }

  function clearRiskClasses(element) {
    element.classList.remove(
      "is-low",
      "is-medium",
      "is-high",
      "is-critical",
      "is-improved"
    );
  }

  function animateScore(element, nextValue) {
    const previous = Number(element.dataset.scoreValue || 0);
    element.dataset.scoreValue = String(nextValue || 0);

    if (!nextValue) {
      element.textContent = "—";
      return;
    }

    if (reducedMotion.matches || previous === nextValue) {
      element.textContent = String(nextValue);
      return;
    }

    const start = performance.now();
    const duration = 360;
    const from = previous || Math.max(nextValue - 4, 0);

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(from + (nextValue - from) * eased);

      element.textContent = String(value);

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  }

  function updateScoreVisual(box, score, risk, improved) {
    const progress = score ? Math.min((score / 25) * 100, 100) : 0;

    box.style.setProperty("--risk-progress", progress + "%");
    clearRiskClasses(box);

    if (risk.className) {
      box.classList.add(risk.className);
    }

    if (improved) {
      box.classList.add("is-improved");
    }

    replay(box, "is-risk-morphing");

    window.setTimeout(function () {
      box.classList.remove("is-risk-morphing");
    }, 700);
  }

  function updateImpact(card, initialValue, residualValue) {
    const impact = card.querySelector(".risk-control-impact");

    if (!impact) {
      return;
    }

    const value = impact.querySelector(".risk-control-impact__value");

    if (!initialValue || !residualValue) {
      impact.hidden = true;
      impact.classList.remove("is-worse");
      impact.style.setProperty("--impact", "0%");
      value.textContent = "0%";
      return;
    }

    const reduction = Math.round(((initialValue - residualValue) / initialValue) * 100);
    const magnitude = Math.min(Math.abs(reduction), 100);

    impact.hidden = false;
    impact.classList.toggle("is-worse", reduction < 0);
    impact.style.setProperty("--impact", magnitude + "%");

    if (reduction > 0) {
      value.textContent = "−" + reduction + "%";
    } else if (reduction < 0) {
      value.textContent = "+" + Math.abs(reduction) + "%";
    } else {
      value.textContent = "0%";
    }
  }

  function calculateCard(card) {
    const initialLikelihood = card.querySelector(".initial-likelihood");
    const initialSeverity = card.querySelector(".initial-severity");
    const residualLikelihood = card.querySelector(".residual-likelihood");
    const residualSeverity = card.querySelector(".residual-severity");

    const initialScore = card.querySelector(".initial-score");
    const initialLevel = card.querySelector(".initial-level");
    const residualScore = card.querySelector(".residual-score");
    const residualLevel = card.querySelector(".residual-level");

    const initialBox = initialScore.closest(".risk-score-box");
    const residualBox = residualScore.closest(".risk-score-box");

    const initialValue =
      Number(initialLikelihood.value) *
      Number(initialSeverity.value);

    const residualValue =
      Number(residualLikelihood.value) *
      Number(residualSeverity.value);

    const initialRisk = riskLevel(initialValue);
    const residualRisk = riskLevel(residualValue);
    const improved = Boolean(initialValue && residualValue && residualValue < initialValue);

    animateScore(initialScore, initialValue);
    animateScore(residualScore, residualValue);

    initialLevel.textContent = translateValue(initialRisk.name);
    residualLevel.textContent = translateValue(residualRisk.name);

    updateScoreVisual(initialBox, initialValue, initialRisk, false);
    updateScoreVisual(residualBox, residualValue, residualRisk, improved);
    updateImpact(card, initialValue, residualValue);
    updateSummary();
  }

  function updateHazardNumbers() {
    const cards = hazardList.querySelectorAll(".hazard-card");

    cards.forEach(function (card, index) {
      const label = card.querySelector(".hazard-card__number");
      label.textContent = translateValue("Hazard " + (index + 1));
    });

    hazardEmpty.hidden = cards.length !== 0;

    const oldCount = Number(hazardCount.dataset.countValue || 0);
    const newCount = cards.length;
    hazardCount.dataset.countValue = String(newCount);

    if (oldCount !== newCount) {
      hazardCount.textContent = String(newCount);
      replay(hazardCount.parentElement, "is-summary-updated");
      window.setTimeout(function () {
        hazardCount.parentElement.classList.remove("is-summary-updated");
      }, 700);
    } else {
      hazardCount.textContent = String(newCount);
    }
  }

  function highlightScale(score) {
    const chips = document.querySelectorAll(".risk-summary__chips .risk-level");
    chips.forEach(function (chip) {
      chip.classList.remove("is-scale-active");
    });

    if (!score) {
      return;
    }

    const level = riskLevel(score).name.toLowerCase();
    const active = document.querySelector(".risk-level--" + level);

    if (active) {
      active.classList.add("is-scale-active");
    }
  }

  function setSummaryValue(element, value) {
    if (element.textContent === value) {
      return;
    }

    element.textContent = value;
    replay(element.parentElement, "is-summary-updated");

    window.setTimeout(function () {
      element.parentElement.classList.remove("is-summary-updated");
    }, 700);
  }

  function updateSummary() {
    const cards = Array.from(
      hazardList.querySelectorAll(".hazard-card")
    );

    let maxInitial = 0;
    let maxResidual = 0;

    cards.forEach(function (card) {
      const initialValue =
        Number(card.querySelector(".initial-likelihood").value) *
        Number(card.querySelector(".initial-severity").value);

      const residualValue =
        Number(card.querySelector(".residual-likelihood").value) *
        Number(card.querySelector(".residual-severity").value);

      if (initialValue > maxInitial) {
        maxInitial = initialValue;
      }

      if (residualValue > maxResidual) {
        maxResidual = residualValue;
      }
    });

    const initialText =
      maxInitial
        ? maxInitial + " · " + translateValue(riskLevel(maxInitial).name)
        : "—";

    const residualText =
      maxResidual
        ? maxResidual + " · " + translateValue(riskLevel(maxResidual).name)
        : "—";

    setSummaryValue(highestInitial, initialText);
    setSummaryValue(highestResidual, residualText);
    highlightScale(maxResidual);
    updateHazardNumbers();
  }

  function attachFieldValidation(card) {
    card
      .querySelectorAll("input, select, textarea")
      .forEach(function (input) {
        input.addEventListener("input", function () {
          if (input.classList.contains("is-invalid")) {
            validateInput(input);
          }

          if (input.classList.contains("control-measures")) {
            card.classList.toggle("has-controls", input.value.trim().length > 0);
          }
        });

        input.addEventListener("change", function () {
          if (input.classList.contains("is-invalid")) {
            validateInput(input);
          }
        });
      });
  }

  function addHazard(values, options) {
    const fragment = hazardTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".hazard-card");
    const config = options || {};
    const hazardSource = config.source || (values && values.source) || "manual";
    card.dataset.source = hazardSource;

    if (values) {
      card.querySelector(".hazard-name").value = values.hazard || "";
      card.querySelector(".control-measures").value = values.controls || values.control || "";
      card.querySelector(".initial-likelihood").value = values.initialLikelihood ? String(values.initialLikelihood) : "";
      card.querySelector(".initial-severity").value = values.initialSeverity ? String(values.initialSeverity) : "";
      card.querySelector(".residual-likelihood").value = values.residualLikelihood ? String(values.residualLikelihood) : "";
      card.querySelector(".residual-severity").value = values.residualSeverity ? String(values.residualSeverity) : "";
    }

    const removeButton = card.querySelector(".hazard-remove");

    removeButton.addEventListener("click", function () {
      if (draftSave) draftSave.dirty();
      if (reducedMotion.matches) {
        card.remove();
        if (draftSave) draftSave.dirty();
        updateSummary();
        return;
      }

      card.classList.add("is-hazard-leaving");

      window.setTimeout(function () {
        card.remove();
        if (draftSave) draftSave.dirty();
        updateSummary();
      }, 250);
    });

    card
      .querySelectorAll(
        ".initial-likelihood, .initial-severity, .residual-likelihood, .residual-severity"
      )
      .forEach(function (select) {
        select.addEventListener("change", function () {
          calculateCard(card);
        });
      });

    attachFieldValidation(card);

    hazardList.appendChild(card);
    if (!config.silent && draftSave) draftSave.dirty();

    if (values) {
      calculateCard(card);
      card.classList.toggle("has-controls", card.querySelector(".control-measures").value.trim().length > 0);
    } else {
      updateSummary();
    }

    if (!config.silent && !reducedMotion.matches) {
      card.classList.add(config.source === "ai" ? "is-ai-added" : "is-hazard-entering");

      window.setTimeout(function () {
        card.classList.remove("is-hazard-entering", "is-ai-added");
      }, config.source === "ai" ? 1800 : 760);
    }

    if (!config.silent) {
      card.scrollIntoView({
        behavior: reducedMotion.matches ? "auto" : "smooth",
        block: "center"
      });
    }

    return card;
  }

  function validateInput(input) {
    const error = input.parentElement.querySelector(".risk-error");

    if (!input.value.trim()) {
      input.classList.add("is-invalid");

      if (error) {
        error.textContent = translateValue("This field is required.");
      }

      return false;
    }

    input.classList.remove("is-invalid");

    if (error) {
      error.textContent = "";
    }

    return true;
  }

  function validateAll() {
    const cards = hazardList.querySelectorAll(".hazard-card");

    if (cards.length === 0) {
      formMessage.className = "risk-form-message is-error";
      formMessage.textContent =
        translateValue("Add at least one hazard before continuing.");

      return false;
    }

    let valid = true;

    cards.forEach(function (card) {
      card
        .querySelectorAll("input[required], select[required], textarea[required]")
        .forEach(function (input) {
          if (!validateInput(input)) {
            valid = false;
          }
        });
    });

    // Approval only accepts hazards whose controls lower the risk below 10 (hasAcceptableRisk in
    // shared/js/data-adapter.js). Catch it here rather than letting the Supervisor hit it at review.
    if (valid) {
      cards.forEach(function (card) {
        const initialValue =
          Number(card.querySelector(".initial-likelihood").value) *
          Number(card.querySelector(".initial-severity").value);
        const residualSeverity = card.querySelector(".residual-severity");
        const residualValue =
          Number(card.querySelector(".residual-likelihood").value) *
          Number(residualSeverity.value);

        if (residualValue < initialValue && residualValue < 10) {
          return;
        }

        valid = false;
        residualSeverity.classList.add("is-invalid");
        const error = residualSeverity.parentElement.querySelector(".risk-error");

        if (error) {
          error.textContent = translateValue(
            "Strengthen the controls or revise the residual rating for the highlighted hazards."
          );
        }
      });

      if (!valid) {
        formMessage.className = "risk-form-message is-error";
        formMessage.textContent = translateValue(
          "Residual risk must be lower than the initial risk and below 10 before this permit can be approved."
        );
      }
    }

    if (!valid) {
      const firstInvalid = document.querySelector(".is-invalid");

      if (firstInvalid) {
        const card = firstInvalid.closest(".hazard-card");

        if (card) {
          replay(card, "is-guided-error");
          window.setTimeout(function () {
            card.classList.remove("is-guided-error");
          }, 760);
        }

        firstInvalid.scrollIntoView({
          behavior: reducedMotion.matches ? "auto" : "smooth",
          block: "center"
        });

        firstInvalid.focus();
      }
    }

    return valid;
  }

  function collectHazards() {
    return Array.from(
      hazardList.querySelectorAll(".hazard-card")
    ).map(function (card) {
      const initialLikelihood = Number(
        card.querySelector(".initial-likelihood").value
      );

      const initialSeverity = Number(
        card.querySelector(".initial-severity").value
      );

      const residualLikelihood = Number(
        card.querySelector(".residual-likelihood").value
      );

      const residualSeverity = Number(
        card.querySelector(".residual-severity").value
      );

      return {
        hazard: card.querySelector(".hazard-name").value.trim(),
        initialLikelihood: initialLikelihood,
        initialSeverity: initialSeverity,
        initialScore: initialLikelihood * initialSeverity,
        controls: card.querySelector(".control-measures").value.trim(),
        residualLikelihood: residualLikelihood,
        residualSeverity: residualSeverity,
        residualScore: residualLikelihood * residualSeverity,
        source: card.dataset.source || "manual"
      };
    });
  }

  addHazardButton.addEventListener("click", function () {
    addHazard();
  });

  generateSuggestions.addEventListener("click", function () {
    if (generateSuggestions.disabled) {
      return;
    }

    generateSuggestions.disabled = true;
    generateSuggestions.setAttribute("aria-busy", "true");

    if (aiCard) {
      aiCard.classList.add("is-analyzing");
    }

    const delay = reducedMotion.matches ? 0 : 920;

    window.setTimeout(function () {
      aiSuggestions.hidden = false;

      aiSuggestions.querySelectorAll(".risk-ai-suggestion").forEach(function (item, index) {
        item.style.setProperty("--suggestion-delay", (index * 95) + "ms");
      });

      generateSuggestions.textContent = translateValue("Suggestions Generated");
      generateSuggestions.removeAttribute("aria-busy");

      if (aiCard) {
        aiCard.classList.remove("is-analyzing");
        aiCard.classList.add("is-ready");
      }
    }, delay);
  });

  document
    .querySelectorAll("[data-add-suggestion]")
    .forEach(function (button) {
      button.addEventListener("click", function () {
        addHazard(
          {
            hazard: button.dataset.hazard,
            control: button.dataset.control
          },
          { source: "ai" }
        );

        button.textContent = translateValue("Added");
        button.disabled = true;
        button.classList.add("is-confirmed");
      });
    });

  saveRiskDraft.addEventListener("click", function () {
    if (draftSave.save()) replay(saveRiskDraft, "is-sp-confirmed", 620);
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    draftSave.cancel();

    if (!validateAll()) {
      return;
    }

    if (!draftSave.save()) return;

    form.classList.add("is-completing");
    formMessage.className = "risk-form-message is-success";
    formMessage.textContent =
      translateValue("Risk assessment saved. Opening Safety Checklist...");

    draftSave.navigate("../safety-checklist/", reducedMotion.matches ? 0 : 720);
  });

  const storedRiskDraft = readStoredDraft("safePermitDraftRiskAssessment");

  if (storedRiskDraft) {
    try {
      const parsedRiskDraft = JSON.parse(storedRiskDraft);
      if (parsedRiskDraft && Array.isArray(parsedRiskDraft.hazards)) {
        parsedRiskDraft.hazards.forEach(function (hazard) {
          addHazard(hazard, { silent: true });
        });
      }
    } catch (error) {
    }
  }

  draftSave = window.SafePermitWizardSave({form, message:formMessage, key:'safePermitDraftRiskAssessment',
    read:() => ({hazards:collectHazards()}), className:'risk-form-message', button:saveRiskDraft});

  const pendingAiSuggestion = readStoredDraft("safePermitAiPendingSuggestion");

  if (pendingAiSuggestion) {
    try {
      const suggestion = JSON.parse(pendingAiSuggestion);

      if (suggestion && suggestion.hazard) {
        addHazard(
          {
            hazard: suggestion.hazard,
            control: suggestion.control || ""
          },
          { source: "ai" }
        );

        formMessage.className = "risk-form-message";
        formMessage.textContent = translateValue(
          "AI suggestion added. Complete likelihood, severity, and residual risk before continuing."
        );
      }
    } catch (error) {
    }

    try { localStorage.removeItem("safePermitAiPendingSuggestion"); } catch (_) { draftReadFailed = true; }
  }

  const basicInfo = readStoredDraft("safePermitDraftBasicInfo");

  if (basicInfo) {
    try {
      const parsed = JSON.parse(basicInfo);

      if (parsed.workTitle) {
        aiWorkContext.textContent =
          translateValue("Suggestions for: " + parsed.workTitle);
      }
    } catch (error) {
      aiWorkContext.textContent =
        translateValue("Based on the permit basic information.");
    }
  }

  document.addEventListener("safepermit:languagechange", function () {
    updateSummary();

    hazardList.querySelectorAll(".hazard-card").forEach(function (card) {
      calculateCard(card);
    });
  });

  if (draftReadFailed) draftSave.fail();

  updateSummary();
})();