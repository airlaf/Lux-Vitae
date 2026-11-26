const page = document.documentElement;
const hero = document.querySelector('.hero');
const stage = document.querySelector('.film-stage');
const video = stage.querySelector('video');
const still = document.querySelector('.product');
const canvas = document.querySelector('.studio');
const ctx = canvas.getContext('2d', { alpha: false });
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let watchdog, frame;
let progress = page.classList.contains('intro') ? 0 : 1;
let source;

function ease(value) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

function paint() {
  if (!source || !ctx) return;
  const width = hero.clientWidth, height = hero.clientHeight;
  const ratio = Math.min(devicePixelRatio, 2);
  const pixelWidth = Math.round(width * ratio), pixelHeight = Math.round(height * ratio);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    ctx.imageSmoothingQuality = 'high';
  }
  const sw = source.videoWidth || source.naturalWidth;
  const sh = source.videoHeight || source.naturalHeight;
  const stageTop = stage.getBoundingClientRect().top - hero.getBoundingClientRect().top;
  const finalTop = stageTop + still.offsetTop;
  const finalHeight = 2 * (height - stageTop);
  const initialHeight = Math.min(finalHeight * .76, height * .8, width * .82);
  const move = ease(progress);
  const filmHeight = initialHeight + (finalHeight - initialHeight) * move;
  const top = Math.round(((height - initialHeight) / 2 * (1 - move) + finalTop * move) * ratio);
  const h = Math.round(filmHeight * ratio), w = Math.round(h * sw / sh);
  // Follow the top and half-width of the glass display in the source frame.
  hero.style.setProperty('--screen-top', ((top + .09 * h) / ratio) + 'px');
  hero.style.setProperty('--screen-radius', (.31 * w / ratio) + 'px');
  // The glass frame is centered at 49.1% of the closing shot.
  const left = Math.round(pixelWidth / 2 - w * (.5 - .009 * move));
  // Extend each edge from the same decoded frame. The top retains its
  // horizontal lighting gradient and the sides retain the studio floor.
  function band(sy, sourceHeight, y, destHeight) {
    if (destHeight <= 0) return;
    ctx.drawImage(source, 0, sy, sw, sourceHeight, left, y, w, destHeight);
    if (left > 0) {
      ctx.drawImage(source, 0, sy, 1, sourceHeight, 0, y, left, destHeight);
    }
    if (left + w < pixelWidth) {
      ctx.drawImage(source, sw-1, sy, 1, sourceHeight, left+w, y, pixelWidth-left-w, destHeight);
    }
  }
  band(0, 1, 0, top);
  band(0, sh, top, h);
  band(sh-1, 1, top+h, pixelHeight-top-h);
  page.classList.add('rendered');
}
function finish() {
  clearTimeout(watchdog);
  if (frame !== undefined) video.cancelVideoFrameCallback?.(frame);
  video.pause();
  progress = 1;
  page.classList.remove('intro');
  if (still.complete && still.naturalWidth) source = still;
  paint();
  window.dispatchEvent(new Event('hero-ready'));
  motion.removeEventListener('change', finish);
}
function updateReveal(position) {
  page.style.setProperty('--glass-opacity', ease((position - .29) / .68));
  page.style.setProperty('--nav-opacity', ease((position - .27) / .32));
  page.style.setProperty('--copy-opacity', ease((position - .42) / .50));
  page.style.setProperty('--subtitle-opacity', ease((position - .46) / .49));
  page.style.setProperty('--action-opacity', ease((position - .50) / .48));
}
function paintMovie(time) {
  if (!video.videoHeight || !page.classList.contains('intro')) return;
  source = video;
  progress = Math.min(1, time / Math.max(.01, video.duration - 1/24)) || 0;
  updateReveal(progress);
  paint();
}
function onFrame(_, metadata) {
  if (!page.classList.contains('intro')) return;
  paintMovie(metadata.mediaTime);
  frame = video.requestVideoFrameCallback(onFrame);
}
new ResizeObserver(paint).observe(hero);
still.decode().then(() => {
  if (!page.classList.contains('intro')) { source = still; paint(); }
}).catch(() => {});
if (page.classList.contains('intro') && ctx) {
  const armWatchdog = () => {
    clearTimeout(watchdog);
    watchdog = setTimeout(finish, 4500);
  };
  video.addEventListener('ended', finish, { once: true });
  video.addEventListener('error', finish, { once: true });
  motion.addEventListener('change', finish);
  video.addEventListener('timeupdate', () => {
    if (!page.classList.contains('intro')) return;
    armWatchdog();
    if (!video.requestVideoFrameCallback) paintMovie(video.currentTime);
  });
  if (video.requestVideoFrameCallback) frame = video.requestVideoFrameCallback(onFrame);
  armWatchdog();
  const useLargerFilm = hero.clientWidth > 700 && !navigator.connection?.saveData;
  video.src = useLargerFilm ? 'antik-film-2x.mp4' : 'antik-film.mp4';
  video.playbackRate = 1.25;
  video.play().catch(finish);
} else if (page.classList.contains('intro')) finish();

const daylight = hero.querySelector('.glass-daylight');
const responsiveLight = matchMedia('(any-hover: hover) and (any-pointer: fine) and (prefers-reduced-motion: no-preference)');
function centerDaylight() {
  daylight.style.removeProperty('--light-x');
  daylight.style.removeProperty('--light-y');
}
hero.addEventListener('pointermove', event => {
  if (!responsiveLight.matches || event.pointerType === 'touch' || page.classList.contains('intro')) return;
  const bounds = hero.getBoundingClientRect();
  const x = (event.clientX - bounds.left) / bounds.width - .5;
  const y = (event.clientY - bounds.top) / bounds.height - .5;
  daylight.style.setProperty('--light-x', (x * 6).toFixed(2) + '%');
  daylight.style.setProperty('--light-y', (y * 4).toFixed(2) + '%');
}, { passive: true });
hero.addEventListener('pointerleave', centerDaylight);
window.addEventListener('blur', centerDaylight);
responsiveLight.addEventListener('change', centerDaylight);
