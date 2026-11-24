import * as T from './vendor/three.module.js';
import {rigAssembly} from './assembly.js?v=callout3';
import {perforateFoot} from './perforations.js';
import {addSteelVisibility} from './steel.js';

// Dimensions in millimetres. The 540 × 304 active area anchors the reconstruction.
export async function createComputer() {
  const root = new T.Group();
  const metal = new T.MeshStandardMaterial({color:0xdcd3c1,metalness:1,roughness:.064});
  
  const graphite = new T.MeshStandardMaterial({color:0x242625,metalness:.52,roughness:.41});
  const profiles = [];
  const groups = {};
  function part(name) {const g=new T.Group();g.name=name;root.add(g);groups[name]=g;return g}
  function mesh(parent,geometry,mat,x=0,y=0,z=0) {
    const m=new T.Mesh(geometry,mat);m.position.set(x,y,z);parent.add(m);return m;
  }
  // Extrude the side elevation across the chassis. Profile coordinates are depth and height.
  function profile(parent,outline,width,x,finish,bevel=1) {
    const shape=new T.Shape();outline.forEach(([z,y],i)=>shape[i?'lineTo':'moveTo'](-z,y));shape.closePath();
    const geo=new T.ExtrudeGeometry(shape,{depth:width-2*bevel,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:4});
    geo.translate(0,0,-(width-2*bevel)/2);geo.rotateY(Math.PI/2);
    const body=mesh(parent,geo,finish,x);
    profiles.push({mesh:body,outline,width});
    return body;
  }
  // Side elevation of the joint. Its parting line follows the rake of the upright.
  const backAt = y => -4 - (y - 11) * 40 / 369;
  const heel = new T.EllipseCurve(3,10,9,9,-Math.PI/2,.114);
  const upright = [
    ...heel.getPoints(12).map(p => [p.x,p.y]),
    [-30,380],[-44,380],[backAt(1),1]
  ];
  const uprightBevel = 1.3, footBevel = 1.2;
  // Extrusion bevels grow outward in the profile plane; allow for both lips.
  const footAt = y => backAt(y) - (uprightBevel + footBevel + .55) * Math.hypot(1,40/369);
  // The foot has a short rounded shoulder at the seam and one continuous
  // crown running into the tapered tip. Coordinates are (depth, height).
  const crown=new T.Path();
  crown.moveTo(footAt(17.8),17.8);
  crown.bezierCurveTo(footAt(21.8),21.8,-11.6,24.7,-15.2,24.7);
  crown.bezierCurveTo(-26,24.7,-74,11.6,-89.8,6.5);
  crown.bezierCurveTo(-93.6,5.25,-95.8,3.7,-96,2);
  const foot = [[footAt(1.3),1.3],...crown.getPoints(9).map(p=>[p.x,p.y])];
  const sides=[-1,1].map(sign=>{
    const g=part(sign<0?'Left upright':'Right upright');
    const rail=profile(g,upright,16,sign*278,metal,uprightBevel);
    const shoe=profile(g,foot,17,sign*278,metal,footBevel);
    perforateFoot(shoe,foot,sign,metal);
    // An inset saddle fills the joint below the crown. Its curved upper lip
    // catches the narrow highlight visible behind the foot in the reference.
    const saddle=new T.Shape();
    saddle.moveTo(3.2,2.4);
    saddle.lineTo(5.1,19.8);
    saddle.quadraticCurveTo(6.3,23.5,10.1,23.5);
    saddle.lineTo(13,22);
    saddle.lineTo(12,2.4);
    saddle.closePath();
    const inset=new T.ExtrudeGeometry(saddle,{depth:12.2,bevelSize:.3,bevelThickness:.3,bevelSegments:3});
    inset.translate(0,0,-6.1);
    inset.rotateY(Math.PI/2);
    const heelSaddle=mesh(g,inset,metal,sign*278);
    return {g,upright:rail,shoe,saddle:heelSaddle};
  });
  const base=part('Compute enclosure');
  profile(base,[[-22,3],[-21,12],[-30,22],[-51,25],[-76,17],[-95,6],[-95,3]],539,0,metal,1.5);
  const display=part('Display laminate');
  // The closed volume gives the dielectric a true entry surface and polished edges.
  const glass = new T.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: .045, transmission: .985,
    thickness: 3.4, ior: 1.51, attenuationColor: 0xdde5dc,
    attenuationDistance: 17, envMapIntensity: 1
  });
  const outline = new T.Shape();
  outline.moveTo(-270,-153);
  outline.lineTo(270,-153);
  outline.lineTo(270,153);
  outline.lineTo(-270,153);
  outline.closePath();
  const laminate = new T.ExtrudeGeometry(outline, {
    depth: 2.7, bevelEnabled: true, bevelThickness: .35,
    bevelSize: .32, bevelSegments: 4
  });
  laminate.translate(0,0,-1.35);
  const pane = mesh(display,laminate,glass,0,226,-20.5);
  pane.rotation.x = -.112;
  const updateVisibility=addSteelVisibility(metal,profiles,root);
  const pose=await rigAssembly(sides,base,display,metal,graphite);
  function explode(amount, table = 0){pose(amount, table);updateVisibility()}
  explode(0);
  // Anchors follow the same moving parents as the visible assembly.
  function anchor(parent,x,y,z){
    const point=new T.Object3D();
    point.position.set(x,y,z);
    parent.add(point);
    return point;
  }
  const anchors=[
    anchor(sides[0].upright,0,246,-21),
    anchor(sides[0].shoe,-8.5,10,-55),
    anchor(pane,180,10,1.7),
    anchor(base.getObjectByName('DockFront'),.16,.012,-.034)
  ];
  // Each callout has its own wash uniform, including where meshes share a finish.
  display.userData.callout = 2;
  base.userData.callout = 3;
  const washes = anchors.map(() => ({value: 0}));
  const variants = anchors.map(() => new Map());
  function groupMaterials(node, inherited) {
    const group = node.userData.callout ?? inherited;
    if (node.isMesh) {
      const original = node.material;
      if (!variants[group].has(original)) {
        const material = original.clone();
        material.color = original.color;
        material.customProgramCacheKey = () => original.customProgramCacheKey() + '-callout-wash';
        material.onBeforeCompile = (shader, renderer) => {
          original.onBeforeCompile(shader, renderer);
          shader.uniforms.calloutWash = washes[group];
          shader.fragmentShader = 'uniform float calloutWash;\n' + shader.fragmentShader.replace(
            '#include <colorspace_fragment>',
            '#include <colorspace_fragment>\ngl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), calloutWash);'
          );
        };
        variants[group].set(original, material);
      }
      node.material = variants[group].get(original);
    }
    node.children.forEach(child => groupMaterials(child, group));
  }
  groupMaterials(root, 0);
  function emphasize(weights, draftingWash = 0) {
    washes.forEach((wash, i) => { wash.value = Math.max(draftingWash, .65 * (1 - weights[i])); });
  }
  const finishes = {steel: 0xdcd3c1, bronze: 0xb4a18a};
  function setFinish(name) {
    if (Object.hasOwn(finishes, name)) metal.color.setHex(finishes[name]);
  }
  return {root,explode,anchors,setFinish,emphasize,sides,pane,profiles};
}
