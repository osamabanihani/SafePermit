(function () {
  const body = document.body;
  const revealItems = Array.from(document.querySelectorAll(".reveal-item"));
  const permitPreview = document.querySelector(".permit-preview");
  const facts = Array.from(document.querySelectorAll(".home-fact strong"));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function startHomeMotion() {
    body.classList.add("home-motion-ready");
  }

  if (
    document.documentElement.classList.contains("sp-page-booting") &&
    !reducedMotion
  ) {
    window.setTimeout(startHomeMotion, 230);
  } else {
    startHomeMotion();
  }

  function applyRevealStagger() {
    const parentCounts = new Map();

    revealItems.forEach(function (item) {
      const parent = item.parentElement;
      const count = parentCounts.get(parent) || 0;

      item.style.setProperty(
        "--home-reveal-delay",
        Math.min(count * 85, 255) + "ms"
      );

      parentCounts.set(parent, count + 1);
    });
  }

  function setupReveal() {
    applyRevealStagger();

    if (reducedMotion || !("IntersectionObserver" in window)) {
      revealItems.forEach(function (item) {
        item.classList.add("is-visible");
      });

      return;
    }

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.14,
        rootMargin: "0px 0px -7% 0px"
      }
    );

    revealItems.forEach(function (item) {
      observer.observe(item);
    });
  }

  function setupPermitEntrance() {
    if (!permitPreview) {
      return;
    }

    if (reducedMotion) {
      permitPreview.classList.add("is-entered");
      return;
    }

    permitPreview.addEventListener(
      "animationend",
      function (event) {
        if (event.animationName === "home-preview-enter") {
          permitPreview.classList.add("is-entered");
        }
      },
      { once: true }
    );

    window.setTimeout(function () {
      permitPreview.classList.add("is-entered");
    }, 1250);
  }

  function animateNumber(element, target, suffix) {
    const duration = 720;
    const startedAt = performance.now();

    function step(now) {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(target * eased);

      element.textContent = value + suffix;

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }

  function setupFactCounters() {
    if (reducedMotion) {
      return;
    }

    window.setTimeout(function () {
      facts.forEach(function (item, index) {
        const original = item.textContent.trim();
        const match = original.match(/^(\d+)(.*)$/);

        if (!match) {
          return;
        }

        const target = Number(match[1]);
        const suffix = match[2] || "";

        item.textContent = "0" + suffix;

        window.setTimeout(function () {
          animateNumber(item, target, suffix);
        }, index * 90);
      });
    }, 520);
  }

  function setupPreviewTilt() {
    if (
      !permitPreview ||
      reducedMotion ||
      window.innerWidth <= 860 ||
      !window.matchMedia("(pointer: fine)").matches
    ) {
      return;
    }

    permitPreview.addEventListener("pointermove", function (event) {
      if (!permitPreview.classList.contains("is-entered")) {
        return;
      }

      const rect = permitPreview.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;

      permitPreview.classList.add("is-home-tilting");
      permitPreview.style.setProperty("--home-tilt-y", (x * 2.1).toFixed(2) + "deg");
      permitPreview.style.setProperty("--home-tilt-x", (-y * 1.5).toFixed(2) + "deg");
    });

    permitPreview.addEventListener("pointerleave", function () {
      permitPreview.classList.remove("is-home-tilting");
      permitPreview.style.setProperty("--home-tilt-y", "0deg");
      permitPreview.style.setProperty("--home-tilt-x", "0deg");
    });
  }

  function setupWorkflowArrowMotion() {
    const workflow = document.querySelector(".workflow");
    const arrows = Array.from(document.querySelectorAll(".workflow__arrow"));

    if (!workflow || !arrows.length) {
      return;
    }

    arrows.forEach(function (arrow, index) {
      arrow.style.setProperty("--home-flow-delay", (index * 90) + "ms");
    });

    if (reducedMotion || !("IntersectionObserver" in window)) {
      arrows.forEach(function (arrow) {
        arrow.classList.add("is-home-flow-live");
      });
      return;
    }

    const observer = new IntersectionObserver(
      function (entries) {
        if (!entries.some(function (entry) { return entry.isIntersecting; })) {
          return;
        }

        arrows.forEach(function (arrow) {
          arrow.classList.add("is-home-flow-live");
        });

        observer.disconnect();
      },
      { threshold: 0.28 }
    );

    observer.observe(workflow);
  }

  function removeCompetingSharedMotion() {
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        revealItems.forEach(function (item) {
          item.classList.remove("sp-motion-item");
        });
      });
    });
  }

  setupReveal();
  setupPermitEntrance();
  setupFactCounters();
  setupPreviewTilt();
  setupWorkflowArrowMotion();

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      removeCompetingSharedMotion,
      { once: true }
    );
  } else {
    removeCompetingSharedMotion();
  }
})();
