import * as T from './vendor/three.module.js';

// Radiances are linear. The camera sees the white sweep while the steel
// reflects the studio around it, including the unlit space between the cards.
export function lightStudio(renderer) {
  const studio = new T.Scene();
  studio.background = new T.Color(.14,.142,.145);
  function panel(position, width, height, center, edge, roll = 0) {
    const material = new T.ShaderMaterial({
      side: T.DoubleSide,
      uniforms: { center: {value: center}, edge: {value: edge} },
      vertexShader: `
        varying vec2 panelUV;
        void main() {
          panelUV = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
        }`,
      fragmentShader: `
        uniform float center, edge;
        varying vec2 panelUV;
        void main() {
          vec2 offset = (panelUV - .5) * 2.;
          float falloff = dot(offset * vec2(.45, .85), offset);
          float radiance = mix(center, edge, smoothstep(0., 1., falloff));
          gl_FragColor = vec4(vec3(radiance), 1.);
        }`
    });
    const card = new T.Mesh(new T.PlaneGeometry(width,height),material);
    card.position.fromArray(position);
    card.lookAt(0,0,0);
    card.rotateZ(roll);
    studio.add(card);
  }
  // Front scrim and low flag control the gradient on the tall flat faces.
  panel([-2,1.25,5],9,4.1,1.42,.43,-.12);
  panel([-1,-1.45,4.8],11,1.2,.025,.078,-.12);
  // Side strip boxes give the narrow returns a clean opposing highlight.
  panel([5,1,-2],2.4,9,1.72,.54,.1);
  panel([-5,1,-2],2.7,9,1.52,.62,-.14);
  panel([4,-.3,3],1.3,8,.025,.055);
  // Ceiling bank above the machined housing, with black cutter at its lip.
  panel([0,5,1],15,4.4,1.6,.78);
  panel([0,4,-2.7],15,1.8,.033,.075);
  panel([0,-4,-3],13,5,.72,.32);
  panel([0,1,-5],12,3.2,.91,.53);
  panel([-2.6,3.1,-4.6],10,2.2,1.18,.24,-.09);
  const generator = new T.PMREMGenerator(renderer);
  const target = generator.fromScene(studio,0,.1,40);
  generator.dispose();
  studio.children.forEach(card=>{card.geometry.dispose();card.material.dispose()});
  return target;
}
