import { LiquidGlass } from './vendor/liquidglass-1.0.3.js';

async function applyGlass(link) {
  try {
    await LiquidGlass.init({
      root: link.parentElement,
      glassElements: [link],
      defaults: {
        button: true,
        refraction: 0.86,
        blurAmount: 0.06,
        chromAberration: 0.025,
        edgeHighlight: 0.29,
        specular: 0.36,
        tintStrength: 0.02,
        zRadius: 15,
        shadowOpacity: 0.18,
        shadowSpread: 8,
        shadowOffsetY: 2
      }
    });
  } catch (error) {
    // The CSS pill remains usable on devices without WebGL.
    console.warn('LiquidGlass could not initialize the waitlist link.', error);
  }
}

if (document.documentElement.classList.contains('intro')) {
  await new Promise(resolve => window.addEventListener('hero-ready', resolve, { once: true }));
}
const product = document.querySelector('.product');
if (product) await product.decode().catch(() => {});
await Promise.all(Array.from(document.querySelectorAll('a.pill'), applyGlass));
