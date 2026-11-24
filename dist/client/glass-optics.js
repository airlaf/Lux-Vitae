// A small moving patch samples the backdrop through the curved face of each flute.
export function createGlassOptics(surface, layer) {
  const studio = surface.querySelector('.studio');
  const patch = document.createElement('canvas');
  patch.className = 'glass-optics';
  const ctx = patch.getContext('2d');
  if (!ctx) return () => {};
  layer.before(patch);
  let footer, width, height, pitch, radius;

  function resize() {
    width = surface.clientWidth;
    height = surface.clientHeight;
    pitch = Math.min(36, Math.max(21, innerWidth * .0225));
    radius = Math.min(215, Math.max(125, innerWidth * .15));
    patch.width = Math.ceil(radius * 2);
    patch.height = Math.ceil(radius * 1.55);
    if (!studio && width && height) {
      footer = document.createElement('canvas');
      footer.width = width;
      footer.height = height;
      const bg = footer.getContext('2d');
      const wash = bg.createLinearGradient(0, 0, 0, height);
      wash.addColorStop(0, '#fff');
      wash.addColorStop(1, '#f2e9dc');
      bg.fillStyle = wash;
      bg.fillRect(0, 0, width, height);
      bg.save();
      bg.translate(width * .72, height * 1.1);
      bg.scale(width * .66, height);
      const light = bg.createRadialGradient(0, 0, 0, 0, 0, 1);
      light.addColorStop(0, '#e2d2b8');
      light.addColorStop(1, 'rgba(226,210,184,0)');
      bg.fillStyle = light;
      bg.fillRect(-2, -2, 4, 4);
      bg.restore();
      const rib = bg.createLinearGradient(0, 0, pitch, 0);
      for (const [stop,color] of [[0,'#94744826'],[.21,'#be9f7417'],[.48,'transparent'],[.9,'#fff9'],[.97,'#fff3'],[1,'#94744821']]) rib.addColorStop(stop,color);
      bg.fillStyle = rib;
      for (let left = 0; left < width; left += pitch) {
        bg.save(); bg.translate(left, 0); bg.fillRect(0, 0, pitch, height); bg.restore();
      }
    }
  }

  return function draw(x, y, strength) {
    if (width !== surface.clientWidth || height !== surface.clientHeight) resize();
    patch.style.opacity = strength;
    const source = studio || footer;
    if (!strength || !source?.width || !width || !height) return;
    const left = Math.round(x - patch.width / 2);
    const top = Math.round(y - patch.height / 2);
    patch.style.transform = 'translate(' + left + 'px,' + top + 'px)';
    ctx.clearRect(0, 0, patch.width, patch.height);
    const sx = source.width / width, sy = source.height / height;
    for (let u = 0; u < patch.width; u += 2) {
      const at = left + u;
      const angle = 2 * Math.PI * at / pitch;
      const normal = Math.sin(angle);
      const incidence = (u - radius) / radius;
      const bend = pitch * (.39 * normal + .12 * incidence);
      ctx.drawImage(source, (at + bend) * sx, (top + normal * 2) * sy, 2 * sx, patch.height * sy, u, 0, 2, patch.height);
      const highlight = Math.pow(Math.max(0, Math.cos(angle - .85 - incidence * 1.5)), 11);
      ctx.fillStyle = 'rgba(255,255,255,' + (.57 * highlight) + ')';
      ctx.fillRect(u, 0, 2, patch.height);
      ctx.fillStyle = 'rgba(68,65,61,' + (.14 * Math.pow(Math.max(0, -normal), 4)) + ')';
      ctx.fillRect(u, 0, 2, patch.height);
    }
  };
}
