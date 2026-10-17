/* Command Center presentation only. This controller never saves or changes safety records. */
(function (root) {
  "use strict";
  function create(overlay, form) {
    const dialog = overlay.querySelector('[role="dialog"]');
    const closeButton = overlay.querySelector("#suite-close");
    const saveButton = overlay.querySelector('[type="submit"]');
    let opener, initial, background = [], previousOverflow, busy = false;
    let pendingClose = null, promptFocus, disabledControls = [];
    dialog.tabIndex = -1;

    const prompt = document.createElement("div");
    prompt.className = "sp-editor-discard";
    prompt.hidden = true;
    prompt.setAttribute("role", "group");
    prompt.setAttribute("aria-labelledby", "suite-discard-message");
    prompt.setAttribute("data-i18n-ignore", "");
    const message = document.createElement("p");
    message.id = "suite-discard-message";
    const keep = document.createElement("button");
    const discard = document.createElement("button");
    keep.type = discard.type = "button";
    keep.className = discard.className = "small-btn";
    keep.setAttribute("aria-describedby", message.id);
    discard.setAttribute("aria-describedby", message.id);
    prompt.append(message, keep, discard);
    dialog.append(prompt);

    function translatePrompt() {
      const ar = document.documentElement.lang === "ar";
      message.textContent = ar ? "لديك تعديلات غير محفوظة. هل تريد تجاهلها؟" : "You have unsaved changes. Discard them?";
      keep.textContent = ar ? "متابعة التحرير" : "Keep editing";
      discard.textContent = ar ? "تجاهل التعديلات" : "Discard changes";
    }
    function snapshot() {
      return JSON.stringify(Array.from(form.elements).map(input =>
        [input.name, input.value, input.checked]));
    }
    function isOpen() { return !overlay.hidden; }
    function isDirty() { return isOpen() && snapshot() !== initial; }
    function tabbable() {
      return Array.from(dialog.querySelectorAll('a[href],button,input,select,textarea,[tabindex]'))
        .filter(node => !node.disabled && node.tabIndex >= 0 && !node.closest("[inert]") &&
          node.getClientRects().length && getComputedStyle(node).visibility !== "hidden");
    }
    function focusFirst() {
      const input = prompt.hidden ? form.querySelector('input:not([disabled]),select:not([disabled]),textarea:not([disabled])') : keep;
      (input || tabbable()[0] || dialog).focus({ preventScroll: true });
    }
    function cancelClose() {
      prompt.hidden = true;
      form.inert = false;
      saveButton.hidden = false;
      pendingClose = null;
      if (promptFocus && promptFocus.isConnected && !promptFocus.disabled) promptFocus.focus();
      else focusFirst();
    }
    function endSave() {
      disabledControls.forEach(([control, disabled]) => { control.disabled = disabled; });
      disabledControls = [];
      busy = false;
      dialog.removeAttribute("aria-busy");
      if (isOpen() && (document.activeElement === dialog || !dialog.contains(document.activeElement))) focusFirst();
    }
    function close() {
      endSave();
      overlay.hidden = true;
      prompt.hidden = true;
      form.inert = false;
      saveButton.hidden = false;
      pendingClose = null;
      background.forEach(([node, inert]) => { node.inert = inert; });
      background = [];
      document.body.style.overflow = previousOverflow;
      const target = opener && opener.isConnected && !opener.disabled ? opener : document.getElementById("suite-new");
      if (target) target.focus({ preventScroll: true });
    }
    function requestClose(afterClose) {
      if (!isOpen() || busy) return;
      if (!isDirty()) { close(); if (afterClose) afterClose(); return; }
      if (!prompt.hidden) return;
      pendingClose = afterClose || null;
      promptFocus = document.activeElement;
      translatePrompt();
      form.inert = true;
      saveButton.hidden = true;
      prompt.hidden = false;
      keep.focus();
    }
    function open() {
      opener = document.activeElement;
      initial = snapshot();
      prompt.hidden = true;
      form.inert = false;
      saveButton.hidden = false;
      overlay.hidden = false;
      previousOverflow = document.body.style.overflow;
      background = Array.from(document.body.children)
        .filter(node => node !== overlay && !node.matches("script,style,link"))
        .map(node => [node, node.inert]);
      background.forEach(([node]) => { node.inert = true; });
      document.body.style.overflow = "hidden";
      focusFirst();
    }
    function startSave() {
      if (busy || !prompt.hidden) return false;
      busy = true;
      dialog.setAttribute("aria-busy", "true");
      disabledControls = Array.from(dialog.querySelectorAll("button,input,select,textarea"))
        .map(control => [control, control.disabled]);
      disabledControls.forEach(([control]) => { control.disabled = true; });
      dialog.focus({ preventScroll: true });
      return true;
    }
    keep.addEventListener("click", cancelClose);
    discard.addEventListener("click", function () {
      const callback = pendingClose;
      close();
      if (callback) callback();
    });
    closeButton.addEventListener("click", function () { requestClose(); });
    document.addEventListener("keydown", function (event) {
      if (!isOpen()) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!busy) { if (!prompt.hidden) cancelClose(); else requestClose(); }
      } else if (event.key === "Tab") {
        const controls = tabbable();
        const first = controls[0], last = controls[controls.length - 1];
        if (!first) { event.preventDefault(); dialog.focus(); }
        else if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement))) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !controls.includes(document.activeElement))) {
          event.preventDefault(); first.focus();
        }
      }
    }, true);
    document.addEventListener("focusin", function (event) {
      if (isOpen() && !dialog.contains(event.target)) focusFirst();
    });
    root.addEventListener("beforeunload", function (event) {
      if (isDirty() || busy) { event.preventDefault(); event.returnValue = ""; }
    });
    document.addEventListener("safepermit:languagechange", translatePrompt);
    return { open, isOpen, requestClose, startSave, endSave, closeSaved: close };
  }
  root.SafePermitSuiteEditor = Object.freeze({ create });
})(window);
