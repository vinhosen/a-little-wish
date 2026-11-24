/**
 * A Little Wish — Project Configuration & Asset Manifest
 */

export const ASSETS = {
  nightSky: 'assets/images/night-sky.jpg',
  riverBg: 'assets/images/moonlit-river-bg.jpg',
  moonlight: 'assets/images/moonlight.png',
  candle: 'assets/images/candle.png',
  flame: 'assets/images/flame.png',
  petalLotus: 'assets/images/petal-lotus.png',
  petalJasmine: 'assets/images/petal-jasmine.png',
  floralOrnament: 'assets/images/decor-floral-ornament.png',
};

/**
 * Calibrated Krathong definitions (3 distinct illustrated designs).
 * candleX / candleY / candleW align the separate candle.png & flame.png
 * cleanly inside each krathong's central floral pocket.
 */
export const KRATHONGS = [
  {
    id: 'lotus',
    nameTh: 'กระทงบัวชมพูแสงจันทร์',
    nameEn: 'Blush Moonlit Lotus',
    shortLabel: 'บัวชมพู',
    description: 'กลีบบัวสีชมพูอ่อนละมุน สำหรับคำอธิษฐานที่อบอุ่นและอ่อนโยน',
    image: 'assets/images/krathong-lotus.png',
    aspect: 640 / 506,
    // DOM percentages within .krathong-assembly (aspect 640/556)
    domCandleX: '50%',
    domCandleY: '42%',
    domCandleW: '12.5%',
    // Canvas normalized coordinates relative to krathong image width/height
    canvasCandleX: 0.50,
    canvasCandleY: 0.34,
    canvasCandleScale: 0.48,
  },
  {
    id: 'classic',
    nameTh: 'กระทงใบตองจันทร์นวล',
    nameEn: 'Classic Moonlit Leaf',
    shortLabel: 'ใบตองคลาสสิก',
    description: 'ใบตองจีบประณีตเคียงมะลิและดาวเรือง เรียบง่ายและอบอุ่นใจ',
    image: 'assets/images/krathong-classic.png',
    aspect: 640 / 515,
    domCandleX: '50%',
    domCandleY: '41.5%',
    domCandleW: '11.4%',
    canvasCandleX: 0.50,
    canvasCandleY: 0.35,
    canvasCandleScale: 0.45,
  },
  {
    id: 'swan',
    nameTh: 'กระทงหงส์น้อยเคียงจันทร์',
    nameEn: 'Little Moonlit Swan',
    shortLabel: 'หงส์น้อย',
    description: 'หงส์น้อยกลีบบัวสีนวล แสนน่ารักและพกพารอยยิ้มเล็ก ๆ ไปกับสายน้ำ',
    image: 'assets/images/krathong-swan.png',
    aspect: 640 / 556,
    domCandleX: '48.5%',
    domCandleY: '48.5%',
    domCandleW: '10.6%',
    canvasCandleX: 0.485,
    canvasCandleY: 0.47,
    canvasCandleScale: 0.41,
  },
];

export const WISH_PRESETS = [
  'ขอให้คืนนี้ใจเบาสบาย',
  'ขอให้ทุกวันข้างหน้าอ่อนโยนกับเรา',
  'ขอให้มีรอยยิ้มในเรื่องเล็ก ๆ เสมอ',
];

export const DEFAULT_SILENT_WISH = 'คำอธิษฐานเงียบ ๆ ที่เก็บไว้ในใจใต้แสงจันทร์';

export const TOTAL_SCENES = 6;
