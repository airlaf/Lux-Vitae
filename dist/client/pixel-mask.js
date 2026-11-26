export function createPixelMask(height) {
  const mask = document.createElement('canvas');
  mask.width = 512;
  mask.height = height;
  const brush = mask.getContext('2d');
  const pixels = brush.createImageData(mask.width,mask.height);
  const thresholds = new Float32Array(mask.width*mask.height);

  // A stable grain field lets the same flecks return when scrolling back.
  let seed = 4751;
  const cornerRadius = Math.hypot(mask.width / 2, mask.height / 2);
  for (let y = 0; y < mask.height; y++) {
    for (let x = 0; x < mask.width; x++) {
      const radius = Math.hypot(x + .5 - mask.width / 2, y + .5 - mask.height / 2) / cornerRadius;
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const grain = .14 * (seed / 4294967296 - .5);
      const clusters = .025 * Math.sin(.08 * x + Math.sin(.06 * y)) * Math.cos(.09 * y);
      thresholds[y * mask.width + x] = Math.max(0, .04 + .80 * radius + clusters + grain);
    }
  }

  return function maskAt(progress) {
    for (let i=0;i<thresholds.length;i++) {
      pixels.data[i*4+3]=255*Math.min(1,Math.max(0,(progress-thresholds[i])/.065));
    }
    brush.putImageData(pixels,0,0);
    return mask;
  };
}
