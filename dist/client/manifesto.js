import {splitWords, revealWords} from './word-reveal.js';

const motion = matchMedia('(prefers-reduced-motion: reduce)');
const elements = document.querySelectorAll('.manifesto-page h1, .manifesto-page p:not(.source), .manifesto-page blockquote');
const reading = Array.from(elements)
  .filter(element => element.getBoundingClientRect().top >= innerHeight)
  .map(element => ({element, words: splitWords(element)}));
let queued = false;

function update() {
  queued = false;
  const maxScroll = document.documentElement.scrollHeight - innerHeight;
  for (const {element, words} of reading) {
    const rect = element.getBoundingClientRect();
    const top = scrollY + rect.top;
    const end = Math.min(maxScroll, top + rect.height - innerHeight * .49);
    const start = Math.min(top - innerHeight * .86, end - innerHeight * .24);
    revealWords(words, maxScroll <= 0 ? 1 : (scrollY - start) / (end - start));
  }
}

function schedule() {
  if (!queued) {
    queued = true;
    requestAnimationFrame(update);
  }
}

addEventListener('scroll', schedule, {passive: true});
addEventListener('resize', schedule);
motion.addEventListener('change', schedule);
document.fonts.ready.then(schedule);
update();
