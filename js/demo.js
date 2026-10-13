// ============================================
// DEMO SUBMISSION — posts to demo.hyperproduction.co.za
// ============================================
(function() {
    const ENDPOINT = "https://demo.hyperproduction.co.za";

    const form = document.getElementById('demo-form');
    const submitBtn = document.getElementById('submit-btn');
    const submitText = document.getElementById('submit-text');
    const submitSpinner = document.getElementById('submit-spinner');
    const errorMessage = document.getElementById('error-message');
    const linkError = document.getElementById('link-error');
    const formContainer = document.getElementById('demo-form-container');
    const successMessage = document.getElementById('success-message');
    const demoLink = document.getElementById('demo-link');

    if (!form) return;

    // Validate demo link — must be SoundCloud, Google Drive, or Dropbox
    function validateDemoLink(url) {
        if (!url) return false;
        const lowerUrl = url.toLowerCase();
        try {
            new URL(url);
        } catch {
            return false;
        }
        const allowed = [
            'soundcloud.com',
            'drive.google.com',
            'dropbox.com',
            'dropboxusercontent.com'
        ];
        return allowed.some(domain => lowerUrl.includes(domain));
    }

    // Real-time validation on input
    demoLink.addEventListener('input', function() {
        const url = this.value.trim();
        if (!url) {
            linkError.classList.remove('show');
            return;
        }
        if (validateDemoLink(url)) {
            linkError.classList.remove('show');
        } else {
            linkError.textContent = '⚠️ Please use a valid Google Drive, Dropbox, or SoundCloud link.';
            linkError.classList.add('show');
        }
    });

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        // Clear previous errors
        errorMessage.classList.remove('show');
        linkError.classList.remove('show');

        // Validate demo link
        const url = demoLink.value.trim();
        if (!validateDemoLink(url)) {
            linkError.textContent = '⚠️ Please use a valid Google Drive, Dropbox, or SoundCloud link.';
            linkError.classList.add('show');
            demoLink.focus();
            return;
        }

        // Collect form fields
        const artist = document.getElementById('artist-name').value.trim();
        const email = document.getElementById('email').value.trim();
        const consent = document.getElementById('privacy-consent').checked;
        const honeypot = form.querySelector('input[name="website"]');
        const website = honeypot ? honeypot.value.trim() : "";

        if (!artist || !email) {
            errorMessage.textContent = 'Please fill in all required fields.';
            errorMessage.classList.add('show');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errorMessage.textContent = 'Please enter a valid email address.';
            errorMessage.classList.add('show');
            return;
        }
        if (!consent) {
            errorMessage.textContent = 'Please accept the privacy policy to continue.';
            errorMessage.classList.add('show');
            return;
        }

        // Disable button + show spinner
        submitBtn.disabled = true;
        submitText.textContent = 'Submitting...';
        submitSpinner.classList.add('show');

        fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                artist_name: artist,
                email: email,
                demo_link: url,
                website: website
            })
        })
        .then(response => response.json().then(data => ({ ok: response.ok, data })))
        .then(({ ok, data }) => {
            if (ok && data.ok) {
                formContainer.style.display = 'none';
                successMessage.style.display = 'block';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                errorMessage.textContent = (data && data.error) || 'Something went wrong. Please try again.';
                errorMessage.classList.add('show');
                submitBtn.disabled = false;
                submitText.textContent = 'Submit Demo';
                submitSpinner.classList.remove('show');
            }
        })
        .catch(function(err) {
            console.error('Demo submit error:', err);
            errorMessage.textContent = 'Network error. Please check your connection and try again.';
            errorMessage.classList.add('show');
            submitBtn.disabled = false;
            submitText.textContent = 'Submit Demo';
            submitSpinner.classList.remove('show');
        });
    });
})();
