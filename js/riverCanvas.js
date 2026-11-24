/**
 * A Little Wish — Interactive Canvas 2D Moonlit River Engine
 * Handles animated moonlight shimmer, perspective water ripples,
 * fireflies, painted floating petals, distant river lanterns,
 * and the user's live floating Krathong with reflections & embers.
 */

import { drawKrathongOnCanvas } from './krathongView.js';

export class RiverCanvas {
  constructor(canvas, images, { onWaterTap } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.images = images;
    this.onWaterTap = onWaterTap;

    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.horizonRatio = 0.54;

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.rafId = null;
    this.lastTime = 0;
    this.elapsed = 0;

    // Ambient particle layers
    this.ripples = [];
    this.fireflies = [];
    this.petals = [];
    this.distantLights = [];
    this.embers = [];

    // User's live floating krathong state (Scenes 5 & 6)
    this.userKrathong = null;
    this._wakeTimer = 0;
    this._emberTimer = 0;

    this._initParticles();
    this.resize();
    this._bindEvents();
  }

  _initParticles() {
    // 1. Warm drifting fireflies
    const fireflyCount = this.reducedMotion ? 8 : 22;
    this.fireflies = Array.from({ length: fireflyCount }, () => ({
      x: Math.random(),
      y: 0.28 + Math.random() * 0.58,
      r: 1.4 + Math.random() * 2.2,
      vx: (Math.random() - 0.5) * 0.008,
      vy: (Math.random() - 0.5) * 0.006,
      phase: Math.random() * Math.PI * 2,
      speed: 0.9 + Math.random() * 1.4,
    }));

    // 2. Painted drifting lotus petals & jasmine blossoms on the river
    const petalCount = this.reducedMotion ? 4 : 9;
    this.petals = Array.from({ length: petalCount }, (_, i) =>
      this._createPetal(true, i % 2 === 0 ? 'petalLotus' : 'petalJasmine')
    );

    // 3. Distant floating river krathong lights near the far water horizon (dy offset below horizon)
    this.distantLights = [
      { x: 0.24, dy: 0.028, drift: 0.0022, size: 3.0, phase: 0.4 },
      { x: 0.37, dy: 0.015, drift: 0.0018, size: 2.3, phase: 2.1 },
      { x: 0.64, dy: 0.019, drift: -0.0016, size: 2.6, phase: 3.8 },
      { x: 0.77, dy: 0.036, drift: -0.0020, size: 3.1, phase: 5.0 },
    ];
  }

  _createPetal(randomX = false, spriteKey = null, customX = null, customY = null) {
    const key = spriteKey || (Math.random() < 0.62 ? 'petalLotus' : 'petalJasmine');
    const depth = customY != null
      ? Math.max(0.15, Math.min(1, (customY / this.height - this.horizonRatio) / (1 - this.horizonRatio)))
      : 0.18 + Math.random() * 0.82;
    return {
      key,
      x: customX != null ? customX / this.width : (randomX ? Math.random() : -0.06),
      depth,
      vx: (0.006 + depth * 0.012) * (Math.random() < 0.8 ? 1 : -0.6),
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.32,
      bobPhase: Math.random() * Math.PI * 2,
      opacity: 0.45 + depth * 0.42,
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

    // Water tap listener (only triggers on clicks directly hitting the canvas)
    this._onPointerDown = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (y >= this.height * (this.horizonRatio - 0.01)) {
        this.spawnRipple(x, y, { golden: Boolean(this.userKrathong?.state === 'floating') });
        if (this.userKrathong && this.userKrathong.state === 'floating' && this.petals.length < 18) {
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
    // Align water horizon closely with moonlit-river-bg.jpg shoreline across mobile portrait & desktop
    this.horizonRatio = this.width < this.height ? 0.605 : 0.565;
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

  spawnRipple(x, y, { golden = false, maxRadius = null } = {}) {
    const horizonY = this.height * this.horizonRatio;
    const depth = Math.max(0.15, Math.min(1, (y - horizonY) / (this.height - horizonY)));
    this.ripples.push({
      x,
      y,
      radius: 4,
      maxRadius: maxRadius || (36 + depth * 74),
      squash: 0.24 + depth * 0.14,
      alpha: golden ? 0.62 : 0.45,
      golden,
    });
    if (this.ripples.length > 26) {
      this.ripples.shift();
    }
  }

  /**
   * Prepare the user's chosen lit krathong near foreground water edge (Scene 5).
   */
  prepareFloatingKrathong(krathongCfg) {
    this.userKrathong = {
      cfg: krathongCfg,
      state: 'ready', // 'ready' | 'floating' | 'settled'
      progress: 0,
      dragOffsetPx: 0,
      x: this.width * 0.5,
      y: this.height * 0.77,
      scale: 1,
      driftPhase: 0,
      onArrived: null,
      arrivedFired: false,
    };
    this._wakeTimer = 0;
    this._emberTimer = 0;
  }

  setDragOffset(offsetPx) {
    if (!this.userKrathong || this.userKrathong.state !== 'ready') return;
    this.userKrathong.dragOffsetPx = Math.max(-135, Math.min(20, offsetPx));
  }

  /**
   * Launch the krathong gently out toward the moonlit horizon.
   */
  releaseKrathong(onArrived) {
    if (!this.userKrathong || this.userKrathong.state !== 'ready') return;
    this.userKrathong.state = 'floating';
    this.userKrathong.onArrived = onArrived;
    this.userKrathong.arrivedFired = false;

    // Initial progress reflects how far the user pushed upward
    const dragBoost = Math.max(0, -this.userKrathong.dragOffsetPx / (this.height * 0.45));
    this.userKrathong.progress = Math.min(0.14, dragBoost);
    this.userKrathong.dragOffsetPx = 0;

    // Expanding celebratory golden ripples & escort petals
    const rx = this.userKrathong.x;
    const ry = this.userKrathong.y;
    this.spawnRipple(rx, ry + 6, { golden: true, maxRadius: 118 });
    setTimeout(() => this.spawnRipple(rx, ry - 4, { golden: true, maxRadius: 96 }), 260);

    for (let i = 0; i < 3; i++) {
      const px = rx + (Math.random() - 0.5) * 140;
      const py = ry + (Math.random() - 0.5) * 40;
      this.petals.push(this._createPetal(false, i % 2 === 0 ? 'petalLotus' : 'petalJasmine', px, py));
    }
  }

  clearFloatingKrathong() {
    this.userKrathong = null;
    this.embers = [];
  }

  getKrathongScreenRect() {
    if (!this.userKrathong) return null;
    const baseW = Math.min(230, Math.max(158, this.width * 0.44));
    const w = baseW * this.userKrathong.scale;
    const h = w / this.userKrathong.cfg.aspect;
    return {
      x: this.userKrathong.x - w / 2,
      y: this.userKrathong.y - h,
      width: w,
      height: h,
      cx: this.userKrathong.x,
      cy: this.userKrathong.y - h * 0.45,
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
      rp.alpha = Math.max(0, (rp.golden ? 0.6 : 0.44) * (1 - t) * (1 - t));
      if (t >= 1) this.ripples.splice(i, 1);
    }

    // 2. Update fireflies
    for (const f of this.fireflies) {
      f.x += f.vx * dt * timeScale;
      f.y += (f.vy + Math.sin(this.elapsed * 0.7 + f.phase) * 0.003) * dt * timeScale;
      if (f.x < -0.04) f.x = 1.04;
      if (f.x > 1.04) f.x = -0.04;
      if (f.y < 0.24) f.y = 0.84;
      if (f.y > 0.88) f.y = 0.28;
    }

    // 3. Update drifting painted petals
    for (let i = this.petals.length - 1; i >= 0; i--) {
      const p = this.petals[i];
      p.x += p.vx * dt * timeScale;
      p.rot += p.vrot * dt * timeScale;
      if (p.x > 1.08) {
        if (this.petals.length > 10) {
          this.petals.splice(i, 1);
        } else {
          p.x = -0.06;
          p.depth = 0.2 + Math.random() * 0.78;
        }
      } else if (p.x < -0.08) {
        p.x = 1.06;
      }
    }

    // 4. Distant krathong reflections
    for (const d of this.distantLights) {
      d.x += d.drift * dt * timeScale;
      if (d.x > 0.92) d.x = 0.08;
      if (d.x < 0.08) d.x = 0.92;
    }

    // 5. Rising golden candle embers
    for (let i = this.embers.length - 1; i >= 0; i--) {
      const em = this.embers[i];
      em.x += (em.vx + Math.sin(this.elapsed * 3 + em.phase) * 8) * dt;
      em.y += em.vy * dt;
      em.life -= dt;
      if (em.life <= 0) this.embers.splice(i, 1);
    }

    // 6. User's Live Floating Krathong (Scene 5 & Scene 6)
    const uk = this.userKrathong;
    if (uk) {
      const startY = this.height * 0.77;
      const endY = this.height * (this.horizonRatio + 0.035);

      if (uk.state === 'ready') {
        const bob = Math.sin(this.elapsed * 2.1) * 4;
        uk.x = this.width * 0.5;
        uk.y = startY + uk.dragOffsetPx + bob;
        uk.scale = Math.max(0.76, 1 + uk.dragOffsetPx / 620);
      } else if (uk.state === 'floating') {
        const duration = this.reducedMotion ? 3.2 : 7.2;
        uk.progress = Math.min(1, uk.progress + dt / duration);

        // Smooth ease-out cubic for realistic gentle water friction
        const eased = 1 - Math.pow(1 - uk.progress, 2.35);
        // Gentle poetic S-curve following the moonlit river center
        const sCurve = Math.sin(eased * Math.PI * 1.15) * Math.min(54, this.width * 0.11);
        uk.x = this.width * 0.5 + sCurve * (1 - eased * 0.35);
        uk.y = startY + (endY - startY) * eased + Math.sin(this.elapsed * 2.2) * (3.2 * (1 - eased * 0.6));
        uk.scale = 1 - eased * 0.75; // 1.0 -> 0.25 distant perspective

        // Spawn gentle trailing wake ripples
        this._wakeTimer += dt;
        if (this._wakeTimer > 0.72 && uk.progress < 0.88) {
          this._wakeTimer = 0;
          this.spawnRipple(uk.x, uk.y + 4, {
            golden: true,
            maxRadius: 34 + (1 - eased) * 58,
          });
        }

        // Spawn soft warm rising candle embers
        this._emberTimer += dt;
        if (!this.reducedMotion && this._emberTimer > 0.28) {
          this._emberTimer = 0;
          this.embers.push({
            x: uk.x + (Math.random() - 0.5) * 14 * uk.scale,
            y: uk.y - 72 * uk.scale,
            vx: (Math.random() - 0.5) * 10,
            vy: -(18 + Math.random() * 22),
            r: 1.2 + Math.random() * 1.6,
            life: 1.4 + Math.random() * 0.9,
            maxLife: 2.3,
            phase: Math.random() * 6,
          });
        }

        if (uk.progress >= 0.76 && !uk.arrivedFired) {
          uk.arrivedFired = true;
          if (typeof uk.onArrived === 'function') uk.onArrived();
        }

        if (uk.progress >= 1) {
          uk.state = 'settled';
          uk.settledBaseX = uk.x;
          uk.settledBaseY = endY;
        }
      } else if (uk.state === 'settled') {
        uk.driftPhase += dt * timeScale;
        uk.x = uk.settledBaseX + Math.sin(uk.driftPhase * 0.35) * 16;
        uk.y = uk.settledBaseY + Math.sin(uk.driftPhase * 1.7) * 1.8;
        uk.scale = 0.25;
      }
    }
  }

  render() {
    const ctx = this.ctx;
    const W = this.width;
    const H = this.height;
    const horizonY = H * this.horizonRatio;

    ctx.clearRect(0, 0, W, H);

    // 1. Live animated moonlight shimmer path across the central river
    this._renderMoonShimmer(ctx, W, H, horizonY);

    // 2. Distant tiny festival krathong lights near the far shore
    this._renderDistantLights(ctx, W, H);

    // 3. Interactive concentric perspective water ripples
    this._renderRipples(ctx);

    // 4. Painted floating flower petals (behind foreground krathong when farther away)
    this._renderPetals(ctx, W, H, horizonY, 0, 0.72);

    // 5. User's Live Floating Krathong (Scene 5 & Scene 6)
    if (this.userKrathong) {
      const uk = this.userKrathong;
      const baseW = Math.min(230, Math.max(158, W * 0.44));
      const sway = Math.sin(this.elapsed * 1.8) * 0.024;
      drawKrathongOnCanvas(ctx, {
        x: uk.x,
        y: uk.y,
        width: baseW * uk.scale,
        time: this.elapsed,
        sway,
        lit: true,
        krathongCfg: uk.cfg,
        images: this.images,
        drawReflection: true,
        opacity: 1,
      });
    }

    // 6. Foreground drifting petals
    this._renderPetals(ctx, W, H, horizonY, 0.72, 1.1);

    // 7. Rising warm candle embers
    for (const em of this.embers) {
      const a = Math.max(0, em.life / em.maxLife) * 0.85;
      ctx.fillStyle = `rgba(255, 224, 152, ${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(em.x, em.y, em.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 8. Soft glowing fireflies
    this._renderFireflies(ctx, W, H);
  }

  _renderMoonShimmer(ctx, W, H, horizonY) {
    const centerX = W * 0.5;
    const waterH = H - horizonY;
    const bands = this.reducedMotion ? 14 : 26;

    for (let i = 0; i < bands; i++) {
      const t = i / bands;
      const y = horizonY + 8 + Math.pow(t, 1.35) * (waterH - 18);
      const waveOffset = Math.sin(this.elapsed * 1.15 + i * 0.85) * (6 + t * 18);
      const halfW = (18 + (1 - Math.abs(t - 0.35)) * 56) * (0.78 + 0.22 * Math.sin(this.elapsed * 1.6 + i * 1.4));
      const alpha = (0.09 + 0.08 * Math.sin(this.elapsed * 1.9 + i * 1.7)) * (1 - t * 0.55);

      ctx.fillStyle = `rgba(251, 240, 212, ${Math.max(0.015, alpha).toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(centerX + waveOffset, y, halfW, 1.2 + t * 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _renderDistantLights(ctx, W, H) {
    for (const d of this.distantLights) {
      const x = d.x * W;
      const y = (this.horizonRatio + d.dy) * H;
      const pulse = 0.72 + 0.28 * Math.sin(this.elapsed * 2.4 + d.phase);

      // Soft warm halo
      const grad = ctx.createRadialGradient(x, y, 0.5, x, y, d.size * 5.2);
      grad.addColorStop(0, `rgba(255, 222, 148, ${(0.58 * pulse).toFixed(3)})`);
      grad.addColorStop(0.5, `rgba(240, 168, 82, ${(0.16 * pulse).toFixed(3)})`);
      grad.addColorStop(1, 'rgba(240, 168, 82, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, d.size * 5.2, 0, Math.PI * 2);
      ctx.fill();

      // Tiny bright flame pinprick
      ctx.fillStyle = `rgba(255, 246, 214, ${(0.88 * pulse).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, d.size * 0.55, 0, Math.PI * 2);
      ctx.fill();

      // Tiny vertical reflection shimmer below
      ctx.fillStyle = `rgba(245, 199, 126, ${(0.22 * pulse).toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(x, y + d.size * 2.5, d.size * 1.2, d.size * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _renderRipples(ctx) {
    for (const rp of this.ripples) {
      ctx.save();
      ctx.strokeStyle = rp.golden
        ? `rgba(245, 199, 126, ${rp.alpha.toFixed(3)})`
        : `rgba(220, 234, 250, ${rp.alpha.toFixed(3)})`;
      ctx.lineWidth = rp.golden ? 1.5 : 1.15;

      // Primary ring
      ctx.beginPath();
      ctx.ellipse(rp.x, rp.y, rp.radius, rp.radius * rp.squash, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Secondary delicate inner echo ring
      if (rp.radius > 16) {
        ctx.strokeStyle = rp.golden
          ? `rgba(255, 230, 174, ${(rp.alpha * 0.5).toFixed(3)})`
          : `rgba(220, 234, 250, ${(rp.alpha * 0.45).toFixed(3)})`;
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
      const y = horizonY + 14 + p.depth * (waterH - 36) + Math.sin(this.elapsed * 1.5 + p.bobPhase) * 2.5;
      const size = 12 + p.depth * 24;

      ctx.save();
      ctx.translate(x, y);

      // Subtle mirrored reflection underneath petal
      ctx.globalAlpha = p.opacity * 0.24;
      ctx.scale(1, -0.42);
      ctx.rotate(p.rot);
      ctx.drawImage(sprite, -size / 2, -size / 2 - size * 0.55, size, size);
      ctx.restore();

      // Crisp floating petal on water surface
      ctx.save();
      ctx.translate(x, y);
      ctx.globalAlpha = p.opacity;
      ctx.rotate(p.rot);
      ctx.scale(1, 0.72); // Gentle perspective foreshortening on water
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
