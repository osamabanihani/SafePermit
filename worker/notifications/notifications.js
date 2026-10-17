(function () {
  const sidebar = document.getElementById("workerSidebar");
  const overlay = document.getElementById("workerOverlay");
  const sidebarOpen = document.getElementById("sidebarOpen");
  const sidebarClose = document.getElementById("sidebarClose");

  const filterButtons = document.querySelectorAll("[data-filter]");
  const notificationItems = Array.from(
    document.querySelectorAll(".notification-item")
  );

  const searchInput = document.getElementById("notificationSearch");
  const markAllReadButton = document.getElementById("markAllReadButton");

  const unreadCount = document.getElementById("unreadCount");
  const allCount = document.getElementById("allCount");
  const permitCount = document.getElementById("permitCount");
  const sidebarUnreadBadge = document.getElementById("sidebarUnreadBadge");
  const visibleCount = document.getElementById("visibleCount");
  const emptyState = document.getElementById("notificationsEmpty");

  const readStorageKey = "safePermitWorkerNotificationsRead";

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

  function updateCounts() {
    const unread = notificationItems.filter(function (item) {
      return item.dataset.read === "false";
    }).length;

    const permits = notificationItems.filter(function (item) {
      return item.dataset.type === "permit";
    }).length;

    allCount.textContent = notificationItems.length;
    unreadCount.textContent = unread;
    permitCount.textContent = permits;

    sidebarUnreadBadge.textContent = unread;
    sidebarUnreadBadge.hidden = unread === 0;
  }

  function applyFilters() {
    const searchValue = searchInput.value.trim().toLowerCase();
    let shown = 0;

    notificationItems.forEach(function (item) {
      const matchesSearch =
        item.dataset.search.toLowerCase().includes(searchValue);

      let matchesFilter = true;

      if (activeFilter === "unread") {
        matchesFilter = item.dataset.read === "false";
      } else if (activeFilter === "permit") {
        matchesFilter = item.dataset.type === "permit";
      } else if (activeFilter === "system") {
        matchesFilter = item.dataset.type === "system";
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

  function saveReadState() {
    const readIndexes = notificationItems
      .map(function (item, index) {
        return item.dataset.read === "true" ? index : -1;
      })
      .filter(function (index) {
        return index >= 0;
      });

    localStorage.setItem(
      readStorageKey,
      JSON.stringify(readIndexes)
    );
  }

  function markAsRead(item, persist) {
    if (!item || item.dataset.read === "true") {
      return;
    }

    item.dataset.read = "true";
    item.classList.remove("is-unread");

    const button = item.querySelector("[data-mark-read]");

    if (button) {
      button.remove();
    }

    if (persist !== false) {
      saveReadState();
    }

    updateCounts();
    applyFilters();
  }

  function applySavedReadState() {
    const stored = localStorage.getItem(readStorageKey);

    if (!stored) {
      return;
    }

    if (stored === "true") {
      notificationItems.forEach(function (item) {
        markAsRead(item, false);
      });

      saveReadState();
      return;
    }

    try {
      const indexes = JSON.parse(stored);

      if (!Array.isArray(indexes)) {
        return;
      }

      indexes.forEach(function (index) {
        if (notificationItems[index]) {
          markAsRead(notificationItems[index], false);
        }
      });
    } catch (error) {
    }
  }

  notificationItems.forEach(function (item) {
    const button = item.querySelector("[data-mark-read]");

    if (button) {
      button.addEventListener("click", function () {
        markAsRead(item);
      });
    }
  });

  markAllReadButton.addEventListener("click", function () {
    notificationItems.forEach(function (item) {
      markAsRead(item, false);
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

  applySavedReadState();
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
