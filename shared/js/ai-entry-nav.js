(function () {
  function closeOpenRoleSidebar() {
    document.querySelectorAll('[id$="Sidebar"].is-open').forEach(function (sidebar) {
      sidebar.classList.remove('is-open');
    });
    document.querySelectorAll('[id$="Overlay"].is-open').forEach(function (overlay) {
      overlay.classList.remove('is-open');
    });
    document.body.style.overflow = '';
  }

  document.addEventListener('click', function (event) {
    const link = event.target.closest('.sp-ai-nav-link');
    if (!link) return;

    const href = link.getAttribute('href') || '';
    if (!href.startsWith('#')) return;

    const target = document.querySelector(href);
    if (!target) return;

    event.preventDefault();
    closeOpenRoleSidebar();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', href);
    }
  });
})();
