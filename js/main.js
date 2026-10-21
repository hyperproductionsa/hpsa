document.addEventListener('DOMContentLoaded',function(){console.log('Hyper Production (SA) - Website loaded');const observer=new IntersectionObserver((entries)=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible')}})},{threshold:0.15,rootMargin:'0px 0px -50px 0px'});document.querySelectorAll('.fade-section, .fade-left, .fade-right, .scale-up').forEach(el=>{observer.observe(el)})})

/* Mobile discovery panel: Explore + distribution, controlled by the floating menu and swipe gesture. */
document.addEventListener('DOMContentLoaded', function () {
  const hero = document.getElementById('hero');
  const panel = document.getElementById('mobile-discovery-panel');
  const explore = document.getElementById('explore');
  const toggle = document.getElementById('mobile-explore-toggle');
  if (!hero || !panel || !explore || !toggle || !window.PointerEvent) return;

  const mobile = () => window.matchMedia('(max-width: 768px)').matches;
  let drag = null;
  let suppressClickUntil = 0;

  function setOpen(open) {
    if (!mobile()) return;
    panel.classList.toggle('discovery-open', open);
    document.body.classList.toggle('explore-expanded', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close Explore and distribution menu' : 'Open Explore and distribution menu');
    toggle.querySelector('.explore-toggle-open-icon').style.display = open ? 'none' : 'block';
    toggle.querySelector('.explore-toggle-close-icon').style.display = open ? 'block' : 'none';
  }

  toggle.addEventListener('click', function () {
    setOpen(!panel.classList.contains('discovery-open'));
    panel.style.transform = '';
  });

  function start(event, mode) {
    if (!mobile() || (event.pointerType === 'mouse' && event.button !== 0)) return;
    if (mode === 'open' && panel.classList.contains('discovery-open')) return;
    if (mode === 'close' && !panel.classList.contains('discovery-open')) return;
    if (mode === 'open' && event.target.closest('a,button,input,textarea,select,#artwork-carousel,.slick-slider,.slick-list,.slick-track,.slick-slide')) return;
    if (mode === 'close' && !event.target.closest('#mobile-discovery-panel .panel-grab-area')) return;
    drag = {mode, id:event.pointerId, startY:event.clientY, lastY:event.clientY, lastTime:performance.now(), velocity:0, moved:false};
    panel.classList.add('discovery-dragging');
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
      panel.classList.add('discovery-open');
      document.body.classList.add('explore-expanded');
      panel.style.transform = 'translateY(calc(100% + ' + dy + 'px))';
    } else if (drag.mode === 'close' && dy > 0) {
      panel.style.transform = 'translateY(' + dy + 'px)';
    }
  }

  function finish(event) {
    if (!drag || (event && event.pointerId !== drag.id)) return;
    const d = drag;
    const dy = (event ? event.clientY : d.lastY) - d.startY;
    const h = Math.max(1, window.innerHeight);
    const intentional = Math.abs(dy) >= Math.max(64, h * .09);
    const open = d.mode === 'open' && d.moved && intentional && (dy < -h * .18 || d.velocity < -.7);
    const close = d.mode === 'close' && d.moved && intentional && (dy > h * .18 || d.velocity > .7);
    drag = null;
    panel.classList.remove('discovery-dragging');
    panel.style.transform = '';
    if (open) setOpen(true);
    else if (d.mode === 'open') setOpen(false);
    else if (close) setOpen(false);
    if (d.moved && d.mode === 'open') suppressClickUntil = Date.now() + 180;
  }

  hero.addEventListener('pointerdown', e => start(e, 'open'));
  panel.querySelector('.panel-grab-area').addEventListener('pointerdown', e => start(e, 'close'));
  [hero, panel].forEach(el => {
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', finish);
    el.addEventListener('pointercancel', finish);
  });
  hero.addEventListener('click', e => {
    if (Date.now() < suppressClickUntil) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  window.addEventListener('resize', function () {
    if (!mobile()) {
      drag = null;
      panel.classList.remove('discovery-open', 'discovery-dragging');
      panel.style.transform = '';
      document.body.classList.remove('explore-expanded');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open Explore and distribution menu');
      toggle.querySelector('.explore-toggle-open-icon').style.display = 'block';
      toggle.querySelector('.explore-toggle-close-icon').style.display = 'none';
    }
  });
});
