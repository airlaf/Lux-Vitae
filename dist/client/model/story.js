import {MathUtils,Vector3} from './vendor/three.module.js';

export function createStory(host) {
  const callouts=host.querySelector('.callouts');
  const labels=[...callouts.querySelectorAll('span')];
  const path=document.createElementNS('http://www.w3.org/2000/svg','path');
  callouts.querySelector('svg').append(path);
  const projection=new Vector3();
  function draw(active,phase,anchors,camera,stacked,reducedMotion) {
    callouts.hidden=active<0;
    if (callouts.hidden) return;
    labels.forEach((label,i)=>{ label.hidden=i!==active; });
    const label=labels[active];
    anchors[active].getWorldPosition(projection).project(camera);
    const x=(projection.x+1)*host.clientWidth/2;
    const y=(1-projection.y)*host.clientHeight/2;
    const half=label.offsetHeight/2;
    const mobileY=[.19,.79,.25,.85];
    const labelY=MathUtils.clamp(stacked?host.clientHeight*mobileY[active]:y,
      half+12,host.clientHeight-half-12);
    label.style.top=labelY+'px';
    const bounds=label.getBoundingClientRect();
    // Approach the nearest exterior edge, even when a part projects above
    // or below its caption in the portrait layout.
    const hostLeft=host.getBoundingClientRect().left;
    const left=bounds.left-hostLeft-8, right=bounds.right-hostLeft+8;
    const endX=MathUtils.clamp(x,left,right);
    const beside=x<left || x>right;
    const endY=beside ? labelY : MathUtils.clamp(y,labelY-half-8,labelY+half+8);
    const elbow=beside ? endX + Math.sign(x-endX)*Math.min(24,Math.abs(x-endX)) : x;
    const diagonal=Math.hypot(elbow-x,endY-y);
    const progress=reducedMotion?1:MathUtils.smoothstep(phase,0,.28);
    const length=progress*(diagonal+Math.abs(endX-elbow));
    const t=diagonal?Math.min(1,length/diagonal):1;
    let line='M '+x+' '+y+' L '+MathUtils.lerp(x,elbow,t)+' '+MathUtils.lerp(y,endY,t);
    if(length>diagonal) line+=' H '+(elbow+Math.sign(endX-elbow)*(length-diagonal));
    path.setAttribute('d',length?line:'');
    const opacity=reducedMotion||active===labels.length-1?1:1-MathUtils.smoothstep(phase,.88,1);
    path.style.opacity=String(opacity);
    label.style.opacity=String(opacity*(reducedMotion?1:MathUtils.smoothstep(phase,.28,.40)));
  }
  return {draw};
}
