const track = document.querySelector('.tour-stage');
const slides = Array.from(track.querySelectorAll('figure'));
function copySlide(slide) {
  const copy = slide.cloneNode(true);
  copy.removeAttribute('id');
  copy.setAttribute('aria-hidden', 'true');
  return copy;
}

const leading = slides.slice(-2).map(copySlide);
const trailing = slides.slice(0, 2).map(copySlide);
track.dataset.initializing = '';
track.prepend(...leading);
track.append(...trailing);
const frames = [...leading, ...slides, ...trailing];
const firstFrame = leading.length;
const controls = document.querySelector('.tour-controls');
const previous = controls.querySelector('[data-tour-prev]');
const next = controls.querySelector('[data-tour-next]');
const position = controls.querySelector('output');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
let activeSlide = -1;
let activeFrame = firstFrame;
let settleTimer;
let drag;

function slideOffset(slide) {
  const viewport = track.getBoundingClientRect();
  const bounds = slide.getBoundingClientRect();
  return bounds.left - viewport.left - (track.clientWidth - bounds.width) / 2;
}

function updateCarousel() {
  const offsets = frames.map(slide => Math.abs(slideOffset(slide)));
  const closestFrame = offsets.indexOf(Math.min(...offsets));
  if (closestFrame !== activeFrame) frames[activeFrame].removeAttribute('data-active');
  activeFrame = closestFrame;
  frames[activeFrame].setAttribute('data-active', '');
  const closest = (activeFrame - firstFrame + slides.length) % slides.length;
  if (closest === activeSlide) return;

  activeSlide = closest;
  position.value = (closest + 1) + ' / ' + slides.length;
  position.setAttribute('aria-label', 'Workspace preview ' + (closest + 1) + ' of ' + slides.length);
}

function moveTo(index, behavior = reduceMotion.matches ? 'instant' : 'smooth') {
  const slide = frames[index];
  if (!slide) return;
  track.scrollBy({ left: slideOffset(slide), behavior });
}

function settleCarousel() {
  if (drag || (activeFrame >= firstFrame && activeFrame < firstFrame + slides.length)) return;
  // The copied neighbors make this repositioning visually identical at either end.
  const distance = slideOffset(slides[activeSlide]) - slideOffset(frames[activeFrame]);
  track.scrollBy({ left: distance, behavior: 'instant' });
  updateCarousel();
}

function step(direction) {
  if (!frames[activeFrame + direction]) settleCarousel();
  moveTo(activeFrame + direction);
}

moveTo(firstFrame, 'instant');
delete track.dataset.initializing;
controls.hidden = false;
updateCarousel();
track.addEventListener('scroll', () => {
  updateCarousel();
  clearTimeout(settleTimer);
  settleTimer = setTimeout(settleCarousel, 140);
}, { passive: true });
let trackWidth = track.clientWidth;
new ResizeObserver(() => {
  if (track.clientWidth === trackWidth) return;
  trackWidth = track.clientWidth;
  moveTo(firstFrame + activeSlide, 'instant');
  updateCarousel();
}).observe(track);
previous.addEventListener('click', () => step(-1));
next.addEventListener('click', () => step(1));
track.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    step(event.key === 'ArrowLeft' ? -1 : 1);
  } else if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault();
    moveTo(firstFrame + (event.key === 'Home' ? 0 : slides.length - 1));
  }
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
  drag = { pointer: event.pointerId, start: event.clientX, scroll: track.scrollLeft, frame: activeFrame };
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
    const index = swipe && activeFrame === drag.frame ? drag.frame + Math.sign(distance) : activeFrame;
    moveTo(Math.max(0, Math.min(frames.length - 1, index)));
  }
  track.classList.remove('is-dragging');
  drag = undefined;
}
track.addEventListener('pointerup', finishDrag);
track.addEventListener('pointercancel', finishDrag);
track.addEventListener('lostpointercapture', finishDrag);

const frame = document.querySelector('.appearance-frame');
const fallback = document.querySelector('.appearance-fallback');
const demoUrl = new URL('demo/', location.href);

fetch(new URL('ready.json', demoUrl))
  .then(response => response.ok && response.json())
  .then(status => {
    if (!status?.appearanceDemo) return;
    frame.src = demoUrl.href;
    frame.hidden = false;
    fallback.hidden = true;
  })
  .catch(() => {
    // The HTML-only preview can still show the screenshots.
  });

const root = document.documentElement;
document.addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse' || event.buttons) return;
  root.classList.toggle('scrollbar-near', event.clientX >= window.innerWidth - 16);
}, { passive: true });
window.addEventListener('blur', () => root.classList.remove('scrollbar-near'));
document.addEventListener('pointerleave', event => {
  if (!event.buttons && event.clientX < window.innerWidth - 16) root.classList.remove('scrollbar-near');
});

const pageLinks = Array.from(document.querySelectorAll('.nav a[href^="#"]'))
  .filter(link => ['#frontend', '#workspace', '#appearance', '#get-started'].includes(link.hash));
const navigation = document.querySelector('.nav');
const heroImage = document.querySelector('#project-chat .image-link');
let navigationFrame = 0;

function updateNavigationContrast() {
  navigationFrame = 0;
  const bar = navigation.getBoundingClientRect();
  const image = heroImage.getBoundingClientRect();
  // The page gradient also darkens below the hero on short layouts.
  const onScreenshot = image.top < bar.top + bar.height / 2 && image.bottom > bar.top + bar.height / 2;
  navigation.toggleAttribute('data-dark-backdrop', onScreenshot || window.scrollY >= 760);
}

function queueNavigationContrast() {
  if (!navigationFrame) navigationFrame = requestAnimationFrame(updateNavigationContrast);
}

updateNavigationContrast();
window.addEventListener('scroll', queueNavigationContrast, { passive: true });
window.addEventListener('resize', queueNavigationContrast);
window.addEventListener('pageshow', queueNavigationContrast);

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
