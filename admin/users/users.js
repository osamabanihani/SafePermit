(function () {
  function escapeHTML(value) {return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  const sidebar = document.getElementById("adminSidebar");
  const overlay = document.getElementById("adminOverlay");
  const sidebarOpen = document.getElementById("sidebarOpen");
  const sidebarClose = document.getElementById("sidebarClose");

  const search = document.getElementById("userSearch");
  const roleFilter = document.getElementById("roleFilter");
  const statusFilter = document.getElementById("statusFilter");
  const departmentFilter = document.getElementById("departmentFilter");
  const sortFilter = document.getElementById("sortFilter");

  const tableBody = document.getElementById("usersTableBody");
  const mobileList = document.getElementById("usersMobileList");
  const emptyState = document.getElementById("usersEmpty");
  const visibleCount = document.getElementById("usersVisibleCount");

  const totalUsers = document.getElementById("totalUsers");
  const activeUsers = document.getElementById("activeUsers");
  const workerUsers = document.getElementById("workerUsers");
  const reviewUsers = document.getElementById("reviewUsers");

  const addUserButton = document.getElementById("addUserButton");
  const userModal = document.getElementById("userModal");
  const userModalEyebrow = document.getElementById("userModalEyebrow");
  const userModalTitle = document.getElementById("userModalTitle");
  const userForm = document.getElementById("userForm");

  const editingUserId = document.getElementById("editingUserId");
  const fullName = document.getElementById("fullName");
  const employeeId = document.getElementById("employeeId");
  const userEmail = document.getElementById("userEmail");
  const userPhone = document.getElementById("userPhone");
  const userRole = document.getElementById("userRole");
  const userDepartment = document.getElementById("userDepartment");
  const userSite = document.getElementById("userSite");
  const userStatus = document.getElementById("userStatus");

  const statusModal = document.getElementById("statusModal");
  const statusModalIcon = document.getElementById("statusModalIcon");
  const statusModalTitle = document.getElementById("statusModalTitle");
  const statusModalText = document.getElementById("statusModalText");
  const cancelStatusButton = document.getElementById("cancelStatusButton");
  const confirmStatusButton = document.getElementById("confirmStatusButton");

  const storageKey = "safePermitAdminUsers";

  const defaultUsers = [
    {
      id: "WRK-1001",
      name: "Omar Worker",
      email: "omar.worker@safepermit.com",
      phone: "+962 7 9000 1101",
      role: "Worker",
      department: "Maintenance",
      site: "Factory A",
      status: "Active",
      lastActivity: "12 min ago",
      createdAt: "2026-09-14T08:00:00"
    },
    {
      id: "WRK-1007",
      name: "Layla Hassan",
      email: "layla.hassan@safepermit.com",
      phone: "+962 7 9000 1107",
      role: "Worker",
      department: "Electrical",
      site: "Factory A",
      status: "Active",
      lastActivity: "28 min ago",
      createdAt: "2026-09-18T10:00:00"
    },
    {
      id: "WRK-1012",
      name: "Yazan Saleh",
      email: "yazan.saleh@safepermit.com",
      phone: "+962 7 9000 1112",
      role: "Worker",
      department: "Operations",
      site: "Plant B",
      status: "Blocked",
      lastActivity: "5 days ago",
      createdAt: "2026-09-23T09:30:00"
    },
    {
      id: "SUP-1003",
      name: "Ahmad Khalil",
      email: "ahmad.khalil@safepermit.com",
      phone: "+962 7 9000 2103",
      role: "Supervisor",
      department: "Operations",
      site: "Factory A",
      status: "Active",
      lastActivity: "6 min ago",
      createdAt: "2026-08-20T08:00:00"
    },
    {
      id: "SUP-1004",
      name: "Yousef Hamdan",
      email: "yousef.hamdan@safepermit.com",
      phone: "+962 7 9000 2104",
      role: "Supervisor",
      department: "Maintenance",
      site: "Plant B",
      status: "Active",
      lastActivity: "1 hr ago",
      createdAt: "2026-08-22T08:00:00"
    },
    {
      id: "SAF-1002",
      name: "Sarah Nasser",
      email: "sarah.nasser@safepermit.com",
      phone: "+962 7 9000 2244",
      role: "Safety Officer",
      department: "Health, Safety & Environment",
      site: "Factory A",
      status: "Active",
      lastActivity: "4 min ago",
      createdAt: "2026-08-12T08:00:00"
    },
    {
      id: "SAF-1005",
      name: "Maya Haddad",
      email: "maya.haddad@safepermit.com",
      phone: "+962 7 9000 2205",
      role: "Safety Officer",
      department: "Health, Safety & Environment",
      site: "Plant B",
      status: "Active",
      lastActivity: "2 hrs ago",
      createdAt: "2026-09-01T08:00:00"
    },
    {
      id: "ADM-1001",
      name: "Rana Haddad",
      email: "rana.haddad@safepermit.com",
      phone: "+962 7 9000 3101",
      role: "Admin",
      department: "System Administration",
      site: "All Sites",
      status: "Active",
      lastActivity: "Now",
      createdAt: "2026-08-01T08:00:00"
    }
  ];

  let users = [];
  let pendingStatusUserId = "";

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

  if (sidebarOpen) sidebarOpen.addEventListener("click", openSidebar);
  if (sidebarClose) sidebarClose.addEventListener("click", closeSidebar);
  if (overlay) overlay.addEventListener("click", closeSidebar);

  window.addEventListener("resize", function () {
    if (window.innerWidth > 820) closeSidebar();
  });

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function loadUsers() {
    const stored = localStorage.getItem(storageKey);

    if (!stored) {
      users = clone(defaultUsers);
      saveUsers();
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      users = Array.isArray(parsed) ? parsed : clone(defaultUsers);
    } catch (error) {
      users = clone(defaultUsers);
    }
  }

  function saveUsers() {
    localStorage.setItem(storageKey, JSON.stringify(users));
  }

  function initials(name) {
    return String(name || "User")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(function (part) {
        return part.charAt(0).toUpperCase();
      })
      .join("");
  }

  function roleClass(role) {
    return String(role || "")
      .toLowerCase()
      .replace(/\s+/g, "-");
  }

  function getStatusActionButtons(user) {
    if (user.status === "Active") {
      return (
        '<button class="admin-user-action admin-user-action--danger" type="button" data-status-action="deactivate">Deactivate</button>' +
        '<button class="admin-user-action admin-user-action--block" type="button" data-status-action="block">Block</button>'
      );
    }

    if (user.status === "Inactive") {
      return (
        '<button class="admin-user-action admin-user-action--success" type="button" data-status-action="activate">Activate</button>' +
        '<button class="admin-user-action admin-user-action--block" type="button" data-status-action="block">Block</button>'
      );
    }

    return (
      '<button class="admin-user-action admin-user-action--success" type="button" data-status-action="unblock">Unblock</button>'
    );
  }

  function buildTableRow(user) {
    const row = document.createElement("tr");
    row.dataset.userId = user.id;

    row.innerHTML =
      '<td>' +
        '<div class="admin-user-cell">' +
          '<div class="admin-user-avatar">' + escapeHTML(initials(user.name)) + '</div>' +
          '<div>' +
            '<strong>' + escapeHTML(user.name) + '</strong>' +
            '<span>' + escapeHTML(user.email) + '</span>' +
          '</div>' +
        '</div>' +
      '</td>' +
      '<td>' + escapeHTML(user.id) + '</td>' +
      '<td><span class="admin-role admin-role--' + roleClass(user.role) + '">' + escapeHTML(user.role) + '</span></td>' +
      '<td>' + escapeHTML(user.department) + '</td>' +
      '<td>' + escapeHTML(user.site) + '</td>' +
      '<td><span class="admin-account-status admin-account-status--' + escapeHTML(user.status.toLowerCase()) + '">' + escapeHTML(user.status) + '</span></td>' +
      '<td>' + escapeHTML(user.lastActivity) + '</td>' +
      '<td>' +
        '<div class="admin-user-actions">' +
          '<button class="admin-user-action" type="button" data-edit-user>Edit</button>' +
          getStatusActionButtons(user) +
        '</div>' +
      '</td>';

    return row;
  }

  function renderUsers(list) {
    tableBody.innerHTML = "";
    mobileList.innerHTML = "";

    list.forEach(function (user) {
      tableBody.appendChild(buildTableRow(user));

      const card = document.createElement("article");
      card.className = "admin-users-mobile-card";
      card.dataset.userId = user.id;

      card.innerHTML =
        '<div class="admin-users-mobile-card__top">' +
          '<div class="admin-users-mobile-card__identity">' +
            '<div class="admin-user-avatar">' + escapeHTML(initials(user.name)) + '</div>' +
            '<div><strong>' + escapeHTML(user.name) + '</strong><span>' + escapeHTML(user.id) + ' · ' + escapeHTML(user.email) + '</span></div>' +
          '</div>' +
          '<span class="admin-account-status admin-account-status--' + escapeHTML(user.status.toLowerCase()) + '">' + escapeHTML(user.status) + '</span>' +
        '</div>' +
        '<div class="admin-users-mobile-card__meta">' +
          '<div><span>Role</span><strong>' + escapeHTML(user.role) + '</strong></div>' +
          '<div><span>Department</span><strong>' + escapeHTML(user.department) + '</strong></div>' +
          '<div><span>Primary Site</span><strong>' + escapeHTML(user.site) + '</strong></div>' +
          '<div><span>Last Activity</span><strong>' + escapeHTML(user.lastActivity) + '</strong></div>' +
        '</div>' +
        '<div class="admin-users-mobile-card__actions">' +
          '<button class="admin-user-action" type="button" data-edit-user>Edit</button>' +
          getStatusActionButtons(user) +
        '</div>';

      mobileList.appendChild(card);
    });

    bindUserActions();
  }

  function populateDepartmentFilter() {
    const selected = departmentFilter.value;
    const departments = Array.from(
      new Set(users.map(function (user) {
        return user.department;
      }))
    ).sort();

    departmentFilter.innerHTML = '<option value="all">All Departments</option>';

    departments.forEach(function (department) {
      const option = document.createElement("option");
      option.value = department;
      option.textContent = department;
      departmentFilter.appendChild(option);
    });

    departmentFilter.value =
      departments.includes(selected) || selected === "all"
        ? selected
        : "all";
  }

  function updateSummary() {
    totalUsers.textContent = users.length;

    activeUsers.textContent = users.filter(function (user) {
      return user.status === "Active";
    }).length;

    workerUsers.textContent = users.filter(function (user) {
      return user.role === "Worker";
    }).length;

    reviewUsers.textContent = users.filter(function (user) {
      return (
        user.role === "Supervisor" ||
        user.role === "Safety Officer" ||
        user.role === "Admin"
      );
    }).length;
  }

  function searchableText(user) {
    return (
      user.name + " " +
      user.id + " " +
      user.email + " " +
      user.phone + " " +
      user.role + " " +
      user.department + " " +
      user.site
    ).toLowerCase();
  }

  function getFilteredUsers() {
    const term = search.value.trim().toLowerCase();
    const role = roleFilter.value;
    const status = statusFilter.value;
    const department = departmentFilter.value;

    const filtered = users.filter(function (user) {
      const matchesSearch =
        term === "" ||
        searchableText(user).includes(term);

      const matchesRole =
        role === "all" ||
        user.role === role;

      const matchesStatus =
        status === "all" ||
        user.status === status;

      const matchesDepartment =
        department === "all" ||
        user.department === department;

      return (
        matchesSearch &&
        matchesRole &&
        matchesStatus &&
        matchesDepartment
      );
    });

    return filtered.sort(function (a, b) {
      if (sortFilter.value === "role") {
        return a.role.localeCompare(b.role) || a.name.localeCompare(b.name);
      }

      if (sortFilter.value === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      return a.name.localeCompare(b.name);
    });
  }

  function applyFilters() {
    const filtered = getFilteredUsers();

    renderUsers(filtered);
    emptyState.hidden = filtered.length !== 0;

    visibleCount.textContent =
      filtered.length === 1
        ? "1 user shown"
        : filtered.length + " users shown";
  }

  function clearErrors() {
    document.querySelectorAll(".admin-user-field small").forEach(function (item) {
      item.textContent = "";
    });

    document.querySelectorAll(".admin-user-field input, .admin-user-field select").forEach(function (item) {
      item.classList.remove("is-invalid");
    });
  }

  function showFieldError(field, errorId, message) {
    field.classList.add("is-invalid");
    document.getElementById(errorId).textContent = message;
  }

  function openUserModal(user) {
    clearErrors();
    userForm.reset();

    if (user) {
      userModalEyebrow.textContent = "Account details";
      userModalTitle.textContent = "Edit User";

      editingUserId.value = user.id;
      fullName.value = user.name;
      employeeId.value = user.id;
      userEmail.value = user.email;
      userPhone.value = user.phone;
      userRole.value = user.role;
      userDepartment.value = user.department;
      userSite.value = user.site;
      userStatus.value = user.status;
    } else {
      userModalEyebrow.textContent = "New account";
      userModalTitle.textContent = "Add User";

      editingUserId.value = "";
      userStatus.value = "Active";
    }

    userModal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeUserModal() {
    userModal.hidden = true;
    document.body.style.overflow = "";
  }

  function validateUserForm() {
    clearErrors();

    let valid = true;
    const editingId = editingUserId.value;

    if (fullName.value.trim().length < 3) {
      showFieldError(fullName, "fullNameError", "Enter the user's full name.");
      valid = false;
    }

    if (!employeeId.value.trim()) {
      showFieldError(employeeId, "employeeIdError", "Employee ID is required.");
      valid = false;
    } else {
      const duplicateId = users.some(function (user) {
        return (
          user.id.toLowerCase() === employeeId.value.trim().toLowerCase() &&
          user.id !== editingId
        );
      });

      if (duplicateId) {
        showFieldError(employeeId, "employeeIdError", "This Employee ID already exists.");
        valid = false;
      }
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(userEmail.value.trim())) {
      showFieldError(userEmail, "userEmailError", "Enter a valid email address.");
      valid = false;
    } else {
      const duplicateEmail = users.some(function (user) {
        return (
          user.email.toLowerCase() === userEmail.value.trim().toLowerCase() &&
          user.id !== editingId
        );
      });

      if (duplicateEmail) {
        showFieldError(userEmail, "userEmailError", "This email address is already in use.");
        valid = false;
      }
    }

    const normalizedPhone = userPhone.value.trim().replace(/[\s()+-]/g, "");

    if (!/^\d{7,15}$/.test(normalizedPhone)) {
      showFieldError(userPhone, "userPhoneError", "Enter a valid phone number.");
      valid = false;
    }

    if (!userRole.value) {
      showFieldError(userRole, "userRoleError", "Select a system role.");
      valid = false;
    }

    if (userDepartment.value.trim().length < 2) {
      showFieldError(userDepartment, "userDepartmentError", "Department is required.");
      valid = false;
    }

    if (!userSite.value) {
      showFieldError(userSite, "userSiteError", "Select a primary site.");
      valid = false;
    }

    if (!userStatus.value) {
      showFieldError(userStatus, "userStatusError", "Select account status.");
      valid = false;
    }

    return valid;
  }

  function saveUserFromForm() {
    const editingId = editingUserId.value;

    const userData = {
      id: employeeId.value.trim(),
      name: fullName.value.trim(),
      email: userEmail.value.trim(),
      phone: userPhone.value.trim(),
      role: userRole.value,
      department: userDepartment.value.trim(),
      site: userSite.value,
      status: userStatus.value,
      lastActivity: "Updated now",
      createdAt: new Date().toISOString()
    };

    if (editingId) {
      const index = users.findIndex(function (user) {
        return user.id === editingId;
      });

      if (index !== -1) {
        userData.createdAt = users[index].createdAt || userData.createdAt;
        users[index] = userData;
      }
    } else {
      users.unshift(userData);
    }

    saveUsers();
    populateDepartmentFilter();
    updateSummary();
    applyFilters();
  }

  function findUserByElement(element) {
    const holder = element.closest("[data-user-id]");

    if (!holder) return null;

    return users.find(function (user) {
      return user.id === holder.dataset.userId;
    }) || null;
  }

  function bindUserActions() {
    document.querySelectorAll("[data-edit-user]").forEach(function (button) {
      button.onclick = function () {
        const user = findUserByElement(button);
        if (user) openUserModal(user);
      };
    });

    document.querySelectorAll("[data-status-action]").forEach(function (button) {
      button.onclick = function () {
        const user = findUserByElement(button);

        if (user) {
          openStatusModal(user, button.dataset.statusAction);
        }
      };
    });
  }

  function openStatusModal(user, action) {
    pendingStatusUserId = user.id;

    let nextStatus = user.status;
    let title = "Change account status?";
    let text = "This change affects whether the user can access SafePermit.";
    let buttonLabel = "Confirm";
    let icon = "!";
    let iconBackground = "var(--sp-warning-bg)";
    let iconColor = "var(--sp-warning)";

    if (action === "activate") {
      nextStatus = "Active";
      title = "Activate " + user.name + "?";
      text = "This user will regain access according to the assigned system role.";
      buttonLabel = "Activate Account";
      icon = "✓";
      iconBackground = "var(--sp-success-bg)";
      iconColor = "var(--sp-success)";
    }

    if (action === "deactivate") {
      nextStatus = "Inactive";
      title = "Deactivate " + user.name + "?";
      text = "This user will no longer be able to access SafePermit until the account is activated again.";
      buttonLabel = "Deactivate Account";
    }

    if (action === "block") {
      nextStatus = "Blocked";
      title = "Block " + user.name + "?";
      text = "This account will be blocked from accessing SafePermit until an Admin removes the block.";
      buttonLabel = "Block Account";
      iconBackground = "var(--sp-danger-bg)";
      iconColor = "var(--sp-danger)";
    }

    if (action === "unblock") {
      nextStatus = "Inactive";
      title = "Unblock " + user.name + "?";
      text = "The block will be removed. The account will remain Inactive until an Admin activates it.";
      buttonLabel = "Unblock Account";
      icon = "✓";
      iconBackground = "var(--sp-success-bg)";
      iconColor = "var(--sp-success)";
    }

    statusModalIcon.textContent = icon;
    statusModalIcon.style.background = iconBackground;
    statusModalIcon.style.color = iconColor;
    statusModalTitle.textContent = title;
    statusModalText.textContent = text;
    confirmStatusButton.textContent = buttonLabel;
    confirmStatusButton.dataset.nextStatus = nextStatus;

    statusModal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeStatusModal() {
    statusModal.hidden = true;
    pendingStatusUserId = "";
    document.body.style.overflow = "";
  }

  addUserButton.addEventListener("click", function () {
    openUserModal(null);
  });

  document.querySelectorAll("[data-close-modal]").forEach(function (button) {
    button.addEventListener("click", closeUserModal);
  });

  cancelStatusButton.addEventListener("click", closeStatusModal);
  document.querySelector("[data-close-status]").addEventListener("click", closeStatusModal);

  userForm.addEventListener("submit", function (event) {
    event.preventDefault();

    if (!validateUserForm()) return;

    saveUserFromForm();
    closeUserModal();
  });

  confirmStatusButton.addEventListener("click", function () {
    const user = users.find(function (item) {
      return item.id === pendingStatusUserId;
    });

    if (!user) {
      closeStatusModal();
      return;
    }

    user.status = confirmStatusButton.dataset.nextStatus;
    user.lastActivity = "Updated now";

    saveUsers();
    updateSummary();
    applyFilters();
    closeStatusModal();
  });

  [search, roleFilter, statusFilter, departmentFilter, sortFilter].forEach(function (control) {
    control.addEventListener(
      control === search ? "input" : "change",
      applyFilters
    );
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;

    if (!userModal.hidden) closeUserModal();
    if (!statusModal.hidden) closeStatusModal();
  });

  loadUsers();
  populateDepartmentFilter();
  updateSummary();
  applyFilters();
})();
