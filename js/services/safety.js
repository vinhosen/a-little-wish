/**
 * A Little Wish — Shared Validation, Sanitization & Anti-Abuse Guard
 * Protects against XSS, reserved-nickname impersonation, spam links,
 * profanity, and malformed DesignConfig payloads.
 */

const RESERVED_PATTERNS = [
  /a\s*little\s*wish/i,
  /collection/i,
  /\bsystem\b/i,
  /\badmin\b/i,
  /\bmoderator\b/i,
  /\bofficial\b/i,
  /sys-kr/i,
  /ระบบ/,
  /แอดมิน/,
  /ผู้ดูแล/,
  /คอลเลกชัน/,
];

const DISALLOWED_CONTENT_PATTERNS = [
  /https?:\/\//i,
  /www\./i,
  /<script/i,
  /javascript:/i,
  /ควย|เหี้ย|สัส|เย็ด|หี|อีดอก|ชาติหมา/i,
  /\b(fuck|shit|bitch|cunt|asshole|porn)\b/i,
];

export const ALLOWED_BASE_IDS = [
  'banana-bowl',
  'lotus-cup',
  'woven-bamboo',
  'swan-cradle',
  'royal-tier',
];

export const ALLOWED_FLOWER_SPECIES = [
  'lotus',
  'marigold',
  'jasmine',
  'orchid',
  'rose',
  'butterfly-pea',
  'hibiscus',
];

export const ALLOWED_CANDLE_IDS = ['beeswax', 'ivory', 'gold'];

export const ALLOWED_LAYOUTS = ['outer-ring', 'inner-ring', 'crescent', 'cluster', 'crown'];

export function stripUnsafeChars(text) {
  return String(text ?? '')
    .replace(/[\u0000-\u001F\u007F<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function validateNickname(raw) {
  const clean = stripUnsafeChars(raw);
  if (clean.length < 2) {
    return { ok: false, error: 'กรุณาตั้งชื่อเล่นอย่างน้อย 2 ตัวอักษร' };
  }
  if (clean.length > 24) {
    return { ok: false, error: 'ชื่อเล่นยาวได้ไม่เกิน 24 ตัวอักษร' };
  }
  if (RESERVED_PATTERNS.some((re) => re.test(clean))) {
    return { ok: false, error: 'ไม่สามารถใช้ชื่อที่สงวนไว้สำหรับระบบหรือคอลเลกชันได้' };
  }
  if (DISALLOWED_CONTENT_PATTERNS.some((re) => re.test(clean))) {
    return { ok: false, error: 'ชื่อเล่นมีคำหรือลิงก์ที่ไม่เหมาะสม กรุณาเลือกชื่อใหม่อีกครั้ง' };
  }
  return { ok: true, value: clean };
}

export function validateWishMessage(raw) {
  const clean = stripUnsafeChars(raw);
  if (clean.length > 140) {
    return { ok: false, error: 'คำอธิษฐานยาวได้ไม่เกิน 140 ตัวอักษร' };
  }
  if (DISALLOWED_CONTENT_PATTERNS.some((re) => re.test(clean))) {
    return { ok: false, error: 'ข้อความมีคำหรือลิงก์ที่ไม่อนุญาต กรุณาปรับถ้อยคำเล็กน้อยนะ' };
  }
  return { ok: true, value: clean };
}

function clampNum(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function sanitizeHexColor(c) {
  if (!c) return null;
  const s = String(c).trim();
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toLowerCase() : null;
}

/**
 * Normalize and bound every field of a DesignConfig so saved/remote configs
 * render deterministically and safely.
 */
export function sanitizeDesignConfig(raw = {}) {
  const baseId = ALLOWED_BASE_IDS.includes(raw.baseId) ? raw.baseId : 'banana-bowl';
  const candleId = ALLOWED_CANDLE_IDS.includes(raw.candleId) ? raw.candleId : 'beeswax';

  const rawFlowers = Array.isArray(raw.flowers) ? raw.flowers.slice(0, 3) : [];
  const flowers = rawFlowers
    .map((layer) => {
      if (!layer || !ALLOWED_FLOWER_SPECIES.includes(layer.species)) return null;
      const layout = ALLOWED_LAYOUTS.includes(layer.layout) ? layer.layout : 'outer-ring';
      return {
        species: layer.species,
        color: sanitizeHexColor(layer.color),
        count: Math.round(clampNum(layer.count, 1, 14, 8)),
        size: Number(clampNum(layer.size, 0.7, 1.35, 1.0).toFixed(2)),
        layout,
        radiusRatio: Number(clampNum(layer.radiusRatio, 0.22, 0.94, layout === 'inner-ring' ? 0.48 : 0.78).toFixed(2)),
        angleOffset: Math.round(clampNum(layer.angleOffset, 0, 360, 0)),
      };
    })
    .filter(Boolean);

  if (flowers.length === 0) {
    flowers.push({
      species: 'lotus',
      color: null,
      count: 8,
      size: 1.0,
      layout: 'outer-ring',
      radiusRatio: 0.78,
      angleOffset: 0,
    });
  }

  const rawOrnaments = raw.ornaments || {};
  const baisiChoices = [0, 2, 4, 6];
  const rawBaisi = Number(rawOrnaments.baisiCount) || 0;
  const baisiCount = baisiChoices.includes(rawBaisi) ? rawBaisi : 0;

  return {
    version: 2,
    baseId,
    baseTint: sanitizeHexColor(raw.baseTint),
    diameter: Number(clampNum(raw.diameter, 0.8, 1.25, 1.0).toFixed(2)),
    height: Number(clampNum(raw.height, 0.8, 1.25, 1.0).toFixed(2)),
    candleId,
    candleLit: raw.candleLit !== false,
    ornaments: {
      baisiCount,
      incense: Boolean(rawOrnaments.incense),
      pearlGarland: Boolean(rawOrnaments.pearlGarland),
      stardustGlow: Boolean(rawOrnaments.stardustGlow),
    },
    flowers,
  };
}
