// Sinh câu ví dụ (chứa đúng từ vựng) cho TOÀN BỘ từ trong library.js, lưu vào bảng word_examples.
// Câu này dùng cho trò "điền từ vào chỗ trống" ở phần dò bài — client che từ đi rồi cho chọn lại.
//
//   node scripts/gen-word-examples.mjs [--limit N] [--force] [--conc 5]
//
// - Bỏ qua từ đã có ví dụ (trừ khi --force).
// - Với mỗi từ còn thiếu: gọi /api/word-example; nếu câu KHÔNG chứa đúng từ (không che được)
//   thì gọi tiếp /api/word-clue (câu này chắc chắn chứa từ) làm phương án dự phòng.
// - Chỉ nhận và lưu khi câu THỰC SỰ che được từ; không thì bỏ qua (ghi vào danh sách "skip").
//
// An toàn để chạy lại nhiều lần (idempotent nhờ upsert on_conflict=word).

import fs from 'node:fs';

const ORIGIN = 'https://cungnhau.pages.dev';
const SUPA_URL = 'https://vklsqexomaconbzoufmu.supabase.co';
const SUPA_KEY = 'sb_publishable_YDj6liDtYbMFq38GhwCwIQ_KlS-lNwI';

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? (args[i + 1] || true) : d; };
const LIMIT = parseInt(flag('--limit', '0'), 10) || 0;
const FORCE = args.includes('--force');
const CONC = parseInt(flag('--conc', '5'), 10) || 5;

// ---- che từ trong câu, giống blankWord trong index.html ----
const blankWord = (text, word) => {
  if (!text || !word) return text || '';
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp('\\b' + esc + '\\b', 'gi'), '____');
};
const canBlank = (text, word) => { const b = blankWord(text, word); return b && b !== text; };

// ---- nạp library.js ----
global.window = {};
await import('file://' + fs.realpathSync('./library.js'));
const LIB = global.window.LIBRARY || [];

const byWord = new Map();   // từ(viết thường) -> {en, vi}
for (const t of LIB) for (const w of (t.words || [])) {
  const en = (w.en || '').trim(); if (!en) continue;
  const key = en.toLowerCase();
  if (!byWord.has(key)) byWord.set(key, { en, vi: (w.vi || '').trim() });
}
console.log(`library: ${LIB.length} chủ đề, ${byWord.size} từ khác nhau`);

// ---- lấy danh sách từ đã có ví dụ ----
async function sbGet(path) {
  const r = await fetch(SUPA_URL + '/rest/v1/' + path, {
    headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY },
  });
  if (!r.ok) throw new Error('GET ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return r.json();
}
const existing = new Set();
if (!FORCE) {
  for (let off = 0; ; off += 1000) {
    const rows = await sbGet(`word_examples?select=word,example&offset=${off}&limit=1000`);
    rows.forEach(r => { if (r.example) existing.add(r.word); });
    if (rows.length < 1000) break;
  }
  console.log(`đã có sẵn ví dụ: ${existing.size} từ`);
}

let todo = [...byWord.values()].filter(w => FORCE || !existing.has(w.en.toLowerCase()));
if (LIMIT) todo = todo.slice(0, LIMIT);
console.log(`cần sinh: ${todo.length} từ  (conc=${CONC}${FORCE ? ', FORCE' : ''})\n`);

// ---- gọi API ----
async function post(path, body, ms = 30000) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(ORIGIN + path, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body), signal: ctrl.signal,
    });
    if (!r.ok) throw new Error(path + ' ' + r.status);
    return r.json();
  } finally { clearTimeout(t); }
}
async function sbUpsert(row) {
  const r = await fetch(SUPA_URL + '/rest/v1/word_examples?on_conflict=word', {
    method: 'POST',
    headers: {
      apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'content-type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify([row]),
  });
  if (!r.ok) throw new Error('upsert ' + r.status + ' ' + (await r.text()).slice(0, 200));
}

// Sinh cho 1 từ, có thử lại. Trả 'ok' | 'skip' | 'err'.
async function genOne(w) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const j = await post('/api/word-example', { en: w.en, vi: w.vi });
      let example = (j.example || '').trim();
      let row = { word: w.en.toLowerCase(), vi: w.vi, example, example_vi: (j.example_vi || '').trim(),
        usage: (j.usage || '').trim(), meaning_note: (j.meaning_note || '').trim() };
      if (example && canBlank(example, w.en)) { await sbUpsert(row); return 'ok'; }
      // câu ví dụ không chứa từ -> xin câu gợi ý (chắc chắn chứa từ)
      const c = await post('/api/word-clue', { en: w.en, vi: w.vi });
      const clue = (c.clue || '').trim();
      if (clue && canBlank(clue, w.en)) {
        row.example = clue; if (!row.usage) row.usage = ''; await sbUpsert(row); return 'ok';
      }
      // vẫn không được -> thử lại vòng nữa
    } catch (e) {
      if (attempt === 2) { process.stderr.write(`  ! ${w.en}: ${e.message}\n`); return 'err'; }
      await new Promise(r => setTimeout(r, 800 * (attempt + 1)));   // backoff khi bị rate-limit
    }
  }
  return 'skip';
}

// ---- chạy theo lô song song ----
let ok = 0, skip = 0, err = 0, done = 0;
const t0 = Date.now();
async function worker(queue) {
  while (queue.length) {
    const w = queue.shift();
    const r = await genOne(w);
    if (r === 'ok') ok++; else if (r === 'skip') skip++; else err++;
    done++;
    if (done % 25 === 0 || done === todo.length) {
      const el = (Date.now() - t0) / 1000, rate = done / el;
      const eta = rate ? Math.round((todo.length - done) / rate) : 0;
      console.log(`  ${done}/${todo.length}  ok=${ok} skip=${skip} err=${err}  ~${rate.toFixed(1)}/s  còn ~${eta}s`);
    }
  }
}
const queue = todo.slice();
await Promise.all(Array.from({ length: CONC }, () => worker(queue)));
console.log(`\nXONG: ok=${ok} skip=${skip} err=${err} trong ${((Date.now() - t0) / 1000 / 60).toFixed(1)} phút`);
if (skip) console.log('(skip = câu sinh ra không che được từ; chạy lại lần nữa có thể ra)');
