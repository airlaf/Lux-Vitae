const viewport = document.querySelector('.roster-window');
const controls = document.querySelector('.roster-controls');
const [previous, next] = controls.querySelectorAll('button');
const cards = [...viewport.querySelectorAll('li')];
const motion = matchMedia('(prefers-reduced-motion: reduce)');
controls.hidden = false;

function step(direction) {
  const stride = cards[1].offsetLeft - cards[0].offsetLeft;
  viewport.scrollBy({left: direction * stride, behavior: motion.matches ? 'instant' : 'smooth'});
}
previous.addEventListener('click', () => step(-1));
next.addEventListener('click', () => step(1));

const careers = document.querySelector('.team-opportunities');
careers.classList.add('reveal-photo');

function update() {
  const photo = careers.querySelector('img').getBoundingClientRect();
  if (photo.top <= innerHeight - Math.min(photo.height * .8, innerHeight * .6)) {
    careers.classList.add('photo-visible');
  } else if (photo.top >= innerHeight) {
    careers.classList.remove('photo-visible');
  }
  const bounds = viewport.getBoundingClientRect();
  viewport.style.setProperty('--window-width', bounds.width + 'px');
  previous.disabled = viewport.scrollLeft <= 1;
  next.disabled = viewport.scrollLeft >= viewport.scrollWidth - viewport.clientWidth - 1;
  for (const card of cards) {
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--edge-offset', (bounds.left - rect.left) + 'px');
    const across = Math.min(bounds.right, rect.right) - Math.max(bounds.left, rect.left);
    const down = innerHeight - rect.top;
    const progress = Math.max(0, Math.min(1, across / (rect.width * .85), down / (rect.height * .8)));
    card.querySelector('.sand').style.opacity = motion.matches ? 0 : 1 - progress * progress * (3 - 2 * progress);
  }
}
viewport.addEventListener('scroll', update, {passive:true});
window.addEventListener('scroll', update, {passive:true});
new ResizeObserver(update).observe(viewport);
motion.addEventListener('change', update);
update();
