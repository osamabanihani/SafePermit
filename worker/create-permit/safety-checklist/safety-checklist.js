(function () {
  const form = document.getElementById("checklistForm");
  const items = Array.from(document.querySelectorAll(".checklist-item"));

  const workerConfirmation = document.getElementById("workerConfirmation");
  const confirmationError = document.getElementById("confirmationError");
  const confirmationCard = workerConfirmation
    ? workerConfirmation.closest(".checklist-card--confirmation")
    : null;

  const saveChecklistDraft = document.getElementById("saveChecklistDraft");
  const formMessage = document.getElementById("formMessage");
  let draftSave, draftReadFailed = false;
  function readStoredDraft(key) {
    try { return localStorage.getItem(key); }
    catch (_) { draftReadFailed = true; return null; }
  }
  const nextButton = form.querySelector(".checklist-next");

  const progressPercent = document.getElementById("progressPercent");
  const progressBar = document.getElementById("progressBar");
  const progressRing = document.querySelector(".checklist-progress-ring");

  const answeredCount = document.getElementById("answeredCount");
  const mandatoryCount = document.getElementById("mandatoryCount");
  const issueCount = document.getElementById("issueCount");

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

  function getAnswer(item) {
    const checked = item.querySelector("input[type='radio']:checked");
    return checked ? checked.value : "";
  }

  function setItemVisualState(item, answer, animate) {
    const previous = item.dataset.visualAnswer || "";

    item.classList.remove(
      "is-answered",
      "is-positive",
      "is-negative",
      "is-na"
    );

    if (answer) {
      item.classList.add("is-answered");

      if (answer === "yes") {
        item.classList.add("is-positive");
      } else if (answer === "no") {
        item.classList.add("is-negative");
      } else if (answer === "na") {
        item.classList.add("is-na");
      }
    }

    item.dataset.visualAnswer = answer;

    if (animate && answer && answer !== previous) {
      replay(item, "is-just-answered", 700);
    }
  }

  function updateItemState(item, animate) {
    const answer = getAnswer(item);
    const note = item.querySelector(".checklist-item__note");
    const error = item.querySelector(".checklist-error");

    item.classList.remove("has-error");
    setItemVisualState(item, answer, animate);

    if (answer === "no") {
      note.hidden = false;
    } else {
      note.hidden = true;
    }

    if (answer) {
      error.textContent = "";
    }

    updateProgress(Boolean(animate));
  }

  function animateStat(element, value) {
    if (element.textContent === value) {
      return;
    }

    element.textContent = value;
    const card = element.parentElement;
    replay(card, "is-stat-updated", 700);
  }

  function updateProgress(animate) {
    const total = items.length;
    const mandatoryItems = items.filter(function (item) {
      return item.dataset.required === "true";
    });

    let answered = 0;
    let mandatoryComplete = 0;
    let issues = 0;

    items.forEach(function (item) {
      const answer = getAnswer(item);

      if (answer) {
        answered += 1;
      }

      if (answer === "no") {
        issues += 1;
      }

      if (
        item.dataset.required === "true" &&
        (answer === "yes" || answer === "na")
      ) {
        mandatoryComplete += 1;
      }
    });

    const percent = total ? Math.round((answered / total) * 100) : 0;
    const checklistComplete =
      answered === total &&
      mandatoryComplete === mandatoryItems.length &&
      issues === 0;

    if (progressPercent.textContent !== percent + "%") {
      progressPercent.textContent = percent + "%";

      if (animate) {
        replay(progressRing, "is-updating", 700);
      }
    }

    progressBar.style.width = percent + "%";
    progressRing.style.setProperty("--progress", percent + "%");

    if (animate) {
      replay(progressBar, "is-progressing", 720);
    }

    animateStat(answeredCount, answered + " / " + total);
    animateStat(
      mandatoryCount,
      mandatoryComplete + " / " + mandatoryItems.length
    );
    animateStat(issueCount, String(issues));

    const issueCard = issueCount.parentElement;
    issueCard.classList.toggle("has-issues", issues > 0);
    issueCard.classList.toggle("is-clean", answered > 0 && issues === 0);

    progressRing.classList.toggle("is-complete", checklistComplete);
    form.classList.toggle("is-checklist-complete", checklistComplete);

    if (confirmationCard) {
      confirmationCard.classList.toggle("is-ready", checklistComplete);
    }

    if (checklistComplete && animate) {
      replay(progressRing, "is-complete", 900);
    }

    return {
      total: total,
      answered: answered,
      mandatoryComplete: mandatoryComplete,
      mandatoryTotal: mandatoryItems.length,
      issues: issues,
      percent: percent,
      checklistComplete: checklistComplete
    };
  }

  function validateChecklist() {
    let valid = true;
    let firstInvalid = null;

    items.forEach(function (item) {
      const required = item.dataset.required === "true";
      const answer = getAnswer(item);
      const error = item.querySelector(".checklist-error");
      const note = item.querySelector("textarea");

      item.classList.remove("has-error");
      error.textContent = "";

      if (required && !answer) {
        valid = false;
        item.classList.add("has-error");
        error.textContent = translateValue("This mandatory item must be answered.");

        if (!firstInvalid) {
          firstInvalid = item;
        }

        return;
      }

      if (required && answer === "no") {
        valid = false;
        item.classList.add("has-error");
        error.textContent = translateValue(
          "This mandatory safety requirement must be resolved before continuing."
        );

        if (!firstInvalid) {
          firstInvalid = item;
        }

        return;
      }

      if (answer === "no" && note && note.value.trim() === "") {
        valid = false;
        item.classList.add("has-error");
        error.textContent = translateValue("Add a comment explaining this answer.");

        if (!firstInvalid) {
          firstInvalid = item;
        }
      }
    });

    if (!workerConfirmation.checked) {
      valid = false;
      confirmationError.textContent = translateValue(
        "Confirm the checklist before continuing."
      );

      if (!firstInvalid) {
        firstInvalid = workerConfirmation;
      }
    } else {
      confirmationError.textContent = "";
    }

    if (firstInvalid) {
      const target = firstInvalid.closest
        ? firstInvalid.closest(".checklist-item, .checklist-card--confirmation")
        : null;

      if (target) {
        replay(target, "is-guided-error", 760);
      }

      if (firstInvalid.scrollIntoView) {
        firstInvalid.scrollIntoView({
          behavior: reducedMotion.matches ? "auto" : "smooth",
          block: "center"
        });
      }

      if (firstInvalid.focus) {
        window.setTimeout(function () {
          firstInvalid.focus();
        }, reducedMotion.matches ? 0 : 240);
      }
    }

    return valid;
  }

  function collectChecklist() {
    return items.map(function (item) {
      const note = item.querySelector("textarea");

      return {
        item: item.dataset.item,
        required: item.dataset.required === "true",
        answer: getAnswer(item),
        comment: note ? note.value.trim() : ""
      };
    });
  }

  items.forEach(function (item) {
    item
      .querySelectorAll("input[type='radio']")
      .forEach(function (radio) {
        radio.addEventListener("change", function () {
          updateItemState(item, true);
        });
      });

    const textarea = item.querySelector("textarea");

    if (textarea) {
      textarea.addEventListener("input", function () {
        const error = item.querySelector(".checklist-error");

        if (textarea.value.trim() !== "") {
          error.textContent = "";
          item.classList.remove("has-error");
        }
      });
    }

    setItemVisualState(item, getAnswer(item), false);
  });

  workerConfirmation.addEventListener("change", function () {
    if (workerConfirmation.checked) {
      confirmationError.textContent = "";
      confirmationCard.classList.add("is-confirmed");
      replay(confirmationCard, "is-confirmed", 900);
    } else {
      confirmationCard.classList.remove("is-confirmed");
    }
  });

  saveChecklistDraft.addEventListener("click", function () {
    if (draftSave.save()) replay(saveChecklistDraft, "is-sp-confirmed", 620);
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    draftSave.cancel();

    if (!validateChecklist()) {
      formMessage.className = "checklist-message is-error";
      formMessage.textContent = translateValue(
        "Complete all mandatory safety checks before continuing."
      );

      return;
    }

    if (!draftSave.save()) return;

    form.classList.add("is-submitting");
    formMessage.className = "checklist-message is-success";
    formMessage.textContent = translateValue(
      "Safety checklist saved. Opening Review & Submit..."
    );

    if (nextButton) {
      nextButton.setAttribute("aria-busy", "true");
    }

    draftSave.navigate("../review-submit/", reducedMotion.matches ? 0 : 760);
  });

  function loadChecklistDraft() {
    const stored = readStoredDraft("safePermitDraftSafetyChecklist");
    if (!stored) return;

    let draft = null;
    try {
      draft = JSON.parse(stored);
    } catch (error) {
      return;
    }

    if (!draft || !Array.isArray(draft.answers)) return;

    draft.answers.forEach(function (saved) {
      const item = items.find(function (candidate) {
        return candidate.dataset.item === saved.item;
      });
      if (!item) return;

      if (saved.answer) {
        const radio = item.querySelector('input[type="radio"][value="' + saved.answer + '"]');
        if (radio) radio.checked = true;
      }

      const note = item.querySelector("textarea");
      if (note) note.value = saved.comment || "";
      updateItemState(item, false);
    });

    workerConfirmation.checked = draft.confirmed === true;
    confirmationCard.classList.toggle("is-confirmed", workerConfirmation.checked);
    updateProgress(false);
  }

  loadChecklistDraft();

  draftSave = window.SafePermitWizardSave({form, message:formMessage, key:'safePermitDraftSafetyChecklist',
    read:() => ({answers:collectChecklist(),confirmed:workerConfirmation.checked}), className:'checklist-message', button:saveChecklistDraft});

  document.addEventListener("safepermit:languagechange", function () {
    updateProgress(false);
  });

  if (draftReadFailed) draftSave.fail();

  updateProgress(false);
})();