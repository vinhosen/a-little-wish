/**
 * A Little Wish — 6-Scene Controller & Interaction Orchestrator
 * Manages all 6 scenes, smooth guarded transitions, touch swipes,
 * candle lighting, interactive river release, keepsake export & full reset.
 */

import { DEFAULT_SILENT_WISH, KRATHONGS, TOTAL_SCENES } from './config.js';
import { store } from './state.js';
import {
  exportKeepsakeCard,
  triggerCandleSparks,
  updateKrathongAssembly,
} from './krathongView.js';

export class SceneManager {
  constructor({ riverCanvas, sound, images }) {
    this.river = riverCanvas;
    this.sound = sound;
    this.images = images;

    this._transitioning = false;
    this._toastTimer = null;
    this._revealMessageTimer = null;

    this._cacheDom();
    this._bindInteractions();
    this._renderKrathongSelection(0, { animate: false });
    this._syncHud(1);
    this._syncSoundButton(false);
  }

  _cacheDom() {
    this.sceneEls = Array.from(document.querySelectorAll('.scene[data-scene]'));
    this.dotEls = Array.from(document.querySelectorAll('.scene-dot'));
    this.toastEl = document.getElementById('app-toast');
    this.liveRegionEl = document.getElementById('sr-live-region');

    // HUD
    this.btnSound = document.getElementById('btn-sound');
    this.soundLabel = document.getElementById('sound-label');
    this.soundIconOn = document.getElementById('sound-icon-on');
    this.soundIconOff = document.getElementById('sound-icon-off');

    // Scene 1
    this.btnBegin = document.getElementById('btn-begin');

    // Scene 2
    this.btnToChoose = document.getElementById('btn-to-choose');
    this.btnBackTo1 = document.getElementById('btn-back-to-1');

    // Scene 3
    this.carouselStage = document.getElementById('krathong-carousel-stage');
    this.chooseAssembly = document.getElementById('choose-krathong-assembly');
    this.krathongMeta = document.getElementById('krathong-meta');
    this.krathongName = document.getElementById('krathong-name');
    this.krathongDesc = document.getElementById('krathong-desc');
    this.btnPrevKrathong = document.getElementById('btn-prev-krathong');
    this.btnNextKrathong = document.getElementById('btn-next-krathong');
    this.thumbButtons = Array.from(document.querySelectorAll('.krathong-thumb[data-krathong-index]'));
    this.btnToWish = document.getElementById('btn-to-wish');
    this.btnBackTo2 = document.getElementById('btn-back-to-2');

    // Scene 4
    this.wishAssembly = document.getElementById('wish-krathong-assembly');
    this.btnLightCandle = document.getElementById('btn-light-candle');
    this.candleStatus = document.getElementById('candle-status');
    this.wishInput = document.getElementById('wish-input');
    this.wishCounter = document.getElementById('wish-counter');
    this.wishChips = Array.from(document.querySelectorAll('.wish-chip'));
    this.btnToFloat = document.getElementById('btn-to-float');
    this.btnBackTo3 = document.getElementById('btn-back-to-3');

    // Scene 5
    this.floatHeader = document.getElementById('float-header');
    this.floatCaption = document.getElementById('float-caption');
    this.floatSubcaption = document.getElementById('float-subcaption');
    this.swipeCue = document.getElementById('swipe-up-cue');
    this.btnRelease = document.getElementById('btn-release-krathong');
    this.btnToMessage = document.getElementById('btn-to-message');
    this.floatingWishBanner = document.getElementById('floating-wish-banner');

    // Scene 6
    this.keepsakeAssembly = document.getElementById('keepsake-krathong-assembly');
    this.keepsakeWishText = document.getElementById('keepsake-wish-text');
    this.btnSaveKeepsake = document.getElementById('btn-save-keepsake');
    this.btnRestart = document.getElementById('btn-restart');
  }

  _bindInteractions() {
    // Sound toggle
    this.btnSound.addEventListener('click', async () => {
      const next = !store.current.soundEnabled;
      const actual = await this.sound.setEnabled(next);
      store.update({ soundEnabled: actual, userToggledSound: true });
      this._syncSoundButton(actual);
      this.showToast(actual ? 'เปิดเสียงบรรยากาศริมน้ำแล้ว' : 'ปิดเสียงแล้ว');
    });

    // Scene 1 -> 2
    this.btnBegin.addEventListener('click', async () => {
      if (!store.current.userToggledSound && !store.current.soundEnabled) {
        const enabled = await this.sound.setEnabled(true);
        store.update({ soundEnabled: enabled });
        this._syncSoundButton(enabled);
      }
      this.sound.playSoftClick();
      this.goToScene(2);
    });

    // Scene 2 -> 3 / Back
    this.btnToChoose.addEventListener('click', () => {
      this.sound.playSoftClick();
      this.goToScene(3);
    });
    this.btnBackTo1.addEventListener('click', () => {
      this.sound.playSoftClick();
      this.goToScene(1);
    });

    // Scene 3 — Krathong selection (buttons, thumbs, swipe, keyboard)
    this.btnPrevKrathong.addEventListener('click', () => this.stepKrathong(-1));
    this.btnNextKrathong.addEventListener('click', () => this.stepKrathong(1));

    this.thumbButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.krathongIndex);
        this.selectKrathong(idx);
      });
    });

    this._bindCarouselSwipe();

    document.addEventListener('keydown', (e) => {
      if (store.current.scene !== 3) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.stepKrathong(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.stepKrathong(1);
      }
    });

    this.btnToWish.addEventListener('click', () => {
      this.sound.playSoftClick();
      this.goToScene(4);
    });
    this.btnBackTo2.addEventListener('click', () => {
      this.sound.playSoftClick();
      this.goToScene(2);
    });

    // Scene 4 — Light candle & write wish
    this.btnLightCandle.addEventListener('click', () => this.igniteCandle());

    this.wishInput.addEventListener('input', () => {
      const value = this.wishInput.value.slice(0, 140);
      store.update({ wishText: value });
      this.wishCounter.textContent = `${value.length} / 140`;
    });

    this.wishChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const text = chip.dataset.wish || '';
        this.wishInput.value = text;
        store.update({ wishText: text });
        this.wishCounter.textContent = `${text.length} / 140`;
        this.sound.playSoftClick();
      });
    });

    this.btnToFloat.addEventListener('click', () => {
      if (!store.current.candleLit) {
        this.igniteCandle();
        this.showToast('จุดเทียนให้สว่างแล้ว แตะอีกครั้งเพื่อลอยกระทงนะ');
        return;
      }
      this.sound.playSoftClick();
      this.goToScene(5);
    });

    this.btnBackTo3.addEventListener('click', () => {
      this.sound.playSoftClick();
      this.goToScene(3);
    });

    // Scene 5 — Interactive release (button OR upward drag on canvas)
    this.btnRelease.addEventListener('click', () => this.triggerRelease());
    this._bindReleaseDrag();

    this.btnToMessage.addEventListener('click', () => {
      this.sound.playSoftClick();
      this.goToScene(6);
    });

    // Scene 6 — Keepsake download & full restart
    this.btnSaveKeepsake.addEventListener('click', async () => {
      this.sound.playSoftClick();
      try {
        await exportKeepsakeCard({
          krathongCfg: store.selectedKrathong,
          wishText: store.current.wishText,
          images: this.images,
        });
        this.showToast('บันทึกการ์ดความทรงจำแล้วนะ');
      } catch {
        this.showToast('ไม่สามารถบันทึกภาพได้ในขณะนี้');
      }
    });

    this.btnRestart.addEventListener('click', () => {
      this.sound.playSoftClick();
      this.restartExperience();
    });
  }

  _bindCarouselSwipe() {
    let startX = null;
    let pointerId = null;

    this.carouselStage.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      startX = e.clientX;
      pointerId = e.pointerId;
      this.carouselStage.setPointerCapture?.(pointerId);
    });

    this.carouselStage.addEventListener('pointerup', (e) => {
      if (startX == null || e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      startX = null;
      pointerId = null;
      if (Math.abs(dx) > 36) {
        this.stepKrathong(dx < 0 ? 1 : -1);
      }
    });

    this.carouselStage.addEventListener('pointercancel', () => {
      startX = null;
      pointerId = null;
    });
  }

  _bindReleaseDrag() {
    const canvas = this.river.canvas;
    let dragging = false;
    let startY = 0;
    let pointerId = null;

    canvas.addEventListener('pointerdown', (e) => {
      if (store.current.scene !== 5 || store.current.hasReleased) return;
      const rect = this.river.getKrathongScreenRect();
      if (!rect) return;

      // Generous touch area around the foreground krathong
      const hitPad = 76;
      const withinX = e.clientX >= rect.x - hitPad && e.clientX <= rect.x + rect.width + hitPad;
      const withinY = e.clientY >= rect.y - hitPad && e.clientY <= rect.y + rect.height + hitPad;
      if (!withinX || !withinY) return;

      dragging = true;
      startY = e.clientY;
      pointerId = e.pointerId;
      canvas.setPointerCapture?.(pointerId);
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!dragging || e.pointerId !== pointerId) return;
      const dy = e.clientY - startY;
      this.river.setDragOffset(dy);
    });

    const finishDrag = (e) => {
      if (!dragging || e.pointerId !== pointerId) return;
      const dy = e.clientY - startY;
      dragging = false;
      pointerId = null;

      if (dy < -32) {
        this.triggerRelease();
      } else {
        this.river.setDragOffset(0);
      }
    };

    canvas.addEventListener('pointerup', finishDrag);
    canvas.addEventListener('pointercancel', () => {
      if (!dragging) return;
      dragging = false;
      pointerId = null;
      this.river.setDragOffset(0);
    });
  }

  stepKrathong(delta) {
    const next = (store.current.krathongIndex + delta + KRATHONGS.length) % KRATHONGS.length;
    this.selectKrathong(next);
  }

  selectKrathong(index) {
    if (index === store.current.krathongIndex) return;
    store.update({ krathongIndex: index });
    this.sound.playSwitchChime(index);
    this._renderKrathongSelection(index, { animate: true });
  }

  _renderKrathongSelection(index, { animate = true } = {}) {
    const cfg = KRATHONGS[index] || KRATHONGS[0];

    this.thumbButtons.forEach((btn) => {
      const isSelected = Number(btn.dataset.krathongIndex) === index;
      btn.classList.toggle('is-selected', isSelected);
      btn.setAttribute('aria-pressed', String(isSelected));
    });

    const applyContent = () => {
      updateKrathongAssembly(this.chooseAssembly, cfg, { lit: false });
      this.krathongName.textContent = cfg.nameTh;
      this.krathongDesc.textContent = cfg.description;
    };

    if (!animate) {
      applyContent();
      return;
    }

    this.chooseAssembly.classList.add('is-switching');
    this.krathongMeta.style.opacity = '0.25';
    setTimeout(() => {
      applyContent();
      this.chooseAssembly.classList.remove('is-switching');
      this.krathongMeta.style.opacity = '1';
    }, 150);
  }

  igniteCandle() {
    if (store.current.candleLit) return;
    store.update({ candleLit: true });
    updateKrathongAssembly(this.wishAssembly, store.selectedKrathong, { lit: true });
    triggerCandleSparks(this.wishAssembly);
    this.sound.playCandleLight();

    this.candleStatus.textContent = 'เทียนสว่างแล้ว... เขียนคำอธิษฐานเล็ก ๆ ของคุณได้เลย';
    this.candleStatus.classList.add('is-lit');
    this.btnLightCandle.setAttribute('aria-label', 'จุดเทียนเรียบร้อยแล้ว');
    this.btnToFloat.textContent = 'พร้อมปล่อยกระทงลงน้ำ';
    this.btnToFloat.classList.remove('btn-soft-glow');
    this._announce('จุดเทียนเรียบร้อยแล้ว');
  }

  triggerRelease() {
    if (store.current.scene !== 5 || store.current.hasReleased) return;
    store.update({ hasReleased: true });

    this.sound.playReleaseChord();

    // Hide initial release prompts smoothly
    this.swipeCue.classList.add('is-hidden-soft');
    this.btnRelease.classList.add('is-hidden-soft');
    this.btnRelease.disabled = true;

    this.floatCaption.textContent = 'สายน้ำกำลังพาคำอธิษฐานของคุณออกไปช้า ๆ...';
    this.floatSubcaption.textContent = 'แตะผิวน้ำเบา ๆ เพื่อส่งกลีบดอกไม้และระลอกคลื่นตามไปได้นะ';

    // Show rising ethereal wish text
    const wish = (store.current.wishText || '').trim();
    if (wish) {
      this.floatingWishBanner.textContent = `“${wish}”`;
    } else {
      this.floatingWishBanner.textContent = '“ขอให้คำอธิษฐานในใจเดินทางไปอย่างอ่อนโยน”';
    }
    this.floatingWishBanner.classList.remove('is-rising');
    // Trigger reflow safely so CSS animation starts fresh
    void this.floatingWishBanner.offsetWidth;
    this.floatingWishBanner.classList.add('is-rising');

    this._announce('ปล่อยกระทงลงสู่สายน้ำแล้ว');

    this.river.releaseKrathong(() => {
      if (store.current.scene !== 5) return;
      store.update({ floatCompleted: true });
      this.btnToMessage.hidden = false;
      this.btnToMessage.classList.remove('is-hidden-soft');
      this.btnToMessage.classList.add('is-revealed-soft');
      this.floatSubcaption.textContent = 'อยู่ดูแสงเทียนบนผิวน้ำต่อได้ตามสบาย หรือเปิดข้อความเล็ก ๆ ด้านล่างนะ';
    });
  }

  goToScene(targetScene) {
    if (targetScene < 1 || targetScene > TOTAL_SCENES) return;
    if (this._transitioning && targetScene !== 1) return;
    if (targetScene === store.current.scene) return;

    this._transitioning = true;
    setTimeout(() => {
      this._transitioning = false;
    }, 360);

    if (this._revealMessageTimer) {
      clearTimeout(this._revealMessageTimer);
      this._revealMessageTimer = null;
    }

    store.update({ scene: targetScene });
    document.body.dataset.scene = String(targetScene);
    this._syncHud(targetScene);

    // Scene-specific preparation
    if (targetScene < 5) {
      this.river.clearFloatingKrathong();
      this.floatingWishBanner.classList.remove('is-rising');
    }

    if (targetScene === 3) {
      this._renderKrathongSelection(store.current.krathongIndex, { animate: false });
    }

    if (targetScene === 4) {
      this._prepareScene4();
    }

    if (targetScene === 5) {
      this._prepareScene5();
    }

    if (targetScene === 6) {
      this._prepareScene6();
    }

    // Toggle active scene class & scroll to top safely
    this.sceneEls.forEach((el) => {
      const sNum = Number(el.dataset.scene);
      const active = sNum === targetScene;
      el.classList.toggle('is-active', active);
      el.setAttribute('aria-hidden', String(!active));
      if (active) {
        el.scrollTop = 0;
        const heading = el.querySelector('h1, h2');
        if (heading) this._announce(heading.textContent.trim());
      }
    });
  }

  _prepareScene4() {
    const cfg = store.selectedKrathong;
    const isLit = store.current.candleLit;
    updateKrathongAssembly(this.wishAssembly, cfg, { lit: isLit });
    if (isLit) {
      this.candleStatus.textContent = 'เทียนสว่างแล้ว... เขียนคำอธิษฐานเล็ก ๆ ของคุณได้เลย';
      this.candleStatus.classList.add('is-lit');
      this.btnToFloat.textContent = 'พร้อมปล่อยกระทงลงน้ำ';
      this.btnToFloat.classList.remove('btn-soft-glow');
    } else {
      this.candleStatus.textContent = 'แตะที่ไส้เทียนเพื่อจุดไฟดวงเล็ก ๆ';
      this.candleStatus.classList.remove('is-lit');
      this.btnToFloat.textContent = 'จุดเทียนก่อนปล่อยกระทง';
      this.btnToFloat.classList.add('btn-soft-glow');
    }
  }

  _prepareScene5() {
    store.update({ hasReleased: false, floatCompleted: false });
    this.river.prepareFloatingKrathong(store.selectedKrathong);

    this.floatCaption.textContent = 'กระทงพร้อมลอยแล้ว';
    this.floatSubcaption.textContent = 'ค่อย ๆ ดันกระทงขึ้น หรือแตะปุ่มด้านล่างเพื่อปล่อยลงสายน้ำ';

    this.swipeCue.classList.remove('is-hidden-soft');
    this.btnRelease.classList.remove('is-hidden-soft');
    this.btnRelease.disabled = false;

    this.btnToMessage.hidden = true;
    this.btnToMessage.classList.add('is-hidden-soft');
    this.btnToMessage.classList.remove('is-revealed-soft');

    this.floatingWishBanner.classList.remove('is-rising');
    this.floatingWishBanner.textContent = '';
  }

  _prepareScene6() {
    const cfg = store.selectedKrathong;
    updateKrathongAssembly(this.keepsakeAssembly, cfg, { lit: true });
    const wish = (store.current.wishText || '').trim();
    this.keepsakeWishText.textContent = wish ? `“${wish}”` : `“${DEFAULT_SILENT_WISH}”`;
  }

  restartExperience() {
    if (this._revealMessageTimer) {
      clearTimeout(this._revealMessageTimer);
      this._revealMessageTimer = null;
    }

    store.resetExperience();
    this.river.clearFloatingKrathong();
    this.floatingWishBanner.classList.remove('is-rising');
    this.floatingWishBanner.textContent = '';

    // Reset form & krathong selector UI
    this.wishInput.value = '';
    this.wishCounter.textContent = '0 / 140';
    this._renderKrathongSelection(0, { animate: false });

    // Force return cleanly to Scene 1
    this._transitioning = false;
    document.body.dataset.scene = '1';
    this._syncHud(1);
    this.sceneEls.forEach((el) => {
      const active = Number(el.dataset.scene) === 1;
      el.classList.toggle('is-active', active);
      el.setAttribute('aria-hidden', String(!active));
      if (active) el.scrollTop = 0;
    });

    this.showToast('เริ่มต้นค่ำคืนแห่งคำอธิษฐานใหม่แล้ว');
  }

  _syncHud(sceneNumber) {
    this.dotEls.forEach((dot, i) => {
      const idx = i + 1;
      dot.classList.toggle('is-active', idx === sceneNumber);
      dot.classList.toggle('is-past', idx < sceneNumber);
    });
  }

  _syncSoundButton(enabled) {
    this.btnSound.setAttribute('aria-pressed', String(enabled));
    this.btnSound.classList.toggle('is-active', enabled);
    if (enabled) {
      this.soundIconOn.removeAttribute('hidden');
      this.soundIconOff.setAttribute('hidden', '');
    } else {
      this.soundIconOn.setAttribute('hidden', '');
      this.soundIconOff.removeAttribute('hidden');
    }
    this.soundLabel.textContent = enabled ? 'เปิดเสียง' : 'ปิดเสียง';
  }

  showToast(message) {
    if (!this.toastEl) return;
    this.toastEl.textContent = message;
    this.toastEl.classList.add('is-visible');
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this.toastEl.classList.remove('is-visible');
    }, 2400);
  }

  _announce(text) {
    if (!this.liveRegionEl) return;
    this.liveRegionEl.textContent = '';
    requestAnimationFrame(() => {
      this.liveRegionEl.textContent = text;
    });
  }
}
