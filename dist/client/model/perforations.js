import * as T from './vendor/three.module.js';

// Column heights measured from the outer face in SideArm.png.
const columnCounts = [8,8,8,8,7,7,7,7,7,6,6,6,6,6,5,5,5,5,5,5,4,4,4,4,4,3];

export function perforateFoot(body, outline, sign, steel) {
  const faceX = sign * 8.5;
  const radius = .22;
  const depth = .85;
  const contour = new T.Shape(outline.map(([z,y]) => new T.Vector2(-z,y)));
  const centers = [];
  for (const [column,count] of columnCounts.entries()) {
    const z = -35.5 - column * 1.51;
    const top = 18.2 - column * .395;
    const bottom = 2.8 + column * .014;
    for (let row=0; row<count; row++) {
      const y = bottom + (top-bottom)*row/(count-1);
      const hole = new T.Path();
      hole.absarc(-z,y,radius,0,Math.PI*2,true);
      contour.holes.push(hole);
      centers.push([y,z]);
    }
  }

  // Keep the opposite cap and the entire polished bevel. Retriangulate just
  // the outside face around real openings, avoiding overlapping coplanar dots.
  const hull = body.geometry;
  const position = hull.getAttribute('position');
  const triangles = [];
  for (let i=0;i<position.count;i+=3) {
    const isOuterCap = [0,1,2].every(k => Math.abs(position.getX(i+k)-faceX)<.0001);
    if (!isOuterCap) triangles.push(i,i+1,i+2);
  }
  hull.setIndex(triangles);
  // ExtrudeGeometry emits isolated triangles. Share normals across the small
  // bevel segments so a softbox reflection flows around the shoulder.
  const normals = hull.getAttribute('normal');
  const corners = new Map();
  for (const i of triangles) {
    const key = [position.getX(i),position.getY(i),position.getZ(i)].map(v=>v.toFixed(4)).join(',');
    if (!corners.has(key)) corners.set(key,[]);
    corners.get(key).push(i);
  }
  for (const indices of corners.values()) {
    const original = indices.map(i=>new T.Vector3().fromBufferAttribute(normals,i));
    const distinct = original.filter((n,i)=>original.findIndex(m=>m.dot(n)>.999999)===i);
    indices.forEach((i,k)=>{
      const n = original[k];
      const blended = new T.Vector3();
      for (const other of distinct) if(n.dot(other)>.9) blended.add(other);
      blended.normalize();
      normals.setXYZ(i,blended.x,blended.y,blended.z);
    });
  }
  const face = new T.ShapeGeometry(contour,8);
  face.rotateY(Math.PI/2);
  if (sign<0) {
    const indices=face.index.array;
    for(let i=0;i<indices.length;i+=3) [indices[i],indices[i+1]]=[indices[i+1],indices[i]];
    face.computeVertexNormals();
  }
  face.translate(faceX,0,0);
  body.add(new T.Mesh(face,steel));

  const cavity = new T.MeshStandardMaterial({color:0x20201f,roughness:.65,metalness:.22,side:T.BackSide});
  const walls = new T.InstancedMesh(new T.CylinderGeometry(radius,radius,depth,16,1,true),cavity,centers.length);
  const backs = new T.InstancedMesh(new T.CircleGeometry(radius,16),new T.MeshBasicMaterial({color:0x121211}),centers.length);
  centers.forEach(([y,z],i)=>{
    const wall = new T.Matrix4().makeRotationZ(Math.PI/2);
    walls.setMatrixAt(i,wall.setPosition(faceX-sign*depth/2,y,z));
    const back = new T.Matrix4().makeRotationY(sign*Math.PI/2);
    backs.setMatrixAt(i,back.setPosition(faceX-sign*depth,y,z));
  });
  body.add(walls,backs);
}
