// Cloudflare Pages Function — ĐỌC MỘT ĐƯỜNG DẪN cho "AI đọc tài liệu" (tính năng ẨN).
// POST /api/lab/fetch { url } (header x-lab-key) → { url, finalUrl, title, siteName, desc, text, links[], kind }
//
// Vì sao tự viết mà không dùng Scrapling (github.com/d4vinci/Scrapling):
//   Scrapling là thư viện PYTHON. Pages Functions chạy trên Workers runtime (JavaScript), không có
//   Python, không cài được pip. Nên phần "lấy trang + bóc chữ" được viết lại bằng JS thuần ở đây.
//   Hệ quả cần biết: KHÔNG chạy JavaScript của trang đích (không phải trình duyệt thật) — trang SPA
//   render bằng JS sẽ trả về rất ít chữ, lúc đó endpoint báo 422 để người dùng tải tệp lên thay thế.
//   Nếu sau này thật sự cần render JS thì phải chạy trình thu thập riêng trên VPS (xem vps-push/),
//   Workers không làm được việc đó.
//
// PDF ở đầu bên kia đường dẫn vẫn đọc được: tải bytes rồi đưa qua env.AI.toMarkdown như /extract.

const LAB_KEY = 'cn-lab-124-tim';
const MAX_BYTES = 4 * 1024 * 1024;   // trần tải về (trang tin thường < 1MB)
const FETCH_TIMEOUT = 20000;
const UA = 'Mozilla/5.0 (compatible; CungNhauReader/1.0; +https://cungnhau.pages.dev)';

export async function onRequestPost({ request, env }) {
  if (request.headers.get('x-lab-key') !== LAB_KEY) return new Response('Not found', { status: 404 });
  let body = {};
  try { body = await request.json(); } catch (e) {}
  const raw = String(body.url || '').trim();
  const check = safeUrl(raw);
  if (!check.ok) return Response.json({ error: check.error }, { status: 400 });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(check.url, {
      signal: ctrl.signal, redirect: 'follow',
      headers: { 'user-agent': UA, 'accept': 'text/html,application/xhtml+xml,application/pdf,text/plain;q=0.9,*/*;q=0.8', 'accept-language': 'vi,en;q=0.9' },
    });
    if (!res.ok) return Response.json({ error: 'Trang trả về lỗi ' + res.status }, { status: 422 });

    const finalUrl = res.url || check.url;
    const ctype = String(res.headers.get('content-type') || '').toLowerCase();
    const buf = await readCapped(res, MAX_BYTES);

    // PDF ở cuối đường dẫn → nhờ Workers AI chuyển sang markdown (giống /api/lab/extract)
    if (ctype.includes('pdf') || /\.pdf($|\?)/i.test(finalUrl)) {
      const md = await toMarkdownText(env, fileNameOf(finalUrl) || 'tai-lieu.pdf', buf, 'application/pdf');
      const text = String(md || '').trim();
      if (!text) return Response.json({ error: 'Không đọc được chữ trong PDF ở đường dẫn này' }, { status: 422 });
      return Response.json({ url: raw, finalUrl, title: fileNameOf(finalUrl) || finalUrl, siteName: hostOf(finalUrl), desc: '', text, links: [], kind: 'pdf' });
    }

    const body2 = new TextDecoder(charsetOf(ctype), { fatal: false }).decode(buf);

    // text/plain, markdown, json… dùng thẳng
    if (!ctype.includes('html') && !/^\s*</.test(body2)) {
      const text = body2.trim();
      if (text.length < 40) return Response.json({ error: 'Đường dẫn này gần như không có chữ' }, { status: 422 });
      return Response.json({ url: raw, finalUrl, title: fileNameOf(finalUrl) || hostOf(finalUrl), siteName: hostOf(finalUrl), desc: '', text, links: [], kind: 'text' });
    }

    const page = htmlToText(body2, finalUrl);
    if (page.text.length < 200) {
      return Response.json({
        error: 'Trang này hầu như không có chữ trong mã nguồn (thường là trang cần chạy JavaScript hoặc chặn máy đọc). ' +
          'Thử lưu trang thành PDF rồi tải tệp lên nha.',
      }, { status: 422 });
    }
    return Response.json({ url: raw, finalUrl, title: page.title || hostOf(finalUrl), siteName: page.siteName || hostOf(finalUrl), desc: page.desc, text: page.text, links: page.links, kind: 'html' });
  } catch (e) {
    const msg = (e && e.name === 'AbortError') ? 'Trang tải quá lâu (quá 20 giây)' : String((e && e.message) || e);
    return Response.json({ error: msg }, { status: 502 });
  } finally { clearTimeout(timer); }
}

// ── Chặn địa chỉ nội bộ (endpoint này tải hộ bất kỳ URL nào nên phải rào) ─────
export function safeUrl(raw) {
  let u;
  try { u = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw); } catch (e) { return { ok: false, error: 'Đường dẫn không hợp lệ' }; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return { ok: false, error: 'Chỉ đọc được đường dẫn http/https' };
  const h = u.hostname.toLowerCase();
  const priv = h === 'localhost' || h === '0.0.0.0' || h === '::1' || h.endsWith('.local') || h.endsWith('.internal') ||
    /^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) || /^\[?f[cd][0-9a-f]{2}:/i.test(h);
  if (priv) return { ok: false, error: 'Không đọc được địa chỉ nội bộ' };
  if (!h.includes('.')) return { ok: false, error: 'Đường dẫn không hợp lệ' };
  return { ok: true, url: u.toString() };
}

async function readCapped(res, max) {
  const reader = res.body && res.body.getReader ? res.body.getReader() : null;
  if (!reader) return await res.arrayBuffer();
  const parts = []; let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    parts.push(value);
    if (total >= max) { try { await reader.cancel(); } catch (e) {} break; }
  }
  const out = new Uint8Array(Math.min(total, max)); let off = 0;
  for (const p of parts) { const take = Math.min(p.byteLength, out.length - off); if (take <= 0) break; out.set(p.subarray(0, take), off); off += take; }
  return out.buffer;
}

function charsetOf(ctype) {
  const m = /charset=([\w-]+)/i.exec(ctype || '');
  const c = (m ? m[1] : 'utf-8').toLowerCase();
  return ['utf-8', 'utf8', 'windows-1252', 'iso-8859-1', 'utf-16le', 'utf-16be'].includes(c) ? c : 'utf-8';
}
function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } }
function fileNameOf(u) { try { return decodeURIComponent(new URL(u).pathname.split('/').filter(Boolean).pop() || ''); } catch (e) { return ''; } }

async function toMarkdownText(env, name, buf, type) {
  const r = await env.AI.toMarkdown({ name, blob: new Blob([buf], { type }) });
  const one = Array.isArray(r) ? r[0] : r;
  return (one && one.data) || '';
}

// ── Bóc chữ từ HTML (không có DOM trong Workers nên xử lý bằng chuỗi) ────────
// Xuất ra ngoài để test bằng node — đừng đổi chữ ký nếu không sửa cả test.
export function htmlToText(html, baseUrl) {
  const src = String(html || '');
  const title = decodeEntities(pick(src, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i) || pick(src, /<title[^>]*>([\s\S]*?)<\/title>/i) || '').trim();
  const desc = decodeEntities(pick(src, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i) || pick(src, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)/i) || '').trim();
  const siteName = decodeEntities(pick(src, /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']*)/i) || '').trim();

  const links = collectLinks(src, baseUrl);

  // bỏ phần không phải nội dung đọc được
  let s = src
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|template|svg|iframe|canvas|form|select|button)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(nav|header|footer|aside)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ');

  // ưu tiên vùng nội dung chính nếu trang có đánh dấu
  const main = longestMatch(s, /<article\b[^>]*>([\s\S]*?)<\/article>/gi) || longestMatch(s, /<main\b[^>]*>([\s\S]*?)<\/main>/gi);
  if (main && main.length > 600) s = main;

  const text = tagsToText(s);
  return { title, desc, siteName, text, links };
}

function tagsToText(s) {
  const out = s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|tr|h[1-6]|blockquote|pre|ul|ol|table|dd|dt)>/gi, '\n\n')
    .replace(/<li\b[^>]*>/gi, '\n- ')
    .replace(/<t[dh]\b[^>]*>/gi, ' | ')
    .replace(/<[^>]+>/g, ' ');
  return dedupeLines(decodeEntities(out)
    .replace(/[ \t\u00A0]+/g, ' ')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .split('\n').map((l) => l.trim()).join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim());
}

// Menu/nút lặp lại nhiều lần làm nhiễu tóm tắt → bỏ dòng ngắn bị lặp
function dedupeLines(text) {
  const seen = new Map(); const keep = [];
  for (const line of text.split('\n')) {
    const k = line.trim();
    if (!k) { keep.push(''); continue; }
    const n = (seen.get(k) || 0) + 1; seen.set(k, n);
    if (k.length < 60 && n > 1) continue;
    keep.push(line);
  }
  return keep.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// Thu thập liên kết + chữ trên liên kết, chấm điểm để client gợi ý "đọc thêm trang con"
function collectLinks(src, baseUrl) {
  const seen = new Set(); const out = [];
  const re = /<a\b[^>]*href=["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(src)) && out.length < 400) {
    let abs;
    try { abs = new URL(m[1], baseUrl).toString(); } catch (e) { continue; }
    if (!/^https?:/i.test(abs)) continue;
    abs = abs.split('#')[0];
    if (seen.has(abs) || abs === baseUrl) continue;
    seen.add(abs);
    const label = decodeEntities(m[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    let sameSite = false;
    try { sameSite = new URL(abs).hostname === new URL(baseUrl).hostname; } catch (e) {}
    if (/\.(jpg|jpeg|png|gif|webp|svg|css|js|zip|mp4|mp3|ico)($|\?)/i.test(abs)) continue;
    out.push({ url: abs, label: label.slice(0, 120), sameSite, score: scoreLink(abs, label, sameSite) });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 40);
}

function scoreLink(url, label, sameSite) {
  let s = sameSite ? 3 : 0;
  const words = label.split(/\s+/).filter(Boolean).length;
  if (words >= 4) s += 3; else if (words >= 2) s += 1;          // chữ dài = bài viết thật, không phải nút
  if (/^(trang chủ|home|đăng nhập|login|liên hệ|contact|giới thiệu|about|xem thêm|next|prev)$/i.test(label)) s -= 4;
  let path = '';
  try { path = new URL(url).pathname; } catch (e) {}
  const depth = path.split('/').filter(Boolean).length;
  if (depth >= 2) s += 2; else if (depth === 0) s -= 3;         // trang gốc thường là mục lục
  if (/\/(tag|category|chuyen-muc|page|author)\//i.test(path)) s -= 2;
  if (path.length > 25) s += 1;
  return s;
}

function pick(s, re) { const m = re.exec(s); return m ? m[1] : ''; }
function longestMatch(s, re) {
  let best = '', m;
  while ((m = re.exec(s))) if (m[1].length > best.length) best = m[1];
  return best;
}

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', laquo: '«', raquo: '»', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', middot: '·', bull: '•', copy: '©', reg: '®', trade: '™', deg: '°', euro: '€', pound: '£', times: '×', divide: '÷' };
function decodeEntities(s) {
  return String(s || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeChar(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeChar(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => (NAMED[n.toLowerCase()] !== undefined ? NAMED[n.toLowerCase()] : m));
}
function safeChar(code) { try { return (code > 0 && code <= 0x10FFFF) ? String.fromCodePoint(code) : ''; } catch (e) { return ''; } }
