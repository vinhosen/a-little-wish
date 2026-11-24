# QA Report — A Little Wish

รายงานผลการตรวจสอบคุณภาพทั้งด้าน **Visual Assets**, **Functional End-to-End**, **Responsive Layout**, **Accessibility**, และ **Performance** จากการทดสอบจริงบนเบราว์เซอร์

---

## 1. สภาพแวดล้อมการทดสอบจริง

- **Browser Engine:** Google Chrome (Headless Chromium via Playwright for Python)
- **Server:** Local HTTP Static Server (`127.0.0.1`)
- **Viewports ที่ทดสอบจริง:**
  1. **Mobile Portrait (Primary):** `390 × 844`, `deviceScaleFactor: 2`, `has_touch: true`
  2. **Compact Mobile (iPhone SE):** `375 × 667`, `has_touch: true`
  3. **Desktop + Reduced Motion:** `1280 × 800`, `prefers-reduced-motion: reduce`

---

## 2. ผลการตรวจสอบ Image Assets (Asset Inspection)

| Asset | หมวดหมู่ | ขนาด (px) | ขนาดไฟล์ | ผลการตรวจคุณภาพ |
|---|---|---:|---:|---|
| `night-sky.jpg` | Night Sky | 1200×896 | 124 KB | ผ่าน (สร้างใหม่รอบ 2 เพื่อแก้ขอบกระดาษสีขาวในรอบแรก) |
| `moonlit-river-bg.jpg` | Moonlit River Background | 1200×896 | 136 KB | ผ่าน (สร้างใหม่รอบ 2 เพื่อตัดพระจันทร์เสี้ยวและขอบขาวออก ให้ใช้พระจันทร์เต็มดวงแยกชิ้น) |
| `moonlight.png` | Moonlight (RGBA) | 512×512 | 245 KB | ผ่าน (พื้นหลังโปร่งใสแบบ Optical Alpha ไร้กรอบดำ) |
| `krathong-lotus.png` | Krathong 1 (RGBA) | 640×506 | 474 KB | ผ่าน (ตัดพื้นหลังโปร่งใสเนียน ไร้ขอบสีฟ้าตกค้าง) |
| `krathong-classic.png` | Krathong 2 (RGBA) | 640×515 | 515 KB | ผ่าน (ขอบกลีบใบตองคมชัด ไร้ขอบสีฟ้าตกค้าง) |
| `krathong-swan.png` | Krathong 3 (RGBA) | 640×556 | 476 KB | ผ่าน (ลายเส้นและโทนสีสอดคล้องกับอีก 2 แบบ) |
| `candle.png` | Candle (RGBA) | 94×320 | 34 KB | ผ่าน (จัดพิกัดวางตรงกลางกระทงทั้ง 3 แบบแม่นยำ) |
| `flame.png` | Flame (RGBA) | 203×256 | 62 KB | ผ่าน (เปลวไฟโปร่งใสเรืองแสงธรรมชาติเหนือไส้เทียน) |
| `petal-lotus.png` | Flower Petal (RGBA) | 168×192 | 45 KB | ผ่าน (ใช้ลอยบน Canvas 2D พร้อมเงาสะท้อนน้ำ) |
| `petal-jasmine.png` | Flower / Decorative (RGBA) | 186×192 | 47 KB | ผ่าน (ใช้ลอยบน Canvas 2D พร้อมเงาสะท้อนน้ำ) |
| `decor-floral-ornament.png` | Decorative Ornament (RGBA) | 322×120 | 54 KB | ผ่าน (ประกอบจากภาพวาดกลีบบัวและดอกมะลิจริงสำหรับหัวการ์ด) |
| `favicon.png` | Site Icon (RGBA) | 64×64 | 3.9 KB | ผ่าน (สร้างจากภาพดวงจันทร์จริง ลด Error 404) |

- **น้ำหนักโปรเจกต์รวมทั้งหมด:** `2.4 MB` (รวม Source Code + Assets ทั้ง 12 ไฟล์)

---

## 3. สรุปผลการทดสอบตามข้อกำหนด (Test Checklist)

| รายการทดสอบ | สถานะ | หลักฐานจากการทดสอบจริง |
|---|---|---|
| ครบทั้ง 6 ฉากตามลำดับอารมณ์ | **PASS** | ทดสอบเปลี่ยนฉาก 1 → 2 → 3 → 4 → 5 → 6 และตรวจภาพหน้าจอจริงครบทุกฉาก |
| การเลือกกระทงทั้ง 3 แบบ | **PASS** | ทดสอบทั้งปุ่มลูกศร, ปุ่ม Thumbnail, Pointer Swipe และคีย์บอร์ด `ArrowRight` |
| การจุดเทียนและเขียนคำอธิษฐาน | **PASS** | แตะไส้เทียนจุดไฟได้จริง + แตะปุ่มหลักตอนยังไม่จุดจะช่วยจุดเทียนให้ + ตัวนับอักษรและ Chip คำอธิษฐานทำงานครบ |
| การปล่อยกระทงลงน้ำจริง | **PASS** | ทดสอบทั้งการคลิกปุ่ม และการลากกระทงขึ้นบนผิวน้ำ Canvas โดยตรง (ป้องกันการกดซ้ำแล้ว) |
| Animation ไม่ติดขัดหรือซ้ำซ้อน | **PASS** | มี Transition Guard, ล็อกปุ่มปล่อยหลังปล่อยแล้ว, หยุด `requestAnimationFrame` เมื่อซ่อนแท็บ |
| Responsive Layout ไม่มี Overflow | **PASS** | `horizontalOverflow: false`, `cardClippedHoriz: false`, และ `sceneNeedsScroll: false` บน `390×844`, `375×667`, `1280×800` |
| ไม่มี Broken Assets | **PASS** | `brokenImgs: []` ในทุกฉากและทุก Viewport |
| ไม่มี Console Errors | **PASS** | `console_errors: []`, `page_errors: []`, `failed_requests: []` |
| เปิดและปิดเสียงได้ | **PASS** | ทดสอบสลับ `#btn-sound` ระหว่าง `aria-pressed="true"` และ `"false"` พร้อมสลับไอคอน SVG ถูกต้อง |
| บันทึกการ์ดความทรงจำ (Keepsake PNG) | **PASS** | ดาวน์โหลดไฟล์ `a-little-wish-swan.png` สำเร็จ (`~2.2 MB`, `1080×1350px`) และตรวจภาพผลลัพธ์จริงแล้ว |
| รองรับ Reduced Motion | **PASS** | ทดสอบภายใต้ `prefers-reduced-motion: reduce` ลดความเร็วแอนิเมชันและตัด `transition-delay` ออกทั้งหมด |
| เริ่มประสบการณ์ใหม่ได้ | **PASS** | ปุ่ม `เริ่มค่ำคืนใหม่อีกครั้ง` รีเซ็ตกลับฉาก 1, ล้างข้อความอธิษฐาน, ดับเทียน และเคลียร์กระทงบนผิวน้ำครบถ้วน |

---

## 4. ปัญหาที่พบระหว่าง QA และดำเนินการแก้ไขแล้ว

1. **ปุ่มจุดเทียนขยับตามแอนิเมชันกระทง (`#btn-light-candle`):** ในการทดสอบรอบแรก Playwright ตรวจพบว่าปุ่มจุดเทียนขยับขึ้นลงตาม `gentleBob` ทำให้แตะยากบนมือถือ → แก้โดยแยกชั้นแอนิเมชัน `.krathong-bob-layer` ออกจากปุ่ม `.candle-hotspot` ให้พื้นที่แตะนิ่งสนิทและตรงตำแหน่งไส้เทียนพอดี
2. **ไอคอนปุ่มเสียงแสดงซ้อนกัน / ไม่สลับบน SVG:** การกำหนด `.hidden` ใน JS บน `<svg>` ไม่ไปเปลี่ยน Attribute `hidden` ของ SVG → แก้โดยเพิ่ม `[hidden] { display: none !important; }` และใช้ `setAttribute`/`removeAttribute('hidden')` แทน
3. **404 Console Error จาก `/favicon.ico`:** เพิ่ม `assets/images/favicon.png` และ `<link rel="icon">` ทำให้ Console Errors เหลือ `0`
4. **เส้นขอบฟ้าผิวน้ำบนมือถือแนวตั้ง:** ปรับ `horizonRatio` แบบ Responsive (`0.605` บนแนวตั้ง / `0.565` บนแนวนอน) ให้แสงสะท้อนและกระทงระยะไกลวางตรงแนวผิวน้ำจริง
5. **หัวข้อฉาก 5 ซ้อนขอบดวงจันทร์บนมือถือ:** ปรับตำแหน่งดวงจันทร์ในฉาก 5 ให้เลื่อนลงมาอยู่กลางท้องฟ้าใต้ข้อความอย่างลงตัว
6. **วงแหวนไกด์ไส้เทียนค้างหลังจุดไฟ & ปุ่มฉาก 6 ตัดคำบนเดสก์ท็อป:** หยุด `animation: none` เมื่อจุดไฟแล้ว, รีเซ็ต `transition-delay: 0ms` ในโหมด Reduced Motion, และปรับ Padding/Wrap ปุ่มฉาก 6 บนเดสก์ท็อปให้แสดงในบรรทัดเดียวสวยงาม

---

## 5. ข้อจำกัดที่ยังเหลือ (Known Limitations — ระบุอย่างตรงไปตรงมา)

1. **การทดสอบบนอุปกรณ์พกพาจริง (Real Device Hardware):** การทดสอบทั้งหมดดำเนินการบน Headless Google Chrome (Playwright) พร้อมโหมดจำลอง Touch และหน้าจอมือถือ (`390×844`, `375×667`) ยังไม่ได้ทดสอบบนเครื่อง iPhone (iOS Safari) หรือ Android จริง โดยเฉพาะพฤติกรรมการปลดล็อก Web Audio และการดาวน์โหลดไฟล์ Data URL PNG บน iOS Safari บางเวอร์ชัน
2. **การตรวจสอบคุณภาพเสียงด้วยการฟังจริง:** ระบบเสียงใช้ Web Audio API สังเคราะห์เสียงน้ำ แพดดนตรี และระฆังเพนทาโทนิกในโค้ด (ไม่มีไฟล์เสียงบันทึกจริง) ในสภาพแวดล้อม Headless QA สามารถตรวจสอบได้เพียงสถานะการทำงาน ปุ่มเปิด/ปิด และความปลอด Error แต่ไม่สามารถฟังเนื้อเสียงผ่านลำโพงจริงได้
3. **Asset ตกแต่งเพิ่มเติมชุดเสริม:** ชุดภาพหลักครบทุกหมวดตามข้อกำหนด (Night Sky, Moonlight, Moonlit River, Krathong 3 แบบ, Candle, Flame, Lotus Petal, Jasmine Blossom และ Floral Ornament) ทั้งนี้ชุดภาพเสริมเพิ่มเติมรอบที่ 4 (ดอกดาวเรืองแยกเดี่ยวและโคมลอยแยกชิ้น) ติดข้อจำกัดโควตาการสร้างภาพของระบบ จึงใช้กลีบบัว ดอกมะลิ และลวดลายดอกไม้ที่สร้างจริงแล้วแทนอย่างกลมกลืน
4. **ข้อกำหนดเรื่องโปรโตคอลการเปิดไฟล์:** เนื่องจากโค้ดใช้ ES Modules (`type="module"`) จึงต้องรันผ่าน HTTP/HTTPS Server และไม่รองรับการเปิดไฟล์แบบ `file://` โดยตรง
5. **ฟอนต์ภาษาไทยเมื่อไม่มีอินเทอร์เน็ต:** ฟอนต์ `Cormorant Garamond`, `Noto Serif Thai` และ `Noto Sans Thai` โหลดจาก Google Fonts หากเปิดแบบออฟไลน์จะสลับไปใช้ System Fonts ของเครื่องโดยอัตโนมัติ
