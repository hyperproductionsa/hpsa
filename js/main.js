document.addEventListener('DOMContentLoaded',function(){console.log('Hyper Production (SA) - Website loaded');const observer=new IntersectionObserver((entries)=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible')}})},{threshold:0.15,rootMargin:'0px 0px -50px 0px'});document.querySelectorAll('.fade-section, .fade-left, .fade-right, .scale-up').forEach(el=>{observer.observe(el)})})

/* Mobile pull-up Explore panel, using the same finger-tracking pattern as the music player. */
document.addEventListener('DOMContentLoaded', function () {
  const hero = document.getElementById('hero');
  const explore = document.getElementById('explore');
  if (!hero || !explore || !window.PointerEvent) return;

  let drag = null;
  const mobile = () => window.matchMedia('(max-width: 768px)').matches;
  const viewportHeight = () => Math.max(1, window.innerHeight);
  const ignoredHeroTargets = 'a, button, input, textarea, select, #artwork-carousel, .slick-slider, .slick-list, .slick-track, .slick-slide';
  let suppressHeroClickUntil = 0;

  hero.addEventListener('click', function (event) {
    if (Date.now() > suppressHeroClickUntil) return;
    suppressHeroClickUntil = 0;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  function begin(event, mode) {
    if (!mobile() || (event.pointerType === 'mouse' && event.button !== 0)) return;
    if (mode === 'open' && document.body.classList.contains('explore-expanded')) return;
    if (mode === 'close' && !document.body.classList.contains('explore-expanded')) return;
    if (mode === 'open' && event.target.closest(ignoredHeroTargets)) return;
    // Close gestures start on the Explore heading so normal scrolling through
    // the cards and links is never intercepted.
    if (mode === 'close' && !event.target.closest('#explore h2')) return;

    suppressHeroClickUntil = 0;
    drag = {
      mode,
      id: event.pointerId,
      surface: event.currentTarget,
      startY: event.clientY,
      lastY: event.clientY,
      lastTime: performance.now(),
      velocity: 0,
      moved: false
    };
    explore.classList.add('explore-dragging');
    // Keep the panel hidden on a tap; reveal it only after a real upward drag.
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch (_) {}
  }

  function move(event) {
    if (!drag || event.pointerId !== drag.id) return;
    const now = performance.now();
    const dy = event.clientY - drag.startY;
    drag.velocity = (event.clientY - drag.lastY) / Math.max(1, now - drag.lastTime);
    drag.lastY = event.clientY;
    drag.lastTime = now;
    if (Math.abs(dy) > 12) drag.moved = true;

    if (drag.mode === 'open' && dy < -12) {
      explore.classList.add('explore-open');
      document.body.classList.add('explore-expanded');
      explore.style.transform = 'translateY(calc(100% + ' + dy + 'px))';
    } else if (drag.mode === 'close') {
      explore.style.transform = 'translateY(' + Math.max(0, dy) + 'px)';
    }
  }

  function finish(event) {
    if (!drag || (event && event.pointerId !== drag.id)) return;
    const d = drag;
    const dy = (event ? event.clientY : d.lastY) - d.startY;
    const h = viewportHeight();
    const intentional = Math.abs(dy) >= Math.max(64, h * 0.09);
    const shouldOpen = d.mode === 'open' && d.moved && intentional && (dy < -h * 0.18 || d.velocity < -0.7);
    const shouldClose = d.mode === 'close' && d.moved && intentional && (dy > h * 0.18 || d.velocity > 0.7);

    drag = null;
    explore.classList.remove('explore-dragging');
    explore.style.transform = '';

    if (d.mode === 'open') {
      if (shouldOpen) {
        explore.classList.add('explore-open');
        document.body.classList.add('explore-expanded');
      } else {
        explore.classList.remove('explore-open');
        document.body.classList.remove('explore-expanded');
      }
    } else if (shouldClose) {
      explore.classList.remove('explore-open');
      document.body.classList.remove('explore-expanded');
      explore.scrollTop = 0;
    }

    if (d.moved && d.mode === 'open') suppressHeroClickUntil = Date.now() + 120;
  }

  hero.addEventListener('pointerdown', event => begin(event, 'open'));
  explore.querySelector('h2')?.addEventListener('pointerdown', event => begin(event, 'close'));
  [hero, explore].forEach(surface => {
    surface.addEventListener('pointermove', move);
    surface.addEventListener('pointerup', finish);
    surface.addEventListener('pointercancel', finish);
  });

  window.addEventListener('resize', function () {
    if (!mobile()) {
      drag = null;
      explore.classList.remove('explore-open', 'explore-dragging');
      explore.style.transform = '';
      document.body.classList.remove('explore-expanded');
    }
  });
});
