// Cloudflare Worker chạy nền (cron mỗi 5 phút) — kiểm tra lời nhắc (bảng notes) tới giờ,
// đẩy Web Push (RFC 8291 aes128gcm + VAPID) tới các máy đã bật thông báo (bảng push_subscriptions).
// Không dùng thư viện ngoài — tự mã hoá bằng Web Crypto (SubtleCrypto), có sẵn trong Workers runtime.
// Thuật toán mã hoá đã được tự kiểm chứng round-trip trước khi viết vào đây (xem CLAUDE.md).

const TZ_OFFSET_HOURS = 7; // Việt Nam UTC+7, không có giờ tiết kiệm ánh sáng.

export default {
  async scheduled(event, env, ctx) { ctx.waitUntil(run(env)); },
  // cho phép gọi tay để test — trả về log chi tiết dạng JSON để debug khi thông báo không tới
  async fetch(req, env) { const result = await run(env); return new Response(JSON.stringify(result, null, 2), { headers: { 'Content-Type': 'application/json' } }); },
};

async function run(env) {
  const notes = await getDueNotes(env);
  const log = [];
  for (const note of notes) {
    const subs = await getSubs(env, note.space_id);
    const subResults = [];
    for (const sub of subs) {
      try {
        await sendPush(env, sub, { title: 'cùng nhau 🔔', body: note.text });
        subResults.push({ sub: sub.id, ok: true });
      } catch (e) {
        subResults.push({ sub: sub.id, ok: false, status: e && e.status, message: e && e.message });
        if (e && (e.status === 404 || e.status === 410)) await deleteSub(env, sub.id);
      }
    }
    await markNotified(env, note.id);
    log.push({ note: note.id, text: note.text, subs: subResults });
  }
  console.log(JSON.stringify({ checked: notes.length, log }));
  return { checked: notes.length, log };
}

function sbHeaders(env) {
  return { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' };
}

async function getDueNotes(env) {
  const url = `${env.SUPABASE_URL}/rest/v1/notes?done=eq.false&notified_at=is.null&remind_at=not.is.null&select=*`;
  const res = await fetch(url, { headers: sbHeaders(env) });
  if (!res.ok) return [];
  const notes = await res.json();
  const nowMs = Date.now();
  return notes.filter((n) => dueAtMs(n) <= nowMs);
}

function dueAtMs(note) {
  const [y, m, d] = note.remind_at.split('-').map(Number);
  let hh = 0, mm = 0;
  if (note.remind_time) { const [h2, m2] = note.remind_time.split(':').map(Number); hh = h2; mm = m2; }
  return Date.UTC(y, m - 1, d, hh - TZ_OFFSET_HOURS, mm);
}

async function getSubs(env, spaceId) {
  const url = `${env.SUPABASE_URL}/rest/v1/push_subscriptions?space_id=eq.${encodeURIComponent(spaceId)}&select=*`;
  const res = await fetch(url, { headers: sbHeaders(env) });
  if (!res.ok) return [];
  return res.json();
}

async function markNotified(env, noteId) {
  const url = `${env.SUPABASE_URL}/rest/v1/notes?id=eq.${encodeURIComponent(noteId)}`;
  await fetch(url, { method: 'PATCH', headers: sbHeaders(env), body: JSON.stringify({ notified_at: new Date().toISOString() }) });
}

async function deleteSub(env, id) {
  const url = `${env.SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${encodeURIComponent(id)}`;
  await fetch(url, { method: 'DELETE', headers: sbHeaders(env) });
}

/* ============== Web Push: VAPID (RFC 8292) + aes128gcm (RFC 8291 / RFC 8188) ============== */

function bytesToB64url(bytes) {
  let bin = ''; for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlToBytes(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '==='.slice((b64.length + 3) % 4));
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}
function concatBytes(...parts) {
  const len = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(len); let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}
async function hmacSha256(keyBytes, data) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, data));
}
async function hkdfExpand(prk, info, len) {
  const t1 = await hmacSha256(prk, concatBytes(info, new Uint8Array([1])));
  return t1.slice(0, len);
}
async function hkdf(salt, ikm, info, len) {
  const prk = await hmacSha256(salt, ikm);
  return hkdfExpand(prk, info, len);
}

let vapidKeyPromise = null;
function getVapidPrivateKey(env) {
  if (!vapidKeyPromise) {
    const der = Uint8Array.from(atob(env.VAPID_PRIVATE_KEY_PKCS8), (c) => c.charCodeAt(0));
    vapidKeyPromise = crypto.subtle.importKey('pkcs8', der.buffer, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  }
  return vapidKeyPromise;
}

async function buildVapidHeader(env, endpoint) {
  const aud = new URL(endpoint).origin;
  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = { aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT };
  const encHeader = bytesToB64url(new TextEncoder().encode(JSON.stringify(header)));
  const encPayload = bytesToB64url(new TextEncoder().encode(JSON.stringify(payload)));
  const signingInput = `${encHeader}.${encPayload}`;
  const key = await getVapidPrivateKey(env);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(signingInput));
  return { jwt: `${signingInput}.${bytesToB64url(new Uint8Array(sig))}`, header: `vapid t=${signingInput}.${bytesToB64url(new Uint8Array(sig))}, k=${env.VAPID_PUBLIC_KEY}` };
}

// RFC 8291: mã hoá payload bằng khoá công khai (p256dh) + auth secret của thuê bao.
async function encryptPayload(sub, plaintext) {
  const uaPublicBytes = b64urlToBytes(sub.p256dh);
  const authSecret = b64urlToBytes(sub.auth);

  const asKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublicBytes = new Uint8Array(await crypto.subtle.exportKey('raw', asKeyPair.publicKey));
  const uaPublicKey = await crypto.subtle.importKey('raw', uaPublicBytes, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaPublicKey }, asKeyPair.privateKey, 256));

  const authInfo = concatBytes(new TextEncoder().encode('WebPush: info\0'), uaPublicBytes, asPublicBytes);
  const ikm = await hkdf(authSecret, ecdhSecret, authInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmacSha256(salt, ikm);
  const cek = await hkdfExpand(prk, new TextEncoder().encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdfExpand(prk, new TextEncoder().encode('Content-Encoding: nonce\0'), 12);

  const padded = concatBytes(plaintext, new Uint8Array([2])); // 0x02 = đánh dấu bản ghi cuối (không chia nhỏ nhiều record)
  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded));

  const header = new Uint8Array(16 + 4 + 1 + asPublicBytes.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, ciphertext.length, false);
  header[20] = asPublicBytes.length;
  header.set(asPublicBytes, 21);
  return concatBytes(header, ciphertext);
}

async function sendPush(env, sub, payloadObj) {
  const body = await encryptPayload(sub, new TextEncoder().encode(JSON.stringify(payloadObj)));
  const { header } = await buildVapidHeader(env, sub.endpoint);
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream', 'Content-Encoding': 'aes128gcm', TTL: '86400', Authorization: header },
    body,
  });
  if (!res.ok) { const bodyText = await res.text().catch(() => ''); const err = new Error(`push failed ${res.status}: ${bodyText}`); err.status = res.status; throw err; }
}
