/**
 * A Little Wish — Unified Community Backend Client
 * Supports 3 deployment modes seamlessly with zero secret keys in client code:
 *   1. Supabase Cloud Mode (when window.ALW_BACKEND_CONFIG.supabaseUrl & public anonKey are provided)
 *   2. Node.js Community Server Mode (auto-detected via /api/health, using SSE realtime stream)
 *   3. Static Host Multi-Tab Mode (BroadcastChannel + localStorage on GitHub Pages)
 */

import {
  sanitizeDesignConfig,
  validateNickname,
  validateWishMessage,
} from './safety.js';

const STORAGE_SESSION_KEY = 'alw.v2.session';
const STORAGE_KRATHONGS_KEY = 'alw.v2.playerKrathongs';
const CHANNEL_NAME = 'alw-community-river-v2';

function makeLocalId(prefix) {
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `${prefix}-${hex}`;
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

function stableSeedFromId(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

export class CommunityBackend {
  constructor() {
    this.mode = 'local-browser'; // 'supabase' | 'node-sse' | 'local-browser'
    this.session = this._loadLocalSession();
    this.listeners = new Set();
    this._channel = null;
    this._eventSource = null;
    this._supaPollTimer = null;

    const cfg = window.ALW_BACKEND_CONFIG || {};
    this.supabaseUrl = cfg.supabaseUrl ? String(cfg.supabaseUrl).replace(/\/$/, '') : '';
    this.supabaseAnonKey = cfg.supabaseAnonKey ? String(cfg.supabaseAnonKey) : '';
  }

  _loadLocalSession() {
    try {
      const raw = localStorage.getItem(STORAGE_SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.playerId && parsed?.sessionId && parsed?.nickname && parsed?.sessionToken) {
        return parsed;
      }
    } catch {
      // ignore
    }
    return null;
  }

  _saveLocalSession(session) {
    this.session = session;
    try {
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
    } catch {
      // ignore storage quota errors
    }
  }

  _loadLocalKrathongs() {
    try {
      const raw = localStorage.getItem(STORAGE_KRATHONGS_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  _saveLocalKrathongs(list) {
    try {
      localStorage.setItem(STORAGE_KRATHONGS_KEY, JSON.stringify(list));
    } catch {
      // ignore
    }
  }

  onUpdate(cb) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  _emit(type, payload) {
    for (const cb of this.listeners) {
      cb(type, payload);
    }
  }

  async init() {
    // 1. Check explicit Supabase configuration (public anon key only; protected by RLS)
    if (this.supabaseUrl && this.supabaseAnonKey) {
      try {
        const res = await fetch(`${this.supabaseUrl}/rest/v1/player_krathongs?select=krathong_id&limit=1`, {
          headers: {
            apikey: this.supabaseAnonKey,
            Authorization: `Bearer ${this.supabaseAnonKey}`,
          },
        });
        if (res.ok) {
          this.mode = 'supabase';
          this._startSupabaseSync();
          return this.mode;
        }
      } catch {
        // Fallback below
      }
    }

    // 2. Auto-detect Node.js backend on same origin (/api/health)
    if (window.location.protocol.startsWith('http')) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 1200);
        const res = await fetch('/api/health', { signal: ctrl.signal });
        clearTimeout(timer);
        if (res.ok) {
          const data = await res.json();
          if (data?.ok) {
            this.mode = 'node-sse';
            this._startNodeSse();
            return this.mode;
          }
        }
      } catch {
        // Static host (e.g., GitHub Pages) -> cleanly fall through to local-browser
      }
    }

    // 3. Static Host Multi-Tab Mode (BroadcastChannel + localStorage)
    this.mode = 'local-browser';
    this._startBroadcastChannel();
    return this.mode;
  }

  _startNodeSse() {
    if (this._eventSource || typeof EventSource === 'undefined') return;
    this._eventSource = new EventSource('/api/stream');
    this._eventSource.addEventListener('krathong_upsert', (ev) => {
      try {
        const item = JSON.parse(ev.data);
        this._emit('upsert', item);
      } catch {
        // ignore
      }
    });
  }

  _startSupabaseSync() {
    // Poll incremental updates gently every 8s (works with pure REST + RLS without external SDK bundle)
    if (this._supaPollTimer) clearInterval(this._supaPollTimer);
    this._supaPollTimer = setInterval(async () => {
      if (document.hidden) return;
      try {
        const list = await this.fetchCommunityKrathongs();
        this._emit('sync', list);
      } catch {
        // ignore transient network blip
      }
    }, 8000);
  }

  _startBroadcastChannel() {
    if (typeof BroadcastChannel !== 'undefined' && !this._channel) {
      this._channel = new BroadcastChannel(CHANNEL_NAME);
      this._channel.onmessage = (ev) => {
        if (ev.data?.type === 'krathong_upsert' && ev.data.krathong) {
          const list = this._loadLocalKrathongs();
          const idx = list.findIndex((k) => k.krathongId === ev.data.krathong.krathongId);
          if (idx >= 0) list[idx] = ev.data.krathong;
          else list.push(ev.data.krathong);
          this._saveLocalKrathongs(list);
          this._emit('upsert', ev.data.krathong);
        }
      };
    }

    window.addEventListener('storage', (ev) => {
      if (ev.key === STORAGE_KRATHONGS_KEY) {
        this._emit('sync', this._loadLocalKrathongs());
      }
    });
  }

  getModeLabel() {
    if (this.mode === 'supabase') return 'Cloud Realtime (Supabase)';
    if (this.mode === 'node-sse') return 'Community Live Server (SSE)';
    return 'Static Multi-Tab Sync (Browser)';
  }

  async ensureSession(nicknameInput) {
    const check = validateNickname(nicknameInput);
    if (!check.ok) throw new Error(check.error);
    const nickname = check.value;

    if (this.mode === 'node-sse') {
      const headers = { 'Content-Type': 'application/json' };
      if (this.session?.sessionToken) {
        headers['x-alw-session-token'] = this.session.sessionToken;
      }
      const res = await fetch('/api/session', {
        method: 'POST',
        headers,
        body: JSON.stringify({ nickname }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ไม่สามารถเข้าสู่ระบบได้');
      this._saveLocalSession(data);
      return data;
    }

    if (this.mode === 'supabase') {
      const existing = this.session;
      const playerId = existing?.playerId || makeLocalId('PLR');
      const sessionId = existing?.sessionId || makeLocalId('SES');
      const sessionToken = existing?.sessionToken || makeLocalId('TOK');
      const sessionHash = await sha256Hex(sessionToken);

      if (!existing) {
        const res = await fetch(`${this.supabaseUrl}/rest/v1/players`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: this.supabaseAnonKey,
            Authorization: `Bearer ${this.supabaseAnonKey}`,
            'x-alw-session-token': sessionToken,
          },
          body: JSON.stringify({
            player_id: playerId,
            session_id: sessionId,
            session_hash: sessionHash,
            nickname,
          }),
        });
        if (!res.ok) throw new Error('ไม่สามารถสร้างเซสชันบน Supabase ได้');
      } else if (existing.nickname !== nickname) {
        await fetch(`${this.supabaseUrl}/rest/v1/players?player_id=eq.${encodeURIComponent(playerId)}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: this.supabaseAnonKey,
            Authorization: `Bearer ${this.supabaseAnonKey}`,
            'x-alw-session-token': sessionToken,
          },
          body: JSON.stringify({ nickname, last_seen_at: new Date().toISOString() }),
        });
      }
      const sess = { playerId, sessionId, nickname, sessionToken, resumed: Boolean(existing) };
      this._saveLocalSession(sess);
      return sess;
    }

    // Local browser mode
    const existing = this.session;
    const now = new Date().toISOString();
    const sess = existing
      ? { ...existing, nickname, lastSeenAt: now, resumed: true }
      : {
          playerId: makeLocalId('PLR'),
          sessionId: makeLocalId('SES'),
          sessionToken: makeLocalId('TOK'),
          nickname,
          createdAt: now,
          lastSeenAt: now,
          resumed: false,
        };
    this._saveLocalSession(sess);

    // Keep nickname synced on player's own local krathongs
    const list = this._loadLocalKrathongs();
    let changed = false;
    list.forEach((k) => {
      if (k.playerId === sess.playerId && k.nickname !== nickname) {
        k.nickname = nickname;
        changed = true;
      }
    });
    if (changed) this._saveLocalKrathongs(list);

    return sess;
  }

  async fetchCommunityKrathongs() {
    if (this.mode === 'node-sse') {
      const headers = {};
      if (this.session?.sessionToken) {
        headers['x-alw-session-token'] = this.session.sessionToken;
      }
      const res = await fetch('/api/krathongs', { headers });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.krathongs) ? data.krathongs : [];
    }

    if (this.mode === 'supabase') {
      const headers = {
        apikey: this.supabaseAnonKey,
        Authorization: `Bearer ${this.supabaseAnonKey}`,
      };
      if (this.session?.sessionToken) {
        headers['x-alw-session-token'] = this.session.sessionToken;
      }
      const res = await fetch(
        `${this.supabaseUrl}/rest/v1/player_krathongs?select=*&order=created_at.desc&limit=80`,
        { headers }
      );
      if (!res.ok) return [];
      const rows = await res.json();
      return rows.map((r) => ({
        krathongId: r.krathong_id,
        playerId: r.player_id,
        nickname: r.nickname,
        designConfig: sanitizeDesignConfig(r.design_config),
        wishMessage: r.wish_message || '',
        releaseStatus: r.release_status,
        riverSeed: Number(r.river_seed) || stableSeedFromId(r.krathong_id),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        releasedAt: r.released_at,
        isSystem: false,
      }));
    }

    // Local browser mode: return only genuinely saved player krathongs (never fabricated)
    return this._loadLocalKrathongs();
  }

  async saveKrathong({ krathongId = null, designConfig, wishMessage = '', releaseStatus = 'draft' }) {
    if (!this.session) {
      throw new Error('กรุณาใส่ชื่อเล่นก่อนบันทึกกระทง');
    }

    const wishCheck = validateWishMessage(wishMessage);
    if (!wishCheck.ok) throw new Error(wishCheck.error);
    const cleanConfig = sanitizeDesignConfig(designConfig);
    const status = releaseStatus === 'released' ? 'released' : 'draft';

    if (this.mode === 'node-sse') {
      const res = await fetch('/api/krathongs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-alw-session-token': this.session.sessionToken,
        },
        body: JSON.stringify({
          krathongId,
          designConfig: cleanConfig,
          wishMessage: wishCheck.value,
          releaseStatus: status,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'บันทึกกระทงไม่สำเร็จ');
      return data.krathong;
    }

    if (this.mode === 'supabase') {
      const id = krathongId || makeLocalId('USR-KR');
      const now = new Date().toISOString();
      const payload = {
        krathong_id: id,
        player_id: this.session.playerId,
        session_id: this.session.sessionId,
        nickname: this.session.nickname,
        design_config: cleanConfig,
        wish_message: wishCheck.value,
        release_status: status,
        river_seed: stableSeedFromId(id),
        updated_at: now,
        ...(status === 'released' ? { released_at: now } : {}),
      };
      const res = await fetch(`${this.supabaseUrl}/rest/v1/player_krathongs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=representation',
          apikey: this.supabaseAnonKey,
          Authorization: `Bearer ${this.supabaseAnonKey}`,
          'x-alw-session-token': this.session.sessionToken,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || 'บันทึกข้อมูลลง Supabase ไม่สำเร็จ');
      }
      const [row] = await res.json();
      const saved = {
        krathongId: row.krathong_id,
        playerId: row.player_id,
        nickname: row.nickname,
        designConfig: sanitizeDesignConfig(row.design_config),
        wishMessage: row.wish_message || '',
        releaseStatus: row.release_status,
        riverSeed: Number(row.river_seed) || stableSeedFromId(row.krathong_id),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        releasedAt: row.released_at,
        isSystem: false,
      };
      if (saved.releaseStatus === 'released') this._emit('upsert', saved);
      return saved;
    }

    // Local browser mode
    const list = this._loadLocalKrathongs();
    const now = new Date().toISOString();

    if (krathongId) {
      const idx = list.findIndex((k) => k.krathongId === krathongId);
      if (idx >= 0) {
        if (list[idx].playerId !== this.session.playerId) {
          throw new Error('ไม่สามารถแก้ไขกระทงของผู้อื่นได้');
        }
        list[idx] = {
          ...list[idx],
          nickname: this.session.nickname,
          designConfig: cleanConfig,
          wishMessage: wishCheck.value,
          releaseStatus: status,
          updatedAt: now,
          releasedAt: status === 'released' ? list[idx].releasedAt || now : list[idx].releasedAt,
        };
        this._saveLocalKrathongs(list);
        if (status === 'released') {
          this._channel?.postMessage({ type: 'krathong_upsert', krathong: list[idx] });
          this._emit('upsert', list[idx]);
        }
        return list[idx];
      }
    }

    const id = krathongId || makeLocalId('USR-KR');
    const created = {
      krathongId: id,
      playerId: this.session.playerId,
      sessionId: this.session.sessionId,
      nickname: this.session.nickname,
      designConfig: cleanConfig,
      wishMessage: wishCheck.value,
      releaseStatus: status,
      riverSeed: stableSeedFromId(id),
      createdAt: now,
      updatedAt: now,
      releasedAt: status === 'released' ? now : null,
      isSystem: false,
    };
    list.push(created);
    this._saveLocalKrathongs(list);

    if (status === 'released') {
      this._channel?.postMessage({ type: 'krathong_upsert', krathong: created });
      this._emit('upsert', created);
    }
    return created;
  }

  isOwnedByCurrentPlayer(krathong) {
    if (!krathong || krathong.isSystem || !this.session) return false;
    return krathong.playerId === this.session.playerId;
  }
}
