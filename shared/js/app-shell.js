/* Mobile drawer for role pages without their own drawer script (Command Center, Controlled Resume,
   Admin Notifications). Uses explicit add/remove, so it is safe next to a page's own handler. */
(function () {
  "use strict";
  const sidebar = document.querySelector(".sp-app-sidebar, #workerSidebar, #supervisorSidebar, #safetySidebar, #adminSidebar");
  const overlay = document.querySelector(".sp-app-overlay, #workerOverlay, #supervisorOverlay, #safetyOverlay, #adminOverlay");
  const open = document.getElementById("sidebarOpen");
  const close = document.getElementById("sidebarClose");
  if (!sidebar) return;
  function setOpen(value) {
    sidebar.classList.toggle("is-open", value);
    if (overlay) overlay.classList.toggle("is-open", value);
    document.body.style.overflow = value ? "hidden" : "";
  }
  if (open) open.addEventListener("click", function () { setOpen(true); });
  if (close) close.addEventListener("click", function () { setOpen(false); if (open) open.focus(); });
  if (overlay) overlay.addEventListener("click", function () { setOpen(false); });
  // Following a sidebar link to another section of the same page closes the drawer.
  sidebar.addEventListener("click", function (event) { if (event.target.closest("a[href]")) setOpen(false); });
})();
