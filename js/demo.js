// ============================================
// DEMO SUBMISSION - AJAX (No Page Reload)
// ============================================
(function() {
    const form = document.getElementById('demo-form');
    const submitBtn = document.getElementById('submit-btn');
    const submitText = document.getElementById('submit-text');
    const submitSpinner = document.getElementById('submit-spinner');
    const errorMessage = document.getElementById('error-message');
    const linkError = document.getElementById('link-error');
    const successMessage = document.getElementById('success-message');
    const formContainer = document.getElementById('demo-form-container');
    const demoLink = document.getElementById('demo-link');

    // Validate demo link
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
            'dropboxusercontent.com',
            'db.tt'
        ];
        
        return allowed.some(domain => lowerUrl.includes(domain));
    }

    // Real-time validation on input
    demoLink.addEventListener('input', function() {
        const url = this.value.trim();
        linkError.classList.remove('show');
        
        if (url && !validateDemoLink(url)) {
            linkError.textContent = '⚠️ Please use a valid Google Drive, Dropbox, or SoundCloud link.';
            linkError.classList.add('show');
        }
    });

    // Form submission - AJAX
    form.addEventListener('submit', function(e) {
        e.preventDefault(); // STOP page reload
        
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

        // Show loading state
        submitBtn.disabled = true;
        submitText.textContent = 'Submitting...';
        submitSpinner.classList.add('show');

        // Build form data
        const formData = new FormData(form);

        // Send via AJAX to Web3Forms
        fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Show success message
                formContainer.style.display = 'none';
                successMessage.style.display = 'block';
            } else {
                // Show error
                errorMessage.textContent = data.message || 'Something went wrong. Please try again.';
                errorMessage.classList.add('show');
                submitBtn.disabled = false;
                submitText.textContent = 'Submit Demo';
                submitSpinner.classList.remove('show');
            }
        })
        .catch(function(err) {
            errorMessage.textContent = 'Network error. Please check your connection and try again.';
            errorMessage.classList.add('show');
            submitBtn.disabled = false;
            submitText.textContent = 'Submit Demo';
            submitSpinner.classList.remove('show');
        });
    });
})();
