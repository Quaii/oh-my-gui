const track = document.querySelector('.tour-stage');
const slides = Array.from(track.querySelectorAll('figure'));
const controls = document.querySelector('.tour-controls');
const previous = controls.querySelector('[data-tour-prev]');
const next = controls.querySelector('[data-tour-next]');
const position = controls.querySelector('output');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
let activeSlide = -1;
let drag;

function slideOffset(slide) {
  const viewport = track.getBoundingClientRect();
  const bounds = slide.getBoundingClientRect();
  return bounds.left - viewport.left - (track.clientWidth - bounds.width) / 2;
}

function updateCarousel() {
  const offsets = slides.map(slide => Math.abs(slideOffset(slide)));
  const closest = offsets.indexOf(Math.min(...offsets));
  if (closest === activeSlide) return;

  activeSlide = closest;
  position.value = (closest + 1) + ' / ' + slides.length;
  position.setAttribute('aria-label', 'Workspace preview ' + (closest + 1) + ' of ' + slides.length);
  previous.setAttribute('aria-disabled', String(closest === 0));
  next.setAttribute('aria-disabled', String(closest === slides.length - 1));
}

function moveTo(index) {
  const slide = slides[index];
  if (!slide) return;
  track.scrollBy({ left: slideOffset(slide), behavior: reduceMotion.matches ? 'instant' : 'smooth' });
}

controls.hidden = false;
updateCarousel();
track.addEventListener('scroll', updateCarousel, { passive: true });
new ResizeObserver(updateCarousel).observe(track);
previous.addEventListener('click', () => moveTo(activeSlide - 1));
next.addEventListener('click', () => moveTo(activeSlide + 1));
track.addEventListener('keydown', event => {
  const index = { ArrowLeft: activeSlide - 1, ArrowRight: activeSlide + 1, Home: 0, End: slides.length - 1 }[event.key];
  if (index === undefined) return;
  event.preventDefault();
  moveTo(index);
});
track.addEventListener('pointerdown', event => {
  if (event.pointerType === 'touch') {
    delete track.dataset.mouseDrag;
    return;
  }
  if (!event.isPrimary || event.button !== 0) return;
  event.preventDefault();
  track.focus({ preventScroll: true });
  track.dataset.mouseDrag = '';
  track.scrollTo({ left: track.scrollLeft, behavior: 'instant' });
  drag = { pointer: event.pointerId, start: event.clientX, scroll: track.scrollLeft, slide: activeSlide };
  track.setPointerCapture(event.pointerId);
});
track.addEventListener('pointermove', event => {
  if (drag?.pointer !== event.pointerId) return;
  const distance = drag.start - event.clientX;
  if (Math.abs(distance) < 4 && !track.classList.contains('is-dragging')) return;
  track.classList.add('is-dragging');
  track.scrollLeft = drag.scroll + distance;
});
function finishDrag(event) {
  if (drag?.pointer !== event.pointerId) return;
  if (track.classList.contains('is-dragging')) {
    const distance = track.scrollLeft - drag.scroll;
    updateCarousel();
    const swipe = event.type === 'pointerup' && Math.abs(distance) > Math.min(90, track.clientWidth * .12);
    const index = swipe && activeSlide === drag.slide ? drag.slide + Math.sign(distance) : activeSlide;
    moveTo(Math.max(0, Math.min(slides.length - 1, index)));
  }
  track.classList.remove('is-dragging');
  drag = undefined;
}
track.addEventListener('pointerup', finishDrag);
track.addEventListener('pointercancel', finishDrag);
track.addEventListener('lostpointercapture', finishDrag);

const frame = document.querySelector('.appearance-frame');
const fallback = document.querySelector('.appearance-fallback');
const preview = document.querySelector('#appearance-preview');
const demoToggle = document.querySelector('.demo-toggle');
const themeLinks = Array.from(document.querySelectorAll('[data-theme]'));
const demoUrl = new URL('demo/', location.href);
let pendingTheme;
let demoReady = false;

function sendTheme(theme) {
  if (!demoReady) return;
  frame.contentWindow.postMessage({ type: 'omp:appearance-demo-theme', theme }, demoUrl.origin);
}

function toggleDemo(open, scroll = false) {
  demoToggle.setAttribute('aria-expanded', String(open));
  preview.hidden = !open;
  preview.classList.toggle('is-open', open);
  if (!open) return;
  if (!frame.hasAttribute('src')) frame.src = demoUrl.href;
  if (scroll) preview.scrollIntoView({ block: 'start', behavior: reduceMotion.matches ? 'instant' : 'smooth' });
}

window.addEventListener('message', event => {
  if (event.origin !== demoUrl.origin || event.source !== frame.contentWindow) return;
  if (event.data?.type !== 'omp:appearance-demo-current') return;

  demoReady = true;
  for (const link of themeLinks) {
    if (link.dataset.theme === event.data.theme) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  }
  if (pendingTheme) {
    sendTheme(pendingTheme);
    pendingTheme = undefined;
  }
});

fetch(new URL('ready.json', demoUrl))
  .then(response => response.ok && response.json())
  .then(status => {
    if (!status?.appearanceDemo) return;
    frame.hidden = false;
    fallback.hidden = true;
    demoToggle.hidden = false;
    toggleDemo(location.hash === '#appearance-preview');
    demoToggle.addEventListener('click', () => toggleDemo(preview.hidden, preview.hidden));
    for (const link of themeLinks) {
      link.addEventListener('click', event => {
        event.preventDefault();
        if (demoReady) sendTheme(link.dataset.theme);
        else pendingTheme = link.dataset.theme;
        toggleDemo(true, true);
      });
    }
  })
  .catch(() => {
    // The HTML-only preview can still show the screenshots.
  });

const pageLinks = Array.from(document.querySelectorAll('.nav a[href^="#"]'))
  .filter(link => ['#frontend', '#workspace', '#appearance', '#get-started'].includes(link.hash));

function updateNavigation() {
  const id = location.hash.slice(1);
  const current = document.getElementById(id)?.closest('main > section, .closing');
  for (const link of pageLinks) {
    if (link.hash === '#' + current?.id) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
}

updateNavigation();
window.addEventListener('hashchange', () => {
  updateNavigation();
  const target = document.getElementById(location.hash.slice(1));
  if (target) requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
});

const menu = document.querySelector('.mobile-navigation');
const menuTrigger = menu.querySelector('summary');
menu.querySelector('nav').addEventListener('click', event => {
  if (event.target.closest('a')) menu.open = false;
});
document.addEventListener('pointerdown', event => {
  if (menu.open && !menu.contains(event.target)) menu.open = false;
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || !menu.open) return;
  event.preventDefault();
  menu.open = false;
  menuTrigger.focus();
});
