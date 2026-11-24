/**
 * A Little Wish — Interactive Canvas 2D Community Moonlit River Engine
 * Renders continuous procedural water flow, moonlight shimmer, perspective ripples,
 * painted floating petals, fireflies, all Community & System Krathongs via
 * RiverPopulationManager + KrathongRenderer, and the active release staging krathong.
 */

import { RiverPopulationManager } from './populationManager.js';

export class RiverCanvas {
  constructor(canvas, images, renderer, { onWaterTap, onKrathongTap } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.images = images;
    this.renderer = renderer;
    this.onWaterTap = onWaterTap;
    this.onKrathongTap = onKrathongTap;

    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.horizonRatio = 0.58;

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.rafId = null;
    this.lastTime = 0;
    this.elapsed = 0;

    this.population = new RiverPopulationManager({ maxVisible: 20 });
    this._sortedEntities = [];

    // Ambient particle layers
    this.ripples = [];
    this.fireflies = [];
    this.petals = [];
    this.embers = [];

    // Foreground staging krathong waiting to be released in Scene 5
    this.stagingKrathong = null;
    this._emberTimer = 0;

    this._initParticles();
    this.resize();
    this._bindEvents();
  }

  _initParticles() {
    const fireflyCount = this.reducedMotion ? 8 : 20;
    this.fireflies = Array.from({ length: fireflyCount }, () => ({
      x: Math.random(),
      y: 0.24 + Math.random() * 0.62,
      r: 1.4 + Math.random() * 2.1,
      vx: (Math.random() - 0.5) * 0.008,
      vy: (Math.random() - 0.5) * 0.005,
      phase: Math.random() * Math.PI * 2,
      speed: 0.9 + Math.random() * 1.4,
    }));

    const petalCount = this.reducedMotion ? 4 : 9;
    this.petals = Array.from({ length: petalCount }, (_, i) =>
      this._createPetal(true, i % 2 === 0 ? 'petalLotus' : 'petalJasmine')
    );
  }

  _createPetal(randomX = false, spriteKey = null, customX = null, customY = null) {
    const key = spriteKey || (Math.random() < 0.62 ? 'petalLotus' : 'petalJasmine');
    const depth = customY != null
      ? Math.max(0.15, Math.min(1, (customY / this.height - this.horizonRatio) / (1 - this.horizonRatio)))
      : 0.16 + Math.random() * 0.84;
    return {
      key,
      x: customX != null ? customX / this.width : (randomX ? Math.random() : -0.06),
      depth,
      vx: (0.007 + depth * 0.011),
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.32,
      bobPhase: Math.random() * Math.PI * 2,
      opacity: 0.42 + depth * 0.42,
    };
  }

  _bindEvents() {
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize, { passive: true });

    this._onVisibility = () => {
      if (document.hidden) {
        this.stop();
      } else {
        this.start();
      }
    };
    document.addEventListener('visibilitychange', this._onVisibility);

    this._onPointerDown = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // 1. Check if user tapped any floating Community / System krathong
      const hit = this.population.hitTest(x, y, this._sortedEntities);
      if (hit) {
        this.spawnRipple(hit.screenX, hit.screenY, { golden: true, maxRadius: 68 });
        if (this.onKrathongTap) this.onKrathongTap(hit.record);
        return;
      }

      // 2. Otherwise if tapping the river surface, spawn ripple + wave impulse
      if (y >= this.height * (this.horizonRatio - 0.01)) {
        const depth = Math.max(0, Math.min(1, (y / this.height - this.horizonRatio) / (1 - this.horizonRatio)));
        this.spawnRipple(x, y, { golden: true });
        this.population.applyWaveImpulse(x / this.width, depth, 1.0);
        if (this.petals.length < 16) {
          this.petals.push(this._createPetal(false, null, x, y));
        }
        if (this.onWaterTap) this.onWaterTap(x, y);
      }
    };
    this.canvas.addEventListener('pointerdown', this._onPointerDown);
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.horizonRatio = this.width < this.height ? 0.60 : 0.56;
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  start() {
    if (this.rafId != null) return;
    this.lastTime = performance.now();
    const tick = (now) => {
      const dt = Math.min((now - this.lastTime) / 1000, 0.05);
      this.lastTime = now;
      this.update(dt);
      this.render();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop() {
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  syncCommunity(records, opts = {}) {
    this.population.syncRecords(records, opts);
  }

  spawnRipple(x, y, { golden = false, maxRadius = null } = {}) {
    const horizonY = this.height * this.horizonRatio;
    const depth = Math.max(0.15, Math.min(1, (y - horizonY) / (this.height - horizonY)));
    this.ripples.push({
      x,
      y,
      radius: 4,
      maxRadius: maxRadius || (34 + depth * 68),
      squash: 0.23 + depth * 0.14,
      alpha: golden ? 0.58 : 0.42,
      golden,
    });
    if (this.ripples.length > 36) {
      this.ripples.shift();
    }
  }

  prepareStagingKrathong(designConfig) {
    this.stagingKrathong = {
      designConfig,
      dragOffsetPx: 0,
      x: this.width * 0.5,
      y: this.height * 0.77,
      scale: 1,
    };
    this._emberTimer = 0;
  }

  setStagingDragOffset(offsetPx) {
    if (!this.stagingKrathong) return;
    this.stagingKrathong.dragOffsetPx = Math.max(-135, Math.min(20, offsetPx));
  }

  /**
   * Hand off the staging krathong smoothly into the live Community River Physics engine!
   */
  launchStagingIntoCommunity(releasedRecord) {
    let startNx = 0.5;
    let startDepth = 0.78;
    if (this.stagingKrathong) {
      startNx = this.stagingKrathong.x / this.width;
      const horizonY = this.height * this.horizonRatio;
      startDepth = Math.max(0.25, Math.min(0.84, (this.stagingKrathong.y - horizonY) / (this.height - horizonY)));
    }
    this.stagingKrathong = null;

    this.population.spawnReleasedPlayerKrathong(releasedRecord, startNx, startDepth);
    this.population.applyWaveImpulse(startNx, startDepth, 1.35);

    const rx = startNx * this.width;
    const ry = this.height * this.horizonRatio + startDepth * (this.height * (1 - this.horizonRatio));
    this.spawnRipple(rx, ry, { golden: true, maxRadius: 120 });
    setTimeout(() => this.spawnRipple(rx, ry - 4, { golden: true, maxRadius: 94 }), 250);

    for (let i = 0; i < 3; i++) {
      const px = rx + (Math.random() - 0.5) * 140;
      const py = ry + (Math.random() - 0.5) * 40;
      this.petals.push(this._createPetal(false, i % 2 === 0 ? 'petalLotus' : 'petalJasmine', px, py));
    }
  }

  clearStagingKrathong() {
    this.stagingKrathong = null;
  }

  getStagingScreenRect() {
    if (!this.stagingKrathong) return null;
    const baseW = Math.min(220, Math.max(150, this.width * 0.42));
    const diam = this.stagingKrathong.designConfig?.diameter || 1.0;
    const w = baseW * this.stagingKrathong.scale * diam;
    const h = w * 0.85;
    return {
      x: this.stagingKrathong.x - w / 2,
      y: this.stagingKrathong.y - h,
      width: w,
      height: h,
    };
  }

  update(dt) {
    const timeScale = this.reducedMotion ? 0.35 : 1;
    this.elapsed += dt * timeScale;

    // 1. Update water ripples
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const rp = this.ripples[i];
      rp.radius += dt * (this.reducedMotion ? 22 : 42);
      const t = rp.radius / rp.maxRadius;
      rp.alpha = Math.max(0, (rp.golden ? 0.56 : 0.42) * (1 - t) * (1 - t));
      if (t >= 1) this.ripples.splice(i, 1);
    }

    // 2. Update fireflies
    for (const f of this.fireflies) {
      f.x += f.vx * dt * timeScale;
      f.y += (f.vy + Math.sin(this.elapsed * 0.7 + f.phase) * 0.003) * dt * timeScale;
      if (f.x < -0.04) f.x = 1.04;
      if (f.x > 1.04) f.x = -0.04;
      if (f.y < 0.22) f.y = 0.84;
      if (f.y > 0.88) f.y = 0.26;
    }

    // 3. Update drifting painted petals
    for (let i = this.petals.length - 1; i >= 0; i--) {
      const p = this.petals[i];
      p.x += p.vx * dt * timeScale;
      p.rot += p.vrot * dt * timeScale;
      if (p.x > 1.08) {
        if (this.petals.length > 9) {
          this.petals.splice(i, 1);
        } else {
          p.x = -0.06;
          p.depth = 0.18 + Math.random() * 0.80;
        }
      }
    }

    // 4. Update rising candle embers
    for (let i = this.embers.length - 1; i >= 0; i--) {
      const em = this.embers[i];
      em.x += (em.vx + Math.sin(this.elapsed * 3 + em.phase) * 8) * dt;
      em.y += em.vy * dt;
      em.life -= dt;
      if (em.life <= 0) this.embers.splice(i, 1);
    }

    // 5. Update staging krathong in Scene 5 before release
    if (this.stagingKrathong) {
      const st = this.stagingKrathong;
      const bob = Math.sin(this.elapsed * 2.0) * 4;
      st.x = this.width * 0.5;
      st.y = this.height * 0.77 + st.dragOffsetPx + bob;
      st.scale = Math.max(0.78, 1 + st.dragOffsetPx / 620);
    }

    // 6. Step Realistic River Physics for all Community & System Krathongs
    this._sortedEntities = this.population.step(
      dt * timeScale,
      this.elapsed,
      this.width,
      this.height,
      this.horizonRatio,
      {
        spawnRipple: (rx, ry, opts) => {
          if (!this.reducedMotion) this.spawnRipple(rx, ry, opts);
        },
      }
    );

    // Occasional gentle candle ember from foreground krathongs
    this._emberTimer += dt;
    if (!this.reducedMotion && this._emberTimer > 0.45 && this._sortedEntities.length > 0) {
      this._emberTimer = 0;
      const front = this._sortedEntities[Math.floor(Math.random() * this._sortedEntities.length)];
      if (front && front.persp > 0.5) {
        this.embers.push({
          x: front.screenX + (Math.random() - 0.5) * 12,
          y: front.screenY - front.screenW * 0.58,
          vx: (Math.random() - 0.5) * 9,
          vy: -(16 + Math.random() * 18),
          r: 1.1 + Math.random() * 1.4,
          life: 1.3 + Math.random() * 0.8,
          maxLife: 2.1,
          phase: Math.random() * 6,
        });
      }
    }
  }

  render() {
    const ctx = this.ctx;
    const W = this.width;
    const H = this.height;
    const horizonY = H * this.horizonRatio;

    ctx.clearRect(0, 0, W, H);

    // 1. Procedural continuous flowing water lines + animated moon shimmer
    this._renderProceduralWater(ctx, W, H, horizonY);

    // 2. Expanding perspective water ripples
    this._renderRipples(ctx);

    // 3. Far-to-mid drifting painted petals
    this._renderPetals(ctx, W, H, horizonY, 0, 0.7);

    // 4. All Community & System Krathongs sorted back-to-front with perspective & physics
    for (const ent of this._sortedEntities) {
      const distFade = Math.min(1, 0.72 + ent.persp * 0.28);
      this.renderer.draw(ctx, {
        designConfig: ent.record.designConfig,
        x: ent.screenX,
        y: ent.screenY,
        displayWidth: ent.screenW,
        time: this.elapsed,
        tilt: ent.tilt,
        opacity: distFade,
        drawReflection: true,
      });
    }

    // 5. Scene 5 foreground staging krathong (waiting for upward push / release)
    if (this.stagingKrathong) {
      const st = this.stagingKrathong;
      const baseW = Math.min(220, Math.max(150, W * 0.42));
      this.renderer.draw(ctx, {
        designConfig: st.designConfig,
        x: st.x,
        y: st.y,
        displayWidth: baseW * st.scale,
        time: this.elapsed,
        tilt: Math.sin(this.elapsed * 1.7) * 0.022,
        opacity: 1,
        drawReflection: true,
      });
    }

    // 6. Foreground drifting petals
    this._renderPetals(ctx, W, H, horizonY, 0.7, 1.1);

    // 7. Rising warm candle embers
    for (const em of this.embers) {
      const a = Math.max(0, em.life / em.maxLife) * 0.82;
      ctx.fillStyle = `rgba(255, 224, 152, ${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(em.x, em.y, em.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 8. Soft glowing fireflies
    this._renderFireflies(ctx, W, H);
  }

  _renderProceduralWater(ctx, W, H, horizonY) {
    const waterH = H - horizonY;

    // A. Subtle directional water current ribbons across the entire river
    const streamCount = this.reducedMotion ? 8 : 16;
    ctx.save();
    for (let i = 0; i < streamCount; i++) {
      const laneT = (i + 0.5) / streamCount;
      const y = horizonY + 10 + Math.pow(laneT, 1.25) * (waterH - 20);
      const speed = (14 + laneT * 26) * (i % 2 === 0 ? 1 : 0.78);
      const segW = 48 + laneT * 96;
      const x = ((i * 193 + this.elapsed * speed) % (W + segW * 2)) - segW;
      const alpha = (0.035 + 0.025 * Math.sin(this.elapsed * 1.2 + i)) * (0.5 + laneT * 0.5);

      ctx.strokeStyle = `rgba(176, 206, 238, ${alpha.toFixed(3)})`;
      ctx.lineWidth = 0.9 + laneT * 1.1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + segW * 0.5, y + Math.sin(this.elapsed * 1.4 + i) * 2.2, x + segW, y);
      ctx.stroke();
    }
    ctx.restore();

    // B. Animated moonlight shimmer path down the center
    const centerX = W * 0.5;
    const bands = this.reducedMotion ? 14 : 24;
    for (let i = 0; i < bands; i++) {
      const t = i / bands;
      const y = horizonY + 8 + Math.pow(t, 1.35) * (waterH - 18);
      const waveOffset = Math.sin(this.elapsed * 1.15 + i * 0.85) * (6 + t * 18);
      const halfW = (18 + (1 - Math.abs(t - 0.35)) * 54) * (0.78 + 0.22 * Math.sin(this.elapsed * 1.6 + i * 1.4));
      const alpha = (0.08 + 0.075 * Math.sin(this.elapsed * 1.9 + i * 1.7)) * (1 - t * 0.55);

      ctx.fillStyle = `rgba(251, 240, 212, ${Math.max(0.015, alpha).toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(centerX + waveOffset, y, halfW, 1.2 + t * 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _renderRipples(ctx) {
    for (const rp of this.ripples) {
      ctx.save();
      ctx.strokeStyle = rp.golden
        ? `rgba(245, 199, 126, ${rp.alpha.toFixed(3)})`
        : `rgba(220, 234, 250, ${rp.alpha.toFixed(3)})`;
      ctx.lineWidth = rp.golden ? 1.4 : 1.1;

      ctx.beginPath();
      ctx.ellipse(rp.x, rp.y, rp.radius, rp.radius * rp.squash, 0, 0, Math.PI * 2);
      ctx.stroke();

      if (rp.radius > 16) {
        ctx.strokeStyle = rp.golden
          ? `rgba(255, 230, 174, ${(rp.alpha * 0.45).toFixed(3)})`
          : `rgba(220, 234, 250, ${(rp.alpha * 0.4).toFixed(3)})`;
        ctx.beginPath();
        ctx.ellipse(rp.x, rp.y, rp.radius * 0.62, rp.radius * 0.62 * rp.squash, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  _renderPetals(ctx, W, H, horizonY, minDepth, maxDepth) {
    const waterH = H - horizonY;
    for (const p of this.petals) {
      if (p.depth < minDepth || p.depth >= maxDepth) continue;
      const sprite = this.images[p.key];
      if (!sprite || !sprite.complete || !sprite.naturalWidth) continue;

      const x = p.x * W;
      const y = horizonY + 12 + p.depth * (waterH - 34) + Math.sin(this.elapsed * 1.5 + p.bobPhase) * 2.5;
      const size = 12 + p.depth * 22;

      ctx.save();
      ctx.translate(x, y);
      ctx.globalAlpha = p.opacity * 0.22;
      ctx.scale(1, -0.4);
      ctx.rotate(p.rot);
      ctx.drawImage(sprite, -size / 2, -size / 2 - size * 0.55, size, size);
      ctx.restore();

      ctx.save();
      ctx.translate(x, y);
      ctx.globalAlpha = p.opacity;
      ctx.rotate(p.rot);
      ctx.scale(1, 0.72);
      ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
      ctx.restore();
    }
  }

  _renderFireflies(ctx, W, H) {
    for (const f of this.fireflies) {
      const glow = 0.22 + 0.78 * (0.5 + 0.5 * Math.sin(this.elapsed * f.speed + f.phase));
      const x = f.x * W;
      const y = f.y * H;

      const grad = ctx.createRadialGradient(x, y, 0.2, x, y, f.r * 4.5);
      grad.addColorStop(0, `rgba(255, 236, 178, ${(0.85 * glow).toFixed(3)})`);
      grad.addColorStop(0.4, `rgba(245, 199, 126, ${(0.28 * glow).toFixed(3)})`);
      grad.addColorStop(1, 'rgba(245, 199, 126, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, f.r * 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
