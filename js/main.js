document.addEventListener('DOMContentLoaded',function(){console.log('Hyper Production (SA) - Website loaded');if(document.getElementById('hero'))document.body.classList.add('hpsa-home-active','home-page');const observer=new IntersectionObserver((entries)=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible')}})},{threshold:0.15,rootMargin:'0px 0px -50px 0px'});document.querySelectorAll('.fade-section, .fade-left, .fade-right, .scale-up').forEach(el=>{observer.observe(el)})})

/* Desktop homepage footer follows the Contact section, activating before it reaches the fixed footer. */
document.addEventListener('DOMContentLoaded', function () {
  const contact = document.getElementById('contact');
  if (!contact || !document.body.classList.contains('home-page')) return;

  document.body.classList.remove('contact-section-active');

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      document.body.classList.toggle('contact-section-active', entry.isIntersecting);
    });
  }, {
    root:null,
    rootMargin:'0px 0px -60px 0px',
    threshold:0
  });

  observer.observe(contact);
});

