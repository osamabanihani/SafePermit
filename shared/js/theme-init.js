(function () {
  var theme = "light";

  try {
    var saved = localStorage.getItem("safePermitTheme");
    if (saved === "dark" || saved === "light") theme = saved;
  } catch (error) {}

  document.documentElement.setAttribute("data-theme", theme);

  // v13.7 Safety Gate: right after a demo sign-in, the role dashboard opens once from the centre
  // (styles in shared/css/cockpit.css). Presentation only; the flag carries no identity or permission.
  try {
    var gateArrival = Number(sessionStorage.getItem("safePermitGateArrival") || 0);
    if (gateArrival) {
      sessionStorage.removeItem("safePermitGateArrival");
      if (Date.now() - gateArrival < 4000 && /\/(worker|supervisor|safety|admin)\/dashboard\//.test(window.location.pathname)) {
        document.documentElement.classList.add("sp-gate-arrival");
      }
    }
  } catch (error) {}

  try {
    var transition = JSON.parse(
      sessionStorage.getItem("safePermitPageTransition") || "null"
    );

    if (
      transition &&
      Date.now() - Number(transition.time || 0) < 4000
    ) {
      // Role workspaces use a quiet fade instead of the full-screen loading flash.
      if (!/\/(worker|supervisor|safety|admin)\//.test(window.location.pathname)) {
        document.documentElement.classList.add("sp-page-booting");
      }

      var script = document.currentScript;

      if (script) {
        var cssUrl = new URL("../css/motion.css", script.src).href;
        var alreadyLoaded = Array.prototype.some.call(
          document.querySelectorAll('link[rel="stylesheet"]'),
          function (link) {
            return link.href === cssUrl ||
              /\/shared\/css\/motion\.css(?:$|[?#])/.test(link.href);
          }
        );

        if (!alreadyLoaded) {
          var link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = cssUrl;
          link.setAttribute("data-sp-motion-style", "");
          document.head.appendChild(link);
        }
      }

      window.setTimeout(function () {
        document.documentElement.classList.remove("sp-page-booting");
      }, 1800);
    }
  } catch (error) {}
})();
