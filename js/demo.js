(function(){
  const ENDPOINT = "https://demo.hyperproduction.co.za";

  const form = document.getElementById("demo-form");
  const formContainer = document.getElementById("demo-form-container");
  const successMessage = document.getElementById("success-message");
  const submitBtn = document.getElementById("submit-btn");
  const submitText = document.getElementById("submit-text");
  const submitSpinner = document.getElementById("submit-spinner");
  const errorEl = document.getElementById("error-message");
  const linkErrorEl = document.getElementById("link-error");

  if(!form) return;

  function showError(el, msg){
    if(!el) return;
    el.textContent = msg;
    el.classList.add("show");
  }
  function clearErrors(){
    [errorEl, linkErrorEl].forEach((el)=>{
      if(!el) return;
      el.textContent = "";
      el.classList.remove("show");
    });
  }
  function setLoading(loading){
    submitBtn.disabled = loading;
    submitSpinner.classList.toggle("show", loading);
    submitText.textContent = loading ? "Sending..." : "Submit Demo";
  }

  form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    clearErrors();

    const artist = document.getElementById("artist-name").value.trim();
    const email = document.getElementById("email").value.trim();
    const link = document.getElementById("demo-link").value.trim();
    const consent = document.getElementById("privacy-consent").checked;
    const honeypot = document.querySelector('input[name="website"]');
    const website = honeypot ? honeypot.value.trim() : "";

    if(!artist || !email || !link){
      showError(errorEl, "Please fill in all required fields.");
      return;
    }
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
      showError(errorEl, "Please enter a valid email address.");
      return;
    }
    if(!/^https?:\/\//i.test(link)){
      showError(linkErrorEl, "Demo link must start with http:// or https://");
      return;
    }
    if(!consent){
      showError(errorEl, "Please accept the privacy policy to continue.");
      return;
    }

    setLoading(true);

    try{
      const r = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artist_name: artist,
          email: email,
          demo_link: link,
          website: website
        })
      });

      const data = await r.json().catch(()=>({}));

      if(!r.ok || !data.ok){
        showError(errorEl, data.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      formContainer.style.display = "none";
      successMessage.style.display = "block";
      window.scrollTo({ top: 0, behavior: "smooth" });
    }catch(err){
      console.error("Demo submit error:", err);
      showError(errorEl, "Network error. Please check your connection and try again.");
      setLoading(false);
    }
  });
})();
