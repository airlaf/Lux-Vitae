import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {MeshoptDecoder} from './vendor/meshopt_decoder.mjs';

export async function rigAssembly(sides,dock,display,steel,graphite) {
  const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const asset=await loader.loadAsync(new URL('./assembly.glb',import.meta.url).href);
  const hardware=steel.clone();
  hardware.roughness=.25;
  const finish={Housing:steel.clone(),Hardware:hardware,'Port interior':graphite};
  // All exposed metal shares one finish while retaining its own roughness.
  hardware.color = steel.color;
  finish.Housing.color = steel.color;
  const parts=new Map();
  for(const node of [...asset.scene.children]){
    // Keep the importer's local quantization transforms intact.
    node.traverse(child=>{if(child.isMesh)child.material=finish[child.material.name]});
    const part=new T.Group();
    part.name=node.userData.part;
    part.scale.setScalar(1000);
    part.add(node);
    parts.set(part.name,part);
  }
  const mount=(parent,name)=>{
    const template=parts.get(name);
    const part=template.parent ? template.clone() : template;
    parent.add(part);
    return part;
  };
  const front=mount(dock,'DockFront'),rear=mount(dock,'DockRear');
  const floor=mount(dock,'Floor'),ports=new T.Group();
  for(let i=0;i<9;i++)mount(ports,'PortBank'+i);
  dock.add(ports);
  const dockSkin=dock.children[0];
  const rails=sides.map(({g,upright,shoe,saddle},i)=>{
    const side=i?'R':'L',sign=i?1:-1;
    const leg=new T.Group(),foot=new T.Group();
    g.add(leg,foot);
    leg.add(upright);
    foot.add(shoe);
    foot.userData.callout = 1;
    const vent=new T.Group();
    vent.position.x=shoe.position.x;
    vent.add(...[...shoe.children]);
    foot.add(vent);
    const socket=mount(leg,'UprightSocket');
    const openShoe=mount(foot,'Shoe'+side);
    socket.position.x=openShoe.position.x=sign*278;
    return {g,sign,leg,foot,upright,shoe,saddle,socket,openShoe,
      insert:mount(g,'Insert'+side),joint:mount(g,'Joint'+side),
      sole:mount(g,'Sole'+side),bracket:mount(g,'Bracket'+side)};
  });

  // The STEP establishes connections. Offsets here are presentation distances
  // chosen to keep the mating faces and the small hardware visible on scroll.
  function positionParts(amount, table) {
    const spread=T.MathUtils.smoothstep(amount,0,.64);
    const disengage=T.MathUtils.smoothstep(amount,.09,.88);
    const open=T.MathUtils.smoothstep(amount,.23,1);
    // Lay the pane flat in the center of the opening parts layout.
    display.rotation.x = (-Math.PI / 2 - display.children[0].rotation.x) * table;
    display.position.set(0,30*spread,108*spread + 118*table);
    for(const r of rails){
      r.g.position.set(r.sign*(72*spread + 210*table), 0, 180*table);
      r.leg.rotation.order = 'YXZ';
      r.leg.rotation.x = (-Math.PI / 2 + Math.atan(40 / 369)) * table;
      r.leg.rotation.y = r.sign * .22 * table;
      r.leg.position.set(r.sign*24*disengage,78*disengage,19*disengage);
      r.foot.position.set(-r.sign*100*table,12*open,125*table-9*disengage);
      r.saddle.visible=disengage===0;
      r.upright.visible=r.shoe.visible=disengage===0;
      r.socket.visible=r.openShoe.visible=disengage>0;
      r.joint.visible=r.insert.visible=r.sole.visible=disengage>0;
      r.bracket.visible=spread>0;
      r.insert.position.set(r.sign*15*disengage,50*disengage,12*disengage);
      r.joint.position.set(r.sign*7*disengage,28*disengage,4*disengage);
      r.sole.position.set(0,0,-9*disengage);
      r.bracket.position.set(-r.sign*34*spread,6*open,-5*disengage);
    }
    dockSkin.visible=open===0;
    front.visible=rear.visible=floor.visible=ports.visible=open>0;
    front.position.set(-230*table,46*open,22*open+245*table);
    rear.position.set(225*table,90*open,-45*open-250*table);
    floor.position.set(-245*table,0,-230*table);
    ports.position.set(240*table,13*open,10*open+245*table);
  }

  // Measure each visible part once in the opening pose, before the model is
  // added to the scene. All bottom faces then share one tabletop elevation.
  positionParts(1, 1);
  const flatParts = [display, front, rear, floor, ports,
    ...rails.flatMap(r => [r.leg, r.foot, r.insert, r.joint, r.sole, r.bracket])];
  function visibleBounds(part) {
    const bounds = new T.Box3();
    const vertex = new T.Vector3();
    part.updateWorldMatrix(true, true);
    part.traverseVisible(mesh => {
      if (!mesh.isMesh) return;
      const points = mesh.geometry.attributes.position;
      for (let i = 0; i < points.count; i++) {
        bounds.expandByPoint(vertex.fromBufferAttribute(points, i).applyMatrix4(mesh.matrixWorld));
      }
    });
    return bounds;
  }
  const tablePoses = flatParts.map(part => {
    const bounds = visibleBounds(part);
    const size = bounds.getSize(new T.Vector3());
    const center = bounds.getCenter(new T.Vector3());
    // Rest small hardware and enclosure pieces on their broadest face.
    let tiltX = 0, tiltZ = 0;
    if (part !== display && !rails.some(r => r.leg === part)) {
      if (size.z < size.y && size.z <= size.x) tiltX = Math.PI / 2;
      else if (size.x < size.y) tiltZ = Math.PI / 2;
    }
    part.rotation.x += tiltX;
    part.rotation.z += tiltZ;
    const resting = visibleBounds(part);
    const offset = center.sub(resting.getCenter(new T.Vector3()));
    offset.y = -resting.min.y;
    part.rotation.x -= tiltX;
    part.rotation.z -= tiltZ;
    return {part, tiltX, tiltZ, offset};
  });
  return (amount, table) => {
    positionParts(amount, table);
    for (const {part, tiltX, tiltZ, offset} of tablePoses) {
      if (tiltX) part.rotation.x = tiltX * table;
      if (tiltZ) part.rotation.z = tiltZ * table;
      part.position.addScaledVector(offset, table);
    }
  };
}
