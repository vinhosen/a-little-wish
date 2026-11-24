# QA Report — A Little Wish (v2.0 Virtual Loy Krathong Community)

รายงานผลการตรวจสอบคุณภาพทั้งระบบหลังจากพัฒนาต่อยอดเป็น **Virtual Loy Krathong Community** ครบทั้ง System Collection 10 ใบ, Krathong Creator, Realistic River Physics, Population Manager, Player Session, Backend Security และ Profile Popup

---

## 1. สภาพแวดล้อมการทดสอบจริง

- **Backend ที่รันทดสอบจริง:** `server/index.mjs` (Node.js HTTP + SSE Realtime + HMAC-SHA256 Session Token + JSON Persistence)
- **Browser Engine:** Headless Google Chrome (Playwright for Python)
- **Multi-Client & Viewport Matrix:**
  1. **Player A (Mobile Touch):** `390 × 844`, `deviceScaleFactor: 2`, `has_touch: true`
  2. **Player B (Desktop Concurrent Client):** `1280 × 800`
  3. **Compact Mobile (iPhone SE):** `375 × 667`, `has_touch: true`

---

## 2. ผลการตรวจสอบ Image Assets (26 Assets)

- ตรวจสอบภาพประกอบทั้งหมด 26 ไฟล์ (Background 2 ไฟล์, Moonlight/Flame/Ornament/Favicon 4 ไฟล์, Base เปล่า 5 ทรง, ดอกไม้ 7 ชนิด, เทียน 3 แบบ, กรวยบายศรี 1 แบบ, กลีบดอกไม้ 2 แบบ และกระทงรวมดั้งเดิม 3 แบบ)
- หลังพบปัญหาขอบสี่เหลี่ยมจางใน Sprite ที่ลงสีทับ (`_getTintedSprite`) จากการใช้ `globalCompositeOperation = 'color'` จึงเพิ่มการตัดมาสก์ด้วย `destination-in` ตาม Alpha ต้นฉบับ และยืนยันผ่านภาพหน้าจอ `06_mobile_community_river.png` และ `07_desktop_community_river.png` แล้วว่าไร้ขอบกล่องตกค้าง 100%

---

## 3. สรุปผลการทดสอบ End-to-End (E2E Checklist)

| รายการทดสอบ | สถานะ | ผลลัพธ์จากการทดสอบจริง |
|---|---|---|
| **System Krathong Collection (`SYS-KR-001`–`010`)** | **PASS** | แสดงครบทั้ง 10 ใบตั้งแต่เริ่มเข้าเว็บ (`กำลังลอยอยู่ 10 ใบ · คอลเลกชัน 10 · ผู้เล่น 0`) พร้อมป้าย `A Little Wish Collection` |
| **Krathong Creator (Real-time Preview)** | **PASS** | ทดสอบเปลี่ยนฐาน (`woven-bamboo`), ปรับ `diameter: 1.14` และ `height: 0.94`, เปลี่ยนดอกไม้ (`orchid` + เฉดสี), เลือกเทียนทอง, กรวยบายศรี 4 ยอด, ธูป 3 ดอก และละอองดาว |
| **Player Nickname Session & Persistence** | **PASS** | สร้าง `Player ID` + `Session ID` + Token, รีเฟรชหน้าเว็บแล้วกลับมาใช้งานชื่อเล่นเดิม (`น้องจันทร์`) ได้อัตโนมัติ |
| **Anti-Impersonation & Security** | **PASS** | ป้องกันชื่อสงวน (`"A Little Wish Collection"` ถูกปฏิเสธ), API ปฏิเสธการเขียนโดยไม่มี Token (`401`) และปฏิเสธการแก้ไข `SYS-KR-001` (`403`) |
| **Community River Realtime & Multi-Player** | **PASS** | Player A ปล่อยกระทงลงน้ำ → จำนวนบนแม่น้ำเพิ่มเป็น `11 ใบ (คอลเลกชัน 10 · ผู้เล่น 1)` และ Player B (คนละ Browser Context) มองเห็นตรงกันทันที |
| **Realistic River Physics & Hit-Testing** | **PASS** | กระทงทุกใบลอยตามกระแสน้ำ, มี Vertical Bob, Wave-Slope Tilt, เงาสะท้อน, Ripple, หลบชนกัน และแตะเปิด Profile Popup ได้ |
| **Profile Popup & Ownership Guard** | **PASS** | แสดงภาพกระทง, ป้าย `A Little Wish Collection` / ชื่อเล่น และคำอธิษฐาน โดยซ่อนปุ่มแก้ไขสำหรับผู้เล่นคนอื่น (`edit_hidden_for_non_owner: True`) |
| **Custom Keepsake PNG Export** | **PASS** | ดาวน์โหลด `a-little-wish-usr-kr-*.png` (`2,178 KB`, `1080×1350px`) สำเร็จและตรวจภาพจริงแล้ว |
| **Responsive & No Broken Assets/Errors** | **PASS** | `console_errors: []`, `page_errors: []`, `failed_requests: []`, `overflow_or_clip: []`, `broken_images: []` |

---

## 4. ปัญหาที่พบระหว่าง QA รอบ v2.0 และแก้ไขแล้ว

1. **กรอบสี่เหลี่ยมจางบน Sprite ที่ลงสี (`_getTintedSprite`):** แก้โดยใช้ `destination-in` คืนค่า Alpha Mask เดิมหลัง Blend โหมด `'color'`
2. **ข้อความ HUD บนมือถือ 390px ตัดขึ้น 2 บรรทัด:** ปรับปุ่ม HUD ด้านขวาเป็น Icon-only บนหน้าจอ `<= 480px` ให้เหลือพื้นที่สำหรับ Dot ความคืบหน้าและป้ายชื่อเล่นได้พอดีในแถวเดียว
3. **วงแหวนไกด์ไส้เทียนไม่หายในฉาก 4 หลังเปลี่ยนมาใช้ `<canvas>`:** เพิ่ม `.wish-canvas-wrap.is-lit .candle-hotspot__ring` เพื่อซ่อนวงแหวนทันทีที่จุดเทียน
4. **ตัวอักษรพิมพ์ผิดในชื่อไทยของ `SYS-KR-005`:** แก้เป็น `คำสัญญากุหลาบชมพู`
5. **ป้าย `Community Live Server (SSE)` ชนขอบดวงจันทร์ในฉาก 5:** ปรับตำแหน่งดวงจันทร์ในฉาก 5 (`translate3d(-50%, 62%, 0)`) ให้พ้นแนวป้ายสถานะอย่างสวยงาม

---

## 5. ข้อจำกัดที่ยังเหลือ (ระบุอย่างตรงไปตรงมา)

1. **โหมด Hosting บน GitHub Pages (Static Only):** เนื่องจาก GitHub Pages ให้บริการเฉพาะไฟล์ Static (ไม่รัน Node.js `server/index.mjs`) เมื่อเปิดผ่าน `https://vinhosen.github.io/a-little-wish/` โดยยังไม่ได้เชื่อมโปรเจกต์ Supabase ระบบจะทำงานในโหมด **Static Multi-Tab Sync** (แสดง System Collection 10 ใบ + ซิงก์กระทงผู้เล่นระหว่างแท็บในเบราว์เซอร์เดียวกัน) — หากต้องการให้ผู้เล่นต่างอุปกรณ์เห็นกันแบบ Cloud Realtime ให้ทำตาม [`BACKEND_SETUP.md`](BACKEND_SETUP.md) หรือรัน `npm start` บนโฮสต์ Node.js
2. **การทดสอบบนฮาร์ดแวร์มือถือจริง:** การทดสอบทั้งหมดทำบน Headless Chromium (จำลอง Touch `390×844` และ `375×667`) ยังไม่ได้ทดสอบบนเครื่อง iPhone (iOS Safari) หรือ Android จริง
3. **เสียงสังเคราะห์ผ่าน Web Audio API:** ทดสอบปุ่มเปิด/ปิดและความปลอด Error ครบแล้วใน Headless Chrome แต่ยังไม่ได้ทดสอบฟังเสียงจริงผ่านลำโพง
4. **กรณีผู้เล่นจำนวนมากระดับหลายร้อยใบ:** ระบบจำกัด `maxVisible = 20` ใบพร้อม LOD Caching เพื่อรักษา 60 FPS บนมือถือ (กระทงที่มีอยู่เกิน 20 ใบในฐานข้อมูลจะถูกคัดเลือกตามลำดับล่าสุด แต่ยังไม่ได้ทำ Pagination/Search สำหรับค้นหากระทงใบเก่าที่หลุดจากหน้าต่าง 20 ใบแรก)
