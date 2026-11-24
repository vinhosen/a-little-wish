/**
 * A Little Wish — Virtual Loy Krathong Community Entrypoint
 */

import { SoundEngine } from './audio.js';
import { CreatorController } from './creatorController.js';
import { KrathongRenderer } from './krathongRenderer.js';
import { preloadImageMap } from './krathongView.js';
import { RiverCanvas } from './riverCanvas.js';
import { SceneManager } from './scenes.js';
import { CommunityBackend } from './services/communityBackend.js';
import { store } from './state.js';

async function initApp() {
  const canvas = document.getElementById('river-canvas');
  const moonWrap = document.getElementById('atmo-moon-wrap');

  // 1. Preload all 26 painted assets cleanly
  const images = await preloadImageMap();

  // 2. Initialize Unified Modular Renderer, Web Audio & Community Backend
  const renderer = new KrathongRenderer(images);
  const sound = new SoundEngine();
  const backend = new CommunityBackend();
  const mode = await backend.init();
  store.update({ backendMode: mode });

  // 3. Initialize Interactive Community River Canvas (with tap hit-testing -> Profile Popup)
  let sceneManager = null;
  const riverCanvas = new RiverCanvas(canvas, images, renderer, {
    onWaterTap: () => {
      sound.playWaterRipple();
    },
    onKrathongTap: (record) => {
      if (sceneManager) {
        sceneManager.openProfilePopup(record);
      }
    },
  });
  riverCanvas.start();

  // 4. Initialize Krathong Creator + 10-Collection Controller
  let draftSaveTimer = null;
  const creator = new CreatorController({
    renderer,
    sound,
    onDraftChanged: () => {
      // Debounced draft save when player already has an active session
      if (!store.current.session) return;
      if (draftSaveTimer) clearTimeout(draftSaveTimer);
      draftSaveTimer = setTimeout(async () => {
        try {
          const saved = await backend.saveKrathong({
            krathongId: store.current.editingKrathongId,
            designConfig: store.current.designConfig,
            wishMessage: store.current.wishText,
            releaseStatus: 'draft',
          });
          store.update({ editingKrathongId: saved.krathongId });
        } catch {
          // ignore silent background draft failure
        }
      }, 900);
    },
  });

  // 5. Mount 6-Scene Manager
  sceneManager = new SceneManager({
    riverCanvas,
    renderer,
    creator,
    backend,
    sound,
    images,
  });

  // 6. Subtle moonlight pointer parallax on desktop (disabled under reduced-motion)
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
