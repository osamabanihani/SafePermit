(function (root) {
  "use strict";
  function create(target) {
    if (!target || !target.parentNode) return null;
    const message = document.createElement("div");
    message.className = "sp-async-state";
    message.setAttribute("role", "status");
    message.setAttribute("aria-live", "polite");
    message.hidden = true;
    // Reuse the live-status element if a page initializes the view twice.
    const existing = target.previousElementSibling;
    if (existing && existing.classList.contains("sp-async-state")) {
      return { set: function(state, text) {
        existing.hidden = state === "ready";
        existing.textContent = text || (state === "loading" ? "Loading permits…" : state === "empty" ? "No permits to show." : "Unable to load permits. Please retry.");
        existing.dataset.state = state;
        target.setAttribute("aria-busy", String(state === "loading"));
      }, element: existing };
    }
    target.parentNode.insertBefore(message, target);
    function set(state, text) {
      message.hidden = state === "ready";
      message.textContent = text || (state === "loading" ? "Loading permits…" : state === "empty" ? "No permits to show." : "Unable to load permits. Please retry.");
      message.dataset.state = state;
      target.setAttribute("aria-busy", String(state === "loading"));
    }
    return { set: set, element: message };
  }
  root.SafePermitAsyncView = Object.freeze({ create: create });
})(window);
