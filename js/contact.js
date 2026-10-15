(function () {
  const form       = document.getElementById("demo-form");
  const submitBtn  = document.getElementById("submit-btn");
  const submitText = document.getElementById("submit-text");
  const spinner    = document.getElementById("submit-spinner");
  const errorBox   = document.getElementById("error-message");
  const linkError  = document.getElementById("link-error");
  const formWrap   = document.getElementById("demo-form-container");
  const successBox = document.getElementById("success-message");

  if (!form) return;

  // ── Pre-select subject from URL ──────────────────────────
  const params    = new URLSearchParams(window.location.search);
  const preselect = params.get("subject");
  if (preselect) {
    const sel = document.getElementById("subject");
    if (sel && [...sel.options].some(o => o.value === preselect)) {
      sel.value = preselect;
    }
  }

  const ENDPOINT = "https://contact.hyperproduction.co.za/";

  const showError = (msg) => {
    errorBox.textContent = msg;
    errorBox.style.display = "block";
  };
  const clearErrors = () => {
    errorBox.textContent = "";
    errorBox.style.display = "none";
    if (linkError) { linkError.textContent = ""; linkError.style.display = "none"; }
  };
  const setLoading = (loading) => {
    submitBtn.disabled = loading;
    submitText.textContent = loading ? "Sending…" : "Send Message";
    if (spinner) spinner.style.display = loading ? "inline-block" : "none";
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();

    const data = {
      name:            form.name.value.trim(),
      email:           form.email.value.trim(),
      subject:         form.subject.value,
      message:         form.message.value.trim(),
      website:         form.website.value.trim(),
      privacy_consent: form.privacy_consent.checked
    };

    if (!data.name || data.name.length > 120)
      return showError("Please enter your name (max 120 characters).");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || data.email.length > 200)
      return showError("Please enter a valid email address.");
    if (!data.subject)
      return showError("Please choose a subject / service.");
    if (!data.message || data.message.length > 5000)
      return showError("Please enter a message (max 5000 characters).");
    if (!data.privacy_consent)
      return showError("Please accept the Privacy Policy to continue.");

    setLoading(true);

    try {
      const res  = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(json.error || "Something went wrong. Please try again.");

      formWrap.style.display  = "none";
      successBox.style.display = "block";
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      showError(err.message || "Could not send. Please try again later.");
      setLoading(false);
    }
  });
})();
