import { Mesh, PlaneGeometry, ShaderMaterial, Vector2 } from './vendor/three.module.js';

// Draw a screen-aligned sheet behind the model, so opaque hardware covers the lines.
export function createDraftingGrid() {
  const material = new ShaderMaterial({
    uniforms: {
      size: { value: new Vector2() },
      spacing: { value: 24 },
      reveal: { value: 0 },
      warmth: { value: 0 },
      explodedTone: { value: 0 }
    },
    depthTest: false,
    depthWrite: false,
    vertexShader: `
      varying vec2 sheet;
      void main() {
        sheet = uv;
        gl_Position = vec4(position.xy, 0.9999, 1.0);
      }`,
    fragmentShader: `
      varying vec2 sheet;
      uniform vec2 size;
      uniform float spacing;
      uniform float reveal;
      uniform float warmth;
      uniform float explodedTone;

      float rule(float p, float spacing) {
        float distanceToLine = abs(mod(p + spacing * 0.5, spacing) - spacing * 0.5);
        return 1.0 - smoothstep(0.15, 0.85, distanceToLine);
      }

      void main() {
        vec2 px = (sheet - 0.5) * size;
        vec2 edge = smoothstep(vec2(0.0), vec2(0.09), min(sheet, 1.0 - sheet));
        float reach = reveal * 1.38;
        // Horizontal rules lead, then verticals trace down the sheet.
        float horizontal = smoothstep(0.0, 0.08, reach - sheet.x - 0.13 * (1.0 - sheet.y));
        float vertical = smoothstep(0.0, 0.08, reach - (1.0 - sheet.y) - 0.18 * sheet.x - 0.06);
        float rows = rule(px.y, spacing) * 0.035 + rule(px.y, spacing * 5.0) * 0.027;
        float cols = rule(px.x, spacing) * 0.035 + rule(px.x, spacing * 5.0) * 0.027;
        float ink = max(rows * horizontal, cols * vertical) * edge.x * edge.y;
        // Display-space colors keep the drafting sheet consistent with the CSS palette.
        float light = smoothstep(0.0, 1.0, sheet.y * 0.65 + sheet.x * 0.35);
        vec3 sand = mix(vec3(207.,178.,149.), vec3(235.,219.,202.), light) / 255.;
        vec3 umber = mix(vec3(104.,80.,65.), vec3(151.,121.,100.), light) / 255.;
        vec3 paper = mix(vec3(1.), mix(sand, umber, explodedTone), warmth);
        gl_FragColor = vec4(paper * (1.0 - ink), 1.0);
      }`
  });
  const sheet = new Mesh(new PlaneGeometry(2, 2), material);
  sheet.frustumCulled = false;
  sheet.renderOrder = -100;
  return sheet;
}
