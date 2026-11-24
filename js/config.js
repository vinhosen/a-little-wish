/**
 * A Little Wish — Unified Asset Manifest, Modular Creator Catalog & Constants
 */

export const ASSETS = {
  // Atmosphere & River
  nightSky: 'assets/images/night-sky.jpg',
  riverBg: 'assets/images/moonlit-river-bg.jpg',
  moonlight: 'assets/images/moonlight.png',
  floralOrnament: 'assets/images/decor-floral-ornament.png',
  petalLotus: 'assets/images/petal-lotus.png',
  petalJasmine: 'assets/images/petal-jasmine.png',

  // Modular Krathong Bases (5 distinct materials & silhouettes)
  baseBananaBowl: 'assets/images/base-banana-bowl.png',
  baseLotusCup: 'assets/images/base-lotus-cup.png',
  baseWovenBamboo: 'assets/images/base-woven-bamboo.png',
  baseSwanCradle: 'assets/images/base-swan-cradle.png',
  baseRoyalTier: 'assets/images/base-royal-tier.png',

  // Modular Botanical Flowers (7 distinct species)
  flowerLotus: 'assets/images/flower-lotus.png',
  flowerMarigold: 'assets/images/flower-marigold.png',
  flowerJasmine: 'assets/images/petal-jasmine.png',
  flowerOrchid: 'assets/images/flower-orchid.png',
  flowerRose: 'assets/images/flower-rose.png',
  flowerButterflyPea: 'assets/images/flower-butterfly-pea.png',
  flowerHibiscus: 'assets/images/flower-hibiscus.png',

  // Candles, Flame & Thai Decorative Ornaments
  candleBeeswax: 'assets/images/candle.png',
  candleIvory: 'assets/images/candle-ivory.png',
  candleGold: 'assets/images/candle-gold.png',
  flame: 'assets/images/flame.png',
  decorBaisi: 'assets/images/decor-baisi.png',
};

/**
 * Base geometry calibration for 3D perspective flower rings, ornaments & candle anchors.
 * Coordinates are normalized (0..1) relative to each base PNG's bounding box.
 */
export const KRATHONG_BASES = [
  {
    id: 'banana-bowl',
    assetKey: 'baseBananaBowl',
    nameTh: 'ใบตองจีบคลาสสิก',
    nameEn: 'Pleated Banana Leaf',
    materialNote: 'ใบตองสดพับกลีบประณีต',
    deckCx: 0.50,
    deckCy: 0.37,
    deckRx: 0.31,
    deckRy: 0.14,
    hullBottom: 0.94,
    candleScale: 0.44,
    defaultTint: null,
  },
  {
    id: 'lotus-cup',
    assetKey: 'baseLotusCup',
    nameTh: 'ถ้วยกลีบบัวแสงจันทร์',
    nameEn: 'Lotus Petal Cradle',
    materialNote: 'กลีบบัวหยกขาวซ้อนชั้นละมุน',
    deckCx: 0.50,
    deckCy: 0.35,
    deckRx: 0.25,
    deckRy: 0.115,
    hullBottom: 0.93,
    candleScale: 0.42,
    defaultTint: null,
  },
  {
    id: 'woven-bamboo',
    assetKey: 'baseWovenBamboo',
    nameTh: 'กระจาดไม้ไผ่สาน',
    nameEn: 'Woven Bamboo Tray',
    materialNote: 'ตอกไม้ไผ่สานรองด้วยใบตองสด',
    deckCx: 0.50,
    deckCy: 0.44,
    deckRx: 0.35,
    deckRy: 0.16,
    hullBottom: 0.92,
    candleScale: 0.46,
    defaultTint: null,
  },
  {
    id: 'swan-cradle',
    assetKey: 'baseSwanCradle',
    nameTh: 'หงส์น้อยเคียงจันทร์',
    nameEn: 'Moonlit Swan Cradle',
    materialNote: 'หงส์กลีบบัวบนฐานใบตองพับ',
    deckCx: 0.445,
    deckCy: 0.44,
    deckRx: 0.19,
    deckRy: 0.095,
    hullBottom: 0.93,
    candleScale: 0.38,
    defaultTint: null,
  },
  {
    id: 'royal-tier',
    assetKey: 'baseRoyalTier',
    nameTh: 'บุษบกใบตองสองชั้น',
    nameEn: 'Royal Two-Tier Pedestal',
    materialNote: 'ใบตองสองชั้นขลิบทองประณีต',
    deckCx: 0.50,
    deckCy: 0.285,
    deckRx: 0.25,
    deckRy: 0.115,
    hullBottom: 0.94,
    candleScale: 0.41,
    defaultTint: null,
  },
];

export const FLOWER_CATALOG = [
  { id: 'lotus', assetKey: 'flowerLotus', nameTh: 'ดอกบัว', nameEn: 'Lotus', baseSize: 0.20 },
  { id: 'marigold', assetKey: 'flowerMarigold', nameTh: 'ดาวเรือง', nameEn: 'Marigold', baseSize: 0.175 },
  { id: 'jasmine', assetKey: 'flowerJasmine', nameTh: 'ดอกมะลิ', nameEn: 'Jasmine', baseSize: 0.135 },
  { id: 'orchid', assetKey: 'flowerOrchid', nameTh: 'กล้วยไม้', nameEn: 'Orchid', baseSize: 0.185 },
  { id: 'rose', assetKey: 'flowerRose', nameTh: 'กุหลาบ', nameEn: 'Rose', baseSize: 0.185 },
  { id: 'butterfly-pea', assetKey: 'flowerButterflyPea', nameTh: 'ดอกอัญชัน', nameEn: 'Butterfly Pea', baseSize: 0.16 },
  { id: 'hibiscus', assetKey: 'flowerHibiscus', nameTh: 'ชบาตะวันตกดิน', nameEn: 'Hibiscus', baseSize: 0.185 },
];

export const FLOWER_COLOR_SWATCHES = [
  { id: 'natural', label: 'สีธรรมชาติ', hex: null },
  { id: 'blush', label: 'ชมพูระเรื่อ', hex: '#f4b8c8' },
  { id: 'ivory', label: 'ขาวนวลแสงจันทร์', hex: '#f8f0dc' },
  { id: 'gold', label: 'เหลืองทองอร่าม', hex: '#f4c158' },
  { id: 'lavender', label: 'ม่วงลาเวนเดอร์', hex: '#cbb0ee' },
  { id: 'indigo', label: 'ครามยามค่ำ', hex: '#6c87d6' },
  { id: 'coral', label: 'ส้มพีชยามเย็น', hex: '#f39b78' },
];

export const BASE_TINT_SWATCHES = [
  { id: 'natural', label: 'เขียวใบตองธรรมชาติ', hex: null },
  { id: 'emerald', label: 'เขียวมรกตเข้ม', hex: '#2e6e4d' },
  { id: 'jade', label: 'เขียวหยกอ่อน', hex: '#8dbba0' },
  { id: 'moon-ivory', label: 'นวลแสงจันทร์', hex: '#ede4d2' },
  { id: 'amber-gold', label: 'ทองอบอุ่น', hex: '#d8a657' },
];

export const CANDLE_CATALOG = [
  { id: 'beeswax', assetKey: 'candleBeeswax', nameTh: 'เทียนขี้ผึ้งอบอุ่น', nameEn: 'Warm Beeswax' },
  { id: 'ivory', assetKey: 'candleIvory', nameTh: 'เทียนไข่มุกแสงจันทร์', nameEn: 'Moonlit Ivory' },
  { id: 'gold', assetKey: 'candleGold', nameTh: 'เทียนแกะสลักทอง', nameEn: 'Carved Golden' },
];

export const FLOWER_LAYOUTS = [
  { id: 'outer-ring', nameTh: 'เรียงรอบวงนอก' },
  { id: 'inner-ring', nameTh: 'ล้อมรอบเทียน' },
  { id: 'crescent', nameTh: 'ทรงจันทร์เสี้ยว' },
  { id: 'cluster', nameTh: 'ช่อดอกไม้คู่' },
  { id: 'crown', nameTh: 'มงกุฎดอกไม้' },
];

export const WISH_PRESETS = [
  'ขอให้คืนนี้ใจเบาสบาย',
  'ขอให้ทุกวันข้างหน้าอ่อนโยนกับเรา',
  'ขอให้มีรอยยิ้มในเรื่องเล็ก ๆ เสมอ',
];

export const DEFAULT_SILENT_WISH = 'คำอธิษฐานเงียบ ๆ ที่เก็บไว้ในใจใต้แสงจันทร์';
export const SYSTEM_COLLECTION_BADGE = 'A Little Wish Collection';
export const TOTAL_SCENES = 6;
