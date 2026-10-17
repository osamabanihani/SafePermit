/* THE WORKSITE (v13.9) — password-setup scene adapter. Presentation only.
 *
 * The same miniature worksite as the sign-in page, with one section of the route missing: three open bays in the
 * walkway between the entrance gate and the stair. reset-password.js passes validation booleans only — the scene
 * never receives, renders, stores or derives anything from the password itself.
 *   update({ length, upper, number, match })   each met requirement lowers one walkway plate into its bay; when a
 *                                              rule fails again the plate lifts out. A matching confirmation of a
 *                                              valid password connects the route through the section.
 *   flag()                                     invalid submission: the checkpoint indicator dims briefly
 *   complete(done)                             after a successful (demo) save only: the gate opens and the route
 *                                              completes to the platform (~0.82 s); then done() once
 * Without WebGL the static image is shown and complete calls done at once; reduced motion shows final states.
 *
 * Public API (window.SafePermitResetScene): update(flags), setTyping(bool), flag(), complete(done), reset().
 */
(function (root) {
  "use strict";
  const doc = root.document;
  const host = doc.querySelector("[data-spw-scene]");
  if (!host || root.SafePermitResetScene) return;
  const scene = root.SafePermitWorksite ? root.SafePermitWorksite.attach(host, "reset") : null;
  if (!scene) host.classList.add("is-fallback");
  const S = scene || { setTyping() {}, setSections() {}, flag() {}, reset() {}, complete(done) { done(); } };

  root.SafePermitResetScene = {
    update(flags) {
      const f = flags || {};
      S.setSections({ length: !!f.length, upper: !!f.upper, number: !!f.number, match: !!f.match });
    },
    setTyping(on) { S.setTyping(!!on); },
    flag() { S.flag(); },
    complete(done) {
      let called = false;
      S.complete(function () { if (called) return; called = true; if (typeof done === "function") done(); });
    },
    reset() { S.reset(); }
  };
})(typeof window !== "undefined" ? window : globalThis);
