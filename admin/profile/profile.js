(function () {
  const sidebar = document.getElementById("adminSidebar");
  const overlay = document.getElementById("adminOverlay");
  const sidebarOpen = document.getElementById("sidebarOpen");
  const sidebarClose = document.getElementById("sidebarClose");

  const editButton = document.getElementById("editProfileButton");
  const cancelButton = document.getElementById("cancelEditButton");
  const form = document.getElementById("profileForm");
  const actions = document.getElementById("profileActions");

  const fullName = document.getElementById("fullName");
  const adminIdentityName = document.getElementById("adminIdentityName");
  const adminSidebarName = document.getElementById("adminSidebarName");
  const email = document.getElementById("email");
  const phone = document.getElementById("phone");
  const emailError = document.getElementById("emailError");
  const phoneError = document.getElementById("phoneError");
  const message = document.getElementById("profileMessage");

  const photoInput = document.getElementById("photoInput");
  const changePhotoButton = document.getElementById("changePhotoButton");
  const removePhotoButton = document.getElementById("removePhotoButton");

  const profileImage = document.getElementById("profileImage");
  const profileInitials = document.getElementById("profileInitials");

  const sidebarAvatarImage = document.getElementById("sidebarAvatarImage");
  const sidebarAvatarText = document.getElementById("sidebarAvatarText");

  const storageKey = "safePermitAdminProfile";

  let editMode = false;

  let originalState = {
    fullName: fullName.value,
    email: email.value,
    phone: phone.value,
    photo: ""
  };

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

  function clearErrors() {
    emailError.textContent = "";
    phoneError.textContent = "";

    email.classList.remove("is-invalid");
    phone.classList.remove("is-invalid");
  }

  function getCurrentPhoto() {
    if (!profileImage.hidden && profileImage.src) {
      return profileImage.src;
    }

    return "";
  }

  function applyPhoto(photo) {
    const hasPhoto = Boolean(photo);

    if (hasPhoto) {
      profileImage.src = photo;
      profileImage.hidden = false;
      profileInitials.hidden = true;

      sidebarAvatarImage.src = photo;
      sidebarAvatarImage.hidden = false;
      sidebarAvatarText.hidden = true;
    } else {
      profileImage.removeAttribute("src");
      profileImage.hidden = true;
      profileInitials.hidden = false;

      sidebarAvatarImage.removeAttribute("src");
      sidebarAvatarImage.hidden = true;
      sidebarAvatarText.hidden = false;
    }

    removePhotoButton.hidden =
      !editMode || !hasPhoto;
  }

  function setEditMode(enabled) {
    editMode = enabled;

    fullName.disabled = !enabled;
    email.disabled = !enabled;
    phone.disabled = !enabled;
    changePhotoButton.disabled = !enabled;

    actions.hidden = !enabled;
    editButton.hidden = enabled;

    message.textContent = "";
    message.className = "admin-profile-message";

    clearErrors();

    removePhotoButton.hidden =
      !enabled || !getCurrentPhoto();

    if (enabled) {
      originalState = {
        fullName: fullName.value,
        email: email.value,
        phone: phone.value,
        photo: getCurrentPhoto()
      };

      fullName.focus();
    }
  }

  function validateEmail() {
    const value = email.value.trim();
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!value) {
      emailError.textContent =
        "Email address is required.";

      email.classList.add("is-invalid");
      return false;
    }

    if (!pattern.test(value)) {
      emailError.textContent =
        "Enter a valid email address.";

      email.classList.add("is-invalid");
      return false;
    }

    return true;
  }

  function validatePhone() {
    const value = phone.value.trim();

    const normalized =
      value.replace(/[\s()+-]/g, "");

    if (!value) {
      phoneError.textContent =
        "Phone number is required.";

      phone.classList.add("is-invalid");
      return false;
    }

    if (!/^\d{7,15}$/.test(normalized)) {
      phoneError.textContent =
        "Enter a valid phone number.";

      phone.classList.add("is-invalid");
      return false;
    }

    return true;
  }

  function loadProfile() {
    const stored =
      localStorage.getItem(storageKey);

    if (!stored) {
      applyPhoto("");
      return;
    }

    try {
      const data = JSON.parse(stored);

      if (data.fullName) {
        fullName.value = data.fullName;
        if (adminIdentityName) adminIdentityName.textContent = data.fullName;
        if (adminSidebarName) adminSidebarName.textContent = data.fullName;
      }

      if (data.email) {
        email.value = data.email;
      }

      if (data.phone) {
        phone.value = data.phone;
      }

      applyPhoto(data.photo || "");

      originalState = {
        fullName: fullName.value,
        email: email.value,
        phone: phone.value,
        photo: data.photo || ""
      };
    } catch (error) {
      applyPhoto("");
    }
  }

  editButton.addEventListener(
    "click",
    function () {
      setEditMode(true);
    }
  );

  cancelButton.addEventListener(
    "click",
    function () {
      fullName.value = originalState.fullName;
      email.value = originalState.email;
      phone.value = originalState.phone;

      applyPhoto(originalState.photo);
      setEditMode(false);
    }
  );

  changePhotoButton.addEventListener(
    "click",
    function () {
      if (!editMode) {
        return;
      }

      photoInput.click();
    }
  );

  removePhotoButton.addEventListener(
    "click",
    function () {
      if (!editMode) {
        return;
      }

      photoInput.value = "";
      applyPhoto("");

      message.textContent = "";
      message.className =
        "admin-profile-message";
    }
  );

  photoInput.addEventListener(
    "change",
    function () {
      const file =
        photoInput.files &&
        photoInput.files[0];

      if (!file) {
        return;
      }

      const allowedTypes = [
        "image/jpeg",
        "image/png"
      ];

      const maxSize =
        2 * 1024 * 1024;

      if (!allowedTypes.includes(file.type)) {
        message.className =
          "admin-profile-message is-error";

        message.textContent =
          "Profile picture must be JPG or PNG.";

        photoInput.value = "";
        return;
      }

      if (file.size > maxSize) {
        message.className =
          "admin-profile-message is-error";

        message.textContent =
          "Profile picture must be 2 MB or smaller.";

        photoInput.value = "";
        return;
      }

      const reader = new FileReader();

      reader.onload = function () {
        applyPhoto(reader.result);

        message.textContent = "";
        message.className =
          "admin-profile-message";
      };

      reader.readAsDataURL(file);
    }
  );

  form.addEventListener(
    "submit",
    function (event) {
      event.preventDefault();

      clearErrors();

      const emailValid =
        validateEmail();

      const phoneValid =
        validatePhone();

      if (!emailValid || !phoneValid) {
        message.className =
          "admin-profile-message is-error";

        message.textContent =
          "Please correct the highlighted fields.";

        return;
      }

      const profileData = {
        fullName: fullName.value.trim(),
        email: email.value.trim(),
        phone: phone.value.trim(),
        photo: getCurrentPhoto()
      };

      localStorage.setItem(
        storageKey,
        JSON.stringify(profileData)
      );

      originalState = {
        fullName: profileData.fullName,
        email: profileData.email,
        phone: profileData.phone,
        photo: profileData.photo
      };

      if (adminIdentityName) adminIdentityName.textContent = profileData.fullName;
      if (adminSidebarName) adminSidebarName.textContent = profileData.fullName;
      setEditMode(false);

      message.className =
        "admin-profile-message is-success";

      message.textContent =
        "Profile updated successfully.";
    }
  );

  email.addEventListener(
    "input",
    function () {
      emailError.textContent = "";
      email.classList.remove("is-invalid");
    }
  );

  phone.addEventListener(
    "input",
    function () {
      phoneError.textContent = "";
      phone.classList.remove("is-invalid");
    }
  );

  loadProfile();
})();
