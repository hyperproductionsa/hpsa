// ============================================
// DEMO SUBMISSION - Web3Forms Handler with Link Validation
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

    // Check if URL has success parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
        formContainer.style.display = 'none';
        successMessage.style.display = 'block';
    }

    // Validate demo link
    function validateDemoLink(url) {
        if (!url) return false;
        
        const lowerUrl = url.toLowerCase();
        
        // Check if it's a valid URL
        try {
            new URL(url);
        } catch {
            return false;
        }
        
        // Allowed platforms
        const allowed = [
            'soundcloud.com',
            'drive.google.com',
            'dropbox.com',
            'dropboxusercontent.com',
            'db.tt'
        ];
        
        return allowed.some(domain => lowerUrl.includes(domain));
    }

    // Get platform name from URL
    function getPlatformName(url) {
        const lowerUrl = url.toLowerCase();
        if (lowerUrl.includes('soundcloud')) return 'SoundCloud';
        if (lowerUrl.includes('google')) return 'Google Drive';
        if (lowerUrl.includes('dropbox')) return 'Dropbox';
        return 'Unknown';
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

    // Form submission
    form.addEventListener('submit', function(e) {
        // Clear previous errors
        errorMessage.classList.remove('show');
        linkError.classList.remove('show');
        
        // Validate demo link
        const url = demoLink.value.trim();
        if (!validateDemoLink(url)) {
            e.preventDefault();
            linkError.textContent = '⚠️ Please use a valid Google Drive, Dropbox, or SoundCloud link.';
            linkError.classList.add('show');
            demoLink.focus();
            return;
        }

        // Show loading state
        submitBtn.disabled = true;
        submitText.textContent = 'Submitting...';
        submitSpinner.classList.add('show');
    });

    // If there's an error from Web3Forms
    if (urlParams.get('error') === 'true') {
        errorMessage.textContent = 'Something went wrong. Please try again.';
        errorMessage.classList.add('show');
    }
})();
