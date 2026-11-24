/**
 * A Little Wish — Application Entrypoint
 * Bootstraps preloaded image assets, Web Audio ambience, Canvas 2D river,
 * subtle pointer parallax, and the 6-scene interactive experience.
 */

import { KRATHONGS } from './config.js';
import { SoundEngine } from './audio.js';
import { preloadImageMap } from './krathongView.js';
import { RiverCanvas } from './riverCanvas.js';
import { SceneManager } from './scenes.js';

async function initApp() {
  const canvas = document.getElementById('river-canvas');
  const moonWrap = document.getElementById('atmo-moon-wrap');

  // 1. Preload all real visual assets cleanly
  const images = await preloadImageMap(KRATHONGS);

  // 2. Initialize Web Audio engine
  const sound = new SoundEngine();

  // 3. Start interactive Canvas 2D moonlit river
  const riverCanvas = new RiverCanvas(canvas, images, {
    onWaterTap: () => {
      sound.playWaterRipple();
    },
  });
  riverCanvas.start();

  // 4. Mount 6-scene controller
  new SceneManager({ riverCanvas, sound, images });

  // 5. Subtle moonlight pointer parallax on desktop (disabled under reduced-motion)
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reducedMotion && moonWrap && window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener(
      'pointermove',
      (e) => {
        const nx = (e.clientX / window.innerWidth - 0.5) * 14;
        const ny = (e.clientY / window.innerHeight - 0.5) * 10;
        moonWrap.style.marginLeft = `${nx.toFixed(1)}px`;
        moonWrap.style.marginTop = `${ny.toFixed(1)}px`;
      },
      { passive: true }
    );
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
