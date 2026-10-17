/* Supervisor dashboard: page shell only. Content is rendered from stored records by shared/js/role-dashboard.js. */
(function () {
  const sidebar = document.getElementById("supervisorSidebar");
  const overlay = document.getElementById("supervisorOverlay");
  const openButton = document.getElementById("sidebarOpen");
  const closeButton = document.getElementById("sidebarClose");

  function openSidebar() {
    if (!sidebar || !overlay) return;
    sidebar.classList.add("is-open");
    overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeSidebar() {
    if (!sidebar || !overlay) return;
    sidebar.classList.remove("is-open");
    overlay.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  if (openButton) openButton.addEventListener("click", openSidebar);
  if (closeButton) closeButton.addEventListener("click", closeSidebar);
  if (overlay) overlay.addEventListener("click", closeSidebar);

  window.addEventListener("resize", function () {
    if (window.innerWidth > 820) closeSidebar();
  });
})();
