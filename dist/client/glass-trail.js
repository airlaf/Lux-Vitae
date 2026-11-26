import {createGlassOptics} from './glass-optics.js';
const enabled = matchMedia('(any-hover:hover) and (any-pointer:fine) and (prefers-reduced-motion:no-preference)');

function attachTrail(surface) {
  const layer = surface.querySelector('.trail-flutes');
  const shadows = Array.from(layer.children, element => ({element, x:0, y:0}));
  let drawOptics;
  let lastClientX, lastClientY;
  let x = 0, y = 0, strength = 0, hovering = false, frame = 0, lastTime = 0;

  function draw(time) {
    frame = 0;
    const dt = Math.min(50, time - lastTime || 16);
    lastTime = time;
    const target = hovering ? 1 : 0;
    strength += (target - strength) * (1 - Math.exp(-dt / (hovering ? 110 : 215)));
    let moving = false;
    let leadX = x, leadY = y;
    shadows.forEach((shadow, index) => {
      const follow = 1 - Math.exp(-dt / (48 + index * 45));
      shadow.x += (leadX - shadow.x) * follow;
      shadow.y += (leadY - shadow.y) * follow;
      shadow.element.style.transform = 'translate(' + shadow.x + 'px,' + shadow.y + 'px) translate(-50%,-50%)';
      moving ||= Math.abs(leadX - shadow.x) + Math.abs(leadY - shadow.y) > .25;
      leadX = shadow.x;
      leadY = shadow.y;
    });
    const opacity = strength < .008 ? 0 : strength;
    layer.style.opacity = opacity;
    drawOptics ??= createGlassOptics(surface, layer);
    drawOptics(shadows[0].x, shadows[0].y, opacity);
    if ((hovering && moving) || Math.abs(target - strength) > .005) frame = requestAnimationFrame(draw);
  }
  function wake() {
    if (!frame) {
      lastTime = performance.now();
      frame = requestAnimationFrame(draw);
    }
  }
  function leave() {
    hovering = false;
    if (strength > .005) wake();
  }
  surface.addEventListener('pointermove', event => {
    if (!enabled.matches || event.pointerType === 'touch' || event.target.closest('a,button')) {
      leave();
      return;
    }
    // Browsers can report the resting pointer when the page appears beneath it.
    const moved = event.movementX || event.movementY ||
      (lastClientX !== undefined && (event.clientX !== lastClientX || event.clientY !== lastClientY));
    lastClientX = event.clientX;
    lastClientY = event.clientY;
    if (!moved) return;
    const bounds = surface.getBoundingClientRect();
    x = event.clientX - bounds.left;
    y = event.clientY - bounds.top;
    if (!hovering && strength < .01) shadows.forEach(shadow => { shadow.x = x; shadow.y = y; });
    hovering = true;
    wake();
  }, {passive:true});
  surface.addEventListener('pointerleave', leave);
  window.addEventListener('blur', leave);
  window.addEventListener('scroll', leave, {passive:true});
  enabled.addEventListener('change', leave);
}

document.querySelectorAll('.hero, .footer-glass').forEach(attachTrail);
