(function () {
  const script =
    document.currentScript ||
    document.querySelector('script[src*="/shared/js/paths.js"], script[src$="shared/js/paths.js"]');

  if (!script) {
    console.error("SafePermit paths.js could not determine its path.");
    return;
  }

  const jsBase = new URL("./", script.src);
  const sharedBase = new URL("../", jsBase);
  const projectRoot = new URL("../", sharedBase);

  window.SafePermitPaths = Object.freeze({
    projectRoot: projectRoot,
    sharedBase: sharedBase,
    componentsBase: new URL("components/", sharedBase),
    assetsBase: new URL("assets/", projectRoot),
    localesBase: new URL("shared/locales/", projectRoot),
    home: new URL("index.html", projectRoot).href,
    workflow: new URL("index.html#workflow", projectRoot).href,
    features: new URL("index.html#features", projectRoot).href,
    roles: new URL("index.html#roles", projectRoot).href,
    about: new URL("about/", projectRoot).href,
    contact: new URL("contact/", projectRoot).href,
    riskAssessmentInfo: new URL("resources/risk-assessment/", projectRoot).href,
    safetyReviewInfo: new URL("resources/safety-review/", projectRoot).href,
    approvalTrackingInfo: new URL("resources/approval-tracking/", projectRoot).href,
    resetPassword: new URL("auth/reset-password/", projectRoot).href,
    accessDenied: new URL("errors/403/", projectRoot).href,
    notFound: new URL("errors/404/", projectRoot).href,
    login: new URL("auth/login/", projectRoot).href,
    logo: new URL("assets/images/logo/logo-mark.png", projectRoot).href
  });
})();
