// Cloudflare Pages Function — TÌM TÀI LIỆU theo chủ đề cho "AI đọc tài liệu" (tính năng ẨN).
// POST /api/lab/search { q, lang } (header x-lab-key) → { results:[{title,url,snippet,lang,words,source}] }
//
// Nguồn tìm kiếm = Wikipedia tiếng Việt + tiếng Anh (API `list=search`, miễn phí, KHÔNG cần khoá,
// không giới hạn gắt). Cố ý KHÔNG dùng Google/Bing/Brave: mọi công cụ tìm kiếm web tổng quát đều
// đòi khoá API trả tiền, còn cào thẳng trang kết quả thì hay bị chặn từ IP trung tâm dữ liệu của
// Cloudflare — tính năng sẽ hỏng không báo trước. Wikipedia phủ tốt đúng thứ người dùng cần ở đây:
// chủ đề để HỌC (ngân hàng, lạm phát, machine learning…) và có cả hai ngôn ngữ.
// Muốn thêm nguồn khác sau này: viết thêm một hàm trả về cùng dạng {title,url,snippet,lang,words,source}
// rồi nhét vào mảng `jobs` — phần gộp/khử trùng bên dưới không cần sửa.

const LAB_KEY = 'cn-lab-124-tim';
const PER_LANG = 8;
const TIMEOUT = 12000;
const UA = 'Mozilla/5.0 (compatible; CungNhauReader/1.0; +https://cungnhau.pages.dev)';

export async function onRequestPost({ request }) {
  if (request.headers.get('x-lab-key') !== LAB_KEY) return new Response('Not found', { status: 404 });
  let body = {};
  try { body = await request.json(); } catch (e) {}
  const q = String(body.q || body.query || '').trim().slice(0, 200);
  if (q.length < 2) return Response.json({ error: 'Gõ từ khoá dài hơn chút nha' }, { status: 400 });

  const wanted = body.lang === 'vi' || body.lang === 'en' ? [body.lang] : ['vi', 'en'];
  const jobs = wanted.map((l) => wikiSearch(l, q));
  const settled = await Promise.allSettled(jobs);
  const ok = settled.filter((s) => s.status === 'fulfilled').map((s) => s.value);
  if (!ok.length) {
    const why = settled[0] && settled[0].reason;
    return Response.json({ error: 'Không tìm được: ' + String((why && why.message) || why || 'lỗi mạng') }, { status: 502 });
  }
  return Response.json({ results: mergeResults(ok) });
}

async function wikiSearch(lang, q) {
  const url = 'https://' + lang + '.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*' +
    '&srlimit=' + PER_LANG + '&srprop=snippet|wordcount&srsearch=' + encodeURIComponent(q);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'user-agent': UA, accept: 'application/json' } });
    if (!res.ok) throw new Error('Wikipedia ' + lang + ' trả về ' + res.status);
    const j = await res.json();
    const hits = (j && j.query && j.query.search) || [];
    return hits.map((h) => ({
      title: String(h.title || ''),
      url: wikiUrl(lang, h.title),
      snippet: stripHtml(h.snippet || ''),
      words: Number(h.wordcount) || 0,
      lang,
      source: 'Wikipedia',
    })).filter((r) => r.title && r.url);
  } finally { clearTimeout(timer); }
}

// Gộp kết quả nhiều ngôn ngữ: xen kẽ vi/en để không bị một bên chiếm hết phần đầu danh sách.
export function mergeResults(lists) {
  const out = []; const seen = new Set();
  const max = Math.max(...lists.map((l) => l.length), 0);
  for (let i = 0; i < max; i++) {
    for (const list of lists) {
      const r = list[i];
      if (!r || seen.has(r.url)) continue;
      seen.add(r.url); out.push(r);
    }
  }
  return out.slice(0, 20);
}

export function wikiUrl(lang, title) {
  if (!title) return '';
  return 'https://' + lang + '.wikipedia.org/wiki/' + encodeURIComponent(String(title).replace(/ /g, '_'));
}

// Snippet của Wikipedia có thẻ <span class="searchmatch"> và ký tự HTML — bóc về chữ thường
export function stripHtml(s) {
  return decodeEntities(String(s || '').replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
}

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', rsquo: '’', ldquo: '“', rdquo: '”' };
function decodeEntities(s) {
  return String(s || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeChar(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeChar(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => (NAMED[n.toLowerCase()] !== undefined ? NAMED[n.toLowerCase()] : m));
}
function safeChar(code) { try { return (code > 0 && code <= 0x10FFFF) ? String.fromCodePoint(code) : ''; } catch (e) { return ''; } }
