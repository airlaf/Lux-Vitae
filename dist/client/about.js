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
const mask = document.createElement('canvas');
mask.width = 512;
mask.height = 313;
const brush = mask.getContext('2d');
const pixels = brush.createImageData(mask.width,mask.height);
const thresholds = new Float32Array(mask.width*mask.height);

// A stable grain field lets the same flecks return when scrolling back.
let seed = 4751;
const cornerRadius = Math.hypot(mask.width / 2, mask.height / 2);
for (let y = 0; y < mask.height; y++) {
  for (let x = 0; x < mask.width; x++) {
    const radius = Math.hypot(x + .5 - mask.width / 2, y + .5 - mask.height / 2) / cornerRadius;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const grain = .14 * (seed / 4294967296 - .5);
    const clusters = .025 * Math.sin(.08 * x + Math.sin(.06 * y)) * Math.cos(.09 * y);
    thresholds[y * mask.width + x] = Math.max(0, .04 + .80 * radius + clusters + grain);
  }
}

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
  for (let i=0;i<thresholds.length;i++) {
    pixels.data[i*4+3]=255*Math.min(1,Math.max(0,(progress-thresholds[i])/.065));
  }
  brush.putImageData(pixels,0,0);
  ctx.globalCompositeOperation='destination-out';
  ctx.drawImage(mask,0,0,canvas.width,canvas.height);
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
