(function () {
  const sidebar = document.getElementById("safetySidebar");
  const overlay = document.getElementById("safetyOverlay");
  const sidebarOpen = document.getElementById("sidebarOpen");
  const sidebarClose = document.getElementById("sidebarClose");

  const editButton = document.getElementById("editProfileButton");
  const cancelButton = document.getElementById("cancelEditButton");
  const form = document.getElementById("profileForm");
  const actions = document.getElementById("profileActions");

  const email = document.getElementById("email");
  const phone = document.getElementById("phone");
  const emailError = document.getElementById("emailError");
  const phoneError = document.getElementById("phoneError");
  const message = document.getElementById("profileMessage");

  const photoInput = document.getElementById("photoInput");
  const changePhotoButton = document.getElementById("changePhotoButton");
  const profileImage = document.getElementById("profileImage");
  const profileInitials = document.getElementById("profileInitials");
  const sidebarAvatar = document.getElementById("sidebarAvatar");

  const storageKey = "safePermitSafetyProfile";

  let editMode = false;

  let originalState = {
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
    if (photo) {
      profileImage.src = photo;
      profileImage.hidden = false;
      profileInitials.hidden = true;

      sidebarAvatar.textContent = "";
      sidebarAvatar.style.backgroundImage = 'url("' + photo + '")';
      sidebarAvatar.style.backgroundColor = "transparent";
    } else {
      profileImage.removeAttribute("src");
      profileImage.hidden = true;
      profileInitials.hidden = false;

      sidebarAvatar.style.backgroundImage = "";
      sidebarAvatar.style.backgroundColor = "";
      sidebarAvatar.textContent = "SN";
    }
  }

  function setEditMode(enabled) {
    editMode = enabled;

    email.disabled = !enabled;
    phone.disabled = !enabled;
    changePhotoButton.disabled = !enabled;

    actions.hidden = !enabled;
    editButton.hidden = enabled;

    message.textContent = "";
    message.className = "profile-message";

    clearErrors();

    if (enabled) {
      originalState = {
        email: email.value,
        phone: phone.value,
        photo: getCurrentPhoto()
      };

      email.focus();
    }
  }

  function validateEmail() {
    const value = email.value.trim();
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!value) {
      emailError.textContent = "Email address is required.";
      email.classList.add("is-invalid");
      return false;
    }

    if (!pattern.test(value)) {
      emailError.textContent = "Enter a valid email address.";
      email.classList.add("is-invalid");
      return false;
    }

    return true;
  }

  function validatePhone() {
    const value = phone.value.trim();
    const normalized = value.replace(/[\s()+-]/g, "");

    if (!value) {
      phoneError.textContent = "Phone number is required.";
      phone.classList.add("is-invalid");
      return false;
    }

    if (!/^\d{7,15}$/.test(normalized)) {
      phoneError.textContent = "Enter a valid phone number.";
      phone.classList.add("is-invalid");
      return false;
    }

    return true;
  }

  function loadProfile() {
    const stored = localStorage.getItem(storageKey);

    if (!stored) {
      return;
    }

    try {
      const data = JSON.parse(stored);

      if (data.email) {
        email.value = data.email;
      }

      if (data.phone) {
        phone.value = data.phone;
      }

      applyPhoto(data.photo || "");

      originalState = {
        email: email.value,
        phone: phone.value,
        photo: data.photo || ""
      };
    } catch (error) {
    }
  }

  editButton.addEventListener("click", function () {
    setEditMode(true);
  });

  cancelButton.addEventListener("click", function () {
    email.value = originalState.email;
    phone.value = originalState.phone;

    applyPhoto(originalState.photo);
    setEditMode(false);
  });

  changePhotoButton.addEventListener("click", function () {
    if (!editMode) {
      return;
    }

    photoInput.click();
  });

  photoInput.addEventListener("change", function () {
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

    const maxSize = 2 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      message.className = "profile-message is-error";
      message.textContent =
        "Profile picture must be JPG or PNG.";
      photoInput.value = "";
      return;
    }

    if (file.size > maxSize) {
      message.className = "profile-message is-error";
      message.textContent =
        "Profile picture must be 2 MB or smaller.";
      photoInput.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = function () {
      applyPhoto(reader.result);
      message.textContent = "";
      message.className = "profile-message";
    };

    reader.readAsDataURL(file);
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    clearErrors();

    const emailValid = validateEmail();
    const phoneValid = validatePhone();

    if (!emailValid || !phoneValid) {
      message.className = "profile-message is-error";
      message.textContent =
        "Please correct the highlighted fields.";
      return;
    }

    const profileData = {
      email: email.value.trim(),
      phone: phone.value.trim(),
      photo: getCurrentPhoto()
    };

    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify(profileData)
      );
    } catch (error) {
      message.className = "profile-message is-error";
      message.textContent =
        "The selected image is too large for browser storage. Choose a smaller image.";
      return;
    }

    originalState = {
      email: profileData.email,
      phone: profileData.phone,
      photo: profileData.photo
    };

    setEditMode(false);

    message.className = "profile-message is-success";
    message.textContent = "Profile updated successfully.";
  });

  email.addEventListener("input", function () {
    emailError.textContent = "";
    email.classList.remove("is-invalid");
  });

  phone.addEventListener("input", function () {
    phoneError.textContent = "";
    phone.classList.remove("is-invalid");
  });

  loadProfile();
})();
