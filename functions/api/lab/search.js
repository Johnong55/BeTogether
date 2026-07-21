// Cloudflare Pages Function — TÌM TÀI LIỆU HỌC TẬP bằng AI cho "AI đọc tài liệu" (tính năng ẨN).
// POST /api/lab/search (header x-lab-key), chia 3 chặng để client hiện tiến trình & chủ động tốn token:
//   { stage:'plan',   q, lang }               → { topic, level, subtopics[], queries:[{q,lang}] }
//   { stage:'find',   queries:[{q,lang}] }    → { results:[{title,url,site,snippet}] }   (KHÔNG gọi AI)
//   { stage:'curate', q, plan, results }      → { picks:[{i,why,level,kind}], note }
//
// ⚠️ VÌ SAO KHÔNG ĐỂ AI TỰ ĐỌC RA ĐƯỜNG DẪN: model của Workers AI KHÔNG truy cập được internet, hỏi
// link là nó bịa. Đã đo thật trên domain này (endpoint probe tạm, đã xoá): hỏi 8 link tài liệu về
// "ngân hàng thương mại" thì chỉ 2/8 còn sống, 6 cái còn lại 404/403 — link trông rất thật, tên miền
// thật (imf.org, fdic.gov, bankofengland.co.uk) nhưng đường dẫn bịa.
// Nên chia vai: AI LÊN KẾ HOẠCH + CHỌN LỌC, còn ĐƯỜNG DẪN luôn lấy từ máy tìm kiếm thật.
// Chốt an toàn: chặng 'curate' bắt AI trả về SỐ THỨ TỰ trong danh sách kết quả thật, KHÔNG cho trả URL
// — nên về mặt cấu trúc nó không thể bịa link kể cả khi muốn (giống cách 'synthesis' dùng chỉ số nguồn).
//
// Máy tìm kiếm: DuckDuckGo Lite (đã đo: gọi được từ Cloudflare, HTTP 200) — không cần khoá API.
// Truy vấn nào DDG không ra gì thì thử lại bằng Mojeek (cũng đã đo là gọi được).
// Google/Bing/Brave đều đòi khoá trả tiền nên không dùng.

import { runJSON } from './analyze.js';

const LAB_KEY = 'cn-lab-124-tim';
const UA = 'Mozilla/5.0 (compatible; CungNhauReader/1.0; +https://cungnhau.pages.dev)';
const SEARCH_TIMEOUT = 15000;
const MAX_QUERIES = 5;
const MAX_RESULTS = 24;
const MAX_PICKS = 12;

// Mạng xã hội / trang mua bán — hầu như không phải tài liệu học
const JUNK = /(^|\.)(facebook|instagram|tiktok|twitter|x|pinterest|threads|shopee|lazada|tiki|amazon|ebay|reddit)\.(com|vn|net)$/i;

export async function onRequestPost({ request, env }) {
  if (request.headers.get('x-lab-key') !== LAB_KEY) return new Response('Not found', { status: 404 });
  let body = {};
  try { body = await request.json(); } catch (e) {}
  const stage = String(body.stage || 'plan');
  try {
    if (stage === 'plan') return Response.json(await planStage(env, body));
    if (stage === 'find') return Response.json(await findStage(body));
    if (stage === 'curate') return Response.json(await curateStage(env, body));
    return Response.json({ error: 'stage không hợp lệ' }, { status: 400 });
  } catch (e) {
    return Response.json({ error: String((e && e.message) || e) }, { status: 500 });
  }
}

// ── Chặng 1: AI hiểu người dùng muốn học gì → chia mục con + soạn truy vấn tìm kiếm ──
async function planStage(env, body) {
  const q = String(body.q || '').trim().slice(0, 300);
  if (q.length < 2) throw new Error('Nói rõ hơn muốn học gì nha');
  const lang = body.lang === 'vi' || body.lang === 'en' ? body.lang : 'both';
  const LANG_HINT = {
    vi: 'Tất cả truy vấn bằng TIẾNG VIỆT, đặt "lang":"vi".',
    en: 'Tất cả truy vấn bằng TIẾNG ANH, đặt "lang":"en".',
    both: 'Soạn cả truy vấn TIẾNG VIỆT ("lang":"vi") lẫn TIẾNG ANH ("lang":"en"), chia đều.',
  };
  const sys = 'Bạn là người hướng dẫn học tập. Người dùng nói họ muốn học về cái gì (có thể nói rất ngắn hoặc lan man). ' +
    'Nhiệm vụ: hiểu đúng ý họ rồi soạn kế hoạch tìm TÀI LIỆU HỌC TẬP. ' +
    'Đoán trình độ phù hợp nếu họ không nói rõ. Chia chủ đề thành 3-6 mục con NÊN HỌC THEO THỨ TỰ. ' +
    'Soạn 3-5 truy vấn để gõ vào máy tìm kiếm — phải là TỪ KHOÁ NGẮN như người ta thật sự gõ (không phải câu hỏi dài), ' +
    'và nên kèm những từ giúp ra tài liệu học như: giáo trình, bài giảng, tổng quan, pdf, tutorial, introduction, lecture notes, guide. ' +
    (LANG_HINT[lang]) + ' ' +
    'Trả về DUY NHẤT JSON: {"topic":"tên chủ đề chuẩn","level":"cơ bản|trung cấp|nâng cao",' +
    '"subtopics":["mục con nên học, theo thứ tự"],"queries":[{"q":"từ khoá tìm kiếm","lang":"vi|en"}]}. ' +
    'Không markdown, không chữ nào ngoài JSON.';
  const { result, model } = await runJSON(env, sys, 'NGƯỜI DÙNG MUỐN HỌC: ' + q, validPlan);
  return { ...result, model };
}

function validPlan(v) {
  if (!v || !v.topic) return null;
  const queries = (Array.isArray(v.queries) ? v.queries : [])
    .map((x) => {
      const text = String((x && (x.q || x.query)) || (typeof x === 'string' ? x : '')).trim();
      const lang = (x && x.lang) === 'en' ? 'en' : 'vi';
      return text ? { q: text.slice(0, 120), lang } : null;
    })
    .filter(Boolean).slice(0, MAX_QUERIES);
  if (!queries.length) return null;
  return {
    topic: String(v.topic).trim().slice(0, 120),
    level: String(v.level || '').trim().slice(0, 40),
    subtopics: (Array.isArray(v.subtopics) ? v.subtopics : []).map((s) => String(s || '').trim()).filter(Boolean).slice(0, 8),
    queries,
  };
}

// ── Chặng 2: chạy các truy vấn qua máy tìm kiếm THẬT (không dùng AI, không tốn token) ──
async function findStage(body) {
  const queries = (Array.isArray(body.queries) ? body.queries : [])
    .map((x) => ({ q: String((x && x.q) || '').trim().slice(0, 120), lang: (x && x.lang) === 'en' ? 'en' : 'vi' }))
    .filter((x) => x.q).slice(0, MAX_QUERIES);
  if (!queries.length) throw new Error('Không có truy vấn nào để tìm');

  const settled = await Promise.allSettled(queries.map((x) => searchOne(x.q)));
  const lists = settled.filter((s) => s.status === 'fulfilled').map((s) => s.value);
  if (!lists.length) throw new Error('Máy tìm kiếm không phản hồi, thử lại sau chút nha');
  return { results: mergeResults(lists) };
}

async function searchOne(q) {
  let list = await ddgLite(q).catch(() => []);
  if (!list.length) list = await mojeek(q).catch(() => []);
  return list;
}

async function fetchText(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), SEARCH_TIMEOUT);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'user-agent': UA, accept: 'text/html,*/*', 'accept-language': 'vi,en;q=0.9' } });
    if (!r.ok && r.status !== 202) throw new Error('HTTP ' + r.status);
    return await r.text();
  } finally { clearTimeout(t); }
}

async function ddgLite(q) {
  return parseDdg(await fetchText('https://lite.duckduckgo.com/lite/?q=' + encodeURIComponent(q)));
}
async function mojeek(q) {
  return parseMojeek(await fetchText('https://www.mojeek.com/search?q=' + encodeURIComponent(q)));
}

// DuckDuckGo Lite bọc link thật trong /l/?uddg=<url đã mã hoá> — phải bóc ra mới dùng được.
export function parseDdg(html) {
  const out = [];
  const re = /<a\b[^>]*class=['"]result-link['"][^>]*>([\s\S]*?)<\/a>/gi;
  const hrefRe = /href=['"]([^'"]+)['"]/i;
  const snippets = [...String(html).matchAll(/<td\b[^>]*class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/gi)]
    .map((m) => clean(m[1]));
  let m, i = 0;
  while ((m = re.exec(html))) {
    const tag = m[0];
    const href = (hrefRe.exec(tag) || [])[1] || '';
    const url = unwrapDdg(href);
    const title = clean(m[1]);
    if (url && title) out.push({ title, url, site: hostOf(url), snippet: snippets[i] || '' });
    i++;
  }
  return out;
}

export function unwrapDdg(href) {
  if (!href) return '';
  let h = href.startsWith('//') ? 'https:' + href : href;
  try {
    const u = new URL(h, 'https://duckduckgo.com');
    const wrapped = u.searchParams.get('uddg');
    if (wrapped) return wrapped;
    return /^https?:$/.test(u.protocol) && !/duckduckgo\.com$/.test(u.hostname) ? u.toString() : '';
  } catch (e) { return ''; }
}

export function parseMojeek(html) {
  const out = [];
  const re = /<a\b[^>]*class=['"]ob['"][^>]*href=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    const url = m[1].startsWith('http') ? m[1] : '';
    const title = clean(m[2]);
    if (url && title) out.push({ title, url, site: hostOf(url), snippet: '' });
  }
  return out;
}

// Gộp kết quả nhiều truy vấn: xen kẽ để truy vấn nào cũng có mặt ở phần đầu, bỏ URL trùng & trang rác
export function mergeResults(lists) {
  const out = []; const seen = new Set();
  const max = Math.max(...lists.map((l) => l.length), 0);
  for (let i = 0; i < max && out.length < MAX_RESULTS; i++) {
    for (const list of lists) {
      const r = list[i];
      if (!r || out.length >= MAX_RESULTS) continue;
      const key = r.url.split('#')[0].replace(/\/$/, '');
      if (seen.has(key) || JUNK.test(r.site)) continue;
      seen.add(key);
      out.push({ ...r, url: key });
    }
  }
  return out;
}

// ── Chặng 3: AI chọn lọc & xếp thứ tự nên đọc — CHỈ được trả về SỐ THỨ TỰ ──
async function curateStage(env, body) {
  const results = (Array.isArray(body.results) ? body.results : []).slice(0, MAX_RESULTS);
  if (!results.length) throw new Error('Chưa có kết quả nào để chọn');
  const q = String(body.q || '').slice(0, 300);
  const plan = body.plan || {};
  const listTxt = results.map((r, i) =>
    (i + 1) + '. ' + String(r.title || '').slice(0, 160) + '\n   [' + String(r.site || '') + '] ' + String(r.snippet || '').slice(0, 260)
  ).join('\n');
  const sys = 'Bạn giúp người học chọn tài liệu. Dưới đây là KẾT QUẢ TÌM KIẾM THẬT đã đánh số. ' +
    'Chọn tối đa ' + MAX_PICKS + ' tài liệu phù hợp NHẤT để học chủ đề, xếp theo THỨ TỰ NÊN ĐỌC (dễ trước, sâu sau). ' +
    'Bỏ hẳn những mục quảng cáo, rao vặt, trùng nội dung, hoặc không liên quan — thà chọn ít mà đúng. ' +
    'TUYỆT ĐỐI chỉ nhắc tới tài liệu bằng SỐ THỨ TỰ trong danh sách, KHÔNG được tự viết ra đường dẫn nào. ' +
    'Trả về DUY NHẤT JSON: {"picks":[{"i":số thứ tự,"why":"một câu vì sao nên đọc cái này","level":"cơ bản|trung cấp|nâng cao",' +
    '"kind":"giáo trình|bài giảng|bài viết|tài liệu tham khảo|video|khác"}],"note":"1-2 câu gợi ý lộ trình học"}. ' +
    'Viết tiếng Việt. Không markdown, không chữ nào ngoài JSON.';
  const user = 'NGƯỜI DÙNG MUỐN HỌC: ' + q +
    (plan.topic ? '\nCHỦ ĐỀ: ' + plan.topic : '') +
    (Array.isArray(plan.subtopics) && plan.subtopics.length ? '\nCÁC MỤC CẦN HỌC: ' + plan.subtopics.join('; ') : '') +
    '\n\nKẾT QUẢ TÌM KIẾM:\n' + listTxt;
  const { result, model } = await runJSON(env, sys, user, (v) => validCurate(v, results.length));
  return { ...result, model };
}

// Chỉ số ngoài khoảng 1..n hoặc trùng đều bị loại — giao diện trỏ thẳng results[i-1] nên sai là vỡ.
function validCurate(v, n) {
  if (!v || !Array.isArray(v.picks)) return null;
  const seen = new Set();
  const picks = v.picks.map((p) => {
    const i = parseInt(p && p.i, 10);
    if (!(i >= 1 && i <= n) || seen.has(i)) return null;
    seen.add(i);
    return {
      i,
      why: String((p && p.why) || '').trim().slice(0, 300),
      level: String((p && p.level) || '').trim().slice(0, 40),
      kind: String((p && p.kind) || '').trim().slice(0, 40),
    };
  }).filter(Boolean).slice(0, MAX_PICKS);
  if (!picks.length) return null;
  return { picks, note: String(v.note || '').trim().slice(0, 500) };
}

// ── Tiện ích ────────────────────────────────────────────────────────────────
function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } }
function clean(s) { return decodeEntities(String(s || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim(); }

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', middot: '·' };
function decodeEntities(s) {
  return String(s || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeChar(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeChar(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => (NAMED[n.toLowerCase()] !== undefined ? NAMED[n.toLowerCase()] : m));
}
function safeChar(code) { try { return (code > 0 && code <= 0x10FFFF) ? String.fromCodePoint(code) : ''; } catch (e) { return ''; } }
