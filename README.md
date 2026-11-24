# A Little Wish — Virtual Loy Krathong Community

ชุมชนลอยกระทงเสมือนจริงใต้แสงจันทร์ ออกแบบด้วยแนวคิด **Mobile First**, โรแมนติกอบอุ่น, น่ารักละมุน และประณีตมีมิติ — ผู้เล่นสามารถ **ประดิษฐ์กระทงของตนเอง**, **จุดเทียนเขียนคำอธิษฐาน**, **ปล่อยลงแม่น้ำกลาง**, และ **แตะชมกระทงของผู้เล่นคนอื่นพร้อมอ่านคำอธิษฐาน** ในโลกเดียวกันได้แบบ Real-time

---

## จุดเด่นของระบบ (v2.0 Virtual Community)

1. **System Krathong Collection (`SYS-KR-001` – `SYS-KR-010`):**
   กระทงตัวอย่าง 10 ใบที่ออกแบบแยกเฉพาะในด้านรูปทรง วัสดุฐาน สัดส่วน ชนิดดอกไม้ สีสัน จำนวนการจัดวาง เทียน และของตกแต่ง พร้อมป้าย **`A Little Wish Collection`** ชัดเจน:
   - `SYS-KR-001` **Moonlight Lotus** · `SYS-KR-002` **Golden Blessing** · `SYS-KR-003` **Violet Dream**
   - `SYS-KR-004` **Jasmine Whisper** · `SYS-KR-005` **Rosy Promise** · `SYS-KR-006` **Indigo Serenity**
   - `SYS-KR-007` **Sunset Garden** · `SYS-KR-008` **Emerald Heritage** · `SYS-KR-009` **Little Stardust**
   - `SYS-KR-010` **The Grand Wish**
2. **Modular Krathong Creator:**
   - **ฐาน 5 รูปทรงและวัสดุ:** ใบตองจีบ, ถ้วยกลีบบัวแสงจันทร์, กระจาดไม้ไผ่สาน, หงส์น้อยเคียงจันทร์, บุษบกใบตองสองชั้น
   - **สัดส่วนอิสระ:** ปรับ **เส้นผ่านศูนย์กลาง (80%–125%)** และ **ความสูงฐาน (80%–125%)** โดยปรับวงการจัดวางดอกไม้และสัดส่วนสัมพันธ์กันจริง (ไม่ใช่การซูมภาพทั้งใบ)
   - **ดอกไม้ 7 ชนิด & 2 ชั้น:** บัว, ดาวเรือง, มะลิ, กล้วยไม้, กุหลาบ, อัญชัน, ชบาตะวันตกดิน ปรับเฉดสี 7 โทน, จำนวน (3–14 ดอก), ขนาด, รูปแบบการจัดวาง 5 แบบ และรัศมี
   - **เทียน 3 แบบ & ของตกแต่ง:** กรวยบายศรี (0/2/4/6 ยอด), ธูปหอม 3 ดอก, พวงมาลัยมุกมะลิ, ละอองดาวแสงจันทร์
   - **Real-time Preview & Draft Persistence:** แสดงตัวอย่างสดแบบ 60 FPS และบันทึก Draft ก่อนปล่อย
3. **Realistic River Physics & Population Manager:**
   - จำลองคลื่นน้ำต่อเนื่อง, กระแสน้ำแบบมี Perspective ใกล้–ไกล, Vertical Bobbing, Wave-Slope Tilt, Yaw Rotation, แรงผลักกันเมื่อเข้าใกล้ (Collision Separation), เงาสะท้อนบนผิวน้ำ, แสงเทียนไหวระริก และระลอกคลื่นรอบกระทง
   - กระทง System และ Player ใช้ `KrathongRenderer` และเอนจินฟิสิกส์ชุดเดียวกัน พร้อม LOD Sprite Caching เพื่อความลื่นไหลบนมือถือ
4. **Community River, Player Session & Profile Popup:**
   - เข้าสู่ระบบด้วย **ชื่อเล่น** (ไม่ต้องกรอกข้อมูลส่วนตัว) สร้าง `Player ID`, `Session ID`, และ Verified Token อัตโนมัติ สามารถกลับมาเล่นต่อหรือแก้ไขกระทงของตนเองได้
   - แตะกระทงใดก็ได้บนผิวน้ำเพื่อเปิด **Profile Popup** แสดงภาพกระทง, ชื่อเล่น (หรือป้าย `A Little Wish Collection`), ID และคำอธิษฐาน
5. **Backend & Data Security (3-Mode Architecture):**
   - รองรับ **Supabase Cloud (PostgreSQL + RLS)**, **Node.js Community Server (SSE + HMAC Token + Rate Limit)** และ **Static Multi-Tab Sync** บน GitHub Pages โดยไม่เปิดเผย Secret Key ใน Client

---

## โครงสร้างโปรเจกต์

```text
a-little-wish/
├── index.html                      # Semantic HTML5 ครบ 6 ฉาก + Creator Studio + Profile Popup
├── package.json                    # สคริปต์รัน Node.js Community Server
├── server/
│   └── index.mjs                   # Zero-dependency Node HTTP + SSE Realtime + HMAC Security API
├── supabase/
│   └── schema.sql                  # PostgreSQL Schema, RLS Policies, Anti-Spam/Impersonation Triggers
├── css/
│   ├── tokens.css                  # Design Tokens
│   ├── base.css                    # Reset, Mobile First, Accessibility, Reduced Motion
│   ├── atmosphere.css              # เลเยอร์ท้องฟ้า, ดวงจันทร์, ริมน้ำ, Canvas และ Vignette
│   ├── components.css              # HUD, ปุ่ม, การ์ด, ฟอร์มคำอธิษฐาน
│   ├── scenes.css                  # การเปลี่ยนฉาก 6 ฉาก และ Responsive Breakpoints
│   └── community.css               # UI ของ Creator Studio, 10-Collection และ Profile Popup
├── js/
│   ├── config.js                   # Asset Manifest, Geometry Calibration & Catalog
│   ├── systemCollection.js         # กระทงตัวอย่าง 10 ใบ (SYS-KR-001..010)
│   ├── krathongRenderer.js         # Unified Modular Renderer + Watercolor Tinting + LOD Cache
│   ├── populationManager.js        # Hydrodynamic Buoyancy Physics, Collision & Population Culling
│   ├── riverCanvas.js              # Canvas 2D Procedural Water, Ripples, Petals, Fireflies & Hit-Test
│   ├── creatorController.js        # Krathong Creator & System Collection UI Controller
│   ├── krathongView.js             # Preloader & High-Res Keepsake PNG Exporter (1080x1350)
│   ├── scenes.js                   # 6-Scene Orchestrator + Profile Popup Controller
│   ├── state.js                    # Reactive State Store
│   ├── audio.js                    # Web Audio API Soundscape & SFX
│   ├── main.js                     # Application Entrypoint
│   └── services/
│       ├── safety.js               # XSS, Anti-Impersonation, Profanity & Config Sanitizer
│       └── communityBackend.js     # Unified Adapter (Supabase / Node SSE / Static Multi-Tab)
├── assets/images/                  # ภาพวาดจริงแยกชิ้นทั้งหมด (26 ไฟล์)
└── docs/
    ├── BACKEND_SETUP.md            # คู่มือเชื่อมต่อ Supabase & Node.js Community Server
    ├── DEPLOY.md                   # คู่มือ Deploy ทั้งแบบ Static และ Fullstack Realtime
    └── QA_REPORT.md                # รายงานผลการทดสอบจริงด้วย Playwright / Chromium
```

---

## วิธีติดตั้งและรันใช้งาน

### แบบที่ 1: รันพร้อม Community Realtime Server (แนะนำ — แชร์ข้อมูลข้ามเครื่องได้จริง)
ต้องมี Node.js 18+

```bash
cd a-little-wish
npm start
# เปิดเบราว์เซอร์ที่ http://localhost:8080
```

### แบบที่ 2: รันเป็น Static Site (เช่น GitHub Pages / `python3 -m http.server`)
```bash
cd a-little-wish
python3 -m http.server 8080
```
- ในโหมด Static จะเริ่มด้วย System Collection 10 ใบ และซิงก์กระทงผู้เล่นแบบ Multi-Tab ภายในเบราว์เซอร์ (หรือเชื่อม Supabase Cloud ตาม [`docs/BACKEND_SETUP.md`](docs/BACKEND_SETUP.md) เพื่อให้ผู้เล่นทั่วโลกเห็นร่วมกันได้ทันที)

---

## เอกสารเพิ่มเติม

- การตั้งค่า Backend & Database Schema: [`docs/BACKEND_SETUP.md`](docs/BACKEND_SETUP.md)
- คู่มือ Deployment: [`docs/DEPLOY.md`](docs/DEPLOY.md)
- รายงานผลทดสอบ QA: [`docs/QA_REPORT.md`](docs/QA_REPORT.md)
