import * as T from './vendor/three.module.js';

export function createDiagramEffects(sides) {
  const dots = new T.PointsMaterial({
    color: 0x607573, size: 2.3, transparent: true, depthWrite: false
  });
  const waves = sides.map(({shoe}, index) => {
    const outward = index === 0 ? -1 : 1;
    const points = [];
    for (let i = 0; i < 58; i++) {
      const t = i / 57;
      const envelope = Math.sin(Math.PI * t) * (1 - .4 * t);
      points.push(new T.Vector3(outward * 2.6 * i,
        Math.sin(t * Math.PI * 7) * 14 * envelope + 8 * t, 0));
    }
    const geometry = new T.BufferGeometry().setFromPoints(points);
    const wave = new T.Points(geometry, dots);
    wave.position.set(shoe.position.x + outward * 8.5, 10, -55);
    // The solid shoe is swapped out during disassembly. Its parent follows both versions.
    shoe.parent.add(wave);
    return wave;
  });

  return function update(active,phase,reducedMotion) {
    const audio = active===1;
    dots.opacity = audio ? .8*(reducedMotion?1:1-T.MathUtils.smoothstep(phase,.88,1)) : 0;
    const drawn = reducedMotion ? 1 : T.MathUtils.smoothstep(phase,0,.4);
    for (const wave of waves) {
      wave.visible = audio;
      wave.geometry.setDrawRange(0, Math.ceil(drawn * wave.geometry.attributes.position.count));
    }
  };
}
