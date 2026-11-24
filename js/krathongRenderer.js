/**
 * A Little Wish — Unified Modular Krathong Renderer (DOM Preview, River LOD, Keepsake)
 * Renders BOTH System Collection (SYS-KR-001..010) and Player Custom Krathongs
 * through the exact same proportional layered rendering pipeline.
 *
 * Key design choices:
 *  - Changing `diameter` & `height` scales deck geometry, spire ring, and flower placement
 *    proportionally rather than uniformly stretching a finished bitmap.
 *  - Static hull + tinted flowers + ornaments + candle shaft are baked into a
 *    Level-of-Detail (LOD) offscreen canvas cache per unique DesignConfig hash,
 *    leaving only live flickering flame, stardust twinkle, embers & water reflection per frame.
 */

import {
  CANDLE_CATALOG,
  FLOWER_CATALOG,
  KRATHONG_BASES,
} from './config.js';

const BASE_MAP = Object.fromEntries(KRATHONG_BASES.map((b) => [b.id, b]));
const FLOWER_MAP = Object.fromEntries(FLOWER_CATALOG.map((f) => [f.id, f]));
const CANDLE_MAP = Object.fromEntries(CANDLE_CATALOG.map((c) => [c.id, c]));

export class KrathongRenderer {
  constructor(images) {
    this.images = images;
    this._tintCache = new Map(); // `${assetKey}|${hex}` -> offscreen canvas
    this._bodyCache = new Map(); // `${configHash}|${lodBucket}` -> { canvas, w, h, anchorX, anchorY, wickX, wickY, baseW }
  }

  _getTintedSprite(assetKey, hexColor) {
    const img = this.images[assetKey];
    if (!img || !img.complete || !img.naturalWidth) return null;
    if (!hexColor) return img;

    const cacheKey = `${assetKey}|${hexColor}`;
    if (this._tintCache.has(cacheKey)) {
      return this._tintCache.get(cacheKey);
    }

    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const octx = off.getContext('2d');

    octx.drawImage(img, 0, 0, w, h);

    // Subtle watercolor-style pigment glaze that preserves dark outlines, leaf veins & highlights
    octx.save();
    octx.globalCompositeOperation = 'source-atop';
    octx.globalAlpha = 0.34;
    octx.fillStyle = hexColor;
    octx.fillRect(0, 0, w, h);

    octx.globalCompositeOperation = 'color';
    octx.globalAlpha = 0.26;
    octx.fillStyle = hexColor;
    octx.fillRect(0, 0, w, h);

    // Strictly re-apply original sprite alpha mask so transparent pixels stay alpha=0
    octx.globalCompositeOperation = 'destination-in';
    octx.globalAlpha = 1;
    octx.drawImage(img, 0, 0, w, h);
    octx.restore();

    if (this._tintCache.size > 120) this._tintCache.clear();
    this._tintCache.set(cacheKey, off);
    return off;
  }

  _hashConfig(cfg) {
    return JSON.stringify({
      b: cfg.baseId,
      bt: cfg.baseTint,
      d: cfg.diameter,
      h: cfg.height,
      c: cfg.candleId,
      o: cfg.ornaments,
      f: cfg.flowers,
    });
  }

  _computePlacements(cfg, baseCfg, baseW, baseH) {
    const deckCx = baseW * baseCfg.deckCx;
    const deckCy = baseH * baseCfg.deckCy;
    // Diameter expands/contracts the radial flower deck independently of flower sprite scale
    const deckRx = baseW * baseCfg.deckRx * (0.9 + (cfg.diameter - 1) * 0.68);
    const deckRy = baseH * baseCfg.deckRy * (0.92 + (cfg.diameter - 1) * 0.46);

    const items = [];

    // 1. Optional Bai-si banana-leaf spires along rim
    const baisiCount = cfg.ornaments?.baisiCount || 0;
    if (baisiCount > 0) {
      for (let i = 0; i < baisiCount; i++) {
        // Distribute evenly, avoiding front center so candle remains unobstructed
        const angle = ((i + 0.5) / baisiCount) * Math.PI * 2 - Math.PI / 2;
        const rx = deckRx * 0.92;
        const ry = deckRy * 0.92;
        const px = deckCx + Math.cos(angle) * rx;
        const py = deckCy + Math.sin(angle) * ry;
        items.push({
          kind: 'baisi',
          x: px,
          y: py,
          depthY: py - 6,
          size: baseW * 0.145,
          rot: Math.cos(angle) * 0.14,
        });
      }
    }

    // 2. Flower layers arranged in true 3D elliptical perspective
    (cfg.flowers || []).forEach((layer, layerIdx) => {
      const fMeta = FLOWER_MAP[layer.species] || FLOWER_MAP.lotus;
      const count = Math.max(1, layer.count || 6);
      const radRatio = layer.radiusRatio ?? (layer.layout === 'inner-ring' ? 0.48 : 0.78);
      const offsetRad = ((layer.angleOffset || 0) * Math.PI) / 180;
      const flowerSize = baseW * fMeta.baseSize * (layer.size || 1.0) * (0.94 + (cfg.diameter - 1) * 0.15);

      for (let i = 0; i < count; i++) {
        let angle;
        let localR = radRatio;

        if (layer.layout === 'crescent') {
          // Sweeping moon crescent arc hugging left/back-right of the deck
          const span = Math.PI * 1.18;
          const t = count === 1 ? 0.5 : i / (count - 1);
          angle = Math.PI * 0.72 + t * span + offsetRad;
        } else if (layer.layout === 'cluster') {
          // Two romantic opposing floral clusters
          const side = i % 2 === 0 ? -0.35 : Math.PI - 0.35;
          const jitter = ((Math.floor(i / 2) - 1) * 0.38);
          angle = side + jitter + offsetRad;
          localR = radRatio * (0.85 + (i % 3) * 0.12);
        } else if (layer.layout === 'crown') {
          // Tight circular crown hugging the central candle
          angle = (i / count) * Math.PI * 2 + offsetRad;
          localR = Math.min(0.64, radRatio);
        } else {
          angle = (i / count) * Math.PI * 2 + offsetRad + layerIdx * 0.25;
        }

        const fx = deckCx + Math.cos(angle) * deckRx * localR;
        const fy = deckCy + Math.sin(angle) * deckRy * localR;

        // Slight perspective scale compression for back-arc flowers
        const depthScale = 0.88 + 0.16 * ((Math.sin(angle) + 1) / 2);

        items.push({
          kind: 'flower',
          assetKey: fMeta.assetKey,
          color: layer.color,
          x: fx,
          y: fy,
          depthY: fy,
          size: flowerSize * depthScale,
          rot: Math.cos(angle) * 0.22,
        });
      }
    });

    // 3. Central Candle & optional Incense (sorted by depthY so front flowers overlap candle collar!)
    items.push({
      kind: 'candle',
      candleId: cfg.candleId || 'beeswax',
      incense: Boolean(cfg.ornaments?.incense),
      x: deckCx,
      y: deckCy + baseH * 0.015,
      depthY: deckCy + baseH * 0.01,
    });

    // Sort back-to-front by Y coordinate
    items.sort((a, b) => a.depthY - b.depthY);
    return { items, deckCx, deckCy, deckRx, deckRy };
  }

  /**
   * Build or retrieve cached offscreen static composite for a given DesignConfig & LOD width.
   */
  _getBakedBody(cfg, lodBucket) {
    const hash = this._hashConfig(cfg);
    const cacheKey = `${hash}|${lodBucket}`;
    if (this._bodyCache.has(cacheKey)) {
      return this._bodyCache.get(cacheKey);
    }

    const baseCfg = BASE_MAP[cfg.baseId] || BASE_MAP['banana-bowl'];
    const baseSprite = this._getTintedSprite(baseCfg.assetKey, cfg.baseTint);
    if (!baseSprite) return null;

    const rawW = baseSprite.width || baseSprite.naturalWidth;
    const rawH = baseSprite.height || baseSprite.naturalHeight;
    const baseAspect = rawW / rawH;

    // Proportional diameter & height adjustments
    const baseW = lodBucket * cfg.diameter;
    const baseH = (lodBucket / baseAspect) * cfg.height;

    // Pad top/sides generously for tall candles, bai-si spires & outer flowers
    const padX = Math.ceil(baseW * 0.22);
    const padTop = Math.ceil(baseH * 0.72);
    const padBot = Math.ceil(baseH * 0.12);

    const canvasW = Math.ceil(baseW + padX * 2);
    const canvasH = Math.ceil(baseH + padTop + padBot);

    const off = document.createElement('canvas');
    off.width = canvasW;
    off.height = canvasH;
    const ctx = off.getContext('2d');

    const originX = padX;
    const originY = padTop;

    // 1. Draw Krathong Base Hull
    ctx.drawImage(baseSprite, originX, originY, baseW, baseH);

    // 2. Compute & draw depth-sorted decorations, flowers, candle & incense
    const { items, deckCx, deckCy, deckRx, deckRy } = this._computePlacements(cfg, baseCfg, baseW, baseH);

    let wickX = originX + deckCx;
    let wickY = originY + deckCy - baseH * 0.35;

    // Optional delicate pearl & jasmine garland draped along the front rim
    if (cfg.ornaments?.pearlGarland) {
      this._drawPearlGarland(ctx, originX + deckCx, originY + deckCy, deckRx * 1.04, deckRy * 1.06);
    }

    for (const item of items) {
      if (item.kind === 'baisi') {
        const bImg = this.images.decorBaisi;
        if (bImg?.complete && bImg.naturalWidth) {
          const bh = item.size * (bImg.naturalHeight / bImg.naturalWidth);
          const bw = item.size;
          ctx.save();
          ctx.translate(originX + item.x, originY + item.y);
          ctx.rotate(item.rot);
          ctx.drawImage(bImg, -bw / 2, -bh * 0.86, bw, bh);
          ctx.restore();
        }
      } else if (item.kind === 'flower') {
        const fImg = this._getTintedSprite(item.assetKey, item.color);
        if (fImg) {
          const fw = item.size;
          const fh = fw * ((fImg.height || fImg.naturalHeight) / (fImg.width || fImg.naturalWidth));
          ctx.save();
          ctx.translate(originX + item.x, originY + item.y);
          ctx.rotate(item.rot);
          // Soft drop shadow anchoring flower onto banana leaf deck
          ctx.shadowColor = 'rgba(4, 10, 22, 0.36)';
          ctx.shadowBlur = Math.max(2, fw * 0.1);
          ctx.shadowOffsetY = Math.max(1, fh * 0.08);
          ctx.drawImage(fImg, -fw / 2, -fh * 0.54, fw, fh);
          ctx.restore();
        }
      } else if (item.kind === 'candle') {
        const cMeta = CANDLE_MAP[item.candleId] || CANDLE_MAP.beeswax;
        const cImg = this.images[cMeta.assetKey];
        if (item.incense) {
          this._drawIncenseSticks(ctx, originX + item.x, originY + item.y, baseH);
        }
        if (cImg?.complete && cImg.naturalWidth) {
          const ch = baseH * baseCfg.candleScale;
          const cw = ch * (cImg.naturalWidth / cImg.naturalHeight);
          const cx = originX + item.x - cw / 2;
          const cy = originY + item.y - ch * 0.84;
          ctx.save();
          ctx.shadowColor = 'rgba(4, 10, 22, 0.32)';
          ctx.shadowBlur = Math.max(2, cw * 0.14);
          ctx.drawImage(cImg, cx, cy, cw, ch);
          ctx.restore();
          wickX = originX + item.x;
          wickY = cy + ch * 0.095;
        }
      }
    }

    const entry = {
      canvas: off,
      w: canvasW,
      h: canvasH,
      anchorX: originX + baseW / 2,
      anchorY: originY + baseH * baseCfg.hullBottom,
      wickX,
      wickY,
      baseW,
      baseH,
    };

    if (this._bodyCache.size > 90) this._bodyCache.clear();
    this._bodyCache.set(cacheKey, entry);
    return entry;
  }

  _drawPearlGarland(ctx, cx, cy, rx, ry) {
    ctx.save();
    const beads = 20;
    for (let i = 0; i <= beads; i++) {
      // Drape gracefully along front arc (0.08*PI to 0.92*PI)
      const t = i / beads;
      const angle = 0.08 * Math.PI + t * 0.84 * Math.PI;
      const sag = Math.sin(t * Math.PI) * ry * 0.34;
      const bx = cx + Math.cos(angle) * rx;
      const by = cy + Math.sin(angle) * ry + sag;
      const r = (i % 3 === 0 ? 3.2 : 2.2) * (rx / 100);

      ctx.fillStyle = i % 3 === 0 ? 'rgba(255, 246, 224, 0.95)' : 'rgba(232, 238, 246, 0.88)';
      ctx.beginPath();
      ctx.arc(bx, by, Math.max(1.2, r), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawIncenseSticks(ctx, cx, cy, baseH) {
    ctx.save();
    const stickLen = baseH * 0.44;
    const angles = [-0.21, -0.05, 0.12];
    angles.forEach((ang, idx) => {
      ctx.save();
      ctx.translate(cx + (idx - 1) * 3, cy - baseH * 0.02);
      ctx.rotate(ang);
      // Bamboo stick lower stem
      ctx.strokeStyle = '#9d5949';
      ctx.lineWidth = Math.max(1.2, baseH * 0.008);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -stickLen * 0.25);
      ctx.stroke();

      // Sandalwood aromatic shaft
      ctx.strokeStyle = '#6c4d3b';
      ctx.lineWidth = Math.max(1.6, baseH * 0.011);
      ctx.beginPath();
      ctx.moveTo(0, -stickLen * 0.25);
      ctx.lineTo(0, -stickLen);
      ctx.stroke();

      // Tiny warm glowing ember tip
      ctx.fillStyle = '#ff9852';
      ctx.beginPath();
      ctx.arc(0, -stickLen, Math.max(1.4, baseH * 0.011), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    ctx.restore();
  }

  /**
   * Draw any DesignConfig at world/screen coordinates (x, y) where (x, y) is the
   * waterline hull center, with optional reflection, live flickering flame,
   * stardust glow, and perspective scaling.
   */
  draw(ctx, {
    designConfig,
    x,
    y,
    displayWidth = 180,
    time = 0,
    tilt = 0,
    opacity = 1,
    drawReflection = true,
    isLit = null,
    lodOverride = null,
  }) {
    const bucket = lodOverride || (displayWidth > 220 ? 320 : displayWidth > 115 ? 200 : 120);
    const baked = this._getBakedBody(designConfig, bucket);
    if (!baked) return;

    const lit = isLit !== null ? isLit : designConfig.candleLit !== false;
    const scale = displayWidth / baked.baseW;
    const drawW = baked.w * scale;
    const drawH = baked.h * scale;
    const offsetX = -baked.anchorX * scale;
    const offsetY = -baked.anchorY * scale;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(x, y);

    // 1. Water contact shadow, mirrored hull reflection & candle shimmer
    if (drawReflection) {
      const hullH = baked.baseH * scale;
      const glowRx = displayWidth * (lit ? 0.72 : 0.54);
      const glowRy = hullH * (lit ? 0.28 : 0.2);

      const waterGrad = ctx.createRadialGradient(0, hullH * 0.08, 2, 0, hullH * 0.08, glowRx);
      if (lit) {
        waterGrad.addColorStop(0, 'rgba(255, 224, 152, 0.40)');
        waterGrad.addColorStop(0.45, 'rgba(240, 173, 86, 0.15)');
        waterGrad.addColorStop(1, 'rgba(240, 173, 86, 0)');
      } else {
        waterGrad.addColorStop(0, 'rgba(195, 218, 245, 0.20)');
        waterGrad.addColorStop(1, 'rgba(195, 218, 245, 0)');
      }

      ctx.save();
      ctx.scale(1, glowRy / glowRx);
      ctx.fillStyle = waterGrad;
      ctx.beginPath();
      ctx.arc(0, hullH * 0.08 * (glowRx / glowRy), glowRx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Subtle mirrored krathong silhouette reflection on rippling water
      ctx.save();
      ctx.globalAlpha = opacity * 0.18;
      ctx.scale(1, -0.34);
      ctx.drawImage(baked.canvas, offsetX, -drawH - offsetY - hullH * 0.14, drawW, drawH);
      ctx.restore();

      // Animated vertical candlelight shimmer streaks
      if (lit) {
        const streaks = displayWidth > 110 ? 6 : 4;
        for (let i = 0; i < streaks; i++) {
          const ratio = i / streaks;
          const sy = hullH * 0.06 + ratio * hullH * 0.62;
          const wave = Math.sin(time * 2.8 + i * 1.35) * (displayWidth * 0.032);
          const sw = displayWidth * (0.28 - ratio * 0.19) * (0.85 + 0.15 * Math.sin(time * 3.4 + i));
          ctx.fillStyle = `rgba(250, 212, 134, ${(0.25 * (1 - ratio)).toFixed(3)})`;
          ctx.beginPath();
          ctx.ellipse(wave, sy, Math.max(1.5, sw), Math.max(1, hullH * 0.022), 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Hull contact shadow
      const shadowGrad = ctx.createRadialGradient(0, 1, displayWidth * 0.08, 0, 1, displayWidth * 0.48);
      shadowGrad.addColorStop(0, 'rgba(3, 8, 18, 0.56)');
      shadowGrad.addColorStop(1, 'rgba(3, 8, 18, 0)');
      ctx.save();
      ctx.scale(1, 0.26);
      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.arc(0, 4, displayWidth * 0.48, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Apply physical wave tilt
    ctx.rotate(tilt);

    // 2. Draw baked modular Krathong body
    ctx.drawImage(baked.canvas, offsetX, offsetY, drawW, drawH);

    // 3. Optional Stardust Glow motes twinkling around the krathong
    if (designConfig.ornaments?.stardustGlow) {
      for (let i = 0; i < 6; i++) {
        const ang = time * 0.5 + (i / 6) * Math.PI * 2;
        const mx = Math.cos(ang) * displayWidth * 0.42;
        const my = -baked.baseH * scale * 0.52 + Math.sin(ang * 1.4 + i) * baked.baseH * scale * 0.25;
        const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * 3.2 + i * 1.7));
        ctx.fillStyle = `rgba(255, 243, 198, ${(0.8 * tw).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(mx, my, Math.max(1.1, displayWidth * 0.012 * tw), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. Live flickering flame + warm radial bloom above candle wick
    const fImg = this.images.flame;
    if (lit && fImg?.complete && fImg.naturalWidth) {
      const wickLocalX = (baked.wickX - baked.anchorX) * scale;
      const wickLocalY = (baked.wickY - baked.anchorY) * scale;
      const fh = baked.baseH * scale * 0.25;
      const fw = fh * (fImg.naturalWidth / fImg.naturalHeight);

      const auraR = displayWidth * 0.42 * (0.96 + 0.04 * Math.sin(time * 4.2));
      const aura = ctx.createRadialGradient(wickLocalX, wickLocalY - fh * 0.35, 1, wickLocalX, wickLocalY - fh * 0.35, auraR);
      aura.addColorStop(0, 'rgba(255, 232, 174, 0.44)');
      aura.addColorStop(0.42, 'rgba(245, 185, 96, 0.16)');
      aura.addColorStop(1, 'rgba(245, 185, 96, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(wickLocalX, wickLocalY - fh * 0.35, auraR, 0, Math.PI * 2);
      ctx.fill();

      const flickerScaleX = 1 + Math.sin(time * 8.2 + x * 0.05) * 0.045;
      const flickerScaleY = 1 + Math.cos(time * 6.7 + y * 0.05) * 0.06;
      const flickerTilt = Math.sin(time * 5.1 + x * 0.03) * 0.055;

      ctx.save();
      ctx.translate(wickLocalX, wickLocalY);
      ctx.rotate(flickerTilt);
      ctx.scale(flickerScaleX, flickerScaleY);
      ctx.drawImage(fImg, -fw / 2, -fh * 0.8, fw, fh);
      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Render a crisp standalone preview onto any UI <canvas> element (Collection, Creator, Profile Popup).
   */
  renderPreviewCanvas(canvas, designConfig, { time = 0.8, isLit = null, widthRatio = 0.62 } = {}) {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = canvas.clientWidth || Number(canvas.getAttribute('width')) || 260;
    const cssH = canvas.clientHeight || Number(canvas.getAttribute('height')) || 220;
    if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const displayW = Math.min(cssW * widthRatio, cssH * 0.86);
    this.draw(ctx, {
      designConfig,
      x: cssW / 2,
      y: cssH * 0.78,
      displayWidth: displayW,
      time,
      tilt: Math.sin(time * 1.4) * 0.015,
      drawReflection: true,
      isLit,
      lodOverride: 320,
    });
  }
}
