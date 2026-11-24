/**
 * A Little Wish — Virtual Loy Krathong Community Scene Controller
 * Orchestrates all 6 scenes, player nickname sessions, Krathong Creator,
 * candle lighting, shared Community River release, Profile Popup,
 * Keepsake PNG export, and full experience navigation.
 */

import {
  DEFAULT_SILENT_WISH,
  SYSTEM_COLLECTION_BADGE,
  TOTAL_SCENES,
} from './config.js';
import { exportKeepsakeCard } from './krathongView.js';
import { validateNickname, validateWishMessage } from './services/safety.js';
import { store } from './state.js';
import { SYSTEM_KRATHONGS } from './systemCollection.js';

export class SceneManager {
  constructor({ riverCanvas, renderer, creator, backend, sound, images }) {
    this.river = riverCanvas;
    this.renderer = renderer;
    this.creator = creator;
    this.backend = backend;
    this.sound = sound;
    this.images = images;

    this._transitioning = false;
    this._toastTimer = null;
    this._wishPreviewRaf = null;
    this._profilePreviewRaf = null;
    this._previewStart = performance.now();

    this._cacheDom();
    this._bindInteractions();
    this._hydrateSessionUI();
    this._refreshCommunityWorld();
    this._syncHud(1);
    this._syncSoundButton(false);
  }

  _cacheDom() {
    this.sceneEls = Array.from(document.querySelectorAll('.scene[data-scene]'));
    this.dotEls = Array.from(document.querySelectorAll('.scene-dot'));
    this.toastEl = document.getElementById('app-toast');
    this.liveRegionEl = document.getElementById('sr-live-region');

    // HUD
    this.btnHudRiver = document.getElementById('btn-hud-river');
    this.hudPlayerPill = document.getElementById('hud-player-pill');
    this.hudPlayerName = document.getElementById('hud-player-name');
    this.btnSound = document.getElementById('btn-sound');
    this.soundLabel = document.getElementById('sound-label');
    this.soundIconOn = document.getElementById('sound-icon-on');
    this.soundIconOff = document.getElementById('sound-icon-off');

    // Scene 1
    this.btnBegin = document.getElementById('btn-begin');
    this.btnExploreRiver = document.getElementById('btn-explore-river');
    this.riverPopulationBadge = document.getElementById('river-population-badge');

    // Scene 2: Invitation & Player Nickname Session
    this.nicknameInput = document.getElementById('nickname-input');
    this.nicknameError = document.getElementById('nickname-error');
    this.returningBanner = document.getElementById('returning-session-banner');
    this.returningSummary = document.getElementById('returning-session-summary');
    this.btnToChoose = document.getElementById('btn-to-choose');
    this.btnBackTo1 = document.getElementById('btn-back-to-1');

    // Scene 3: Creator & System Collection
    this.btnToWish = document.getElementById('btn-to-wish');
    this.btnBackTo2 = document.getElementById('btn-back-to-2');

    // Scene 4: Make A Wish & Light Candle
    this.wishPreviewCanvas = document.getElementById('wish-preview-canvas');
    this.wishAssembly = document.getElementById('wish-krathong-assembly');
    this.btnLightCandle = document.getElementById('btn-light-candle');
    this.candleStatus = document.getElementById('candle-status');
    this.wishInput = document.getElementById('wish-input');
    this.wishCounter = document.getElementById('wish-counter');
    this.wishError = document.getElementById('wish-error');
    this.wishChips = Array.from(document.querySelectorAll('.wish-chip'));
    this.btnToFloat = document.getElementById('btn-to-float');
    this.btnBackTo3 = document.getElementById('btn-back-to-3');

    // Scene 5: Community River & Let It Float
    this.floatHeader = document.getElementById('float-header');
    this.floatCaption = document.getElementById('float-caption');
    this.floatSubcaption = document.getElementById('float-subcaption');
    this.communityStatsPill = document.getElementById('community-stats-pill');
    this.syncModePill = document.getElementById('sync-mode-pill');
    this.swipeCue = document.getElementById('swipe-up-cue');
    this.btnRelease = document.getElementById('btn-release-krathong');
    this.btnEditBeforeRelease = document.getElementById('btn-edit-before-release');
    this.btnToMessage = document.getElementById('btn-to-message');
    this.btnCreateMore = document.getElementById('btn-create-more');
    this.floatingWishBanner = document.getElementById('floating-wish-banner');

    // Scene 6: Keepsake & Closing
    this.keepsakeCanvas = document.getElementById('keepsake-preview-canvas');
    this.keepsakeWishText = document.getElementById('keepsake-wish-text');
    this.keepsakeAuthor = document.getElementById('keepsake-author');
    this.btnSaveKeepsake = document.getElementById('btn-save-keepsake');
    this.btnViewRiverFrom6 = document.getElementById('btn-view-river-from-6');
    this.btnRestart = document.getElementById('btn-restart');

    // Community Profile Popup Modal
    this.profileModal = document.getElementById('krathong-profile-modal');
    this.profileCanvas = document.getElementById('profile-preview-canvas');
    this.profileBadge = document.getElementById('profile-badge');
    this.profileTitle = document.getElementById('profile-title');
    this.profileIdLabel = document.getElementById('profile-id-label');
    this.profileWish = document.getElementById('profile-wish');
    this.profileMeta = document.getElementById('profile-meta');
    this.btnProfileEdit = document.getElementById('btn-profile-edit');
    this.btnProfileRemix = document.getElementById('btn-profile-remix');
    this.btnProfileClose = document.getElementById('btn-profile-close');
  }

  _bindInteractions() {
    // Backend live updates
    this.backend.onUpdate(() => {
      this._refreshCommunityWorld();
    });

    // Sound toggle
    this.btnSound.addEventListener('click', async () => {
      const next = !store.current.soundEnabled;
      const actual = await this.sound.setEnabled(next);
      store.update({ soundEnabled: actual, userToggledSound: true });
      this._syncSoundButton(actual);
      this.showToast(actual ? 'เปิดเสียงบรรยากาศริมน้ำแล้ว' : 'ปิดเสียงแล้ว');
    });

    // HUD shortcut to Community River
    this.btnHudRiver.addEventListener('click', () => {
      this.sound.playSoftClick();
      this.openCommunityRiverExplore();
    });

    // Scene 1
    this.btnBegin.addEventListener('click', async () => {
      if (!store.current.userToggledSound && !store.current.soundEnabled) {
        const enabled = await this.sound.setEnabled(true);
        store.update({ soundEnabled: enabled });
        this._syncSoundButton(enabled);
      }
      this.sound.playSoftClick();
      this.goToScene(2);
    });

    this.btnExploreRiver.addEventListener('click', () => {
      this.sound.playSoftClick();
      this.openCommunityRiverExplore();
    });

    // Scene 2 — Nickname validation & session creation/resumption
    this.nicknameInput.addEventListener('input', () => {
      this.nicknameError.textContent = '';
    });

    this.btnToChoose.addEventListener('click', async () => {
      const rawNick = this.nicknameInput.value;
      const check = validateNickname(rawNick);
      if (!check.ok) {
        this.nicknameError.textContent = check.error;
        this.nicknameInput.focus();
        return;
      }

      this.btnToChoose.disabled = true;
      try {
        const sess = await this.backend.ensureSession(check.value);
        store.update({ session: sess, exploreMode: false });
        this._hydrateSessionUI();
        await this._refreshCommunityWorld();
        this.sound.playSoftClick();
        this.goToScene(3);
      } catch (err) {
        this.nicknameError.textContent = err.message || 'ไม่สามารถบันทึกชื่อเล่นได้';
      } finally {
        this.btnToChoose.disabled = false;
      }
    });

    this.btnBackTo1.addEventListener('click', () => {
      this.sound.playSoftClick();
      this.goToScene(1);
    });

    // Scene 3 -> Scene 4
    this.btnToWish.addEventListener('click', async () => {
      // If user is currently browsing System Collection tab, copy that collection config into editable designConfig
      if (store.current.studioMode === 'collection') {
        const sys = SYSTEM_KRATHONGS[store.current.collectionIndex] || SYSTEM_KRATHONGS[0];
        store.update({
          designConfig: JSON.parse(JSON.stringify(sys.designConfig)),
          studioMode: 'creator',
        });
        this.creator.syncFromState();
      }

      // Persist draft quietly if session exists
      if (store.current.session) {
        try {
          const saved = await this.backend.saveKrathong({
            krathongId: store.current.editingKrathongId,
            designConfig: store.current.designConfig,
            wishMessage: store.current.wishText,
            releaseStatus: 'draft',
          });
          store.update({ editingKrathongId: saved.krathongId });
        } catch {
          // Non-fatal for draft preview
        }
      }

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
      this.wishError.textContent = '';
    });

    this.wishChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const text = chip.dataset.wish || '';
        this.wishInput.value = text;
        store.update({ wishText: text });
        this.wishCounter.textContent = `${text.length} / 140`;
        this.wishError.textContent = '';
        this.sound.playSoftClick();
      });
    });

    this.btnToFloat.addEventListener('click', () => {
      const wishCheck = validateWishMessage(this.wishInput.value);
      if (!wishCheck.ok) {
        this.wishError.textContent = wishCheck.error;
        this.wishInput.focus();
        return;
      }
      store.update({ wishText: wishCheck.value });

      if (!store.current.candleLit) {
        this.igniteCandle();
        this.showToast('จุดเทียนให้สว่างแล้ว แตะอีกครั้งเพื่อไปริมน้ำนะ');
        return;
      }

      this.sound.playSoftClick();
      this.goToScene(5);
    });

    this.btnBackTo3.addEventListener('click', () => {
      this.sound.playSoftClick();
      this.goToScene(3);
    });

    // Scene 5 — Release into Community River OR Edit before release
    this.btnRelease.addEventListener('click', () => this.triggerRelease());
    this.btnEditBeforeRelease.addEventListener('click', () => {
      this.sound.playSoftClick();
      this.goToScene(3);
    });
    this._bindReleaseDrag();

    this.btnToMessage.addEventListener('click', () => {
      this.sound.playSoftClick();
      this.goToScene(6);
    });

    this.btnCreateMore.addEventListener('click', () => {
      this.sound.playSoftClick();
      if (store.current.session) {
        store.startNewCraft({ keepSession: true });
        this.creator.syncFromState();
        this.goToScene(3);
      } else {
        this.goToScene(2);
      }
    });

    // Scene 6 — Keepsake PNG, Return to River, Restart
    this.btnSaveKeepsake.addEventListener('click', async () => {
      this.sound.playSoftClick();
      try {
        const rec = store.current.releasedRecord;
        await exportKeepsakeCard({
          designConfig: store.current.designConfig,
          nickname: store.current.session?.nickname || rec?.nickname,
          krathongId: rec?.krathongId || store.current.editingKrathongId,
          wishText: store.current.wishText,
          images: this.images,
          renderer: this.renderer,
        });
        this.showToast('บันทึกการ์ดความทรงจำแล้วนะ');
      } catch {
        this.showToast('ไม่สามารถบันทึกภาพได้ในขณะนี้');
      }
    });

    this.btnViewRiverFrom6.addEventListener('click', () => {
      this.sound.playSoftClick();
      this.openCommunityRiverExplore();
    });

    this.btnRestart.addEventListener('click', () => {
      this.sound.playSoftClick();
      store.startNewCraft({ keepSession: true });
      this.creator.syncFromState();
      this.wishInput.value = '';
      this.wishCounter.textContent = '0 / 140';
      this.goToScene(store.current.session ? 3 : 1);
    });

    // Profile Popup Modal Controls
    this.btnProfileClose.addEventListener('click', () => this.closeProfilePopup());
    this.profileModal.addEventListener('click', (e) => {
      if (e.target === this.profileModal) this.closeProfilePopup();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.profileModal.hidden) {
        this.closeProfilePopup();
      }
    });

    this.btnProfileEdit.addEventListener('click', () => {
      const rec = store.current.activeProfile;
      if (!rec || !this.backend.isOwnedByCurrentPlayer(rec)) return;
      this.closeProfilePopup();
      store.update({
        editingKrathongId: rec.krathongId,
        designConfig: JSON.parse(JSON.stringify(rec.designConfig)),
        wishText: rec.wishMessage || '',
        candleLit: true,
        studioMode: 'creator',
        exploreMode: false,
      });
      this.creator.syncFromState();
      this.wishInput.value = rec.wishMessage || '';
      this.wishCounter.textContent = `${(rec.wishMessage || '').length} / 140`;
      this.sound.playSoftClick();
      this.goToScene(3);
    });

    this.btnProfileRemix.addEventListener('click', async () => {
      const rec = store.current.activeProfile;
      if (!rec) return;
      this.closeProfilePopup();

      // Ensure player has a session before entering Creator if coming straight from Explore mode
      if (!store.current.session) {
        store.update({
          designConfig: JSON.parse(JSON.stringify(rec.designConfig)),
          studioMode: 'creator',
          editingKrathongId: null,
        });
        this.creator.syncFromState();
        this.goToScene(2);
        this.showToast('ใส่ชื่อเล่นเพื่อสร้างกระทงสไตล์นี้ต่อได้เลยนะ');
        return;
      }

      store.update({
        designConfig: JSON.parse(JSON.stringify(rec.designConfig)),
        studioMode: 'creator',
        editingKrathongId: null,
      });
      this.creator.syncFromState();
      this.sound.playSoftClick();
      this.goToScene(3);
      this.showToast('นำแบบกระทงมาปรับแต่งต่อในสตูดิโอแล้ว');
    });
  }

  _bindReleaseDrag() {
    const canvas = this.river.canvas;
    let dragging = false;
    let startY = 0;
    let pointerId = null;

    canvas.addEventListener('pointerdown', (e) => {
      if (store.current.scene !== 5 || store.current.hasReleased || store.current.exploreMode) return;
      const rect = this.river.getStagingScreenRect();
      if (!rect) return;

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
      this.river.setStagingDragOffset(e.clientY - startY);
    });

    const finishDrag = (e) => {
      if (!dragging || e.pointerId !== pointerId) return;
      const dy = e.clientY - startY;
      dragging = false;
      pointerId = null;

      if (dy < -32) {
        this.triggerRelease();
      } else {
        this.river.setStagingDragOffset(0);
      }
    };

    canvas.addEventListener('pointerup', finishDrag);
    canvas.addEventListener('pointercancel', () => {
      if (!dragging) return;
      dragging = false;
      pointerId = null;
      this.river.setStagingDragOffset(0);
    });
  }

  _hydrateSessionUI() {
    const sess = this.backend.session;
    if (sess) {
      store.update({ session: sess });
      this.nicknameInput.value = sess.nickname;
      this.hudPlayerPill.hidden = false;
      this.hudPlayerName.textContent = sess.nickname;
      this.returningBanner.hidden = false;
      this.returningSummary.textContent = `ยินดีต้อนรับกลับมา “${sess.nickname}” (${sess.playerId})`;
    } else {
      this.hudPlayerPill.hidden = true;
      this.returningBanner.hidden = true;
    }
  }

  async _refreshCommunityWorld() {
    const playerList = await this.backend.fetchCommunityKrathongs();
    store.update({ playerKrathongs: playerList });

    const releasedPlayers = playerList.filter((k) => k.releaseStatus === 'released');
    const allReleased = [...SYSTEM_KRATHONGS, ...releasedPlayers];

    this.river.syncCommunity(allReleased, {
      currentPlayerId: store.current.session?.playerId || null,
    });

    const totalCount = allReleased.length;
    const playerCount = releasedPlayers.length;
    if (this.riverPopulationBadge) {
      this.riverPopulationBadge.textContent = `กำลังลอยอยู่ ${totalCount} ใบ · คอลเลกชัน 10 · ผู้เล่น ${playerCount}`;
    }
    if (this.communityStatsPill) {
      this.communityStatsPill.textContent = `แม่น้ำกลาง: ${totalCount} ใบ (คอลเลกชัน 10 · ผู้เล่น ${playerCount}) · แตะกระทงเพื่ออ่านคำอธิษฐาน`;
    }
    if (this.syncModePill) {
      this.syncModePill.textContent = this.backend.getModeLabel();
    }

    // Resume player's latest un-released draft if returning and no active edit yet
    if (store.current.session && !store.current.editingKrathongId) {
      const myDraft = playerList.find(
        (k) => k.playerId === store.current.session.playerId && k.releaseStatus === 'draft'
      );
      if (myDraft) {
        store.update({
          editingKrathongId: myDraft.krathongId,
          designConfig: myDraft.designConfig,
          wishText: myDraft.wishMessage || '',
        });
        this.creator.syncFromState();
        this.wishInput.value = myDraft.wishMessage || '';
        this.wishCounter.textContent = `${(myDraft.wishMessage || '').length} / 140`;
      }
    }
  }

  openCommunityRiverExplore() {
    store.update({ exploreMode: true, hasReleased: false });
    this.river.clearStagingKrathong();
    this.goToScene(5);
  }

  igniteCandle() {
    if (store.current.candleLit) return;
    store.update({ candleLit: true });
    this._triggerSparks();
    this.sound.playCandleLight();

    this.candleStatus.textContent = 'เทียนสว่างแล้ว... เขียนคำอธิษฐานเล็ก ๆ ของคุณได้เลย';
    this.candleStatus.classList.add('is-lit');
    this.wishAssembly.classList.add('is-lit');
    this.btnToFloat.textContent = 'ไปยังริมแม่น้ำเพื่อปล่อยกระทง';
    this.btnToFloat.classList.remove('btn-soft-glow');
    this._announce('จุดเทียนเรียบร้อยแล้ว');
  }

  _triggerSparks() {
    const burst = this.wishAssembly?.querySelector('.spark-burst');
    if (!burst) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    burst.innerHTML = '';
    for (let i = 0; i < 12; i++) {
      const dot = document.createElement('span');
      dot.className = 'spark-dot';
      const angle = (Math.PI * 2 * i) / 12 + (Math.random() - 0.5) * 0.4;
      const dist = 22 + Math.random() * 28;
      dot.style.setProperty('--sx', `${(Math.cos(angle) * dist).toFixed(1)}px`);
      dot.style.setProperty('--sy', `${(Math.sin(angle) * dist - 10).toFixed(1)}px`);
      burst.appendChild(dot);
    }
    setTimeout(() => {
      if (burst) burst.innerHTML = '';
    }, 850);
  }

  async triggerRelease() {
    if (store.current.scene !== 5 || store.current.hasReleased || store.current.exploreMode) return;
    this.btnRelease.disabled = true;

    try {
      const saved = await this.backend.saveKrathong({
        krathongId: store.current.editingKrathongId,
        designConfig: { ...store.current.designConfig, candleLit: true },
        wishMessage: store.current.wishText,
        releaseStatus: 'released',
      });

      store.update({
        hasReleased: true,
        releasedRecord: saved,
        editingKrathongId: saved.krathongId,
      });

      this.sound.playReleaseChord();
      this.river.launchStagingIntoCommunity(saved);
      await this._refreshCommunityWorld();

      this.swipeCue.classList.add('is-hidden-soft');
      this.btnRelease.classList.add('is-hidden-soft');
      this.btnEditBeforeRelease.classList.add('is-hidden-soft');

      this.floatCaption.textContent = 'กระทงของคุณล่องลงสู่แม่น้ำกลางแล้ว';
      this.floatSubcaption.textContent = 'แตะกระทงใบใดก็ได้บนผิวน้ำเพื่ออ่านคำอธิษฐานของทุกคน';

      const wish = (saved.wishMessage || '').trim();
      this.floatingWishBanner.textContent = wish
        ? `“${wish}”`
        : '“ขอให้คำอธิษฐานในใจเดินทางไปอย่างอ่อนโยน”';
      this.floatingWishBanner.classList.remove('is-rising');
      void this.floatingWishBanner.offsetWidth;
      this.floatingWishBanner.classList.add('is-rising');

      this.btnToMessage.hidden = false;
      this.btnToMessage.classList.remove('is-hidden-soft');
      this.btnToMessage.classList.add('is-revealed-soft');

      this._announce('ปล่อยกระทงลงสู่แม่น้ำกลางเรียบร้อยแล้ว');
    } catch (err) {
      this.btnRelease.disabled = false;
      this.showToast(err.message || 'ปล่อยกระทงไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
  }

  openProfilePopup(record) {
    if (!record) return;
    store.update({ activeProfile: record });

    if (record.isSystem) {
      this.profileBadge.textContent = SYSTEM_COLLECTION_BADGE;
      this.profileBadge.classList.add('is-system');
      this.profileTitle.textContent = `${record.nameEn} — ${record.nameTh}`;
      this.profileMeta.textContent = record.subtitle || '';
    } else {
      this.profileBadge.textContent = 'ผู้ร่วมลอยกระทง';
      this.profileBadge.classList.remove('is-system');
      this.profileTitle.textContent = record.nickname;
      const dateStr = record.releasedAt
        ? new Date(record.releasedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
        : '';
      this.profileMeta.textContent = dateStr ? `ปล่อยเมื่อ ${dateStr} น.` : 'กำลังลอยอยู่บนแม่น้ำ';
    }

    this.profileIdLabel.textContent = record.krathongId;
    const w = (record.wishMessage || '').trim();
    this.profileWish.textContent = w ? `“${w}”` : `“${DEFAULT_SILENT_WISH}”`;

    const isOwner = this.backend.isOwnedByCurrentPlayer(record);
    this.btnProfileEdit.hidden = !isOwner;

    this.profileModal.hidden = false;
    this.sound.playSoftClick();
    this._startProfilePreviewLoop(record.designConfig);
  }

  closeProfilePopup() {
    this.profileModal.hidden = true;
    this._stopProfilePreviewLoop();
    store.update({ activeProfile: null });
  }

  _startProfilePreviewLoop(designConfig) {
    this._stopProfilePreviewLoop();
    const tick = (now) => {
      if (this.profileModal.hidden) return;
      const t = (now - this._previewStart) / 1000;
      this.renderer.renderPreviewCanvas(this.profileCanvas, designConfig, {
        time: t,
        isLit: true,
        widthRatio: 0.56,
      });
      this._profilePreviewRaf = requestAnimationFrame(tick);
    };
    this._profilePreviewRaf = requestAnimationFrame(tick);
  }

  _stopProfilePreviewLoop() {
    if (this._profilePreviewRaf != null) {
      cancelAnimationFrame(this._profilePreviewRaf);
      this._profilePreviewRaf = null;
    }
  }

  _startWishPreviewLoop() {
    this._stopWishPreviewLoop();
    const tick = (now) => {
      if (store.current.scene !== 4) return;
      const t = (now - this._previewStart) / 1000;
      this.renderer.renderPreviewCanvas(this.wishPreviewCanvas, store.current.designConfig, {
        time: t,
        isLit: store.current.candleLit,
        widthRatio: 0.56,
      });
      this._wishPreviewRaf = requestAnimationFrame(tick);
    };
    this._wishPreviewRaf = requestAnimationFrame(tick);
  }

  _stopWishPreviewLoop() {
    if (this._wishPreviewRaf != null) {
      cancelAnimationFrame(this._wishPreviewRaf);
      this._wishPreviewRaf = null;
    }
  }

  goToScene(targetScene) {
    if (targetScene < 1 || targetScene > TOTAL_SCENES) return;
    if (this._transitioning && targetScene !== 1) return;
    if (targetScene === store.current.scene && targetScene !== 5) return;

    this._transitioning = true;
    setTimeout(() => {
      this._transitioning = false;
    }, 320);

    store.update({ scene: targetScene });
    document.body.dataset.scene = String(targetScene);
    this._syncHud(targetScene);

    // Manage scene-specific render loops
    if (targetScene === 3) {
      this.creator.syncFromState();
      this.creator.startPreviewLoop();
    } else {
      this.creator.stopPreviewLoop();
    }

    if (targetScene === 4) {
      this._prepareScene4();
      this._startWishPreviewLoop();
    } else {
      this._stopWishPreviewLoop();
    }

    if (targetScene === 5) {
      this._prepareScene5();
    } else {
      this.river.clearStagingKrathong();
      this.floatingWishBanner.classList.remove('is-rising');
    }

    if (targetScene === 6) {
      this._prepareScene6();
    }

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
    const isLit = store.current.candleLit;
    this.wishAssembly.classList.toggle('is-lit', isLit);
    if (isLit) {
      this.candleStatus.textContent = 'เทียนสว่างแล้ว... เขียนคำอธิษฐานเล็ก ๆ ของคุณได้เลย';
      this.candleStatus.classList.add('is-lit');
      this.btnToFloat.textContent = 'ไปยังริมแม่น้ำเพื่อปล่อยกระทง';
      this.btnToFloat.classList.remove('btn-soft-glow');
    } else {
      this.candleStatus.textContent = 'แตะที่ไส้เทียนเพื่อจุดไฟดวงเล็ก ๆ';
      this.candleStatus.classList.remove('is-lit');
      this.btnToFloat.textContent = 'จุดเทียนก่อนปล่อยกระทง';
      this.btnToFloat.classList.add('btn-soft-glow');
    }
  }

  _prepareScene5() {
    if (store.current.exploreMode) {
      this.river.clearStagingKrathong();
      this.floatCaption.textContent = 'แม่น้ำกลางคืนใต้แสงจันทร์';
      this.floatSubcaption.textContent = 'แตะกระทงที่ลอยอยู่เพื่อเปิดอ่านคำอธิษฐาน หรือสร้างกระทงของคุณเอง';
      this.swipeCue.classList.add('is-hidden-soft');
      this.btnRelease.hidden = true;
      this.btnEditBeforeRelease.hidden = true;
      this.btnToMessage.hidden = true;
      this.btnCreateMore.hidden = false;
      return;
    }

    store.update({ hasReleased: false });
    this.river.prepareStagingKrathong({ ...store.current.designConfig, candleLit: true });

    this.floatCaption.textContent = 'กระทงของคุณพร้อมลงน้ำแล้ว';
    this.floatSubcaption.textContent = 'ค่อย ๆ ดันกระทงขึ้น หรือแตะปุ่มเพื่อปล่อยสู่แม่น้ำกลาง';
    this.swipeCue.classList.remove('is-hidden-soft');
    this.btnRelease.hidden = false;
    this.btnRelease.disabled = false;
    this.btnRelease.classList.remove('is-hidden-soft');

    this.btnEditBeforeRelease.hidden = false;
    this.btnEditBeforeRelease.classList.remove('is-hidden-soft');

    this.btnToMessage.hidden = true;
    this.btnToMessage.classList.add('is-hidden-soft');
    this.btnToMessage.classList.remove('is-revealed-soft');
    this.btnCreateMore.hidden = true;

    this.floatingWishBanner.classList.remove('is-rising');
    this.floatingWishBanner.textContent = '';
  }

  _prepareScene6() {
    const rec = store.current.releasedRecord;
    const wish = (store.current.wishText || rec?.wishMessage || '').trim();
    this.keepsakeWishText.textContent = wish ? `“${wish}”` : `“${DEFAULT_SILENT_WISH}”`;
    const nick = store.current.session?.nickname || rec?.nickname || 'ผู้ร่วมลอยกระทง';
    const kid = rec?.krathongId ? ` · ${rec.krathongId}` : '';
    this.keepsakeAuthor.textContent = `— โดย ${nick}${kid} —`;

    this.renderer.renderPreviewCanvas(this.keepsakeCanvas, store.current.designConfig, {
      time: 1.2,
      isLit: true,
      widthRatio: 0.56,
    });
  }

  _syncHud(sceneNumber) {
    this.dotEls.forEach((dot, i) => {
      const idx = i + 1;
      dot.classList.toggle('is-active', idx === sceneNumber);
      dot.classList.toggle('is-past', idx < sceneNumber);
    });
    this.btnHudRiver.hidden = sceneNumber === 5;
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
    }, 2600);
  }

  _announce(text) {
    if (!this.liveRegionEl) return;
    this.liveRegionEl.textContent = '';
    requestAnimationFrame(() => {
      this.liveRegionEl.textContent = text;
    });
  }
}
