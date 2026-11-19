document.addEventListener('DOMContentLoaded',function(){console.log('Hyper Production (SA) - Website loaded');const observer=new IntersectionObserver((entries)=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible')}})},{threshold:0.15,rootMargin:'0px 0px -50px 0px'});document.querySelectorAll('.fade-section, .fade-left, .fade-right, .scale-up').forEach(el=>{observer.observe(el)})})

/* Desktop homepage footer follows the Contact section, activating before it reaches the fixed footer. */
document.addEventListener('DOMContentLoaded', function () {
  const contact = document.getElementById('contact');
  if (!contact || !document.body.classList.contains('home-page')) return;

  const desktop = window.matchMedia('(min-width: 769px)');
  let observer = null;

  function clearContactState() {
    document.body.classList.remove('contact-section-active');
  }

  function observeContact() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    clearContactState();
    if (!desktop.matches) return;

    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        document.body.classList.toggle('contact-section-active', entry.isIntersecting);
      });
    }, {
      root:null,
      rootMargin:'0px 0px -60px 0px',
      threshold:0
    });

    observer.observe(contact);
  }

  observeContact();
  if (desktop.addEventListener) desktop.addEventListener('change', observeContact);
  else if (desktop.addListener) desktop.addListener(observeContact);
});

