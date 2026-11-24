import {splitWords,revealWords} from './word-reveal.js';
const partners = document.querySelector('.logos');
const repeatedLogos = partners.firstElementChild.cloneNode(true);
repeatedLogos.setAttribute('aria-hidden', 'true');
partners.append(repeatedLogos);
partners.classList.add('looping');

const section = document.querySelector('#antik-section');
const observer = new IntersectionObserver(entries => {
  if (entries.some(entry => entry.isIntersecting)) {
    observer.disconnect();
    import('./model/scene.js?v=solo1').catch(() => section.classList.add('model-unavailable'));
  }
}, {rootMargin: '75% 0px'});
observer.observe(section);

const filmPanel = document.querySelector('.human-film');
const featureFilm = filmPanel.querySelector('video');
const caption = filmPanel.querySelector('p');
const headingWords = splitWords(filmPanel.querySelector('h2'));
const captionWords = splitWords(caption);

const storyHeading = section.querySelector('#story-heading');
const titleWords = splitWords(storyHeading);
const detailsHeading = document.querySelector('#details-heading');
const detailsWords = splitWords(detailsHeading);
const detailCards = [...document.querySelectorAll('.details-grid article')];
const stackedDetails = matchMedia('(max-width: 700px)');
let previousY = scrollY;
let detailHold = null;
let holdTimer;
detailCards.forEach(card => card.classList.add('detail-reveal'));

function releaseDetails() {
  clearTimeout(holdTimer);
  detailHold = null;
  document.documentElement.classList.remove('details-holding');
}

const detailsPanel = detailsHeading.closest('.product-details');

function detailStop(card) {
  const firstView = !stackedDetails.matches || card === detailCards[0];
  const top = (firstView ? detailsPanel : card).getBoundingClientRect().top;
  const bottom = (stackedDetails.matches ? card : detailsPanel).getBoundingClientRect().bottom;
  const inset = Math.max(8, Math.min(innerHeight * .08, (innerHeight - (bottom - top)) / 2));
  return Math.max(0, Math.round(scrollY + top - inset));
}

function handleDetailScroll() {
  const y = scrollY;
  const from = previousY;
  previousY = y;
  if (detailHold !== null || reducedMotion.matches || y < from) return;

  const next = detailCards.find(card => !card.classList.contains('detail-visible'));
  if (!next) return;
  const stop = detailStop(next);
  if (y < stop || from > stop + 1) return;
  const cards = stackedDetails.matches ? [next] : detailCards;
  detailHold = stop;
  document.documentElement.classList.add('details-holding');
  window.scrollTo({top: stop, behavior: 'instant'});
  previousY = stop;
  cards.forEach(card => card.classList.add('detail-visible'));
  // Release on the last caption, with a bounded fallback for cancelled transitions.
  const lastCaption = cards[cards.length - 1].querySelector('p');
  lastCaption.addEventListener('transitionend', releaseDetails, {once: true});
  holdTimer = setTimeout(releaseDetails, stackedDetails.matches ? 700 : 1400);
}

// Anchor navigation and restored pages can start below the reveal threshold.
function showPassedDetails() {
  if (detailHold !== null) return;
  detailCards.forEach(card => {
    if (scrollY >= detailStop(card)) card.classList.add('detail-visible');
  });
  previousY = scrollY;
}
window.addEventListener('scroll', handleDetailScroll, {passive: true});
window.addEventListener('pageshow', showPassedDetails);
window.addEventListener('hashchange', () => { releaseDetails(); showPassedDetails(); });
window.addEventListener('resize', () => { releaseDetails(); showPassedDetails(); });
const waitlistScene = document.querySelector('.waitlist-scene');
const waitlistHeading = document.querySelector('#join-title');
const waitlistWords = splitWords(waitlistHeading);
const modelView = section.querySelector('#view');
const finishPicker = modelView.querySelector('.frame-finishes');
const finishItems = [...splitWords(finishPicker.querySelector('legend')), ...finishPicker.querySelectorAll('label')];
const paragraphs = Array.from(modelView.querySelectorAll('.story p'), element => ({
  element, words: splitWords(element)
}));

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
reducedMotion.addEventListener('change', releaseDetails);
showPassedDetails();
let pendingFrame = 0;
let visible = false;



function updateScrollEffects() {
  pendingFrame = 0;
  const rect = filmPanel.getBoundingClientRect();
  const captionTop = rect.top + caption.offsetTop;
  const distance = (innerHeight - rect.top) / Math.min(rect.height, innerHeight);
  const ease = (start, end) => {
    const t = Math.min(1, Math.max(0, (distance - start) / (end - start)));
    return t * t * (3 - 2 * t);
  };
  const inset = reducedMotion.matches ? 0 : 1 - ease(0, .52);
  filmPanel.style.setProperty('--film-inset', (12 * inset) + '%');
  filmPanel.style.setProperty('--film-radius', (18 * inset) + 'px');
  revealWords(headingWords, (distance - .52) / .26);
  revealWords(captionWords, (innerHeight - captionTop) / (innerHeight * .34));
  revealWords(detailsWords, (innerHeight - detailsHeading.getBoundingClientRect().bottom) / (innerHeight * .27));
  const scene = waitlistScene.getBoundingClientRect();
  const sceneEntry = (innerHeight - scene.top) / Math.min(scene.height, innerHeight);
  const progress = Math.max(0, Math.min(1, sceneEntry / .52));
  const fade = Math.max(0, Math.min(1, (sceneEntry - .72) / .28));
  waitlistScene.style.setProperty('--art-color', reducedMotion.matches ? 1 : fade * fade * (3 - 2 * fade));
  const remaining = reducedMotion.matches ? 0 : 1 - progress * progress * (3 - 2 * progress);
  waitlistScene.style.setProperty('--art-inset', (12 * remaining) + '%');
  waitlistScene.style.setProperty('--art-radius', (18 * remaining) + 'px');
  revealWords(waitlistWords, (innerHeight - waitlistHeading.getBoundingClientRect().bottom) / (innerHeight * .27));
  updateStory();
}

function updateStory() {
  // The heading's box includes the section padding. Use its bottom to track the actual line.
  revealWords(titleWords, (innerHeight - storyHeading.getBoundingClientRect().bottom) / (innerHeight * .27));
  const interactive = section.classList.contains('interactive');
  const height = modelView.clientHeight;
  const progress = Math.max(0, -section.getBoundingClientRect().top / Math.max(1, section.offsetHeight - 4 * height));
  modelView.querySelector('.story').style.translate = interactive && !reducedMotion.matches
    ? '0 ' + ((.48 - progress * .99) * height) + 'px' : '';
  const exitOpacity = Math.min(1, Math.max(0, (.82 - progress) / .065));
  finishPicker.hidden = !interactive || progress <= .38 || progress >= .82;
  finishPicker.style.opacity = exitOpacity;
  revealWords(finishItems, (progress - .38) / .15);
  paragraphs.forEach(({element, words}, index) => {
    if (interactive) {
      element.style.opacity = progress < .19 ? 0 : exitOpacity;
      revealWords(words, (progress - .19 - index * .095) / .15);
    } else {
      element.style.opacity = '';
      revealWords(words, (innerHeight - element.getBoundingClientRect().top) / (innerHeight * .3));
    }
  });
}

function queueReveal() {
  if (!pendingFrame) pendingFrame = requestAnimationFrame(updateScrollEffects);
}
function updatePlayback() {
  featureFilm.controls = reducedMotion.matches;
  if (!visible || document.hidden || reducedMotion.matches || document.documentElement.classList.contains('intro')) {
    featureFilm.pause();
  } else {
    featureFilm.play().catch(() => { featureFilm.controls = true; });
  }
}
new IntersectionObserver(([entry]) => {
  visible = entry.isIntersecting && entry.intersectionRatio > 0;
  updatePlayback();
}, { threshold: [0, .01] }).observe(filmPanel);
window.addEventListener('scroll', queueReveal, { passive: true });
window.addEventListener('resize', queueReveal);
window.addEventListener('hero-ready', () => { queueReveal(); updatePlayback(); });
document.addEventListener('visibilitychange', updatePlayback);
reducedMotion.addEventListener('change', () => { queueReveal(); updatePlayback(); });
new ResizeObserver(queueReveal).observe(section);
updateScrollEffects();
