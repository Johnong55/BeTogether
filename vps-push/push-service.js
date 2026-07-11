// cùng nhau — Push notification service chạy trên VPS (thay cron Cloudflare hay trễ).
// Kiểm tra bảng `notes` (Supabase) mỗi POLL_SECONDS giây, tới giờ thì đẩy Web Push
// tới các máy trong `push_subscriptions`. Dùng thư viện `web-push` (lo hết phần mã hoá VAPID + aes128gcm).
// Node 18+ (cần global fetch). Chạy nền bằng systemd — xem README.md.

import webpush from 'web-push';

const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  VAPID_SUBJECT = 'mailto:trijohn124@gmail.com',
  POLL_SECONDS = '20',
  TZ_OFFSET_HOURS = '7', // Việt Nam UTC+7
} = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error('❌ Thiếu biến môi trường. Xem file .env.example và README.md');
  process.exit(1);
}

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
const TZ = Number(TZ_OFFSET_HOURS);
const POLL_MS = Math.max(5, Number(POLL_SECONDS)) * 1000;

function sbHeaders() {
  return { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' };
}

// Giờ hẹn của lời nhắc quy về mốc thời gian tuyệt đối (UTC ms), theo giờ VN.
function dueAtMs(note) {
  const [y, m, d] = note.remind_at.split('-').map(Number);
  let hh = 0, mm = 0;
  if (note.remind_time) { const [h2, m2] = note.remind_time.split(':').map(Number); hh = h2; mm = m2; }
  return Date.UTC(y, m - 1, d, hh - TZ, mm);
}

async function getDueNotes() {
  const url = `${SUPABASE_URL}/rest/v1/notes?done=eq.false&notified_at=is.null&remind_at=not.is.null&select=*`;
  const res = await fetch(url, { headers: sbHeaders() });
  if (!res.ok) { console.error('getDueNotes', res.status); return []; }
  const notes = await res.json();
  const now = Date.now();
  return notes.filter((n) => dueAtMs(n) <= now);
}

async function getSubs(spaceId) {
  const url = `${SUPABASE_URL}/rest/v1/push_subscriptions?space_id=eq.${encodeURIComponent(spaceId)}&select=*`;
  const res = await fetch(url, { headers: sbHeaders() });
  if (!res.ok) return [];
  return res.json();
}

async function markNotified(id) {
  await fetch(`${SUPABASE_URL}/rest/v1/notes?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH', headers: sbHeaders(), body: JSON.stringify({ notified_at: new Date().toISOString() }),
  });
}

async function deleteSub(id) {
  await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: sbHeaders() });
}

async function tick() {
  try {
    const notes = await getDueNotes();
    for (const note of notes) {
      const subs = await getSubs(note.space_id);
      const payload = JSON.stringify({ title: 'cùng nhau 🔔', body: note.text });
      let okCount = 0;
      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
            { TTL: 86400 },
          );
          okCount++;
        } catch (e) {
          const status = e && e.statusCode;
          console.error(`  push fail sub=${sub.id} status=${status}`);
          if (status === 404 || status === 410) { await deleteSub(sub.id); console.error(`  đã xoá sub hết hạn ${sub.id}`); }
        }
      }
      // Chốt "đã đẩy" để không gửi lại (kể cả nếu Cloudflare worker cũ còn chạy song song).
      await markNotified(note.id);
      console.log(`${new Date().toISOString()} ✅ nhắc "${note.text}" → ${okCount}/${subs.length} máy`);
    }
  } catch (e) {
    console.error('tick error:', (e && e.message) || e);
  }
}

console.log(`cùng nhau push service — kiểm tra mỗi ${POLL_MS / 1000}s (TZ+${TZ}). Bắt đầu…`);
tick();
setInterval(tick, POLL_MS);
