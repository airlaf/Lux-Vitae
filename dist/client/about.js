import {createPixelMask} from './pixel-mask.js';
import {splitWords, revealWords} from './word-reveal.js';

const clip = document.querySelector('.origin-landscape');
const canvas = clip.querySelector('canvas');
const quote = document.querySelector('.founder-note blockquote');
const title = document.querySelector('#note-title');
const titleWords = splitWords(title);
const quoteWords = splitWords(quote);
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const sand = new Image();
sand.src = 'figma/waitlist-scene.png';
const ctx = canvas.getContext('2d');
const maskAt = createPixelMask(313);

const chapterShots = [...document.querySelectorAll('.chapter-shot')];
for (const shot of chapterShots) shot.classList.add('detail-reveal');

function updateChapterShots() {
  for (const shot of chapterShots) {
    const {top, height} = shot.getBoundingClientRect();
    const visibleDepth = Math.min(height * .85, innerHeight * .65);
    if (motion.matches || top <= innerHeight - visibleDepth) {
      shot.classList.add('detail-visible');
    } else if (top >= innerHeight) {
      shot.classList.remove('detail-visible');
    }
  }
}
let last=-1;
function paint(progress) {
  if (!ctx || !sand.naturalWidth || !sand.complete) return;
  canvas.hidden=progress>=1;
  if (progress===last || canvas.hidden) { last=progress; return; }
  last=progress;
  ctx.globalCompositeOperation='source-over';
  ctx.fillStyle='white';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(sand,0,0,canvas.width,canvas.height);
  if (!progress) return;
  ctx.globalCompositeOperation='destination-out';
  ctx.drawImage(maskAt(progress),0,0,canvas.width,canvas.height);
}
let queued=false;
function update() {
  queued=false;
  updateChapterShots();
  const bounds=clip.getBoundingClientRect();
  const travel=Math.max(1,Math.min(innerHeight*.70,bounds.height*.85));
  const start=Math.min(bounds.top+scrollY,innerHeight*.5);
  paint(motion.matches?1:Math.min(1,Math.max(0,(start-bounds.top)/travel)));
  for (const [el,words] of [[title,titleWords],[quote,quoteWords]]) {
    revealWords(words,(innerHeight*.86-el.getBoundingClientRect().top)/(innerHeight*.32));
  }
}
function schedule() {
  if (!queued) { queued=true; requestAnimationFrame(update); }
}
sand.decode().then(()=>{
  canvas.width=sand.naturalWidth;
  canvas.height=sand.naturalHeight;
  last=-1;
  update();
}).catch(()=>{ canvas.hidden=true; });
addEventListener('scroll',schedule,{passive:true});
addEventListener('resize',schedule);
motion.addEventListener('change',schedule);
update();
