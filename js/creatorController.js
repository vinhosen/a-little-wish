/**
 * A Little Wish — Modular Krathong Creator & System Collection Controller
 * Provides real-time live Canvas preview, independent diameter/height proportions,
 * multi-layer botanical flowers (species, color, count, size, placement),
 * base materials, candles, Thai ornaments, and 10 System Collection browsing/remixing.
 */

import {
  BASE_TINT_SWATCHES,
  CANDLE_CATALOG,
  FLOWER_CATALOG,
  FLOWER_COLOR_SWATCHES,
  FLOWER_LAYOUTS,
  KRATHONG_BASES,
} from './config.js';
import { sanitizeDesignConfig } from './services/safety.js';
import { store } from './state.js';
import { SYSTEM_KRATHONGS } from './systemCollection.js';

export class CreatorController {
  constructor({ renderer, sound, onDraftChanged }) {
    this.renderer = renderer;
    this.sound = sound;
    this.onDraftChanged = onDraftChanged;

    this.activeStudioTab = 'base'; // 'base' | 'flowers' | 'candle'
    this.activeFlowerLayerIdx = 0; // 0 = outer/primary, 1 = inner/accent
    this._previewRaf = null;
    this._previewStart = performance.now();

    this._cacheDom();
    this._buildControls();
    this._bindEvents();
    this.syncFromState();
  }

  _cacheDom() {
    this.previewCanvas = document.getElementById('creator-preview-canvas');
    this.modeTabCreator = document.getElementById('tab-mode-creator');
    this.modeTabCollection = document.getElementById('tab-mode-collection');
    this.creatorWorkspace = document.getElementById('creator-workspace');
    this.collectionWorkspace = document.getElementById('collection-workspace');

    // Creator Sub-tabs
    this.subTabBtns = Array.from(document.querySelectorAll('[data-creator-tab]'));
    this.subPanels = Array.from(document.querySelectorAll('[data-creator-panel]'));

    // Base controls
    this.baseGrid = document.getElementById('creator-base-grid');
    this.baseTintRow = document.getElementById('creator-base-tint');
    this.sliderDiameter = document.getElementById('slider-diameter');
    this.valDiameter = document.getElementById('val-diameter');
    this.sliderHeight = document.getElementById('slider-height');
    this.valHeight = document.getElementById('val-height');

    // Flower controls
    this.flowerLayerBtns = Array.from(document.querySelectorAll('[data-flower-layer]'));
    this.btnToggleLayer2 = document.getElementById('btn-toggle-layer2');
    this.flowerSpeciesGrid = document.getElementById('creator-flower-species');
    this.flowerColorRow = document.getElementById('creator-flower-colors');
    this.flowerLayoutRow = document.getElementById('creator-flower-layouts');
    this.sliderFlowerCount = document.getElementById('slider-flower-count');
    this.valFlowerCount = document.getElementById('val-flower-count');
    this.sliderFlowerSize = document.getElementById('slider-flower-size');
    this.valFlowerSize = document.getElementById('val-flower-size');
    this.sliderFlowerRadius = document.getElementById('slider-flower-radius');
    this.valFlowerRadius = document.getElementById('val-flower-radius');

    // Candle & Ornaments controls
    this.candleGrid = document.getElementById('creator-candle-grid');
    this.baisiBtns = Array.from(document.querySelectorAll('[data-baisi-count]'));
    this.chkIncense = document.getElementById('chk-incense');
    this.chkPearl = document.getElementById('chk-pearl');
    this.chkStardust = document.getElementById('chk-stardust');

    // System Collection controls (10 curated designs SYS-KR-001..010)
    this.colBadge = document.getElementById('collection-badge-id');
    this.colTitle = document.getElementById('collection-title');
    this.colSubtitle = document.getElementById('collection-subtitle');
    this.colWish = document.getElementById('collection-wish-quote');
    this.colList = document.getElementById('collection-list');
    this.btnColPrev = document.getElementById('btn-col-prev');
    this.btnColNext = document.getElementById('btn-col-next');
    this.btnRemixSystem = document.getElementById('btn-remix-system');
  }

  _buildControls() {
    // 1. Base buttons
    this.baseGrid.innerHTML = KRATHONG_BASES.map(
      (b) => `
      <button type="button" class="choice-pill" data-base-id="${b.id}">
        <img src="assets/images/base-${b.id}.png" alt="" width="40" height="34" />
        <span>${b.nameTh}</span>
      </button>`
    ).join('');

    // 2. Base tint swatches
    this.baseTintRow.innerHTML = BASE_TINT_SWATCHES.map(
      (sw) => `
      <button type="button" class="swatch-btn" data-base-tint="${sw.hex || ''}" title="${sw.label}" aria-label="${sw.label}">
        <span class="swatch-dot" style="background:${sw.hex || 'linear-gradient(135deg,#4f8b5d,#2f5d3a)'}"></span>
      </button>`
    ).join('');

    // 3. Flower species
    this.flowerSpeciesGrid.innerHTML = FLOWER_CATALOG.map(
      (f) => `
      <button type="button" class="choice-pill choice-pill--compact" data-species-id="${f.id}">
        <img src="${this._speciesImg(f.id)}" alt="" width="30" height="30" />
        <span>${f.nameTh}</span>
      </button>`
    ).join('');

    // 4. Flower color tints
    this.flowerColorRow.innerHTML = FLOWER_COLOR_SWATCHES.map(
      (sw) => `
      <button type="button" class="swatch-btn" data-flower-color="${sw.hex || ''}" title="${sw.label}" aria-label="${sw.label}">
        <span class="swatch-dot" style="background:${sw.hex || 'conic-gradient(#f6c8d3,#f4c158,#cbb0ee,#f8f0dc,#f6c8d3)'}"></span>
      </button>`
    ).join('');

    // 5. Flower layouts
    this.flowerLayoutRow.innerHTML = FLOWER_LAYOUTS.map(
      (ly) => `
      <button type="button" class="chip-btn" data-layout-id="${ly.id}">${ly.nameTh}</button>`
    ).join('');

    // 6. Candles
    this.candleGrid.innerHTML = CANDLE_CATALOG.map(
      (c) => `
      <button type="button" class="choice-pill" data-candle-id="${c.id}">
        <img src="${this._candleImg(c.id)}" alt="" width="20" height="40" />
        <span>${c.nameTh}</span>
      </button>`
    ).join('');

    // 7. System Collection 10-card strip
    this.colList.innerHTML = SYSTEM_KRATHONGS.map(
      (sys, i) => `
      <button type="button" class="collection-pill" data-sys-idx="${i}">
        <span class="collection-pill__id">${sys.krathongId}</span>
        <span class="collection-pill__name">${sys.nameEn}</span>
      </button>`
    ).join('');
  }

  _speciesImg(id) {
    const map = {
      lotus: 'assets/images/flower-lotus.png',
      marigold: 'assets/images/flower-marigold.png',
      jasmine: 'assets/images/petal-jasmine.png',
      orchid: 'assets/images/flower-orchid.png',
      rose: 'assets/images/flower-rose.png',
      'butterfly-pea': 'assets/images/flower-butterfly-pea.png',
      hibiscus: 'assets/images/flower-hibiscus.png',
    };
    return map[id] || map.lotus;
  }

  _candleImg(id) {
    if (id === 'ivory') return 'assets/images/candle-ivory.png';
    if (id === 'gold') return 'assets/images/candle-gold.png';
    return 'assets/images/candle.png';
  }

  _bindEvents() {
    this.modeTabCreator.addEventListener('click', () => this.setStudioMode('creator'));
    this.modeTabCollection.addEventListener('click', () => this.setStudioMode('collection'));

    // Studio Sub-tabs
    this.subTabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeStudioTab = btn.dataset.creatorTab;
        this.sound.playSoftClick();
        this._syncSubTabs();
      });
    });

    // Base choice
    this.baseGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-base-id]');
      if (!btn) return;
      this._mutateConfig((cfg) => ({ ...cfg, baseId: btn.dataset.baseId }));
      this.sound.playSwitchChime(0);
    });

    this.baseTintRow.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-base-tint]');
      if (!btn) return;
      const hex = btn.dataset.baseTint || null;
      this._mutateConfig((cfg) => ({ ...cfg, baseTint: hex }));
      this.sound.playSoftClick();
    });

    this.sliderDiameter.addEventListener('input', () => {
      const v = Number(this.sliderDiameter.value);
      this._mutateConfig((cfg) => ({ ...cfg, diameter: v }));
    });

    this.sliderHeight.addEventListener('input', () => {
      const v = Number(this.sliderHeight.value);
      this._mutateConfig((cfg) => ({ ...cfg, height: v }));
    });

    // Flower layer tabs (Layer 1 vs Layer 2)
    this.flowerLayerBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.flowerLayer);
        this.activeFlowerLayerIdx = idx;
        this._ensureLayerExists(idx);
        this.sound.playSoftClick();
        this.syncFromState();
      });
    });

    this.btnToggleLayer2.addEventListener('click', () => {
      this._mutateConfig((cfg) => {
        const flowers = [...cfg.flowers];
        if (flowers.length > 1) {
          flowers.splice(1, 1);
          this.activeFlowerLayerIdx = 0;
        } else {
          flowers.push({
            species: 'jasmine',
            color: null,
            count: 6,
            size: 0.88,
            layout: 'inner-ring',
            radiusRatio: 0.46,
            angleOffset: 15,
          });
          this.activeFlowerLayerIdx = 1;
        }
        return { ...cfg, flowers };
      });
      this.sound.playSoftClick();
    });

    // Flower attributes
    this.flowerSpeciesGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-species-id]');
      if (!btn) return;
      this._mutateActiveFlower((fl) => ({ ...fl, species: btn.dataset.speciesId }));
      this.sound.playSwitchChime(1);
    });

    this.flowerColorRow.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-flower-color]');
      if (!btn) return;
      const hex = btn.dataset.flowerColor || null;
      this._mutateActiveFlower((fl) => ({ ...fl, color: hex }));
      this.sound.playSoftClick();
    });

    this.flowerLayoutRow.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-layout-id]');
      if (!btn) return;
      const layout = btn.dataset.layoutId;
      const defaultRadius = layout === 'inner-ring' || layout === 'crown' ? 0.46 : 0.78;
      this._mutateActiveFlower((fl) => ({ ...fl, layout, radiusRatio: defaultRadius }));
      this.sound.playSoftClick();
    });

    this.sliderFlowerCount.addEventListener('input', () => {
      const count = Number(this.sliderFlowerCount.value);
      this._mutateActiveFlower((fl) => ({ ...fl, count }));
    });

    this.sliderFlowerSize.addEventListener('input', () => {
      const size = Number(this.sliderFlowerSize.value);
      this._mutateActiveFlower((fl) => ({ ...fl, size }));
    });

    this.sliderFlowerRadius.addEventListener('input', () => {
      const radiusRatio = Number(this.sliderFlowerRadius.value);
      this._mutateActiveFlower((fl) => ({ ...fl, radiusRatio }));
    });

    // Candle & Ornaments
    this.candleGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-candle-id]');
      if (!btn) return;
      this._mutateConfig((cfg) => ({ ...cfg, candleId: btn.dataset.candleId }));
      this.sound.playSwitchChime(2);
    });

    this.baisiBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const count = Number(btn.dataset.baisiCount);
        this._mutateConfig((cfg) => ({
          ...cfg,
          ornaments: { ...cfg.ornaments, baisiCount: count },
        }));
        this.sound.playSoftClick();
      });
    });

    [
      [this.chkIncense, 'incense'],
      [this.chkPearl, 'pearlGarland'],
      [this.chkStardust, 'stardustGlow'],
    ].forEach(([el, key]) => {
      el.addEventListener('change', () => {
        this._mutateConfig((cfg) => ({
          ...cfg,
          ornaments: { ...cfg.ornaments, [key]: el.checked },
        }));
        this.sound.playSoftClick();
      });
    });

    // System Collection browsing
    this.btnColPrev.addEventListener('click', () => this.stepCollection(-1));
    this.btnColNext.addEventListener('click', () => this.stepCollection(1));

    this.colList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-sys-idx]');
      if (!btn) return;
      store.update({ collectionIndex: Number(btn.dataset.sysIdx) });
      this.sound.playSwitchChime(Number(btn.dataset.sysIdx));
      this.syncFromState();
    });

    this.btnRemixSystem.addEventListener('click', () => {
      const sys = SYSTEM_KRATHONGS[store.current.collectionIndex] || SYSTEM_KRATHONGS[0];
      store.update({
        studioMode: 'creator',
        designConfig: sanitizeDesignConfig(JSON.parse(JSON.stringify(sys.designConfig))),
      });
      this.activeFlowerLayerIdx = 0;
      this.sound.playCandleLight();
      this.syncFromState();
      if (this.onDraftChanged) this.onDraftChanged();
    });
  }

  _ensureLayerExists(idx) {
    if (idx === 1 && store.current.designConfig.flowers.length < 2) {
      this._mutateConfig((cfg) => ({
        ...cfg,
        flowers: [
          ...cfg.flowers,
          {
            species: 'jasmine',
            color: null,
            count: 6,
            size: 0.88,
            layout: 'inner-ring',
            radiusRatio: 0.46,
            angleOffset: 15,
          },
        ],
      }));
    }
  }

  _mutateConfig(updater) {
    const next = sanitizeDesignConfig(updater(store.current.designConfig));
    store.update({ designConfig: next });
    this.syncFromState();
    if (this.onDraftChanged) this.onDraftChanged();
  }

  _mutateActiveFlower(updater) {
    this._ensureLayerExists(this.activeFlowerLayerIdx);
    this._mutateConfig((cfg) => {
      const flowers = cfg.flowers.map((fl, i) => (i === this.activeFlowerLayerIdx ? updater(fl) : fl));
      return { ...cfg, flowers };
    });
  }

  setStudioMode(mode) {
    store.update({ studioMode: mode });
    this.sound.playSoftClick();
    this.syncFromState();
  }

  stepCollection(delta) {
    const next = (store.current.collectionIndex + delta + SYSTEM_KRATHONGS.length) % SYSTEM_KRATHONGS.length;
    store.update({ collectionIndex: next });
    this.sound.playSwitchChime(next);
    this.syncFromState();
  }

  _syncSubTabs() {
    this.subTabBtns.forEach((btn) => {
      const active = btn.dataset.creatorTab === this.activeStudioTab;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
    });
    this.subPanels.forEach((panel) => {
      panel.hidden = panel.dataset.creatorPanel !== this.activeStudioTab;
    });
  }

  syncFromState() {
    const { studioMode, collectionIndex, designConfig } = store.current;
    const isCreator = studioMode === 'creator';

    this.modeTabCreator.classList.toggle('is-active', isCreator);
    this.modeTabCreator.setAttribute('aria-selected', String(isCreator));
    this.modeTabCollection.classList.toggle('is-active', !isCreator);
    this.modeTabCollection.setAttribute('aria-selected', String(!isCreator));

    this.creatorWorkspace.hidden = !isCreator;
    this.collectionWorkspace.hidden = isCreator;

    this._syncSubTabs();

    // Base controls sync
    this.baseGrid.querySelectorAll('[data-base-id]').forEach((btn) => {
      btn.classList.toggle('is-selected', btn.dataset.baseId === designConfig.baseId);
    });
    this.baseTintRow.querySelectorAll('[data-base-tint]').forEach((btn) => {
      const val = btn.dataset.baseTint || null;
      btn.classList.toggle('is-selected', val === designConfig.baseTint);
    });
    this.sliderDiameter.value = String(designConfig.diameter);
    this.valDiameter.textContent = `${Math.round(designConfig.diameter * 100)}%`;
    this.sliderHeight.value = String(designConfig.height);
    this.valHeight.textContent = `${Math.round(designConfig.height * 100)}%`;

    // Flower layer sync
    if (this.activeFlowerLayerIdx >= designConfig.flowers.length) {
      this.activeFlowerLayerIdx = 0;
    }
    const hasLayer2 = designConfig.flowers.length > 1;
    this.btnToggleLayer2.textContent = hasLayer2 ? 'ลบชั้นดอกไม้เสริม' : '+ เพิ่มดอกไม้ชั้นใน';

    this.flowerLayerBtns.forEach((btn) => {
      const idx = Number(btn.dataset.flowerLayer);
      btn.hidden = idx === 1 && !hasLayer2;
      btn.classList.toggle('is-active', idx === this.activeFlowerLayerIdx);
    });

    const activeFl = designConfig.flowers[this.activeFlowerLayerIdx] || designConfig.flowers[0];
    this.flowerSpeciesGrid.querySelectorAll('[data-species-id]').forEach((btn) => {
      btn.classList.toggle('is-selected', btn.dataset.speciesId === activeFl.species);
    });
    this.flowerColorRow.querySelectorAll('[data-flower-color]').forEach((btn) => {
      const val = btn.dataset.flowerColor || null;
      btn.classList.toggle('is-selected', val === activeFl.color);
    });
    this.flowerLayoutRow.querySelectorAll('[data-layout-id]').forEach((btn) => {
      btn.classList.toggle('is-selected', btn.dataset.layoutId === activeFl.layout);
    });
    this.sliderFlowerCount.value = String(activeFl.count);
    this.valFlowerCount.textContent = `${activeFl.count} ดอก`;
    this.sliderFlowerSize.value = String(activeFl.size);
    this.valFlowerSize.textContent = `${Math.round(activeFl.size * 100)}%`;
    this.sliderFlowerRadius.value = String(activeFl.radiusRatio);
    this.valFlowerRadius.textContent = `${Math.round(activeFl.radiusRatio * 100)}%`;

    // Candle & Ornaments sync
    this.candleGrid.querySelectorAll('[data-candle-id]').forEach((btn) => {
      btn.classList.toggle('is-selected', btn.dataset.candleId === designConfig.candleId);
    });
    this.baisiBtns.forEach((btn) => {
      btn.classList.toggle('is-selected', Number(btn.dataset.baisiCount) === designConfig.ornaments.baisiCount);
    });
    this.chkIncense.checked = Boolean(designConfig.ornaments.incense);
    this.chkPearl.checked = Boolean(designConfig.ornaments.pearlGarland);
    this.chkStardust.checked = Boolean(designConfig.ornaments.stardustGlow);

    // Collection sync
    const sys = SYSTEM_KRATHONGS[collectionIndex] || SYSTEM_KRATHONGS[0];
    this.colBadge.textContent = `${sys.krathongId} · ${sys.collectionLabel}`;
    this.colTitle.textContent = `${sys.nameEn} — ${sys.nameTh}`;
    this.colSubtitle.textContent = sys.subtitle;
    this.colWish.textContent = `“${sys.wishMessage}”`;
    this.colList.querySelectorAll('[data-sys-idx]').forEach((btn) => {
      btn.classList.toggle('is-selected', Number(btn.dataset.sysIdx) === collectionIndex);
    });
  }

  startPreviewLoop() {
    if (this._previewRaf != null) return;
    const renderTick = (now) => {
      const t = (now - this._previewStart) / 1000;
      const { studioMode, collectionIndex, designConfig } = store.current;
      const activeCfg =
        studioMode === 'collection'
          ? (SYSTEM_KRATHONGS[collectionIndex] || SYSTEM_KRATHONGS[0]).designConfig
          : designConfig;

      this.renderer.renderPreviewCanvas(this.previewCanvas, activeCfg, {
        time: t,
        isLit: true,
        widthRatio: 0.56,
      });
      this._previewRaf = requestAnimationFrame(renderTick);
    };
    this._previewRaf = requestAnimationFrame(renderTick);
  }

  stopPreviewLoop() {
    if (this._previewRaf != null) {
      cancelAnimationFrame(this._previewRaf);
      this._previewRaf = null;
    }
  }
}
