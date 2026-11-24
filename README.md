# A Little Wish — คืนเพ็ญและคำอธิษฐานเล็ก ๆ

ประสบการณ์ลอยกระทงเสมือนจริงแบบโต้ตอบได้ใต้แสงจันทร์ ออกแบบด้วยแนวคิด **Mobile First**, โรแมนติกอบอุ่น, น่ารักละมุน, เรียบง่าย และมีบรรยากาศเสมือนค่ำคืนริมน้ำจริง

---

## จุดเด่นของประสบการณ์ (6 ฉากต่อเนื่อง)

1. **The Moonlit Night** — ค่ำคืนพระจันทร์เต็มดวงเหนือสายน้ำ พร้อมผิวน้ำ Canvas 2D ที่แตะสร้างระลอกคลื่นได้, หิ่งห้อยลอยแผ่ว และกลีบดอกไม้ที่ลอยตามกระแสน้ำ
2. **A Little Invitation** — การ์ดคำชวนเล็ก ๆ สไตล์กระดาษเรืองแสงใต้แสงจันทร์ ประดับลวดลายกลีบบัวและดอกมะลิ
3. **Choose Your Krathong** — เลือกกระทงภาพวาดสีน้ำ 3 รูปแบบ (ปัดซ้าย–ขวา, กดลูกศร, กดปุ่มย่อ หรือใช้แป้นพิมพ์ `←` / `→`):
   - **กระทงบัวชมพูแสงจันทร์** (*Blush Moonlit Lotus*)
   - **กระทงใบตองจันทร์นวล** (*Classic Moonlit Leaf*)
   - **กระทงหงส์น้อยเคียงจันทร์** (*Little Moonlit Swan*)
4. **Make A Wish** — แตะที่ไส้เทียนเพื่อจุดไฟพร้อมประกายไฟและแสงเทียนไหวระริก เขียนคำอธิษฐานของตนเอง (หรือเลือกตัวอย่างคำอธิษฐานอ่อนโยน / เก็บไว้ในใจ)
5. **Let It Float** — ค่อย ๆ ดันกระทงขึ้นบนผิวน้ำ (Touch Drag) หรือกดปุ่มเพื่อปล่อยกระทงล่องตามกระแสน้ำไปสู่เส้นขอบฟ้า พร้อมเงาสะท้อนแสงเทียน ระลอกคลื่น ประกายไฟ และกลีบดอกไม้ที่แตะส่งตามไปได้
6. **A Little Message** — การ์ดความทรงจำพร้อมข้อความปิดท้าย สามารถ **บันทึกการ์ดความทรงจำ (PNG ความละเอียด 1080×1350)** และ **เริ่มประสบการณ์ใหม่** ได้ทุกเมื่อ

---

## โครงสร้างโปรเจกต์

```text
a-little-wish/
├── index.html                  # โครงสร้าง Semantic HTML5 ครบ 6 ฉาก + ARIA + SEO Meta
├── package.json                # สคริปต์รัน Static Server แบบ Zero-Dependency
├── css/
│   ├── tokens.css              # Design Tokens (สี, ฟอนต์, ระยะห่าง, Motion, Z-index)
│   ├── base.css                # Reset, Mobile First, Focus States, Reduced Motion
│   ├── atmosphere.css          # เลเยอร์ท้องฟ้า, ดวงจันทร์, ริมน้ำ, Canvas และ Vignette
│   ├── components.css          # HUD, ปุ่ม, การ์ด, ชุดกระทง+เทียน+เปลวไฟ, ฟอร์มคำอธิษฐาน
│   └── scenes.css              # การเปลี่ยนฉากทั้ง 6 ฉาก และ Responsive Breakpoints
├── js/
│   ├── config.js               # รายการ Assets, พิกัดจุดวางเทียนของกระทง 3 แบบ, ข้อความตัวอย่าง
│   ├── state.js                # ระบบจัดการสถานะกลางพร้อมฟังก์ชัน Reset ประสบการณ์
│   ├── audio.js                # Web Audio API สังเคราะห์เสียงบรรยากาศริมน้ำและเสียงเอฟเฟกต์
│   ├── krathongView.js         # ตัวประกอบภาพกระทง+เทียน+เปลวไฟ และตัวสร้างการ์ด PNG
│   ├── riverCanvas.js          # Canvas 2D ผิวน้ำแสงจันทร์, ระลอกคลื่น, กลีบดอกไม้, หิ่งห้อย, การลอยกระทง
│   ├── scenes.js               # SceneManager ควบคุมการเปลี่ยนฉาก Gesture และ Interaction ทั้งหมด
│   └── main.js                 # ตัวเริ่มต้นระบบ Preload ภาพ และ Pointer Parallax
├── assets/
│   └── images/                 # ภาพจริงทั้งหมด 12 ชิ้น (Backgrounds, Transparent PNGs & Favicon)
│       ├── night-sky.jpg
│       ├── moonlit-river-bg.jpg
│       ├── moonlight.png
│       ├── krathong-lotus.png
│       ├── krathong-classic.png
│       ├── krathong-swan.png
│       ├── candle.png
│       ├── flame.png
│       ├── petal-lotus.png
│       ├── petal-jasmine.png
│       ├── decor-floral-ornament.png
│       └── favicon.png
├── docs/
│   ├── DEPLOY.md               # คู่มือการ Deploy (Netlify, Vercel, GitHub Pages, Cloudflare Pages)
│   └── QA_REPORT.md            # รายงานผลการทดสอบจริงด้วย Playwright / Chromium
└── README.md
```

---

## วิธีติดตั้งและรันบนเครื่อง

โปรเจกต์พัฒนาด้วย **HTML5, Vanilla CSS และ Vanilla JavaScript (ES Modules)** จึงไม่ต้องติดตั้ง Dependency หรือรัน Build Step ใด ๆ

```bash
# 1. เข้าไปยังโฟลเดอร์โปรเจกต์
cd a-little-wish

# 2. รัน Static HTTP Server (เลือกใช้อย่างใดอย่างหนึ่ง)
python3 -m http.server 8080
# หรือ
npm start
# หรือ
npx -y serve -l 8080 .
```

จากนั้นเปิดเบราว์เซอร์ที่ `http://localhost:8080`

---

## เทคโนโลยีและมาตรฐานที่ใช้

- **Mobile First & Responsive:** รองรับตั้งแต่หน้าจอมือถือขนาดเล็ก (`375×667`), มือถือยุคใหม่ (`390×844`) ไปจนถึงแท็บเล็ตและเดสก์ท็อป (`1280×800+`)
- **Touch & Desktop Parity:** รองรับ Touch Swipe เลือกกระทง, Touch Drag ดันกระทงปล่อยลงน้ำ, แตะผิวน้ำสร้างระลอกคลื่น รวมถึงการคลิกและแป้นพิมพ์บนเดสก์ท็อป
- **Web Audio API (Zero Audio Assets):** สังเคราะห์เสียงสายน้ำ แพดดนตรีนุ่มนวล และเสียงระฆังเพนทาโทนิกในตัว เปิด/ปิดได้ทุกฉากโดยไม่เสี่ยงไฟล์เสียงเสีย
- **Accessibility & Reduced Motion:** รองรับ `prefers-reduced-motion`, ARIA attributes, `aria-live` announcements และโฟกัสคีย์บอร์ด (`:focus-visible`)

---

## การ Deploy

ดูขั้นตอนโดยละเอียดสำหรับ Netlify, Vercel, GitHub Pages และ Cloudflare Pages ได้ที่ [`docs/DEPLOY.md`](docs/DEPLOY.md)

## รายงานผลการทดสอบ (QA Report)

ดูรายละเอียดผลการทดสอบจริงทุกฉาก ทุกอุปกรณ์ และข้อจำกัดที่ระบุไว้อย่างตรงไปตรงมาได้ที่ [`docs/QA_REPORT.md`](docs/QA_REPORT.md)
