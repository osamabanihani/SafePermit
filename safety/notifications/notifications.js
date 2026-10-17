(function () {
  const sidebar = document.getElementById("safetySidebar");
  const overlay = document.getElementById("safetyOverlay");
  const sidebarOpen = document.getElementById("sidebarOpen");
  const sidebarClose = document.getElementById("sidebarClose");

  const notificationsList = document.getElementById("notificationsList");
  const searchInput = document.getElementById("notificationSearch");
  const filterButtons = document.querySelectorAll("[data-filter]");
  const markAllReadButton = document.getElementById("markAllReadButton");

  const allCount = document.getElementById("allCount");
  const unreadCount = document.getElementById("unreadCount");
  const reviewCount = document.getElementById("reviewCount");
  const riskCount = document.getElementById("riskCount");
  const sidebarUnreadBadge = document.getElementById("sidebarUnreadBadge");
  const visibleCount = document.getElementById("visibleCount");
  const emptyState = document.getElementById("notificationsEmpty");

  const readStorageKey = "safePermitSafetyNotificationsRead";

  const permitTypeLabels = {
    electrical: "Electrical Work",
    "hot-work": "Hot Work",
    height: "Work at Height",
    confined: "Confined Space Entry",
    excavation: "Excavation",
    general: "General Maintenance"
  };

  let activeFilter = "all";

  function openSidebar() {
    sidebar.classList.add("is-open");
    overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeSidebar() {
    sidebar.classList.remove("is-open");
    overlay.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  if (sidebarOpen) {
    sidebarOpen.addEventListener("click", openSidebar);
  }

  if (sidebarClose) {
    sidebarClose.addEventListener("click", closeSidebar);
  }

  if (overlay) {
    overlay.addEventListener("click", closeSidebar);
  }

  window.addEventListener("resize", function () {
    if (window.innerWidth > 820) {
      closeSidebar();
    }
  });

  function titleCase(value) {
    return String(value || "")
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, function (letter) {
        return letter.toUpperCase();
      });
  }

  function escapeHTML(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getPermitType(value) {
    return permitTypeLabels[value] || titleCase(value) || "Permit";
  }

  function getHighestResidual(permit) {
    const hazards =
      permit &&
      permit.riskAssessment &&
      Array.isArray(permit.riskAssessment.hazards)
        ? permit.riskAssessment.hazards
        : [];

    return hazards.reduce(function (max, hazard) {
      return Math.max(max, Number(hazard.residualScore) || 0);
    }, 0);
  }

  function riskLabel(score) {
    if (score >= 17) {
      return "Critical";
    }

    if (score >= 10) {
      return "High";
    }

    if (score >= 5) {
      return "Medium";
    }

    return "Low";
  }

  function readSubmittedPermits() {
    let permits = [];

    try {
      const stored = JSON.parse(
        localStorage.getItem("safePermitSubmittedPermits") || "[]"
      );

      if (Array.isArray(stored)) {
        permits = stored.filter(Boolean);
      }
    } catch (error) {
      permits = [];
    }

    try {
      const latest = JSON.parse(
        localStorage.getItem("safePermitSubmittedPermit") || "null"
      );

      if (
        latest &&
        latest.id &&
        !permits.some(function (permit) { return permit.id === latest.id; })
      ) {
        permits.unshift(latest);
      }
    } catch (error) {
    }

    return permits;
  }

  function createDynamicNotificationForPermit(permit) {
    if (!permit || !permit.id || permit.status !== "Pending Safety Review") {
      return;
    }

    const notificationId = "dynamic-safety-review-" + permit.id;

    if (
      notificationsList.querySelector(
        '[data-id="' + CSS.escape(notificationId) + '"]'
      )
    ) {
      return;
    }

    const basic = permit.basicInfo || {};
    const score = getHighestResidual(permit);
    const risk = riskLabel(score);
    const elevated = risk === "High" || risk === "Critical";

    const worker = basic.workerName || "Omar Worker";
    const permitType = getPermitType(basic.permitType);
    const site = titleCase(basic.site) || "Site";
    const area = titleCase(basic.area) || "Area";

    const item = document.createElement("article");

    item.className = "safety-notification-item is-unread";
    item.dataset.id = notificationId;
    item.dataset.type = elevated ? "risk" : "review";
    item.dataset.read = "false";
    item.dataset.search =
      (
        permit.id + " " +
        permitType + " " +
        worker + " " +
        site + " " +
        area + " " +
        risk + " pending safety review"
      ).toLowerCase();

    item.innerHTML =
      '<div class="safety-notification-item__icon ' +
        (elevated
          ? 'safety-notification-item__icon--danger'
          : 'safety-notification-item__icon--warning') +
      '">' +
        (elevated ? "!" : "R") +
      '</div>' +
      '<div class="safety-notification-item__content">' +
        '<div class="safety-notification-item__top">' +
          '<div>' +
            '<span class="safety-notification-item__category">' +
              escapeHTML(elevated ? risk + " Risk Alert" : "Safety Review") +
            '</span>' +
            '<h2>New permit waiting for your Safety Review</h2>' +
          '</div>' +
          '<span class="safety-notification-item__time">New</span>' +
        '</div>' +
        '<p>' +
          escapeHTML(permit.id) + ' · ' + escapeHTML(permitType) + ' from ' + escapeHTML(worker) +
          ' at ' + escapeHTML(site) + ' · ' + escapeHTML(area) +
          ' is now Pending Safety Review. Residual risk: ' + escapeHTML(risk) + '.' +
        '</p>' +
        '<div class="safety-notification-item__footer">' +
          '<a href="../review-permit/?id=' + encodeURIComponent(permit.id) + '" data-dynamic-review>' +
            'Review Permit →' +
          '</a>' +
          '<button type="button" data-mark-read>Mark as read</button>' +
        '</div>' +
      '</div>' +
      '<span class="safety-notification-item__unread-dot" aria-label="Unread"></span>';

    notificationsList.prepend(item);

    const dynamicReview = item.querySelector("[data-dynamic-review]");

    dynamicReview.addEventListener("click", function () {
      localStorage.setItem(
        "safePermitSafetySelectedPermit",
        JSON.stringify(permit)
      );
    });
  }

  function createDynamicNotifications() {
    readSubmittedPermits()
      .slice()
      .reverse()
      .forEach(createDynamicNotificationForPermit);
  }

  function getItems() {
    return Array.from(
      notificationsList.querySelectorAll(".safety-notification-item")
    );
  }

  function getSavedReadIds() {
    const stored = localStorage.getItem(readStorageKey);

    if (!stored) {
      return [];
    }

    try {
      const parsed = JSON.parse(stored);

      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function saveReadState() {
    const readIds = getItems()
      .filter(function (item) {
        return item.dataset.read === "true";
      })
      .map(function (item) {
        return item.dataset.id;
      });

    localStorage.setItem(
      readStorageKey,
      JSON.stringify(readIds)
    );
  }

  function applySavedReadState() {
    const readIds = getSavedReadIds();

    getItems().forEach(function (item) {
      if (readIds.includes(item.dataset.id)) {
        item.dataset.read = "true";
        item.classList.remove("is-unread");

        const button = item.querySelector("[data-mark-read]");

        if (button) {
          button.remove();
        }
      }
    });
  }

  function markAsRead(item) {
    if (!item || item.dataset.read === "true") {
      return;
    }

    item.dataset.read = "true";
    item.classList.remove("is-unread");

    const button = item.querySelector("[data-mark-read]");

    if (button) {
      button.remove();
    }

    saveReadState();
    updateCounts();
    applyFilters();
  }

  function bindReadButtons() {
    document.querySelectorAll("[data-mark-read]").forEach(
      function (button) {
        button.onclick = function () {
          markAsRead(button.closest(".safety-notification-item"));
        };
      }
    );
  }

  function updateCounts() {
    const items = getItems();

    const unread = items.filter(function (item) {
      return item.dataset.read === "false";
    }).length;

    const reviews = items.filter(function (item) {
      return item.dataset.type === "review";
    }).length;

    const risks = items.filter(function (item) {
      return item.dataset.type === "risk";
    }).length;

    allCount.textContent = items.length;
    unreadCount.textContent = unread;
    reviewCount.textContent = reviews;
    riskCount.textContent = risks;

    sidebarUnreadBadge.textContent = unread;
    sidebarUnreadBadge.hidden = unread === 0;

    markAllReadButton.disabled = unread === 0;
  }

  function applyFilters() {
    const items = getItems();
    const searchValue = searchInput.value.trim().toLowerCase();

    let shown = 0;

    items.forEach(function (item) {
      const searchText =
        (item.dataset.search || item.textContent).toLowerCase();

      const matchesSearch =
        searchValue === "" ||
        searchText.includes(searchValue);

      let matchesFilter = true;

      if (activeFilter === "unread") {
        matchesFilter = item.dataset.read === "false";
      } else if (activeFilter !== "all") {
        matchesFilter = item.dataset.type === activeFilter;
      }

      const visible = matchesSearch && matchesFilter;

      item.classList.toggle("is-hidden", !visible);

      if (visible) {
        shown += 1;
      }
    });

    emptyState.hidden = shown !== 0;

    visibleCount.textContent =
      shown === 1
        ? "1 notification shown"
        : shown + " notifications shown";
  }

  markAllReadButton.addEventListener("click", function () {
    getItems().forEach(function (item) {
      item.dataset.read = "true";
      item.classList.remove("is-unread");

      const button = item.querySelector("[data-mark-read]");

      if (button) {
        button.remove();
      }
    });

    saveReadState();
    updateCounts();
    applyFilters();
  });

  filterButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      filterButtons.forEach(function (item) {
        item.classList.remove("is-active");
      });

      button.classList.add("is-active");
      activeFilter = button.dataset.filter;
      applyFilters();
    });
  });

  searchInput.addEventListener("input", applyFilters);

  createDynamicNotifications();
  applySavedReadState();
  bindReadButtons();
  updateCounts();
  applyFilters();

  /* Notifications Motion System */
  (function () {
    const motionRoot =
      document.querySelector(".notifications-content") ||
      document.querySelector(".safety-notifications-content");

    if (!motionRoot) {
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motionList = document.getElementById("notificationsList");
    const motionEmpty = document.getElementById("notificationsEmpty");
    const motionVisibleCount = document.getElementById("visibleCount");
    const motionMarkAll = document.getElementById("markAllReadButton");
    const motionSidebarBadge = document.getElementById("sidebarUnreadBadge");
    const motionFilterButtons = Array.from(document.querySelectorAll("[data-filter]"));
    const motionSearch = document.getElementById("notificationSearch");

    const countElements = [
      document.getElementById("allCount"),
      document.getElementById("unreadCount"),
      document.getElementById("permitCount"),
      document.getElementById("reviewCount"),
      document.getElementById("activeCount"),
      document.getElementById("riskCount")
    ].filter(Boolean);

    function getMotionItems() {
      return Array.from(
        motionList.querySelectorAll(
          ".notification-item, .safety-notification-item"
        )
      );
    }

    function getActiveFilter() {
      const active = document.querySelector("[data-filter].is-active");
      return active ? active.dataset.filter : "all";
    }

    function replayMotion(element, className, duration) {
      if (!element) {
        return;
      }

      element.classList.remove(className);
      void element.offsetWidth;
      element.classList.add(className);

      if (duration) {
        window.setTimeout(function () {
          element.classList.remove(className);
        }, duration);
      }
    }

    function markMotionStructure() {
      motionRoot.setAttribute("data-sp-notifications-live", "");

      const header =
        motionRoot.querySelector(".notifications-header") ||
        motionRoot.querySelector(".safety-notifications-header");

      if (header) {
        header.setAttribute("data-notification-header", "");
      }

      const panel =
        motionRoot.querySelector(".notifications-panel") ||
        motionRoot.querySelector(".safety-notifications-panel");

      if (panel) {
        panel.setAttribute("data-notification-panel", "");
      }

      document
        .querySelectorAll(".notifications-stat, .safety-notifications-stat")
        .forEach(function (stat, index) {
          stat.setAttribute("data-notification-stat", "");
          stat.style.setProperty(
            "--notification-delay",
            (80 + index * 90) + "ms"
          );
        });

      countElements.forEach(function (count) {
        count.setAttribute("data-notification-count", "");
      });

      if (motionSidebarBadge) {
        motionSidebarBadge.setAttribute("data-notification-badge", "");
      }

      if (motionEmpty) {
        motionEmpty.setAttribute("data-notification-empty", "");
      }

      if (motionVisibleCount) {
        motionVisibleCount.setAttribute("data-notification-visible-count", "");
      }
    }

    function prepareItem(item, index) {
      item.setAttribute("data-notification-item", "");
      item.style.setProperty(
        "--notification-delay",
        (300 + Math.min(index, 10) * 72) + "ms"
      );

      const icon = item.querySelector(
        ".notification-item__icon, .safety-notification-item__icon"
      );

      if (icon) {
        icon.setAttribute("data-notification-icon", "");
      }

      const dot = item.querySelector(
        ".notification-item__unread-dot, .safety-notification-item__unread-dot"
      );

      if (dot) {
        dot.setAttribute("data-notification-dot", "");
      }

      if (item.dataset.read === "false" || item.classList.contains("is-unread")) {
        item.classList.add("is-notification-unread");
      } else {
        item.classList.remove("is-notification-unread");
      }

      if (
        (icon && /__icon--danger/.test(icon.className)) ||
        item.dataset.type === "risk" ||
        /\bcritical\b/i.test(item.dataset.search || "")
      ) {
        item.classList.add("is-notification-critical");
      }

      if (
        (item.dataset.id && item.dataset.id.indexOf("dynamic-") === 0) ||
        (item.querySelector(".notification-item__time, .safety-notification-item__time") &&
          item.querySelector(".notification-item__time, .safety-notification-item__time")
            .textContent.trim().toLowerCase() === "new")
      ) {
        item.classList.add("is-notification-new");
      }

      item.querySelectorAll("[data-mark-read]").forEach(function (button) {
        button.setAttribute("data-notification-read-action", "");
      });

      if (!reducedMotion.matches) {
        item.classList.add("is-notification-entering");

        window.setTimeout(function () {
          item.classList.remove("is-notification-entering");
        }, 1150 + Math.min(index, 10) * 72);
      }
    }

    function prepareItems() {
      getMotionItems().forEach(prepareItem);
    }

    function animateInitialCount(element) {
      const raw = element.textContent.trim();

      if (!/^\d+$/.test(raw)) {
        return;
      }

      const target = Number(raw);
      element.dataset.motionCount = String(target);

      if (reducedMotion.matches || target === 0) {
        return;
      }

      element.textContent = "0";
      element.classList.add("is-count-morphing");

      const start = performance.now();
      const duration = Math.min(760, 430 + target * 26);

      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        element.textContent = String(Math.round(target * eased));

        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          element.textContent = String(target);

          window.setTimeout(function () {
            element.classList.remove("is-count-morphing");
          }, 180);
        }
      }

      requestAnimationFrame(tick);
    }

    function snapshotCounts() {
      const snapshot = {};

      countElements.forEach(function (element) {
        snapshot[element.id] = Number(element.textContent.trim()) || 0;
      });

      if (motionSidebarBadge) {
        snapshot.sidebarUnreadBadge =
          Number(motionSidebarBadge.textContent.trim()) || 0;
      }

      return snapshot;
    }

    function animateNumberBetween(element, from, to) {
      if (!element || from === to || reducedMotion.matches) {
        if (element) {
          element.textContent = String(to);
          element.dataset.motionCount = String(to);
        }
        return;
      }

      replayMotion(element, "is-count-morphing", 520);

      const start = performance.now();
      const duration = 360;

      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        element.textContent = String(
          Math.round(from + (to - from) * eased)
        );

        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          element.textContent = String(to);
          element.dataset.motionCount = String(to);
        }
      }

      requestAnimationFrame(tick);
    }

    function animateCountsAfterChange(before) {
      window.setTimeout(function () {
        countElements.forEach(function (element) {
          const finalValue = Number(element.textContent.trim()) || 0;
          const previous =
            Object.prototype.hasOwnProperty.call(before, element.id)
              ? before[element.id]
              : finalValue;

          animateNumberBetween(element, previous, finalValue);
        });

        if (motionSidebarBadge) {
          const finalBadge =
            Number(motionSidebarBadge.textContent.trim()) || 0;
          const previousBadge =
            Object.prototype.hasOwnProperty.call(before, "sidebarUnreadBadge")
              ? before.sidebarUnreadBadge
              : finalBadge;

          if (finalBadge !== previousBadge) {
            replayMotion(
              motionSidebarBadge,
              "is-badge-updated",
              600
            );
          }
        }
      }, 0);
    }

    function animateReadItem(item, index, filteredOut) {
      if (!item) {
        return;
      }

      item.style.setProperty("--read-delay", (index * 70) + "ms");
      item.classList.add("is-marking-read");
      item.classList.add("is-mark-all-wave");

      if (filteredOut) {
        item.classList.add("is-marking-read-filtered");
      }

      window.setTimeout(function () {
        item.classList.remove("is-notification-unread");
        item.classList.remove("is-marking-read");
        item.classList.remove("is-mark-all-wave");
        item.classList.remove("is-marking-read-filtered");
        item.classList.add("is-read-confirmed");

        window.setTimeout(function () {
          item.classList.remove("is-read-confirmed");
        }, 520);
      }, 720 + index * 70);
    }

    function animateVisibleResults() {
      window.setTimeout(function () {
        const visible = getMotionItems().filter(function (item) {
          return !item.classList.contains("is-hidden");
        });

        visible.forEach(function (item, index) {
          item.style.setProperty(
            "--notification-delay",
            (Math.min(index, 9) * 55) + "ms"
          );

          replayMotion(
            item,
            "is-filter-entering",
            480 + Math.min(index, 9) * 55
          );
        });

        if (motionVisibleCount) {
          replayMotion(
            motionVisibleCount,
            "is-visible-count-updated",
            420
          );
        }

        if (motionEmpty && !motionEmpty.hidden) {
          motionEmpty.classList.remove("is-waiting-empty");
          replayMotion(motionEmpty, "is-empty-live", 560);
        }
      }, 0);
    }

    if (motionList) {
      motionList.addEventListener(
        "click",
        function (event) {
          const button = event.target.closest("[data-mark-read]");

          if (!button) {
            return;
          }

          const item = button.closest(
            ".notification-item, .safety-notification-item"
          );

          if (!item || item.dataset.read === "true") {
            return;
          }

          const before = snapshotCounts();
          const unreadFilter = getActiveFilter() === "unread";
          const unreadBefore =
            before.unreadCount == null ? 0 : before.unreadCount;

          if (unreadFilter && unreadBefore === 1 && motionEmpty) {
            motionEmpty.classList.add("is-waiting-empty");
          }

          animateReadItem(item, 0, unreadFilter);
          animateCountsAfterChange(before);

          window.setTimeout(function () {
            animateVisibleResults();
          }, unreadFilter ? 650 : 80);
        },
        true
      );
    }

    if (motionMarkAll) {
      motionMarkAll.addEventListener(
        "click",
        function () {
          const before = snapshotCounts();
          const unreadItems = getMotionItems().filter(function (item) {
            return item.dataset.read === "false" || item.classList.contains("is-unread");
          });

          if (!unreadItems.length) {
            return;
          }

          const unreadFilter = getActiveFilter() === "unread";

          if (unreadFilter && motionEmpty) {
            motionEmpty.classList.add("is-waiting-empty");
          }

          replayMotion(motionMarkAll, "is-mark-all-active", 760);

          unreadItems.forEach(function (item, index) {
            animateReadItem(item, index, unreadFilter);
          });

          animateCountsAfterChange(before);

          window.setTimeout(function () {
            if (motionEmpty) {
              motionEmpty.classList.remove("is-waiting-empty");
            }

            animateVisibleResults();
          }, 760 + unreadItems.length * 70);
        },
        true
      );
    }

    motionFilterButtons.forEach(function (button) {
      button.addEventListener("click", animateVisibleResults);
    });

    if (motionSearch) {
      motionSearch.addEventListener("input", animateVisibleResults);
    }

    markMotionStructure();
    prepareItems();

    countElements.forEach(function (element, index) {
      window.setTimeout(function () {
        animateInitialCount(element);
      }, reducedMotion.matches ? 0 : 120 + index * 70);
    });
  })();

})();
