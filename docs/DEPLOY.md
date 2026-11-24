# Deployment Guide — A Little Wish

`A Little Wish` เป็นเว็บไซต์แบบ Static HTML/CSS/Vanilla JavaScript (ES Modules) โดยไม่จำเป็นต้องใช้ Build Step หรือ Backend Server ทำให้สามารถ Deploy ได้ทันทีบนผู้ให้บริการ Static Hosting ชั้นนำทุกเจ้า

> **หมายเหตุสำคัญ:** เนื่องจากโปรเจกต์ใช้ Native ES Modules (`<script type="module">`) ควรเปิดผ่าน HTTP/HTTPS Server (เช่น `python3 -m http.server`, `npx serve`, หรือ Static Hosting) แทนการดับเบิลคลิกเปิดไฟล์ `file://` โดยตรง เพื่อหลีกเลี่ยงข้อจำกัดด้าน CORS ของเบราว์เซอร์

---

## 1. Netlify (แนะนำ — เร็วที่สุด)

### วิธี Drag & Drop
1. เข้าสู่ [app.netlify.com](https://app.netlify.com)
2. ลากโฟลเดอร์ `a-little-wish/` ทั้งโฟลเดอร์วางลงในหน้า **Sites**
3. รอสักครู่ จะได้ URL แบบ HTTPS พร้อมใช้งานทันที

### วิธีผ่าน Netlify CLI
```bash
npm install -g netlify-cli
cd a-little-wish
netlify deploy --prod --dir=.
```

---

## 2. Vercel

```bash
npm install -g vercel
cd a-little-wish
vercel --prod
```
- ตั้งค่า **Framework Preset**: `Other`
- ตั้งค่า **Output Directory**: `.` (ไม่ต้องใส่ Build Command)

---

## 3. GitHub Pages

1. Push โฟลเดอร์โปรเจกต์ขึ้น GitHub Repository (โดยให้ `index.html` อยู่ที่ Root ของ Repository หรือในโฟลเดอร์ `/docs`)
2. ไปที่ **Settings → Pages**
3. เลือก **Source**: `Deploy from a branch` → เลือก Branch `main` และโฟลเดอร์ `/ (root)`
4. กด **Save** และรอประมาณ 1–2 นาที เว็บไซต์จะพร้อมใช้งานที่ `https://<username>.github.io/<repo-name>/`

---

## 4. Cloudflare Pages

1. ไปที่ Cloudflare Dashboard → **Workers & Pages → Create → Pages**
2. เชื่อมต่อ Git Repository หรือเลือก **Direct Upload** แล้วอัปโหลดโฟลเดอร์ `a-little-wish/`
3. ไม่ต้องใส่ Build Command และกำหนด **Build output directory** เป็น `/`

---

## 5. รันทดสอบบนเครื่อง (Local Static Server)

เลือกใช้อย่างใดอย่างหนึ่งภายในโฟลเดอร์ `a-little-wish/`:

```bash
# Python 3
python3 -m http.server 8080

# หรือ Node.js (npx serve)
npx -y serve -l 8080 .
```

จากนั้นเปิดเบราว์เซอร์ที่ `http://localhost:8080`

---

## 6. Checklist ก่อนปล่อยใช้งานจริง

- ตรวจสอบว่าโฟลเดอร์ `assets/images/` ถูกอัปโหลดครบทั้ง 11 ไฟล์
- แนะนำให้เปิดผ่าน **HTTPS** เพื่อให้ Web Audio API และฟีเจอร์ดาวน์โหลดการ์ดความทรงจำทำงานได้ราบรื่นบน iOS Safari และ Android Chrome
- หากต้องการปรับแต่งชื่อหรือข้อความต้อนรับ สามารถแก้ไขได้ใน `index.html` และ `js/config.js`
