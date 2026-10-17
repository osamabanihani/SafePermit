/* THE WORKSITE (v13.9) — sign-in scene adapter. Presentation only: never decides sign-in, never navigates.
 *
 * Connects login.js to the shared miniature worksite (../worksite/worksite-scene.js). login.js stays the only
 * place that talks to the sign-in adapter (demo-auth.js) and the only place that navigates.
 *   focusField / blurField    the camera stops answering the pointer while a field has focus
 *   flagField                 invalid submission: the checkpoint indicator dims briefly; the gate stays closed
 *   setProcessing(true)       a restrained light runs along the route to the closed gate
 *   release(done)             only after login.js received { ok: true }: indicator -> success, the gate opens, the
 *                             route completes to the platform, a short camera move (~0.82 s); then done() once
 * Without WebGL, the static image is shown and release calls done at once; with reduced motion the final state
 * is shown and done runs at once.
 *
 * Public API (window.SafePermitLoginScene): focusField(name), blurField(), flagField(name), setProcessing(bool),
 * setState(state), release(done), reset().
 */
(function (root) {
  "use strict";
  const doc = root.document;
  const host = doc.querySelector("[data-spw-scene]");
  if (!host || root.SafePermitLoginScene) return;
  const scene = root.SafePermitWorksite ? root.SafePermitWorksite.attach(host, "login") : null;
  if (!scene) host.classList.add("is-fallback");
  const S = scene || { setTyping() {}, setProcessing() {}, flag() {}, reset() {}, complete(done) { done(); } };

  root.SafePermitLoginScene = {
    focusField() { S.setTyping(true); },
    blurField() { S.setTyping(false); },
    flagField() { S.flag(); },
    setProcessing(on) { S.setProcessing(!!on); },
    // States are recorded on the host for styling hooks only; the scene reacts to the explicit calls above.
    setState(state) { host.setAttribute("data-auth-state", state); },
    release(done) {
      let called = false;
      S.complete(function () { if (called) return; called = true; if (typeof done === "function") done(); });
    },
    reset() { S.reset(); }
  };
})(typeof window !== "undefined" ? window : globalThis);
