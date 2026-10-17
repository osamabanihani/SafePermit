/* SafePermit sign-in adapter — FRONTEND DEMONSTRATION ONLY.
 *
 * No identity is verified and no password is checked against anything: the demo maps an email that
 * contains a role word (worker, supervisor, safety, admin) to that role's dashboard, exactly as the
 * previous login did. This file is the only place that decides who is "signed in", so a real backend
 * (e.g. ASP.NET Identity) can replace it without touching the page, the animation or the dashboards.
 *
 * Contract (keep it when replacing):
 *   signIn(email, password) → Promise<{ ok: true, role, route } | { ok: false, reason }>
 *   quickRole(role)         → { ok: true, role, route } | { ok: false, reason }   (demo buttons only)
 *   isDemo                  → true while this demo adapter is in use
 * The page only opens the gateway after { ok: true }. The gateway is a visual handoff, never evidence
 * of authentication, authorization or permit/safety approval.
 */
(function (root) {
  "use strict";
  if (root.SafePermitDemoAuth) return;

  // Unchanged from the previous login: dashboards per role (relative to auth/login/).
  const ROUTES = Object.freeze({
    worker: "../../worker/dashboard/",
    supervisor: "../../supervisor/dashboard/",
    safety: "../../safety/dashboard/",
    admin: "../../admin/dashboard/"
  });
  const ROLE_KEY = "safePermitCurrentRole";

  // Unchanged inference order from v13.6: the first role word found in the email wins.
  function inferRole(email) {
    const value = String(email || "").trim().toLowerCase();
    if (value.includes("worker")) return "worker";
    if (value.includes("supervisor")) return "supervisor";
    if (value.includes("safety")) return "safety";
    if (value.includes("admin")) return "admin";
    return "";
  }

  function remember(role) {
    try { root.localStorage.setItem(ROLE_KEY, role); } catch (_) {}
  }

  function quickRole(role) {
    if (!Object.prototype.hasOwnProperty.call(ROUTES, role)) return { ok: false, reason: "unknown-role" };
    remember(role);
    return { ok: true, role: role, route: ROUTES[role] };
  }

  // Resolves immediately: there is no server round-trip to wait for, so no artificial delay is added.
  function signIn(email /*, password: never inspected or stored by the demo */) {
    const role = inferRole(email);
    if (!role) return Promise.resolve({ ok: false, reason: "no-demo-role" });
    remember(role);
    return Promise.resolve({ ok: true, role: role, route: ROUTES[role] });
  }

  root.SafePermitDemoAuth = Object.freeze({ isDemo: true, signIn: signIn, quickRole: quickRole, inferRole: inferRole, routes: ROUTES });
})(typeof window !== "undefined" ? window : globalThis);
