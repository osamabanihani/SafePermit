(function () {
  const sidebar = document.getElementById("adminSidebar");
  const overlay = document.getElementById("adminOverlay");
  const sidebarOpen = document.getElementById("sidebarOpen");
  const sidebarClose = document.getElementById("sidebarClose");

  const organizationName = document.getElementById("organizationName");
  const supportEmail = document.getElementById("supportEmail");
  const defaultLandingPage = document.getElementById("defaultLandingPage");
  const itemsPerPage = document.getElementById("itemsPerPage");

  const defaultPermitValidity = document.getElementById("defaultPermitValidity");
  const maximumPermitDuration = document.getElementById("maximumPermitDuration");
  const autoExpirePermits = document.getElementById("autoExpirePermits");
  const requireDecisionConfirmation = document.getElementById("requireDecisionConfirmation");

  const requireActivationConfirmation = document.getElementById("requireActivationConfirmation");
  const requireClosureComment = document.getElementById("requireClosureComment");
  const notifyReviewAssignment = document.getElementById("notifyReviewAssignment");
  const notifyReturnedRejected = document.getElementById("notifyReturnedRejected");
  const notifyFinalApproval = document.getElementById("notifyFinalApproval");
  const notifyPermitExpiry = document.getElementById("notifyPermitExpiry");
  const expiryAlertMinutes = document.getElementById("expiryAlertMinutes");

  const saveSettingsButton = document.getElementById("saveSettingsButton");
  const resetSettingsButton = document.getElementById("resetSettingsButton");
  const settingsMessage = document.getElementById("settingsMessage");

  const settingsStatusTitle = document.getElementById("settingsStatusTitle");
  const settingsStatusText = document.getElementById("settingsStatusText");

  const resetModal = document.getElementById("resetModal");
  const cancelResetButton = document.getElementById("cancelResetButton");
  const confirmResetButton = document.getElementById("confirmResetButton");

  const storageKey = "safePermitAdminSettings";

  const defaults = {
    organizationName: "SafePermit Demo Organization",
    supportEmail: "support@safepermit.com",
    defaultLandingPage: "dashboard",
    itemsPerPage: 20,
    defaultPermitValidity: 8,
    maximumPermitDuration: 24,
    autoExpirePermits: true,
    requireDecisionConfirmation: true,
    requireActivationConfirmation: true,
    requireClosureComment: true,
    notifications: {
      reviewAssignment: true,
      returnedRejected: true,
      finalApproval: true,
      permitExpiry: true,
      expiryAlertMinutes: 30
    },
    riskPolicy: {
      low: "1-4",
      medium: "5-9",
      high: "10-16",
      critical: "17-25"
    },
    workflow: [
      "Worker",
      "Supervisor",
      "Safety Officer",
      "Admin"
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

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function setMessage(text, type) {
    settingsMessage.textContent = text;
    settingsMessage.className =
      "admin-settings-message" +
      (type ? " is-" + type : "");
  }

  function clearValidation() {
    organizationName.classList.remove("is-invalid");
    supportEmail.classList.remove("is-invalid");

    document.getElementById("organizationNameError").textContent = "";
    document.getElementById("supportEmailError").textContent = "";
  }

  function validate() {
    clearValidation();

    let valid = true;

    if (organizationName.value.trim().length < 3) {
      organizationName.classList.add("is-invalid");
      document.getElementById("organizationNameError").textContent =
        "Organization name must be at least 3 characters.";
      valid = false;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(supportEmail.value.trim())) {
      supportEmail.classList.add("is-invalid");
      document.getElementById("supportEmailError").textContent =
        "Enter a valid support email address.";
      valid = false;
    }

    if (
      Number(defaultPermitValidity.value) >
      Number(maximumPermitDuration.value)
    ) {
      setMessage(
        "Default Permit Validity cannot be longer than Maximum Permit Duration.",
        "error"
      );
      valid = false;
    }

    return valid;
  }

  function readForm() {
    return {
      organizationName: organizationName.value.trim(),
      supportEmail: supportEmail.value.trim(),
      defaultLandingPage: defaultLandingPage.value,
      itemsPerPage: Number(itemsPerPage.value),
      defaultPermitValidity: Number(defaultPermitValidity.value),
      maximumPermitDuration: Number(maximumPermitDuration.value),
      autoExpirePermits: autoExpirePermits.checked,
      requireDecisionConfirmation: requireDecisionConfirmation.checked,
      requireActivationConfirmation: requireActivationConfirmation ? requireActivationConfirmation.checked : true,
      requireClosureComment: requireClosureComment ? requireClosureComment.checked : true,
      notifications: {
        reviewAssignment: notifyReviewAssignment.checked,
        returnedRejected: notifyReturnedRejected.checked,
        finalApproval: notifyFinalApproval.checked,
        permitExpiry: notifyPermitExpiry.checked,
        expiryAlertMinutes: Number(expiryAlertMinutes.value)
      },
      riskPolicy: clone(defaults.riskPolicy),
      workflow: clone(defaults.workflow)
    };
  }

  function applySettings(settings) {
    organizationName.value =
      settings.organizationName || defaults.organizationName;

    supportEmail.value =
      settings.supportEmail || defaults.supportEmail;

    defaultLandingPage.value =
      settings.defaultLandingPage || defaults.defaultLandingPage;

    itemsPerPage.value =
      String(settings.itemsPerPage || defaults.itemsPerPage);

    defaultPermitValidity.value =
      String(
        settings.defaultPermitValidity ||
        defaults.defaultPermitValidity
      );

    maximumPermitDuration.value =
      String(
        settings.maximumPermitDuration ||
        defaults.maximumPermitDuration
      );

    autoExpirePermits.checked =
      settings.autoExpirePermits !== false;

    requireDecisionConfirmation.checked =
      settings.requireDecisionConfirmation !== false;

    if (requireActivationConfirmation) requireActivationConfirmation.checked = settings.requireActivationConfirmation !== false;
    if (requireClosureComment) requireClosureComment.checked = settings.requireClosureComment !== false;

    const notifications =
      settings.notifications || defaults.notifications;

    notifyReviewAssignment.checked =
      notifications.reviewAssignment !== false;

    notifyReturnedRejected.checked =
      notifications.returnedRejected !== false;

    notifyFinalApproval.checked =
      notifications.finalApproval !== false;

    notifyPermitExpiry.checked =
      notifications.permitExpiry !== false;

    expiryAlertMinutes.value =
      String(
        notifications.expiryAlertMinutes ||
        defaults.notifications.expiryAlertMinutes
      );

    syncExpiryAlertState();
  }

  function loadSettings() {
    const stored = localStorage.getItem(storageKey);

    if (!stored) {
      applySettings(defaults);

      settingsStatusTitle.textContent = "Default settings active";
      settingsStatusText.textContent =
        "No custom Admin Settings have been saved yet.";

      return;
    }

    try {
      const parsed = JSON.parse(stored);

      applySettings(parsed);

      settingsStatusTitle.textContent = "Custom settings loaded";
      settingsStatusText.textContent =
        "Saved Admin Settings were loaded from local storage.";
    } catch (error) {
      applySettings(defaults);

      settingsStatusTitle.textContent = "Default settings restored";
      settingsStatusText.textContent =
        "Stored settings could not be read, so defaults were loaded.";
    }
  }

  function saveSettings() {
    setMessage("", "");

    if (!validate()) {
      if (!settingsMessage.textContent) {
        setMessage(
          "Please correct the highlighted settings before saving.",
          "error"
        );
      }

      return;
    }

    const settings = readForm();

    localStorage.setItem(
      storageKey,
      JSON.stringify(settings)
    );

    settingsStatusTitle.textContent = "Settings saved";
    settingsStatusText.textContent =
      "Custom Admin Settings are active in this frontend demo.";

    setMessage(
      "Settings saved successfully.",
      "success"
    );
  }

  function openResetModal() {
    resetModal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeResetModal() {
    resetModal.hidden = true;
    document.body.style.overflow = "";
  }

  function resetSettings() {
    localStorage.removeItem(storageKey);
    applySettings(defaults);
    clearValidation();

    settingsStatusTitle.textContent = "Default settings active";
    settingsStatusText.textContent =
      "Custom Admin Settings were reset to the SafePermit defaults.";

    setMessage(
      "Settings reset to defaults.",
      "success"
    );

    closeResetModal();
  }

  function syncExpiryAlertState() {
    expiryAlertMinutes.disabled =
      !notifyPermitExpiry.checked;
  }

  notifyPermitExpiry.addEventListener(
    "change",
    syncExpiryAlertState
  );

  saveSettingsButton.addEventListener(
    "click",
    saveSettings
  );

  resetSettingsButton.addEventListener(
    "click",
    openResetModal
  );

  cancelResetButton.addEventListener(
    "click",
    closeResetModal
  );

  confirmResetButton.addEventListener(
    "click",
    resetSettings
  );

  document
    .querySelector("[data-close-reset]")
    .addEventListener(
      "click",
      closeResetModal
    );

  organizationName.addEventListener(
    "input",
    function () {
      organizationName.classList.remove("is-invalid");
      document.getElementById("organizationNameError").textContent = "";
    }
  );

  supportEmail.addEventListener(
    "input",
    function () {
      supportEmail.classList.remove("is-invalid");
      document.getElementById("supportEmailError").textContent = "";
    }
  );

  document.addEventListener(
    "keydown",
    function (event) {
      if (
        event.key === "Escape" &&
        !resetModal.hidden
      ) {
        closeResetModal();
      }
    }
  );

  loadSettings();
})();
