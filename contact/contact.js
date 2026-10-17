(function () {
  const form = document.getElementById("contactForm");
  const status = document.getElementById("contactStatus");
  if (!form || !status) return;

  const name = document.getElementById("contactName");
  const email = document.getElementById("contactEmail");
  const topic = document.getElementById("contactTopic");
  const message = document.getElementById("contactMessageInput");
  const controls = [name, email, topic, message].filter(Boolean);

  function clearFieldState(control) { control.classList.remove("is-invalid"); }
  controls.forEach(function (control) { control.addEventListener("input", function () { clearFieldState(control); status.textContent = ""; status.className = "contact-message"; }); });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    controls.forEach(clearFieldState);
    status.className = "contact-message";

    const invalid = [];
    if (!name.value.trim()) invalid.push(name);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) invalid.push(email);
    if (message.value.trim().length < 10) invalid.push(message);

    if (invalid.length) {
      invalid.forEach(function (control) { control.classList.add("is-invalid"); });
      status.classList.add("is-error");
      status.textContent = "Please complete your name, a valid email, and a message of at least 10 characters.";
      invalid[0].focus();
      return;
    }

    const record = { name: name.value.trim(), email: email.value.trim(), topic: topic.value, message: message.value.trim(), createdAt: new Date().toISOString() };
    let list = [];
    try { list = JSON.parse(localStorage.getItem("safePermitContactMessages") || "[]"); } catch (error) { list = []; }
    if (!Array.isArray(list)) list = [];
    list.unshift(record);
    localStorage.setItem("safePermitContactMessages", JSON.stringify(list.slice(0, 20)));
    status.classList.add("is-success");
    status.textContent = "Message saved in this frontend demo. Backend delivery will be connected later.";
    form.reset();
  });
})();
