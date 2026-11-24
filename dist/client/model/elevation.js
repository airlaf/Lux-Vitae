// Drawing and dimensions use the same assembled meshes and camera as the finish.
import {BufferGeometry, EdgesGeometry, LineBasicMaterial, LineSegments, MathUtils, Vector3} from './vendor/three.module.js';

export function createElevation(host, profiles, root, sides) {
  const sheet = document.createElement('canvas');
  sheet.setAttribute('aria-hidden', 'true');
  sheet.style.pointerEvents = 'none';
  sheet.style.zIndex = '1';
  host.prepend(sheet);
  const ctx = sheet.getContext('2d');
  const point = new Vector3();
  // Depth-tested ink on the actual parts keeps nearer faces from painting
  // over visible seams (or revealing edges behind the enclosure).
  const ink = new LineBasicMaterial({color:0x737771, transparent:true, depthWrite:false, toneMapped:false});
  ink.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>',
      '#include <project_vertex>\ngl_Position.z -= .000005 * gl_Position.w;');
  };
  const lines = [];
  function attach(mesh, geometry) {
    const edges = new LineSegments(geometry,ink);
    edges.renderOrder = 3;
    mesh.add(edges);
    lines.push(edges);
  }
  // Creases come from the final bevelled triangles, including the saddle,
  // vent face and glass laminate. Keep the circular bores as face boundaries.
  const solids = [];
  root.traverseVisible(mesh => {
    if (mesh.isMesh && !mesh.isInstancedMesh) solids.push(mesh);
  });
  for (const mesh of solids) attach(mesh,new EdgesGeometry(mesh.geometry,18));

  // The boundary of the camera-facing triangles is the visible silhouette,
  // including rounded joints that have no sharp crease. Rebuild only on orbit.
  const silhouettes = solids.filter(mesh => mesh.geometry.type==='ExtrudeGeometry').map(mesh => {
    attach(mesh,new BufferGeometry());
    return {mesh,edge:lines.at(-1)};
  });
  const lastEye = new Vector3(Infinity,Infinity,Infinity);
  const eye = new Vector3(), v0 = new Vector3(), v1 = new Vector3(), v2 = new Vector3();
  function updateSilhouettes(camera) {
    if (lastEye.equals(camera.position)) return;
    lastEye.copy(camera.position);
    for (const {mesh,edge} of silhouettes) {
      const {index,attributes:{position}} = mesh.geometry;
      mesh.worldToLocal(eye.copy(camera.position));
      const front = [];
      for (let i=0; i<(index?.count ?? position.count); i+=3) {
        const a=index ? index.getX(i) : i;
        const b=index ? index.getX(i+1) : i+1;
        const c=index ? index.getX(i+2) : i+2;
        v0.fromBufferAttribute(position,a);
        v1.fromBufferAttribute(position,b).sub(v0);
        v2.fromBufferAttribute(position,c).sub(v0);
        const normal = v1.cross(v2);
        const toEye = v0.subVectors(eye,v0);
        if (normal.dot(toEye)>0) front.push(a,b,c);
      }
      const surface = new BufferGeometry();
      surface.setAttribute('position',position);
      surface.setIndex(front);
      edge.geometry.dispose();
      edge.geometry = new EdgesGeometry(surface,180);
      surface.dispose();
    }
  }

  function anchor(mesh,x,y,z) {
    const vertices = mesh.geometry.attributes.position;
    const target = new Vector3(x,y,z), nearest = new Vector3();
    let minimum = Infinity;
    for (let i=0;i<vertices.count;i++) {
      point.fromBufferAttribute(vertices,i);
      const distance = point.distanceToSquared(target);
      if (distance<minimum) { minimum=distance; nearest.copy(point); }
    }
    return {mesh,vertex:nearest};
  }
  const base = profiles.find(part => part.mesh.position.x===0).mesh;
  const rail = sides[0].upright, foot = sides[1].shoe;
  const dimensions = [
    [anchor(base,-270,3,-22),anchor(base,270,3,-22),1,'30 in'],
    [anchor(foot,8.5,1,-4),anchor(foot,8.5,2,-96),1,'8.8 in'],
    [anchor(rail,-8,1,-3),anchor(rail,-8,380,-44),-1,'18.8 in']
  ];

  return function draw(camera, finish, width, height, progress) {
    ink.opacity = 1-finish;
    for (const edge of lines) edge.visible = finish < 1;
    sheet.hidden = finish >= 1;
    if (sheet.hidden) return;
    updateSilhouettes(camera);
    const dpr = Math.min(devicePixelRatio,2);
    if (sheet.width !== Math.round(width*dpr) || sheet.height !== Math.round(height*dpr)) {
      sheet.width = Math.round(width*dpr);
      sheet.height = Math.round(height*dpr);
    }
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,width,height);
    sheet.style.opacity = String(1-finish);
    function project({mesh,vertex}) {
      point.copy(vertex).applyMatrix4(mesh.matrixWorld).project(camera);
      return [(point.x+1)*width/2,(1-point.y)*height/2,point.z];
    }
    function line(a,b,t=1) {
      ctx.beginPath();
      ctx.moveTo(a[0],a[1]);
      ctx.lineTo(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t);
      ctx.stroke();
    }
    const t = MathUtils.smoothstep(progress,0,.095);
    if (t===0) return;
    const extension = MathUtils.smoothstep(t,0,.36);
    const rule = MathUtils.smoothstep(t,.22,.86);
    const caption = MathUtils.smoothstep(t,.76,1);
    for (const [start,end,side,label] of dimensions) {
      const a=project(start), b=project(end);
      const dx=b[0]-a[0], dy=b[1]-a[1];
      const length=Math.hypot(dx,dy);
      if (length<1) continue;
      const nx=-side*dy/length, ny=side*dx/length;
      const offset=Math.min(26,width*.034);
      const c=[a[0]+nx*offset,a[1]+ny*offset];
      const d=[b[0]+nx*offset,b[1]+ny*offset];
      ctx.lineWidth=.75;
      ctx.strokeStyle='#b9bab6';
      ctx.setLineDash([2,4]);
      line(a,c,extension); line(b,d,extension);
      ctx.setLineDash([]);
      ctx.strokeStyle='#a3a59f';
      line(c,d,rule);
      line([c[0]-2.5,c[1]+3],[c[0]+2.5,c[1]-3],rule);
      line([d[0]-2.5,d[1]+3],[d[0]+2.5,d[1]-3],caption);
      if (!caption) continue;
      ctx.globalAlpha=caption;
      ctx.textAlign='center';
      ctx.font='12px ui-monospace, monospace';
      ctx.fillStyle='#71746e';
      const half = ctx.measureText(label).width/2+5;
      const x = Math.max(half,Math.min(width-half,(c[0]+d[0])/2+nx*(half+4)));
      ctx.fillText(label,x,(c[1]+d[1])/2+ny*12+4);
      ctx.globalAlpha=1;
    }
  };
}
