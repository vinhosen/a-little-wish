#!/usr/bin/env node
/**
 * A Little Wish — Zero-Dependency Node.js Community Backend Server
 * Features:
 *  - Serves static site + REST API + Server-Sent Events (SSE) realtime stream
 *  - Persistent JSON storage (server/data/community.json)
 *  - HMAC-SHA256 signed session tokens (server-only secret, never leaked to client)
 *  - Rate limiting, anti-impersonation, XSS sanitization & profanity filter
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  sanitizeDesignConfig,
  validateNickname,
  validateWishMessage,
} from '../js/services/safety.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'community.json');
const PORT = Number(process.env.PORT || 8080);

// Ephemeral fallback secret for local dev; in production set ALW_SESSION_SECRET env var
const SERVER_SECRET = process.env.ALW_SESSION_SECRET || crypto.randomBytes(32).toString('hex');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

fs.mkdirSync(DATA_DIR, { recursive: true });

function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      return {
        players: Array.isArray(parsed.players) ? parsed.players : [],
        krathongs: Array.isArray(parsed.krathongs) ? parsed.krathongs : [],
      };
    }
  } catch {
    // Fall back to empty db if corrupted
  }
  return { players: [], krathongs: [] };
}

function saveDb(db) {
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmp, DB_FILE);
}

const db = loadDb();
const sseClients = new Set();
const rateLimitMap = new Map(); // playerId -> timestamps[]

function signSessionToken(playerId, sessionId) {
  const payload = `${playerId}.${sessionId}`;
  const sig = crypto.createHmac('sha256', SERVER_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [playerId, sessionId, sig] = parts;
  const expected = crypto
    .createHmac('sha256', SERVER_SECRET)
    .update(`${playerId}.${sessionId}`)
    .digest('hex');
  const sigBuf = Buffer.from(sig, 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  return { playerId, sessionId };
}

function checkRateLimit(key, maxCount = 6, windowMs = 60_000) {
  const now = Date.now();
  const list = (rateLimitMap.get(key) || []).filter((ts) => now - ts < windowMs);
  if (list.length >= maxCount) return false;
  list.push(now);
  rateLimitMap.set(key, list);
  return true;
}

function broadcastEvent(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(payload);
    } catch {
      sseClients.delete(res);
    }
  }
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

function readJsonBody(req, maxBytes = 32_768) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > maxBytes) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function publicKrathong(k) {
  return {
    krathongId: k.krathongId,
    playerId: k.playerId,
    nickname: k.nickname,
    designConfig: k.designConfig,
    wishMessage: k.wishMessage,
    releaseStatus: k.releaseStatus,
    riverSeed: k.riverSeed,
    createdAt: k.createdAt,
    updatedAt: k.updatedAt,
    releasedAt: k.releasedAt,
    isSystem: false,
  };
}

function serveStatic(reqPath, res) {
  let rel = decodeURIComponent(reqPath.split('?')[0]);
  if (rel === '/') rel = '/index.html';
  const resolved = path.normalize(path.join(ROOT_DIR, rel));
  if (!resolved.startsWith(ROOT_DIR) || resolved.includes(`${path.sep}server${path.sep}`)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(resolved, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(resolved).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
    });
    fs.createReadStream(resolved).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // Healthcheck
  if (req.method === 'GET' && url.pathname === '/api/health') {
    return sendJson(res, 200, { ok: true, mode: 'node-sse', players: db.players.length });
  }

  // SSE Realtime Stream
  if (req.method === 'GET' && url.pathname === '/api/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('event: connected\ndata: {"ok":true}\n\n');
    sseClients.add(res);
    const keepAlive = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(keepAlive);
      }
    }, 25_000);
    req.on('close', () => {
      clearInterval(keepAlive);
      sseClients.delete(res);
    });
    return;
  }

  // Create or Resume Verified Player Session
  if (req.method === 'POST' && url.pathname === '/api/session') {
    try {
      const body = await readJsonBody(req);
      const token = req.headers['x-alw-session-token'];
      const verified = verifySessionToken(token);

      if (verified) {
        const existing = db.players.find(
          (p) => p.playerId === verified.playerId && p.sessionId === verified.sessionId
        );
        if (existing) {
          if (body.nickname !== undefined) {
            const check = validateNickname(body.nickname);
            if (!check.ok) return sendJson(res, 400, { error: check.error });
            existing.nickname = check.value;
            // Sync nickname on player's krathongs
            db.krathongs.forEach((k) => {
              if (k.playerId === existing.playerId) k.nickname = check.value;
            });
          }
          existing.lastSeenAt = new Date().toISOString();
          saveDb(db);
          return sendJson(res, 200, {
            playerId: existing.playerId,
            sessionId: existing.sessionId,
            nickname: existing.nickname,
            sessionToken: token,
            resumed: true,
          });
        }
      }

      const check = validateNickname(body.nickname);
      if (!check.ok) return sendJson(res, 400, { error: check.error });

      const playerId = `PLR-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
      const sessionId = `SES-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
      const sessionToken = signSessionToken(playerId, sessionId);
      const now = new Date().toISOString();

      db.players.push({
        playerId,
        sessionId,
        nickname: check.value,
        createdAt: now,
        lastSeenAt: now,
      });
      saveDb(db);

      return sendJson(res, 201, {
        playerId,
        sessionId,
        nickname: check.value,
        sessionToken,
        resumed: false,
      });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  // Fetch Released Community Krathongs (+ caller's own drafts if verified)
  if (req.method === 'GET' && url.pathname === '/api/krathongs') {
    const verified = verifySessionToken(req.headers['x-alw-session-token']);
    const list = db.krathongs
      .filter((k) => k.releaseStatus === 'released' || (verified && k.playerId === verified.playerId))
      .map(publicKrathong);
    return sendJson(res, 200, { krathongs: list });
  }

  // Create or Update Player Krathong (Draft or Released)
  if (req.method === 'POST' && url.pathname === '/api/krathongs') {
    const verified = verifySessionToken(req.headers['x-alw-session-token']);
    if (!verified) {
      return sendJson(res, 401, { error: 'Invalid or missing session token' });
    }

    const player = db.players.find(
      (p) => p.playerId === verified.playerId && p.sessionId === verified.sessionId
    );
    if (!player) {
      return sendJson(res, 401, { error: 'Session not found' });
    }

    if (!checkRateLimit(player.playerId, 10, 60_000)) {
      return sendJson(res, 429, { error: 'ส่งคำขอบ่อยเกินไป กรุณารอสักครู่นะ' });
    }

    try {
      const body = await readJsonBody(req);
      const wishCheck = validateWishMessage(body.wishMessage ?? '');
      if (!wishCheck.ok) return sendJson(res, 400, { error: wishCheck.error });

      const designConfig = sanitizeDesignConfig(body.designConfig);
      const releaseStatus = body.releaseStatus === 'released' ? 'released' : 'draft';
      const now = new Date().toISOString();

      // If updating an existing krathong owned by this exact verified player
      if (body.krathongId) {
        if (String(body.krathongId).toUpperCase().startsWith('SYS-KR-')) {
          return sendJson(res, 403, { error: 'Cannot modify System Collection krathongs' });
        }
        const existing = db.krathongs.find((k) => k.krathongId === body.krathongId);
        if (existing) {
          if (existing.playerId !== player.playerId) {
            return sendJson(res, 403, { error: 'Cannot modify another player krathong' });
          }
          existing.designConfig = designConfig;
          existing.wishMessage = wishCheck.value;
          existing.releaseStatus = releaseStatus;
          existing.updatedAt = now;
          if (releaseStatus === 'released' && !existing.releasedAt) {
            existing.releasedAt = now;
          }
          saveDb(db);
          const pub = publicKrathong(existing);
          if (pub.releaseStatus === 'released') {
            broadcastEvent('krathong_upsert', pub);
          }
          return sendJson(res, 200, { krathong: pub });
        }
      }

      // Create new Player Krathong with deterministic river seed
      const krathongId = `USR-KR-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const record = {
        krathongId,
        playerId: player.playerId,
        sessionId: player.sessionId,
        nickname: player.nickname,
        designConfig,
        wishMessage: wishCheck.value,
        releaseStatus,
        riverSeed: Math.random(),
        createdAt: now,
        updatedAt: now,
        releasedAt: releaseStatus === 'released' ? now : null,
      };
      db.krathongs.push(record);
      saveDb(db);

      const pub = publicKrathong(record);
      if (pub.releaseStatus === 'released') {
        broadcastEvent('krathong_upsert', pub);
      }
      return sendJson(res, 201, { krathong: pub });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  return serveStatic(url.pathname, res);
});

server.listen(PORT, () => {
  console.log(`A Little Wish community server listening on http://127.0.0.1:${PORT}`);
});
