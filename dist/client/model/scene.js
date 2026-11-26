import * as T from './vendor/three.module.js';
import {createComputer} from './model.js?v=elevation1';
import {createElevation} from './elevation.js?v=locked3';
import {createDraftingGrid} from './drafting-grid.js';
import {lightStudio} from './studio.js';

import {createDiagramEffects} from './diagram-effects.js?v=solo1';
import {createStory} from './story.js?v=solo1';

const section=document.querySelector('#antik-section');
const host=section.querySelector('#view');
const poster=host.querySelector('#poster');
try {
  const renderer=new T.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  const scene=new T.Scene();
  const grid = createDraftingGrid();
  scene.add(grid);
  scene.background=new T.Color(0xffffff);
  scene.environment=lightStudio(renderer).texture;
  const {root,explode,anchors,setFinish,emphasize,sides,profiles}=await createComputer(grid.material.uniforms);
  scene.add(root);
  root.position.y=-190;
  const camera=new T.PerspectiveCamera(23,1,1,5000);

  const mask=document.createElement('canvas');
  mask.width=mask.height=128;
  const ctx=mask.getContext('2d');
  const fade=ctx.createRadialGradient(64,64,0,64,64,64);
  fade.addColorStop(0,'rgba(48,42,35,.28)');
  fade.addColorStop(.52,'rgba(48,42,35,.13)');
  fade.addColorStop(1,'rgba(48,42,35,0)');
  ctx.fillStyle=fade;
  ctx.fillRect(0,0,128,128);
  const shadowMaterial=new T.MeshBasicMaterial({map:new T.CanvasTexture(mask),transparent:true,depthWrite:false});
  function contact(x,z,width,depth) {
    const patch=new T.Mesh(new T.PlaneGeometry(width,depth),shadowMaterial);
    patch.rotation.x=-Math.PI/2;
    patch.position.set(x,-191,z);
    scene.add(patch);
    return patch;
  }
  contact(0,-54,750,195);
  const feet=[contact(-278,-38,56,135),contact(278,-38,56,135)];

  const picker = host.querySelector('.frame-finishes');
  picker.addEventListener('change', event => {
    setFinish(event.target.value);
    redraw();
  });
  setFinish(picker.querySelector(':checked').value);
  const story=createStory(host);
  const drawElevation=createElevation(host,profiles,root,sides);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const narrow=matchMedia('(max-width:1024px) and (orientation:portrait)');
  let yaw=0,pitch=0,drag=null,scheduled=false;
  const updateEffects = createDiagramEffects(sides);
  function render(){
    scheduled=false;
    const w = host.clientWidth, h = host.clientHeight;
    const bounds = section.getBoundingClientRect();
    if (bounds.bottom < 0 || bounds.top > innerHeight) return;
    const sectionTop = bounds.top;
    grid.material.uniforms.size.value.set(w, h);
    grid.material.uniforms.reveal.value = reducedMotion.matches ? 1 : T.MathUtils.smoothstep(-sectionTop / h, -.75, .85);
    const progress = T.MathUtils.clamp(-sectionTop / Math.max(1, section.offsetHeight - 4 * h), 0, 2);
    const entry = T.MathUtils.smoothstep(progress, .13, .25);
    // Reserve the final stretch of the pinned stage for reading the assembled callouts.
    const diagram = T.MathUtils.smoothstep(progress, .80, reducedMotion.matches ? 1 : .93);
    // Divide the remaining pinned distance into one reading interval per part.
    const start=(section.offsetHeight-4*h)*(reducedMotion.matches?1:.93);
    const end=section.offsetHeight-h;
    const sequence=T.MathUtils.clamp((-sectionTop-start)/(end-start-1.3*h),0,1)*anchors.length;
    // Reserve the exit for a gradual dissolve after the final part is introduced.
    const release = T.MathUtils.smoothstep(-sectionTop, end - 1.65*h, end);
    host.style.setProperty('--callout-opacity', 1 - T.MathUtils.smoothstep(release, 0, .24));
    grid.material.uniforms.warmth.value = T.MathUtils.smoothstep(progress, .12, .38) * (1 - release);
    grid.material.uniforms.explodedTone.value = diagram;
    const active=-sectionTop<start?-1:Math.min(anchors.length-1,Math.floor(sequence));
    const phase=sequence-active;
    const strength=active<0?0:T.MathUtils.smoothstep(sequence,0,.2);
    const weights=anchors.map((_,i)=>i===active?1:1-strength);
    emphasize(weights, .96*(1-entry));
    updateEffects(active,phase,reducedMotion.matches);
    const amount = diagram;
    explode(amount);
    shadowMaterial.opacity = entry;
    feet.forEach((foot,i)=>foot.position.x=(i?1:-1)*(278+72*T.MathUtils.smoothstep(amount,0,.64)));
    const turn = T.MathUtils.smoothstep(progress,.27,.66);
    const angle = .68 + yaw + (2*Math.PI + .39 - .68)*turn;
    const elevation=T.MathUtils.clamp(.23 + pitch,-.06,1.52);
    const assembly = T.MathUtils.smoothstep(progress, .76, .88);
    const stacked = narrow.matches;
    const aspect = host.clientWidth / host.clientHeight;
    const compact = stacked && w <= 380 && h <= 680;
    const readingDistance = stacked ? Math.max(2400, (compact ? 2300 : 1950) / aspect) : Math.max(1670, 3330 / aspect);
    const diagramDistance = stacked ? Math.max(2820, 2080 / aspect) : readingDistance;
    const distance = T.MathUtils.lerp(readingDistance, diagramDistance, assembly);
    const lift = stacked ? T.MathUtils.lerp(compact ? .31 : .23, -.045, assembly) : -.045;
    camera.setViewOffset(w, h, (stacked ? 0 : w * .195 * (1 - assembly)), h * lift, w, h);
    const targetY = -8;
    camera.position.set(distance*Math.cos(elevation)*Math.sin(angle),targetY+8+distance*Math.sin(elevation),distance*Math.cos(elevation)*Math.cos(angle)-22);
    camera.lookAt(0,targetY,-22);
    camera.updateMatrixWorld();
    drawElevation(camera,entry,w,h,reducedMotion.matches ? 1 : progress);
    renderer.render(scene,camera);
    story.draw(active,phase,anchors,camera,stacked,reducedMotion.matches);
    poster.hidden=true;
  }
  function redraw(){if(!scheduled){scheduled=true;requestAnimationFrame(render)}}
  function resize(){
    const width = host.clientWidth;
    const spacing = T.MathUtils.clamp(width / 33, 24, 42);
    grid.material.uniforms.spacing.value = spacing;
    // Both the shader and the copy measure columns from the center of the sheet.
    const columns = Math.ceil(width * (narrow.matches ? .03 : .12) / spacing);
    host.style.setProperty('--story-left', (width / 2 + columns * spacing) + 'px');
    camera.aspect=width/host.clientHeight;
    camera.far = Math.max(5000, 4800 / camera.aspect + 1500);
    camera.updateProjectionMatrix();
    renderer.setSize(host.clientWidth,host.clientHeight,false);
    redraw();
  }
  host.append(renderer.domElement);
  new ResizeObserver(resize).observe(host);
  section.classList.add("interactive");
  resize();
  reducedMotion.addEventListener('change', redraw);
  addEventListener('scroll', redraw, { passive: true });
  host.addEventListener('pointerdown',e=>{
    if (picker.contains(e.target)) return;
    drag={x:e.clientX,y:e.clientY,yaw,pitch};
    host.setPointerCapture(e.pointerId);
  });
  host.addEventListener('pointermove',e=>{
    if(!drag)return;
    yaw=drag.yaw-(e.clientX-drag.x)*.007;
    pitch=T.MathUtils.clamp(drag.pitch+(e.clientY-drag.y)*.004,-.2,.9);
    redraw();
  });
  host.addEventListener('lostpointercapture',()=>drag=null);
  host.addEventListener('keydown',e=>{
    if (picker.contains(e.target)) return;
    if(e.key==='Home'){yaw=pitch=0;section.scrollIntoView({block:"start"})}
    else if(e.key==='ArrowLeft')yaw-=.1;
    else if(e.key==='ArrowRight')yaw+=.1;
    else return;
    e.preventDefault();redraw();
  });
} catch(error){console.error(error);section.classList.remove('interactive');section.classList.add('model-unavailable');host.querySelector('canvas')?.remove()}
