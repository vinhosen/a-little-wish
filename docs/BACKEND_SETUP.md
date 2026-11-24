# Backend & Database Configuration Guide — A Little Wish Community

`A Little Wish` ออกแบบระบบ Backend แบบ **3-Mode Pluggable Architecture** เพื่อให้ทำงานได้จริงทั้งบน Cloud (Supabase), Self-Hosted Server (Node.js + SSE), และ Static Hosting (GitHub Pages) โดยไม่เปิดเผย Secret Key ไว้ใน Client-side Code

---

## โหมดการทำงานทั้ง 3 รูปแบบ

| โหมด | การใช้งานที่เหมาะสม | Realtime Protocol | Persistence |
|---|---|---|---|
| **1. Supabase Cloud (แนะนำสำหรับ Production Multi-User)** | เว็บสาธารณะที่มีผู้เล่นหลายคนพร้อมกันทั่วโลก (Deploy ผ่าน GitHub Pages / Netlify / Vercel ได้เลย) | REST + RLS + Polling/Realtime | PostgreSQL (`players`, `player_krathongs`) |
| **2. Node.js Community Server (รวมอยู่ในโปรเจกต์แล้ว)** | รันบน VPS, Railway, Render, Fly.io หรือ Local Network | Server-Sent Events (`/api/stream`) | JSON Atomic File (`server/data/community.json`) |
| **3. Static Multi-Tab Sync (Zero-Config Fallback)** | เปิดบน Static Host โดยยังไม่ได้เชื่อมฐานข้อมูลภายนอก | `BroadcastChannel` + `localStorage` | Browser Local Storage (ซิงก์ข้ามแท็บในเบราว์เซอร์เดียวกัน) |

---

## ข้อมูลที่จัดเก็บ (Data Model)

1. **`players`**
   - `player_id` (เช่น `PLR-A1B2C3D4E5`)
   - `session_id` (เช่น `SES-...`)
   - `session_hash` / HMAC token (เก็บเฉพาะฝั่ง Server / Hash ใน DB เพื่อยืนยันสิทธิ์เจ้าของกระทง)
   - `nickname` (2–24 ตัวอักษร พร้อมระบบป้องกันชื่อเลียนแบบระบบ)
   - `created_at`, `last_seen_at`
2. **`player_krathongs`** (แยกจากคอลเลกชันตัวอย่าง `SYS-KR-001`..`SYS-KR-010` โดยสมบูรณ์)
   - `krathong_id` (เช่น `USR-KR-1A2B3C4D`)
   - `player_id`, `session_id`, `nickname`
   - `design_config` (JSONB เก็บฐาน, สัดส่วนเส้นผ่านศูนย์กลาง/ความสูง, ชั้นดอกไม้, สี, เทียน, ของตกแต่ง)
   - `wish_message` (สูงสุด 140 ตัวอักษร)
   - `release_status` (`draft` | `released`)
   - `river_seed` (ตำแหน่งเสถียรบนแม่น้ำ ไม่สุ่มมั่วเมื่อรีเฟรช)
   - `created_at`, `updated_at`, `released_at`

---

## วิธีเชื่อมต่อ Supabase (ฟรี ไม่มีค่าใช้จ่ายเริ่มต้น)

1. สร้างโปรเจกต์ใหม่ที่ [supabase.com](https://supabase.com)
2. เปิด **SQL Editor** แล้วรันสคริปต์ทั้งหมดในไฟล์ [`supabase/schema.sql`](../supabase/schema.sql)
   - ระบบจะสร้างตาราง `players` และ `player_krathongs`
   - เปิดใช้ **Row Level Security (RLS)** เพื่อป้องกันการแก้ไขกระทงของผู้อื่น
   - เปิด Trigger `validate_krathong_write()` เพื่อป้องกันการสวมรอย `SYS-KR-*`, คำหยาบ, ลิงก์สแปม และ Rate Limiting
3. สร้างไฟล์ `js/backendConfig.js` (หรือกำหนดค่า `window.ALW_BACKEND_CONFIG` ก่อน `<script type="module" src="js/main.js">`) โดยใส่เฉพาะค่า **Public** เท่านั้น:

```html
<script>
  window.ALW_BACKEND_CONFIG = {
    supabaseUrl: 'https://YOUR_PROJECT_ID.supabase.co',
    supabaseAnonKey: 'YOUR_PUBLIC_ANON_KEY'
  };
</script>
```

> **คำเตือนความปลอดภัย:** ห้ามนำ `service_role` key หรือ Database Password มาใส่ในโค้ดฝั่ง Client เด็ดขาด ใช้เฉพาะ `anon` public key ซึ่งถูกจำกัดสิทธิ์ด้วย PostgreSQL RLS แล้วเท่านั้น

---

## วิธีรัน Node.js Community Server (Self-Hosted)

```bash
cd a-little-wish
ALW_SESSION_SECRET="change-this-to-a-long-random-secret" PORT=8080 npm start
```

- เปิดหน้าเว็บได้ที่ `http://localhost:8080`
- เซิร์ฟเวอร์จะเปิด Static Assets + REST API (`/api/session`, `/api/krathongs`) + SSE Stream (`/api/stream`) ในพอร์ตเดียวกันโดยอัตโนมัติ
