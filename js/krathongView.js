/**
 * A Little Wish — Reusable Krathong Assembly Renderer & Keepsake Card Exporter
 * Combines each Krathong PNG with the separate Candle & Flame assets accurately.
 */

import { ASSETS, DEFAULT_SILENT_WISH } from './config.js';

/**
 * Update a DOM `.krathong-assembly` container to display the specified krathong
 * along with its calibrated candle & flame layers.
 */
export function updateKrathongAssembly(container, krathong, { lit = false } = {}) {
  if (!container || !krathong) return;

  const baseImg = container.querySelector('.krathong-base-img');
  if (baseImg) {
    if (baseImg.getAttribute('src') !== krathong.image) {
      baseImg.src = krathong.image;
    }
    baseImg.alt = krathong.nameTh;
  }

  container.style.setProperty('--candle-x', krathong.domCandleX);
  container.style.setProperty('--candle-y', krathong.domCandleY);
  container.style.setProperty('--candle-w', krathong.domCandleW);
  container.classList.toggle('is-lit', Boolean(lit));
}

/**
 * Spawn a celebratory cluster of tiny golden sparks around the candle wick.
 */
export function triggerCandleSparks(container) {
  if (!container) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  const burst = container.querySelector('.spark-burst');
  if (!burst) return;
  burst.innerHTML = '';

  const count = 12;
  for (let i = 0; i < count; i++) {
    const dot = document.createElement('span');
    dot.className = 'spark-dot';
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
    const dist = 22 + Math.random() * 28;
    const sx = Math.cos(angle) * dist;
    const sy = Math.sin(angle) * dist - 10;
    dot.style.setProperty('--sx', `${sx.toFixed(1)}px`);
    dot.style.setProperty('--sy', `${sy.toFixed(1)}px`);
    dot.style.animationDelay = `${Math.floor(Math.random() * 90)}ms`;
    burst.appendChild(dot);
  }

  setTimeout(() => {
    if (burst) burst.innerHTML = '';
  }, 850);
}

/**
 * Paint a full layered Krathong (krathong + candle + flickering flame + water glow & reflection)
 * directly onto a 2D canvas context.
 */
export function drawKrathongOnCanvas(ctx, {
  x,
  y,
  width,
  time = 0,
  sway = 0,
  lit = true,
  krathongCfg,
  images,
  drawReflection = true,
  opacity = 1,
}) {
  const kImg = images[krathongCfg.id];
  const cImg = images.candle;
  const fImg = images.flame;
  if (!kImg || !kImg.complete || !kImg.naturalWidth) return;

  const aspect = kImg.naturalWidth / kImg.naturalHeight;
  const kh = width / aspect;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(x, y);

  // 1. Soft shimmering warm golden water reflection below the floating krathong
  if (drawReflection) {
    const reflY = kh * 0.12;
    const glowRx = width * (lit ? 0.68 : 0.52);
    const glowRy = kh * (lit ? 0.25 : 0.18);

    const waterGrad = ctx.createRadialGradient(0, reflY, 2, 0, reflY, glowRx);
    if (lit) {
      waterGrad.addColorStop(0, 'rgba(255, 224, 152, 0.42)');
      waterGrad.addColorStop(0.45, 'rgba(240, 173, 86, 0.16)');
      waterGrad.addColorStop(1, 'rgba(240, 173, 86, 0)');
    } else {
      waterGrad.addColorStop(0, 'rgba(195, 218, 245, 0.22)');
      waterGrad.addColorStop(1, 'rgba(195, 218, 245, 0)');
    }

    ctx.save();
    ctx.scale(1, glowRy / glowRx);
    ctx.fillStyle = waterGrad;
    ctx.beginPath();
    ctx.arc(0, reflY * (glowRx / glowRy), glowRx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Animated vertical shimmer streaks of the candlelight on the rippling water
    if (lit) {
      const streaks = 7;
      for (let i = 0; i < streaks; i++) {
        const ratio = i / streaks;
        const sy = kh * 0.08 + ratio * kh * 0.68;
        const wave = Math.sin(time * 2.8 + i * 1.35) * (width * 0.035);
        const sw = width * (0.32 - ratio * 0.22) * (0.85 + 0.15 * Math.sin(time * 3.4 + i));
        ctx.fillStyle = `rgba(250, 212, 134, ${(0.28 * (1 - ratio)).toFixed(3)})`;
        ctx.beginPath();
        ctx.ellipse(wave, sy, Math.max(2, sw), Math.max(1, kh * 0.024), 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Subtle dark contact shadow under the banana-leaf hull
    const shadowGrad = ctx.createRadialGradient(0, 2, width * 0.08, 0, 2, width * 0.48);
    shadowGrad.addColorStop(0, 'rgba(3, 8, 18, 0.56)');
    shadowGrad.addColorStop(1, 'rgba(3, 8, 18, 0)');
    ctx.save();
    ctx.scale(1, 0.28);
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.arc(0, 6, width * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Apply gentle river bob tilt
  ctx.rotate(sway);

  // 2. Krathong body (anchored so bottom rests right on water plane y = 0)
  const kx = -width / 2;
  const ky = -kh * 0.92;
  ctx.drawImage(kImg, kx, ky, width, kh);

  // 3. Candle mounted into calibrated floral pocket
  if (cImg && cImg.complete && cImg.naturalWidth) {
    const ch = kh * krathongCfg.canvasCandleScale;
    const cw = ch * (cImg.naturalWidth / cImg.naturalHeight);
    const anchorX = kx + width * krathongCfg.canvasCandleX;
    const anchorY = ky + kh * krathongCfg.canvasCandleY;
    const cx = anchorX - cw / 2;
    const cy = anchorY - ch * 0.84;

    ctx.drawImage(cImg, cx, cy, cw, ch);

    // 4. Flickering flame + warm radial bloom above the wick
    if (lit && fImg && fImg.complete && fImg.naturalWidth) {
      const flickerScaleX = 1 + Math.sin(time * 8.2) * 0.045;
      const flickerScaleY = 1 + Math.cos(time * 6.7) * 0.06;
      const flickerTilt = Math.sin(time * 5.1) * 0.055;

      const fh = ch * 0.58;
      const fw = fh * (fImg.naturalWidth / fImg.naturalHeight);
      const wickX = anchorX;
      const wickY = cy + ch * 0.09;

      // Soft warm candlelight bloom
      const auraR = width * 0.44 * (0.96 + 0.04 * Math.sin(time * 4.2));
      const aura = ctx.createRadialGradient(wickX, wickY - fh * 0.35, 1, wickX, wickY - fh * 0.35, auraR);
      aura.addColorStop(0, 'rgba(255, 232, 174, 0.45)');
      aura.addColorStop(0.4, 'rgba(245, 185, 96, 0.16)');
      aura.addColorStop(1, 'rgba(245, 185, 96, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(wickX, wickY - fh * 0.35, auraR, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(wickX, wickY);
      ctx.rotate(flickerTilt);
      ctx.scale(flickerScaleX, flickerScaleY);
      ctx.drawImage(fImg, -fw / 2, -fh * 0.8, fw, fh);
      ctx.restore();
    }
  }

  ctx.restore();
}

/**
 * Helper to wrap Thai/Latin text cleanly onto a Canvas 2D context.
 */
function wrapCanvasText(ctx, text, maxWidth) {
  const paragraphs = text.split('\n');
  const lines = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // Split intelligently: keep space-separated words or character segments for Thai
    const tokens = trimmed.includes(' ') ? trimmed.split(/(\s+)/) : Array.from(trimmed);
    let current = '';

    for (const token of tokens) {
      const test = current + token;
      if (ctx.measureText(test).width > maxWidth && current.trim().length > 0) {
        lines.push(current.trim());
        current = token.trimStart();
      } else {
        current = test;
      }
    }
    if (current.trim()) lines.push(current.trim());
  }

  return lines;
}

/**
 * Generate & download a crisp 1080x1350 PNG Keepsake Card featuring
 * the user's chosen Krathong, glowing moonlight, and personal wish.
 */
export async function exportKeepsakeCard({ krathongCfg, wishText, images }) {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // 1. Night Sky & Moonlit River Background
  ctx.fillStyle = '#071123';
  ctx.fillRect(0, 0, W, H);

  if (images.nightSky?.complete) {
    const img = images.nightSky;
    const scale = Math.max(W / img.naturalWidth, (H * 0.56) / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, (W - dw) / 2, 0, dw, dh);
  }

  if (images.riverBg?.complete) {
    const img = images.riverBg;
    const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.drawImage(img, (W - dw) / 2, (H - dh) * 0.16, dw, dh);
    ctx.restore();
  }

  // Atmospheric vignette
  const vig = ctx.createLinearGradient(0, 0, 0, H);
  vig.addColorStop(0, 'rgba(6, 14, 29, 0.34)');
  vig.addColorStop(0.38, 'rgba(6, 14, 29, 0.10)');
  vig.addColorStop(0.72, 'rgba(6, 14, 29, 0.62)');
  vig.addColorStop(1, 'rgba(5, 11, 24, 0.90)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // 2. Full Moonlight
  if (images.moonlight?.complete) {
    const mSize = 290;
    ctx.drawImage(images.moonlight, (W - mSize) / 2, 74, mSize, mSize);
  }

  // 3. Soft Decorative Border
  ctx.strokeStyle = 'rgba(245, 199, 126, 0.28)';
  ctx.lineWidth = 2;
  ctx.strokeRect(46, 46, W - 92, H - 92);

  // 4. User's Lit Krathong resting right on the moonlit river surface
  drawKrathongOnCanvas(ctx, {
    x: W / 2,
    y: 740,
    width: 375,
    time: 1.2,
    sway: 0.01,
    lit: true,
    krathongCfg,
    images,
    drawReflection: true,
    opacity: 1,
  });

  // 5. Delicate Floral Ornament above the wish quote
  if (images.floralOrnament?.complete) {
    const fw = 178;
    const fh = fw * (images.floralOrnament.naturalHeight / images.floralOrnament.naturalWidth);
    ctx.drawImage(images.floralOrnament, (W - fw) / 2, 838, fw, fh);
  }

  // 6. Typography
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5c77e';
  ctx.font = '500 26px "Cormorant Garamond", Georgia, serif';
  ctx.fillText('A LITTLE WISH  ·  LOY KRATHONG', W / 2, 944);

  const displayWish = (wishText || '').trim() || DEFAULT_SILENT_WISH;
  ctx.fillStyle = '#fbf4e4';
  ctx.font = '400 38px "Noto Serif Thai", Georgia, serif';
  const lines = wrapCanvasText(ctx, `“${displayWish}”`, W - 210).slice(0, 3);
  const lineH = 56;
  const startY = 1020 - ((lines.length - 1) * lineH) / 4;
  lines.forEach((line, idx) => {
    ctx.fillText(line, W / 2, startY + idx * lineH);
  });

  // Closing sentiment
  ctx.fillStyle = 'rgba(242, 229, 203, 0.86)';
  ctx.font = '400 25px "Noto Serif Thai", sans-serif';
  ctx.fillText('ขอให้แสงจันทร์และสายน้ำพาคำอธิษฐานเล็ก ๆ นี้ไปถึงฝั่งฝันอย่างอ่อนโยน', W / 2, 1196);

  ctx.fillStyle = 'rgba(201, 213, 230, 0.68)';
  ctx.font = '400 22px "Noto Sans Thai", sans-serif';
  ctx.fillText(krathongCfg.nameTh, W / 2, 1250);

  // Trigger clean file download
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `a-little-wish-${krathongCfg.id}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Preload all image assets cleanly into an indexed map for Canvas + Keepsake rendering.
 */
export async function preloadImageMap(krathongs) {
  const entries = [
    ...Object.entries(ASSETS),
    ...krathongs.map((k) => [k.id, k.image]),
  ];

  const images = {};
  await Promise.allSettled(
    entries.map(
      ([key, src]) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            images[key] = img;
            resolve(img);
          };
          img.onerror = () => {
            images[key] = img;
            resolve(null);
          };
          img.src = src;
        })
    )
  );
  return images;
}
