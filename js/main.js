// ============================================
// MAIN - Core functionality
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('Hyper Production (SA) - Website loaded');
    
   // ============================================
// SCROLL ANIMATIONS
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Observe all elements with animation classes
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    });

    // Observe all animated elements
    document.querySelectorAll('.fade-section, .fade-left, .fade-right, .scale-up').forEach(el => {
        observer.observe(el);
    });
});
