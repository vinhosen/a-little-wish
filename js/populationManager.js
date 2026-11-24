/**
 * A Little Wish — River Population Manager & Hydrodynamic Buoyancy Physics
 * Manages System Collection (SYS-KR-001..010) + real Player Krathongs
 * using deterministic stable seeds, continuous directional river current,
 * per-krathong wave sampling (bob, tilt, yaw), soft collision separation,
 * interactive ripple impulses, and LOD/viewport culling.
 */

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/**
 * Procedural continuous water wave & current field.
 * Coordinates nx (0..1), depth (0=far shore, 1=foreground).
 */
export function sampleWaterField(nx, depth, time) {
  const w1 = Math.sin(nx * 7.5 - time * 1.15 + depth * 3.1);
  const w2 = Math.cos(nx * 12.2 + time * 0.85 - depth * 5.4) * 0.55;
  const w3 = Math.sin((nx + depth) * 16.0 - time * 1.65) * 0.28;

  const height = (w1 + w2 + w3) * (0.45 + depth * 0.55);

  // Analytical spatial derivatives for realistic tilt response
  const dwDx =
    7.5 * Math.cos(nx * 7.5 - time * 1.15 + depth * 3.1) -
    12.2 * 0.55 * Math.sin(nx * 12.2 + time * 0.85 - depth * 5.4);
  const dwDy =
    3.1 * Math.cos(nx * 7.5 - time * 1.15 + depth * 3.1) +
    5.4 * 0.55 * Math.sin(nx * 12.2 + time * 0.85 - depth * 5.4);

  // Gentle river current flowing predominantly left-to-right with subtle meander
  const currentVx = (0.0085 + depth * 0.0115) * (0.85 + 0.15 * Math.sin(depth * 4.2 + time * 0.25));
  const currentVy = Math.sin(nx * 4.2 + time * 0.32) * 0.0022;

  return { height, dwDx, dwDy, currentVx, currentVy };
}

export class RiverPopulationManager {
  constructor({ maxVisible = 20 } = {}) {
    this.maxVisible = maxVisible;
    this.entities = new Map(); // krathongId -> physics entity
    this._rippleTimer = 0;
  }

  /**
   * Synchronize System Krathongs + real Player Krathongs without losing
   * existing physical positions/velocities of krathongs already on the river.
   */
  syncRecords(records, { currentPlayerId = null } = {}) {
    const released = records.filter((r) => r.releaseStatus === 'released');

    // Prioritize player's own krathongs, then newest community players, then System Collection
    const sorted = [...released].sort((a, b) => {
      const aOwn = currentPlayerId && a.playerId === currentPlayerId ? 1 : 0;
      const bOwn = currentPlayerId && b.playerId === currentPlayerId ? 1 : 0;
      if (aOwn !== bOwn) return bOwn - aOwn;
      if (a.isSystem !== b.isSystem) return a.isSystem ? 1 : -1;
      return new Date(b.releasedAt || b.createdAt || 0) - new Date(a.releasedAt || a.createdAt || 0);
    });

    const activeIds = new Set();
    const capped = sorted.slice(0, this.maxVisible);

    capped.forEach((rec, slotIdx) => {
      activeIds.add(rec.krathongId);
      const existing = this.entities.get(rec.krathongId);
      if (existing) {
        existing.record = rec;
        return;
      }

      // Deterministic initial lane & X based on stable krathongId + riverSeed
      const s1 = typeof rec.riverSeed === 'number' ? rec.riverSeed : hashSeed(rec.krathongId);
      const s2 = hashSeed(`${rec.krathongId}:depth`);
      const s3 = hashSeed(`${rec.krathongId}:phase`);

      // Distribute across 15..20 stable non-clumping lanes from depth 0.14 (mid-far) to 0.84 (near)
      const laneDepth = 0.14 + ((slotIdx * 0.6180339 + s2 * 0.25) % 1) * 0.70;
      const startNx = 0.08 + ((slotIdx * 0.381966 + s1 * 0.45) % 1) * 0.84;
      const diameter = rec.designConfig?.diameter || 1.0;

      this.entities.set(rec.krathongId, {
        id: rec.krathongId,
        record: rec,
        nx: startNx,
        depth: laneDepth,
        vx: 0,
        vDepth: 0,
        bobOffset: 0,
        tilt: 0,
        yaw: (s3 - 0.5) * 0.12,
        inertia: 0.78 + diameter * 0.42,
        phaseBob: s1 * Math.PI * 2,
        phaseTilt: s2 * Math.PI * 2,
        phaseMeander: s3 * Math.PI * 2,
        rippleCooldown: 0.6 + s1 * 2.4,
        justReleasedTimer: 0,
      });
    });

    // Remove records no longer active in window
    for (const id of this.entities.keys()) {
      if (!activeIds.has(id)) {
        this.entities.delete(id);
      }
    }
  }

  /**
   * Place a newly released player krathong smoothly into the foreground river
   * from the release launch point.
   */
  spawnReleasedPlayerKrathong(record, startNx = 0.5, startDepth = 0.78) {
    const s1 = hashSeed(record.krathongId);
    const s2 = hashSeed(`${record.krathongId}:tilt`);
    const diameter = record.designConfig?.diameter || 1.0;

    this.entities.set(record.krathongId, {
      id: record.krathongId,
      record,
      nx: startNx,
      depth: startDepth,
      vx: 0.012,
      vDepth: -0.055, // Glides outward toward mid-river gently after release
      bobOffset: 0,
      tilt: 0,
      yaw: 0,
      inertia: 0.78 + diameter * 0.42,
      phaseBob: s1 * Math.PI * 2,
      phaseTilt: s2 * Math.PI * 2,
      phaseMeander: s1 * 4.5,
      rippleCooldown: 0.2,
      justReleasedTimer: 4.5,
    });
  }

  /**
   * Inject radial wave impulse from water taps or newly released krathongs.
   */
  applyWaveImpulse(normX, depth, strength = 1.0) {
    for (const ent of this.entities.values()) {
      const dx = ent.nx - normX;
      const dy = (ent.depth - depth) * 0.65;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.005 && dist < 0.24) {
        const falloff = (1 - dist / 0.24) * strength;
        ent.vx += (dx / dist) * 0.025 * falloff / ent.inertia;
        ent.vDepth += (dy / dist) * 0.022 * falloff / ent.inertia;
        ent.tilt += (dx > 0 ? 0.04 : -0.04) * falloff;
      }
    }
  }

  step(dt, time, width, height, horizonRatio, { spawnRipple } = {}) {
    const list = Array.from(this.entities.values());
    const waterH = Math.max(120, height * (1 - horizonRatio));

    // 1. Sample procedural water field + independent bobbing/tilt/current per krathong
    for (const ent of list) {
      const field = sampleWaterField(ent.nx, ent.depth, time);

      // Gentle deceleration of post-release outward glide into natural river lane
      if (ent.justReleasedTimer > 0) {
        ent.justReleasedTimer = Math.max(0, ent.justReleasedTimer - dt);
        ent.vDepth *= Math.pow(0.45, dt);
      } else {
        // Gentle lane-keeping restoring drift so krathongs spread naturally across river
        const targetVDepth = field.currentVy + Math.sin(time * 0.26 + ent.phaseMeander) * 0.0038;
        ent.vDepth += (targetVDepth - ent.vDepth) * Math.min(1, dt * 1.4);
      }

      const targetVx = (field.currentVx / ent.inertia) + Math.cos(time * 0.22 + ent.phaseMeander) * 0.002;
      ent.vx += (targetVx - ent.vx) * Math.min(1, dt * 1.6);

      ent.nx += ent.vx * dt;
      ent.depth += ent.vDepth * dt;

      // Keep depth softly bounded within navigable river channel (0.11 .. 0.88)
      if (ent.depth < 0.11) {
        ent.depth = 0.11;
        ent.vDepth = Math.abs(ent.vDepth) * 0.5 + 0.002;
      } else if (ent.depth > 0.88) {
        ent.depth = 0.88;
        ent.vDepth = -Math.abs(ent.vDepth) * 0.5 - 0.002;
      }

      // Smooth wraparound downstream -> upstream outside horizontal viewport edge
      if (ent.nx > 1.12) {
        ent.nx = -0.10;
      } else if (ent.nx < -0.12) {
        ent.nx = 1.10;
      }

      // Vertical bobbing & wave-slope tilt (distinct frequency & phase per krathong)
      const localBob = Math.sin(time * (1.55 / ent.inertia) + ent.phaseBob) * (2.4 + ent.depth * 2.6);
      ent.bobOffset = field.height * 2.1 + localBob;

      const targetTilt = (field.dwDx * 0.0038 + Math.sin(time * 1.35 + ent.phaseTilt) * 0.022) / ent.inertia;
      ent.tilt += (targetTilt - ent.tilt) * Math.min(1, dt * 4.5);
      ent.yaw = Math.sin(time * 0.42 + ent.phaseMeander) * 0.04;

      // Compute screen coordinates & perspective size for rendering & collision
      const persp = 0.27 + Math.pow(ent.depth, 1.12) * 0.73;
      const baseScreenW = Math.min(185, Math.max(122, width * 0.34));
      const diameter = ent.record.designConfig?.diameter || 1.0;

      ent.screenX = ent.nx * width;
      ent.screenY = height * horizonRatio + 10 + ent.depth * (waterH - 22) + ent.bobOffset;
      ent.screenW = baseScreenW * persp * diameter;
      ent.persp = persp;

      // Periodic expanding hull ripples
      ent.rippleCooldown -= dt;
      if (ent.rippleCooldown <= 0) {
        ent.rippleCooldown = 1.9 + (ent.phaseBob % 1.8);
        if (spawnRipple && ent.nx > 0.02 && ent.nx < 0.98) {
          spawnRipple(ent.screenX, ent.screenY + 2, {
            golden: ent.record.designConfig?.candleLit !== false,
            maxRadius: 22 + ent.persp * 42,
          });
        }
      }
    }

    // 2. Pairwise soft hydrodynamic collision separation (prevents unnatural overlap)
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        const dx = b.screenX - a.screenX;
        const dy = (b.screenY - a.screenY) * 2.3; // Elliptical footprint on perspective river
        const dist = Math.hypot(dx, dy);
        const minDist = (a.screenW + b.screenW) * 0.46;

        if (dist > 0.01 && dist < minDist) {
          const push = ((minDist - dist) / minDist) * 0.045 * dt;
          const ux = dx / dist;
          const uy = dy / dist;

          a.nx -= (ux * push) / a.inertia;
          b.nx += (ux * push) / b.inertia;
          a.depth -= (uy * push * 0.45) / a.inertia;
          b.depth += (uy * push * 0.45) / b.inertia;
        }
      }
    }

    // 3. Return sorted back-to-front by screenY for clean painter's occlusion
    return list.sort((a, b) => a.screenY - b.screenY);
  }

  hitTest(clientX, clientY, sortedEntities) {
    // Check front-to-back so foreground krathong wins naturally
    for (let i = sortedEntities.length - 1; i >= 0; i--) {
      const ent = sortedEntities[i];
      const hw = Math.max(28, ent.screenW * 0.56);
      const hh = Math.max(28, ent.screenW * 0.65);
      const cx = ent.screenX;
      const cy = ent.screenY - hh * 0.42;

      if (Math.abs(clientX - cx) <= hw && Math.abs(clientY - cy) <= hh * 0.65) {
        return ent;
      }
    }
    return null;
  }
}
