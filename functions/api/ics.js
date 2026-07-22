// Cloudflare Pages Function — xuất LỊCH của một phòng ra file .ics (chuẩn iCalendar).
// Điện thoại "đăng ký" đường dẫn này một lần, sau đó app Lịch của MÁY tự báo thức —
// không cần Web Push, không cần cài PWA (điểm yếu lớn nhất của push trên iPhone).
//
//   GET /api/ics?room=<mã phòng>&who=a|b|all[&alarm=5|0|off]
//
// - who=a|b : việc của người đó + việc chung ('both')
// - who=all : cả hai, việc của người kia có gắn nhãn tên
// - alarm   : số phút báo TRƯỚC giờ bắt đầu (mặc định 5). alarm=off = không báo thức.
//
// Bảo mật: dựa vào mã phòng khó đoán, y như phần còn lại của app. Sai mã -> 404.
// LƯU Ý: lịch đăng ký được điện thoại tải lại theo chu kỳ của NÓ (iPhone ~15 phút–1 tiếng,
// Google Calendar có khi vài tiếng). Nên đây là kênh cho việc ĐẶT TRƯỚC; việc cần báo
// ngay lập tức (nhắc nhau, tới lượt nối từ) vẫn phải đi đường Web Push.

const SUPA_URL = 'https://vklsqexomaconbzoufmu.supabase.co';
const SUPA_KEY = 'sb_publishable_YDj6liDtYbMFq38GhwCwIQ_KlS-lNwI';

const TZID = 'Asia/Ho_Chi_Minh';           // Việt Nam +07, không có giờ mùa hè
const DOW  = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const PAST_DAYS = 60;                      // giữ lại quá khứ bấy nhiêu ngày cho đỡ nặng

/* ---------- ngày giờ (tính bằng UTC cho khỏi lệ thuộc múi giờ của máy chủ) ---------- */
const parseYMD = (s) => new Date(String(s).slice(0, 10) + 'T00:00:00Z');
const ymd = (d) => d.toISOString().slice(0, 10);
const shift = (d, n) => new Date(d.getTime() + n * 86400000);

/* 'YYYY-MM-DD' + số phút từ 0h  ->  'YYYYMMDDTHHMMSS' (giờ địa phương, đi kèm TZID).
   Phút ≥ 1440 (vd end_min = 24:00) tự tràn sang ngày hôm sau. */
function stamp(dateStr, min) {
  let m = Math.max(0, Math.round(Number(min) || 0));
  const days = Math.floor(m / 1440);
  m -= days * 1440;
  const d = days ? shift(parseYMD(dateStr), days) : parseYMD(dateStr);
  const hh = String(Math.floor(m / 60)).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return ymd(d).replace(/-/g, '') + 'T' + hh + mm + '00';
}
const utcStamp = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');

/* ---------- chuỗi iCalendar ---------- */
const esc = (s) => String(s == null ? '' : s)
  .replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,')
  .replace(/\r?\n/g, '\\n');

/* RFC 5545: mỗi dòng tối đa 75 octet, dòng nối tiếp bắt đầu bằng một dấu cách.
   Phải đếm theo BYTE (tiếng Việt có dấu là 2 byte) và không được cắt giữa một ký tự. */
const enc = new TextEncoder();
function fold(line) {
  if (enc.encode(line).length <= 74) return line;
  let out = '', cur = 0, limit = 74;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (cur + n > limit) { out += '\r\n '; cur = 1; limit = 75; }
    out += ch; cur += n;
  }
  return out;
}

/* ---------- Supabase REST ---------- */
async function sb(path) {
  const r = await fetch(SUPA_URL + '/rest/v1/' + path, {
    headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, Accept: 'application/json' },
  });
  if (!r.ok) throw new Error('supabase ' + r.status);
  return r.json();
}

const notFound = () => new Response('Not found', { status: 404 });

export async function onRequestGet({ request }) {
  const u = new URL(request.url);
  const room = String(u.searchParams.get('room') || '').trim();
  let who = String(u.searchParams.get('who') || 'all').trim().toLowerCase();
  if (!['a', 'b', 'all'].includes(who)) who = 'all';
  if (!room || !/^[A-Za-z0-9_-]{3,64}$/.test(room)) return notFound();

  const alarmRaw = String(u.searchParams.get('alarm') ?? '5').trim().toLowerCase();
  const alarmOff = alarmRaw === 'off' || alarmRaw === 'no';
  const alarmMin = alarmOff ? 0 : Math.min(120, Math.max(0, parseInt(alarmRaw, 10) || 0));

  let space, routines = [], notes = [];
  try {
    const rooms = await sb(`spaces?id=eq.${encodeURIComponent(room)}&select=id,person_a,person_b&limit=1`);
    space = rooms && rooms[0];
    if (!space) return notFound();

    const since = ymd(shift(new Date(), -PAST_DAYS));
    // Bảng routines có thể chưa được tạo (user chưa chạy schema.sql) -> bỏ qua, vẫn xuất lời nhắc.
    routines = await sb(
      `routines?space_id=eq.${encodeURIComponent(room)}` +
      `&select=id,person,title,emoji,start_min,end_min,freq,days,date,note,created_at`
    ).catch(() => []);
    notes = await sb(
      `notes?space_id=eq.${encodeURIComponent(room)}&remind_at=not.is.null&remind_at=gte.${since}` +
      `&select=id,author,author_name,text,remind_at,remind_time,done`
    ).catch(() => []);
  } catch (e) {
    return new Response('Không đọc được lịch', { status: 502 });
  }

  const nameOf = (p) => String((p === 'a' ? space.person_a : space.person_b) || '').trim();
  const meName = who === 'all' ? '' : nameOf(who);
  const calName = 'cùng nhau' + (meName ? ' — ' + meName : ' — lịch hai đứa');

  const now = new Date();
  const dtstamp = utcStamp(now);
  const floor = ymd(shift(now, -PAST_DAYS));   // việc lặp không cần kéo lịch sử về quá xa

  const L = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//cung nhau//Lich cua hai dua//VI',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:' + esc(calName),
    'X-WR-CALDESC:' + esc('Thói quen và lời nhắc trong app "cùng nhau"'),
    'X-WR-TIMEZONE:' + TZID,
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
    'BEGIN:VTIMEZONE',
    'TZID:' + TZID,
    'X-LIC-LOCATION:' + TZID,
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0700',
    'TZOFFSETTO:+0700',
    'TZNAME:+07',
    'END:STANDARD',
    'END:VTIMEZONE',
  ];

  const alarm = (desc, trigger) => alarmOff ? [] : [
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:' + trigger,
    'DESCRIPTION:' + esc(desc),
    'END:VALARM',
  ];

  /* ---------- Thói quen -> sự kiện lặp (RRULE) ---------- */
  for (const r of routines) {
    const person = r.person === 'b' ? 'b' : (r.person === 'both' ? 'both' : 'a');
    if (who !== 'all' && person !== who && person !== 'both') continue;

    const start = Number(r.start_min) || 0;
    let end = Number(r.end_min) || 0;
    if (end <= start) end = start + 30;

    // Ngày gốc: lúc tạo việc, nhưng không lôi lịch sử về quá PAST_DAYS ngày.
    let base = String(r.created_at || '').slice(0, 10) || ymd(now);
    if (base < floor) base = floor;

    let rrule = '';
    if (r.freq === 'once') {
      if (!r.date) continue;
      base = String(r.date).slice(0, 10);
    } else if (r.freq === 'weekly') {
      const days = String(r.days || '').split(',')
        .map((x) => parseInt(x, 10)).filter((x) => x >= 0 && x <= 6);
      if (!days.length) continue;
      // DTSTART phải rơi đúng một trong các thứ đã chọn -> đẩy tới ngày hợp lệ gần nhất
      let d = parseYMD(base);
      for (let i = 0; i < 7 && !days.includes(d.getUTCDay()); i++) d = shift(d, 1);
      base = ymd(d);
      rrule = 'RRULE:FREQ=WEEKLY;BYDAY=' + days.sort().map((x) => DOW[x]).join(',');
    } else {
      rrule = 'RRULE:FREQ=DAILY';
    }

    const mark = person === 'both' ? '💞 ' : (who === 'all' && person !== 'a' ? '' : '');
    const tag = (who === 'all' && person !== 'both' && nameOf(person)) ? ' (' + nameOf(person) + ')' : '';
    const title = (r.emoji ? r.emoji + ' ' : '') + mark + (r.title || 'Việc trong lịch') + tag;

    L.push('BEGIN:VEVENT');
    L.push('UID:rt-' + esc(r.id) + '@cungnhau');
    L.push('DTSTAMP:' + dtstamp);
    L.push('DTSTART;TZID=' + TZID + ':' + stamp(base, start));
    L.push('DTEND;TZID=' + TZID + ':' + stamp(base, end));
    if (rrule) L.push(rrule);
    L.push('SUMMARY:' + esc(title));
    if (r.note) L.push('DESCRIPTION:' + esc(r.note));
    L.push('TRANSP:OPAQUE');
    L.push(...alarm(title, alarmMin ? '-PT' + alarmMin + 'M' : '-PT0M'));
    L.push('END:VEVENT');
  }

  /* ---------- Lời nhắc -> sự kiện một lần ---------- */
  for (const n of notes) {
    if (n.done) continue;
    const author = n.author === 'b' ? 'b' : 'a';
    if (who !== 'all' && author !== who) continue;   // lời nhắc là của riêng người viết
    const day = String(n.remind_at || '').slice(0, 10);
    if (!day) continue;

    const txt = String(n.text || '').trim() || 'Lời nhắc';
    const one = txt.split('\n')[0].slice(0, 80);
    const tag = (who === 'all' && nameOf(author)) ? ' (' + nameOf(author) + ')' : '';
    const title = '🔔 ' + one + tag;
    const hm = /^\d{1,2}:\d{2}$/.test(String(n.remind_time || '')) ? String(n.remind_time) : '';

    L.push('BEGIN:VEVENT');
    L.push('UID:nt-' + esc(n.id) + '@cungnhau');
    L.push('DTSTAMP:' + dtstamp);
    if (hm) {
      const [h, m] = hm.split(':').map(Number);
      const min = h * 60 + m;
      L.push('DTSTART;TZID=' + TZID + ':' + stamp(day, min));
      L.push('DTEND;TZID=' + TZID + ':' + stamp(day, min + 30));
      L.push(...alarm(one, '-PT0M'));
    } else {
      // Không hẹn giờ -> sự kiện cả ngày, báo lúc 8h sáng cho khỏi rơi vào nửa đêm
      L.push('DTSTART;VALUE=DATE:' + day.replace(/-/g, ''));
      L.push('DTEND;VALUE=DATE:' + ymd(shift(parseYMD(day), 1)).replace(/-/g, ''));
      L.push(...alarm(one, 'PT8H'));
    }
    L.push('SUMMARY:' + esc(title));
    if (txt.length > one.length) L.push('DESCRIPTION:' + esc(txt));
    L.push('TRANSP:TRANSPARENT');
    L.push('END:VEVENT');
  }

  L.push('END:VCALENDAR');

  const body = L.map(fold).join('\r\n') + '\r\n';
  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="cungnhau.ics"',
      'Cache-Control': 'public, max-age=600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
