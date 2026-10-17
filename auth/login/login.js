/* SafePermit login page (v13.9 "The Worksite").
 * Validation, messages and controls for the sign-in form. Who gets signed in is decided only by the
 * adapter in demo-auth.js (window.SafePermitDemoAuth) so a real backend can replace it; the worksite scene
 * (login-scene.js -> ../worksite/worksite-scene.js) is presentation only.
 *
 * Explicit states: idle → editing ⇄ invalid → submitting → success. A submission is ignored while one is
 * pending or after success. After an { ok: true } result the scene opens the gate and completes the route
 * (~0.82 s) and calls back; navigation happens in that callback, exactly once. Without WebGL, or with reduced
 * motion, the callback runs at once. No timers here. */
(function () {
  "use strict";
  const form = document.getElementById("loginForm");
  if (!form) return;
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const emailError = document.getElementById("emailError");
  const passwordError = document.getElementById("passwordError");
  const passwordToggle = document.getElementById("passwordToggle");
  const message = document.getElementById("authMessage");
  const demoButtons = Array.from(document.querySelectorAll("[data-demo-role]"));
  const forgotPasswordButton = document.getElementById("forgotPasswordButton");
  const submitButton = form.querySelector(".auth-submit");
  const capsLockWarning = document.getElementById("capsLockWarning");
  const auth = window.SafePermitDemoAuth;
  const noop = function () {};
  const scene = Object.assign({ focusField: noop, blurField: noop, flagField: noop, setProcessing: noop, setState: noop, reset: noop }, window.SafePermitLoginScene || {});

  /* ---------- state ---------- */
  let state = "idle";
  let navigated = false;
  function setState(next) {
    state = next;
    form.setAttribute("data-state", next);
    scene.setState(next);
  }
  const locked = () => state === "submitting" || state === "success";

  // Messages are written in English and translated through the locale runtime map (shared/js/i18n.js).
  function translate(element) {
    if (window.SafePermitI18n && typeof window.SafePermitI18n.apply === "function") window.SafePermitI18n.apply(element);
  }
  function say(element, text) {
    element.textContent = text;
    translate(element);
  }
  function showMessage(kind, text) {
    message.className = "auth-message" + (kind ? " is-" + kind : "");
    say(message, text);
  }

  function fieldFor(input) {
    return input.closest(".auth-field");
  }
  function fieldName(input) {
    const field = fieldFor(input);
    return field ? field.getAttribute("data-spg-field") : "";
  }

  function syncFieldState(input) {
    const field = fieldFor(input);
    if (!field) return;
    field.classList.toggle("has-auth-value", input.value.trim() !== "");
    field.classList.toggle("has-auth-error", input.classList.contains("is-invalid"));
  }

  // Calm, readable errors: colour, an inline-start bar and text on the field itself. No shake.
  function setError(input, errorElement, text) {
    input.classList.add("is-invalid");
    input.setAttribute("aria-invalid", "true");
    say(errorElement, text);
    syncFieldState(input);
  }

  function clearError(input, errorElement) {
    const wasInvalid = input.classList.contains("is-invalid");
    input.classList.remove("is-invalid");
    input.removeAttribute("aria-invalid");
    errorElement.textContent = "";
    syncFieldState(input);
    if (wasInvalid && document.activeElement === input) scene.focusField(fieldName(input));
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function validateEmail() {
    const value = emailInput.value.trim();
    if (value === "") {
      setError(emailInput, emailError, "Email address is required.");
      return false;
    }
    if (!isValidEmail(value)) {
      setError(emailInput, emailError, "Enter a valid email address.");
      return false;
    }
    clearError(emailInput, emailError);
    return true;
  }

  function validatePassword() {
    const value = passwordInput.value;
    if (value === "") {
      setError(passwordInput, passwordError, "Password is required.");
      return false;
    }
    if (value.length < 6) {
      setError(passwordInput, passwordError, "Password must be at least 6 characters.");
      return false;
    }
    clearError(passwordInput, passwordError);
    return true;
  }

  // While editing after an error, the state returns to "editing" once no field is flagged.
  function settleEditing() {
    if (locked()) return;
    setState(form.querySelector(".is-invalid") ? "invalid" : "editing");
  }

  [emailInput, passwordInput].forEach(function (input) {
    const field = fieldFor(input);
    input.addEventListener("focus", function () {
      if (field) field.classList.add("is-auth-focused");
      scene.focusField(fieldName(input));
      if (state === "idle") setState("editing");
    });
    input.addEventListener("blur", function () {
      if (field) field.classList.remove("is-auth-focused");
      scene.blurField();
    });
    input.addEventListener("input", function () {
      syncFieldState(input);
    });
    syncFieldState(input);
  });

  emailInput.addEventListener("input", function () {
    if (emailInput.classList.contains("is-invalid")) validateEmail();
    settleEditing();
  });
  passwordInput.addEventListener("input", function () {
    if (passwordInput.classList.contains("is-invalid")) validatePassword();
    settleEditing();
  });

  function setCapsLockWarning(visible) {
    if (capsLockWarning) capsLockWarning.hidden = !visible;
  }
  function syncCapsLock(event) {
    if (event && typeof event.getModifierState === "function") setCapsLockWarning(event.getModifierState("CapsLock"));
  }
  passwordInput.addEventListener("keydown", syncCapsLock);
  passwordInput.addEventListener("keyup", syncCapsLock);
  passwordInput.addEventListener("blur", function () { setCapsLockWarning(false); });

  passwordToggle.addEventListener("click", function () {
    const show = passwordInput.type === "password";
    passwordInput.type = show ? "text" : "password";
    passwordToggle.classList.toggle("is-visible", show);
    passwordToggle.setAttribute("aria-pressed", String(show));
    passwordToggle.setAttribute("aria-label", show ? "Hide password" : "Show password");
    passwordToggle.setAttribute("data-i18n-aria-label", show ? "auth.login.hide_password" : "auth.login.show_password");
    translate(passwordToggle);
  });

  function setBusy(busy) {
    submitButton.disabled = busy;
    submitButton.classList.toggle("is-busy", busy);
    if (busy) submitButton.setAttribute("aria-busy", "true");
    else submitButton.removeAttribute("aria-busy");
    demoButtons.forEach(function (button) { button.disabled = busy; });
    scene.setProcessing(busy);
  }

  function navigate(route) {
    if (navigated) return;
    navigated = true;
    window.location.assign(route);
  }

  // Called only after a successful demo result. The release is a visual handoff, not a security check, and the
  // wording never says "approved" or "verified".
  function openWorkspace(route) {
    setState("success");
    submitButton.disabled = true;
    submitButton.classList.remove("is-busy");
    demoButtons.forEach(function (button) { button.disabled = true; });
    showMessage("progress", "Demo sign-in: opening your workspace…");
    // One-time cue for the dashboard's entrance (read and removed by shared/js/theme-init.js).
    try { sessionStorage.setItem("safePermitGateArrival", String(Date.now())); } catch (_) {}
    if (typeof scene.release === "function") scene.release(function () { navigate(route); });
    else navigate(route);
  }

  function failed(reason) {
    setBusy(false);
    setState("editing");
    if (reason === "no-demo-role") {
      showMessage("info", "Demo mode: no account is checked. Use an address containing worker, supervisor, safety or admin (for example worker@demo.com), or a quick role button below.");
    } else {
      showMessage("error", "Sign-in could not be completed. Please try again.");
    }
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (locked() || submitButton.disabled) return;

    const emailIsValid = validateEmail();
    const passwordIsValid = validatePassword();
    showMessage("", "");

    if (!emailIsValid || !passwordIsValid) {
      setState("invalid");
      showMessage("error", "Please correct the fields above.");
      const firstInvalid = form.querySelector(".is-invalid");
      if (firstInvalid) {
        firstInvalid.focus();
        scene.flagField(fieldName(firstInvalid));
      }
      return;
    }

    if (!auth) {
      failed("unavailable");
      return;
    }

    setState("submitting");
    setBusy(true);
    Promise.resolve()
      .then(function () { return auth.signIn(emailInput.value.trim(), passwordInput.value); })
      .then(function (result) {
        if (result && result.ok && result.route) {
          scene.setProcessing(false);
          openWorkspace(result.route);
          return;
        }
        failed(result && result.reason);
      })
      .catch(function () { failed("error"); });
  });

  if (forgotPasswordButton) {
    forgotPasswordButton.addEventListener("click", function () {
      window.location.href = "../reset-password/?mode=forgot";
    });
  }

  demoButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      if (!auth || button.disabled || locked()) return;
      const result = auth.quickRole(button.dataset.demoRole);
      if (!result.ok) return;
      openWorkspace(result.route);
    });
  });

  // Coming back with the browser's Back button may restore this page from the cache mid-handoff.
  window.addEventListener("pageshow", function (event) {
    if (!event.persisted) return;
    navigated = false;
    setBusy(false);
    showMessage("", "");
    scene.reset();
    setState("idle");
  });

  setState("idle");
})();
