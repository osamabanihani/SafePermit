(function () {
  const form = document.getElementById("profileForm");
  const editButton = document.getElementById("editProfileButton");
  const cancelButton = document.getElementById("cancelEditButton");
  const actions = document.getElementById("profileActions");
  const message = document.getElementById("profileMessage");

  const email = document.getElementById("email");
  const phone = document.getElementById("phone");

  const profilePicture = document.getElementById("profilePicture");
  const uploadLabel = document.getElementById("uploadLabel");
  const removePhotoButton = document.getElementById("removePhotoButton");
  const pictureError = document.getElementById("pictureError");

  const profileAvatarImage = document.getElementById("profileAvatarImage");
  const profileAvatarText = document.getElementById("profileAvatarText");
  const sidebarAvatarImage = document.getElementById("sidebarAvatarImage");
  const sidebarAvatarText = document.getElementById("sidebarAvatarText");
  const picturePreviewImage = document.getElementById("picturePreviewImage");
  const picturePreviewText = document.getElementById("picturePreviewText");

  const sidebar = document.getElementById("workerSidebar");
  const overlay = document.getElementById("workerOverlay");
  const sidebarOpen = document.getElementById("sidebarOpen");
  const sidebarClose = document.getElementById("sidebarClose");

  let originalEmail = email.value;
  let originalPhone = phone.value;
  let savedPhoto = "";
  let workingPhoto = "";

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

  function setEditing(enabled) {
    email.disabled = !enabled;
    phone.disabled = !enabled;
    profilePicture.disabled = !enabled;
    removePhotoButton.disabled = !enabled;

    uploadLabel.classList.toggle("is-disabled", !enabled);

    actions.hidden = !enabled;
    editButton.hidden = enabled;

    if (enabled) {
      email.focus();
    }
  }

  function setImage(imageElement, textElement, value) {
    if (value) {
      imageElement.src = value;
      imageElement.hidden = false;
      textElement.hidden = true;
    } else {
      imageElement.removeAttribute("src");
      imageElement.hidden = true;
      textElement.hidden = false;
    }
  }

  function updatePhotoDisplays(value) {
    setImage(profileAvatarImage, profileAvatarText, value);
    setImage(sidebarAvatarImage, sidebarAvatarText, value);
    setImage(picturePreviewImage, picturePreviewText, value);
  }

  function validate() {
    let valid = true;

    email.classList.remove("is-invalid");
    phone.classList.remove("is-invalid");

    document.getElementById("emailError").textContent = "";
    document.getElementById("phoneError").textContent = "";
    pictureError.textContent = "";

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email.value.trim())) {
      email.classList.add("is-invalid");
      document.getElementById("emailError").textContent =
        "Enter a valid email address.";
      valid = false;
    }

    if (phone.value.trim().length < 7) {
      phone.classList.add("is-invalid");
      document.getElementById("phoneError").textContent =
        "Enter a valid phone number.";
      valid = false;
    }

    return valid;
  }

  function loadProfile() {
    const saved = localStorage.getItem("safePermitWorkerProfile");

    if (saved) {
      try {
        const data = JSON.parse(saved);

        if (data.email) {
          email.value = data.email;
        }

        if (data.phone) {
          phone.value = data.phone;
        }

        if (data.photo) {
          savedPhoto = data.photo;
        }
      } catch (error) {
      }
    }

    originalEmail = email.value;
    originalPhone = phone.value;
    workingPhoto = savedPhoto;

    document.getElementById("profileDisplayEmail").textContent =
      email.value;

    updatePhotoDisplays(savedPhoto);
  }

  editButton.addEventListener("click", function () {
    originalEmail = email.value;
    originalPhone = phone.value;
    workingPhoto = savedPhoto;

    message.className = "profile-message";
    message.textContent = "";
    pictureError.textContent = "";

    setEditing(true);
  });

  cancelButton.addEventListener("click", function () {
    email.value = originalEmail;
    phone.value = originalPhone;
    workingPhoto = savedPhoto;

    updatePhotoDisplays(savedPhoto);

    email.classList.remove("is-invalid");
    phone.classList.remove("is-invalid");

    document.getElementById("emailError").textContent = "";
    document.getElementById("phoneError").textContent = "";
    pictureError.textContent = "";

    setEditing(false);

    message.className = "profile-message";
    message.textContent = "";
  });

  profilePicture.addEventListener("change", function () {
    const file = profilePicture.files[0];

    pictureError.textContent = "";

    if (!file) {
      return;
    }

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      pictureError.textContent =
        "Only JPG and PNG images are allowed.";
      profilePicture.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      pictureError.textContent =
        "Image must be 2MB or smaller.";
      profilePicture.value = "";
      return;
    }

    const reader = new FileReader();

    reader.addEventListener("load", function () {
      workingPhoto = reader.result;
      updatePhotoDisplays(workingPhoto);
    });

    reader.readAsDataURL(file);
  });

  removePhotoButton.addEventListener("click", function () {
    workingPhoto = "";
    profilePicture.value = "";
    updatePhotoDisplays("");
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    if (!validate()) {
      message.className = "profile-message is-error";
      message.textContent =
        "Please fix the highlighted contact fields.";
      return;
    }

    const data = {
      email: email.value.trim(),
      phone: phone.value.trim(),
      photo: workingPhoto
    };

    try {
      localStorage.setItem(
        "safePermitWorkerProfile",
        JSON.stringify(data)
      );
    } catch (error) {
      message.className = "profile-message is-error";
      message.textContent =
        "The selected image is too large for browser storage. Choose a smaller image.";
      return;
    }

    savedPhoto = workingPhoto;
    originalEmail = data.email;
    originalPhone = data.phone;

    document.getElementById("profileDisplayEmail").textContent =
      data.email;

    setEditing(false);

    message.className = "profile-message is-success";
    message.textContent = "Profile changes saved locally.";
  });

  email.addEventListener("input", function () {
    email.classList.remove("is-invalid");
    document.getElementById("emailError").textContent = "";
  });

  phone.addEventListener("input", function () {
    phone.classList.remove("is-invalid");
    document.getElementById("phoneError").textContent = "";
  });

  loadProfile();
})();
