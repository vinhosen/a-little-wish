/**
 * A Little Wish — Asset Preloader & High-Res Keepsake Card Exporter (1080x1350 PNG)
 * Uses the unified KrathongRenderer so exported keepsake cards match
 * the player's custom-designed Krathong & Nickname identically.
 */

import { ASSETS, DEFAULT_SILENT_WISH, KRATHONG_BASES } from './config.js';

function wrapCanvasText(ctx, text, maxWidth) {
  const paragraphs = text.split('\n');
  const lines = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

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

export async function exportKeepsakeCard({
  designConfig,
  nickname,
  krathongId,
  wishText,
  images,
  renderer,
}) {
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

  // 4. Player's Custom-Designed Krathong rendered via unified KrathongRenderer
  renderer.draw(ctx, {
    designConfig,
    x: W / 2,
    y: 745,
    displayWidth: 365,
    time: 1.2,
    tilt: 0.01,
    drawReflection: true,
    isLit: true,
    lodOverride: 320,
  });

  // 5. Floral Ornament
  if (images.floralOrnament?.complete) {
    const fw = 178;
    const fh = fw * (images.floralOrnament.naturalHeight / images.floralOrnament.naturalWidth);
    ctx.drawImage(images.floralOrnament, (W - fw) / 2, 838, fw, fh);
  }

  // 6. Typography & Attribution
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5c77e';
  ctx.font = '500 26px "Cormorant Garamond", Georgia, serif';
  ctx.fillText('A LITTLE WISH  ·  COMMUNITY RIVER', W / 2, 944);

  const displayWish = (wishText || '').trim() || DEFAULT_SILENT_WISH;
  ctx.fillStyle = '#fbf4e4';
  ctx.font = '400 38px "Noto Serif Thai", Georgia, serif';
  const lines = wrapCanvasText(ctx, `“${displayWish}”`, W - 210).slice(0, 3);
  const lineH = 56;
  const startY = 1020 - ((lines.length - 1) * lineH) / 4;
  lines.forEach((line, idx) => {
    ctx.fillText(line, W / 2, startY + idx * lineH);
  });

  const baseMeta = KRATHONG_BASES.find((b) => b.id === designConfig?.baseId);
  ctx.fillStyle = 'rgba(242, 229, 203, 0.86)';
  ctx.font = '400 25px "Noto Serif Thai", sans-serif';
  ctx.fillText(`โดย ${nickname || 'ผู้ร่วมลอยกระทง'}  ·  ${baseMeta ? baseMeta.nameTh : ''}`, W / 2, 1196);

  ctx.fillStyle = 'rgba(201, 213, 230, 0.65)';
  ctx.font = '400 21px "Noto Sans Thai", sans-serif';
  ctx.fillText(krathongId ? `ID: ${krathongId}` : 'A Little Wish', W / 2, 1246);

  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `a-little-wish-${(krathongId || 'custom').toLowerCase()}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function preloadImageMap() {
  const entries = Object.entries(ASSETS);
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
