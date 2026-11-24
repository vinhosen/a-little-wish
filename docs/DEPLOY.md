# Deployment Guide — A Little Wish Community

โปรเจกต์ `A Little Wish` รองรับการ Deploy ทั้งแบบ **Static Hosting + Supabase Cloud** (แนะนำสำหรับชุมชนออนไลน์จริง) และแบบ **Node.js Fullstack Server**

---

## ตัวเลือกที่ 1: GitHub Pages / Netlify / Vercel + Supabase Cloud (แนะนำ)

เหมาะสำหรับเว็บสาธารณะที่มีผู้เล่นหลายคนพร้อมกันโดยไม่มีค่าใช้จ่ายเซิร์ฟเวอร์ Node:

1. **เตรียมฐานข้อมูล Supabase (ฟรี):**
   - สร้างโปรเจกต์ที่ [supabase.com](https://supabase.com)
   - รันไฟล์ [`supabase/schema.sql`](../supabase/schema.sql) ใน SQL Editor
2. **ตั้งค่า Client Config (ไม่ใส่ Secret Key):**
   - เพิ่ม `<script>` ก่อน `js/main.js` ใน `index.html` หรือโหลด `backendConfig.js` ที่กำหนด `window.ALW_BACKEND_CONFIG = { supabaseUrl: '...', supabaseAnonKey: '...' }`
3. **Deploy ไฟล์ Static:**
   - **GitHub Pages:** Push ขึ้น Branch `main` (มี `.nojekyll` รองรับแล้ว)
   - **Netlify / Vercel:** Deploy โฟลเดอร์ `a-little-wish/` โดยไม่ต้องตั้ง Build Command

---

## ตัวเลือกที่ 2: Fullstack Node.js Community Server (Render / Railway / Fly.io / VPS)

หากต้องการรันเซิร์ฟเวอร์ Node.js ในตัว (`server/index.mjs`) ที่เสิร์ฟทั้งเว็บและ Realtime SSE API:

1. อัปโหลดโปรเจกต์ขึ้น Repository
2. ตั้งค่า Start Command: `npm start` (หรือ `node server/index.mjs`)
3. กำหนด Environment Variables:
   - `PORT=8080` (หรือพอร์ตที่ผู้ให้บริการกำหนด)
   - `ALW_SESSION_SECRET=<สุ่มรหัสลับยาวอย่างน้อย 32 ตัวอักษร>`
4. แนะนำให้ Mount Persistent Volume ที่ `/server/data` เพื่อเก็บไฟล์ `community.json` ข้ามการรีสตาร์ต

---

## ตัวเลือกที่ 3: Static Hosting อย่างเดียว (เช่น GitHub Pages ปัจจุบัน)

- หากไม่ได้ต่อ Supabase หรือ Node Server เว็บไซต์จะทำงานในโหมด **Static Multi-Tab Sync** โดยอัตโนมัติ:
  - มีกระทงตัวอย่าง `A Little Wish Collection` ครบทั้ง 10 ใบ (`SYS-KR-001`–`SYS-KR-010`)
  - ผู้เล่นสามารถสร้าง แก้ไข และปล่อยกระทงได้จริง พร้อมซิงก์ข้ามแท็บในเบราว์เซอร์เดียวกัน
  - เมื่อพร้อมเปิดเป็นชุมชนออนไลน์ข้ามเครื่อง สามารถต่อ Supabase ตาม [`docs/BACKEND_SETUP.md`](BACKEND_SETUP.md) ได้ทันทีโดยไม่ต้องแก้โค้ดหลัก
