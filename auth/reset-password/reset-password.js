/* SafePermit password setup (v13.9 "The Worksite") — FRONTEND DEMONSTRATION.
 * Same policy, messages, routes and storage as v13.7: at least 8 characters, one uppercase letter and one
 * number; the confirmation must match. On success this demo only records that setup was completed for the role
 * (safePermitPasswordReady:<role>) and opens the role dashboard, or the sign-in page when no role is given.
 * The password is never stored, sent, or passed to the scene: the worksite (reset-scene.js) receives only booleans.
 *
 * Explicit states: idle → editing ⇄ invalid → submitting → success. Navigation happens once, after the scene has
 * opened the gate and completed the route (at once with reduced motion or without WebGL). */
(function () {
  "use strict";
  const params = new URLSearchParams(location.search);
  const role = (params.get("role") || "").toLowerCase();
  const mode = params.get("mode") || "first";
  const routes = { worker: "../../worker/dashboard/", supervisor: "../../supervisor/dashboard/", safety: "../../safety/dashboard/", admin: "../../admin/dashboard/" };
  const labels = { worker: "Worker", supervisor: "Supervisor", safety: "Safety Officer", admin: "Admin" };

  const form = document.getElementById("resetForm");
  if (!form) return;
  const roleLabel = document.getElementById("resetRoleLabel");
  const title = document.getElementById("resetTitle");
  const description = document.getElementById("resetDescription");
  const pass = document.getElementById("newPassword");
  const confirm = document.getElementById("confirmPassword");
  const message = document.getElementById("resetMessage");
  const live = document.getElementById("resetRulesLive");
  const submitButton = form.querySelector('[type="submit"]');
  const rules = {
    length: document.getElementById("ruleLength"),
    upper: document.getElementById("ruleUpper"),
    number: document.getElementById("ruleNumber"),
    match: document.getElementById("ruleMatch")
  };
  const noop = function () {};
  const scene = Object.assign({ update: noop, setTyping: noop, flag: noop, reset: noop }, window.SafePermitResetScene || {});

  function translate(element) {
    if (window.SafePermitI18n && typeof window.SafePermitI18n.apply === "function") window.SafePermitI18n.apply(element);
  }
  function say(element, text) {
    element.textContent = text;
    translate(element);
  }

  roleLabel.textContent = labels[role] || "SafePermit User";
  if (mode === "forgot") {
    title.textContent = "Reset your password";
    description.textContent = "Create a new password for your SafePermit account. Backend identity verification will be connected later.";
  }

  /* ---------- state ---------- */
  let state = "idle", navigated = false;
  function setState(next) {
    state = next;
    form.setAttribute("data-state", next);
  }
  const locked = () => state === "submitting" || state === "success";

  /* ---------- the policy (unchanged) and its indicators ---------- */
  function evaluate() {
    const v = pass.value;
    const result = { length: v.length >= 8, upper: /[A-Z]/.test(v), number: /\d/.test(v) };
    result.valid = result.length && result.upper && result.number;
    result.match = result.valid && confirm.value !== "" && confirm.value === v;
    return result;
  }

  let announced = { valid: false, match: false };
  function render() {
    const r = evaluate();
    Object.keys(rules).forEach(function (key) {
      const el = rules[key];
      if (!el) return;
      const met = !!r[key];
      if (el.classList.contains("is-valid") === met) return;
      el.classList.toggle("is-valid", met);
      say(el.querySelector(".spr-rule__state"), met ? "Requirement met" : "Requirement not met");
    });
    scene.update({ length: r.length, upper: r.upper, number: r.number, match: r.match });
    // Announce only when the overall picture changes, not on every keystroke.
    if (r.valid !== announced.valid || r.match !== announced.match) {
      if (r.match && !announced.match) say(live, "Passwords match.");
      else if (r.valid && !announced.valid) say(live, "All password requirements are met.");
      // A state that is lost again leaves nothing stale behind for a screen reader to repeat.
      else live.textContent = "";
      announced = { valid: r.valid, match: r.match };
    }
    return r;
  }

  function clearFieldError(input) {
    input.classList.remove("is-invalid");
    input.removeAttribute("aria-invalid");
    const field = input.closest(".auth-field");
    if (field) field.classList.remove("has-auth-error");
  }
  function flagField(input) {
    input.classList.add("is-invalid");
    input.setAttribute("aria-invalid", "true");
    const field = input.closest(".auth-field");
    if (field) field.classList.add("has-auth-error");
  }

  [pass, confirm].forEach(function (input) {
    const field = input.closest(".auth-field");
    input.addEventListener("focus", function () {
      if (field) field.classList.add("is-auth-focused");
      scene.setTyping(true);
      if (state === "idle") setState("editing");
    });
    input.addEventListener("blur", function () {
      if (field) field.classList.remove("is-auth-focused");
      scene.setTyping(false);
    });
    input.addEventListener("input", function () {
      if (locked()) return;
      const r = render();
      if (pass.classList.contains("is-invalid") && r.valid) clearFieldError(pass);
      if (confirm.classList.contains("is-invalid") && r.match) clearFieldError(confirm);
      if (state === "invalid" && !form.querySelector(".is-invalid")) {
        setState("editing");
        showMessage("", "");
      } else if (state === "idle") {
        setState("editing");
      }
    });
  });

  // Show / hide password, one control per field, with a translatable accessible name.
  Array.from(form.querySelectorAll("[data-spr-toggle]")).forEach(function (toggle) {
    const input = document.getElementById(toggle.getAttribute("data-spr-toggle"));
    toggle.addEventListener("click", function () {
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      toggle.classList.toggle("is-visible", show);
      toggle.setAttribute("aria-pressed", String(show));
      toggle.setAttribute("aria-label", show ? "Hide password" : "Show password");
      toggle.setAttribute("data-i18n-aria-label", show ? "auth.login.hide_password" : "auth.login.show_password");
      translate(toggle);
    });
  });

  function showMessage(kind, text) {
    message.className = "auth-message reset-message" + (kind ? " is-" + kind : "");
    say(message, text);
  }

  function navigate() {
    if (navigated) return;
    navigated = true;
    location.href = routes[role] || "../login/";
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (locked()) return;
    const r = render();
    if (!r.valid) {
      setState("invalid");
      flagField(pass);
      showMessage("error", "Use at least 8 characters with an uppercase letter and a number.");
      scene.flag();
      pass.focus();
      return;
    }
    if (pass.value !== confirm.value) {
      setState("invalid");
      flagField(confirm);
      showMessage("error", "Passwords do not match.");
      scene.flag();
      confirm.focus();
      return;
    }
    setState("submitting");
    submitButton.disabled = true;
    // Demo only: remember that setup was completed for this role. The password itself is never stored.
    if (role) {
      try {
        localStorage.setItem("safePermitPasswordReady:" + role, "true");
        localStorage.setItem("safePermitCurrentRole", role);
      } catch (_) {}
    }
    setState("success");
    showMessage("success", "Password saved for this frontend demo.");
    if (typeof scene.complete === "function") scene.complete(navigate);
    else navigate();
  });

  window.addEventListener("pageshow", function (event) {
    if (!event.persisted) return;
    navigated = false;
    submitButton.disabled = false;
    scene.reset();
    setState("idle");
    render();
  });

  setState("idle");
  render();
})();
