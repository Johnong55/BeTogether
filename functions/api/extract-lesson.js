// Cloudflare Pages Function — biến nội dung một trang web (đã crawl thành text/markdown)
// thành DỮ LIỆU HỌC: danh sách từ vựng (từ + nghĩa + ví dụ) và/hoặc bản tóm tắt tiếng Việt.
// Gọi từ VPS (vps-crawl) SAU khi crawl4ai lấy được nội dung sạch:
//   POST /api/extract-lesson  { text, mode: 'vocab'|'summary'|'both', title?, url?, max_words? }
//   -> { title, words:[{front,back,example}], summary }
// Dùng Workers AI (binding env.AI, khai trong wrangler.toml). KHÔNG cần key riêng.
const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const MAX_INPUT = 7000;   // cắt bớt nội dung để không vượt ngữ cảnh model
const S = (v) => (v == null ? '' : String(v)).trim();

// Gọi model rồi cố gắng parse JSON lỏng lẻo (model đôi khi kèm chữ thừa hoặc trả object).
async function ask(env, system, user, max_tokens) {
  const out = await env.AI.run(MODEL, {
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    max_tokens, temperature: 0.3,
  });
  const resp = out && out.response;
  if (resp && typeof resp === 'object') return resp;
  const txt = String(resp || '').trim();
  // thử bóc mảng [...] trước (danh sách từ), rồi tới object {...}
  let m = txt.match(/\[[\s\S]*\]/);
  if (m) { try { return JSON.parse(m[0]); } catch (e) {} }
  m = txt.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch (e) {} }
  return txt;
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const text = S(body.text).slice(0, MAX_INPUT);
    const mode = ['vocab', 'summary', 'both'].includes(body.mode) ? body.mode : 'both';
    const title = S(body.title);
    const maxWords = Math.min(40, Math.max(5, parseInt(body.max_words, 10) || 20));
    if (!text) return Response.json({ error: 'thiếu nội dung (text)' }, { status: 400 });

    let words = [], summary = '', outTitle = title;

    if (mode === 'vocab' || mode === 'both') {
      const sys = [
        'Bạn là giáo viên tiếng Anh cho người Việt (trình độ B2).',
        `Từ NỘI DUNG trang web bên dưới, hãy chọn ra tối đa ${maxWords} TỪ/CỤM tiếng Anh ĐÁNG HỌC nhất (hữu ích, không quá tầm thường).`,
        'Với mỗi từ: cho nghĩa tiếng Việt NGẮN GỌN và một câu ví dụ tiếng Anh tự nhiên (ưu tiên lấy/điều chỉnh từ chính nội dung).',
        'CHỈ trả về một MẢNG JSON hợp lệ, KHÔNG thêm chữ nào khác:',
        '[{"front":"<từ/cụm tiếng Anh>","back":"<nghĩa tiếng Việt>","example":"<câu ví dụ tiếng Anh>"}]'
      ].join(' ');
      const user = (title ? `Chủ đề: ${title}\n` : '') + `Nội dung:\n${text}`;
      const arr = await ask(env, sys, user, 1200);
      if (Array.isArray(arr)) {
        words = arr.map(w => ({ front: S(w.front || w.word || w.en), back: S(w.back || w.vi || w.meaning), example: S(w.example || w.ex) }))
                   .filter(w => w.front).slice(0, maxWords);
      }
    }

    if (mode === 'summary' || mode === 'both') {
      const sys = [
        'Bạn là trợ giảng tiếng Anh cho người Việt.',
        'Tóm tắt NỘI DUNG trang web bên dưới thành một đoạn tiếng Việt NGẮN GỌN, dễ hiểu (khoảng 3-6 câu), tập trung ý chính để người học nắm nhanh.',
        'Nếu đặt được một tiêu đề ngắn cho nội dung, thêm vào.',
        'CHỈ trả về một JSON hợp lệ, KHÔNG thêm chữ nào khác:',
        '{"title":"<tiêu đề ngắn tiếng Việt>","summary":"<đoạn tóm tắt tiếng Việt>"}'
      ].join(' ');
      const user = (title ? `Gợi ý chủ đề: ${title}\n` : '') + `Nội dung:\n${text}`;
      const obj = await ask(env, sys, user, 500);
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        summary = S(obj.summary);
        if (!outTitle) outTitle = S(obj.title);
      } else if (typeof obj === 'string') {
        summary = S(obj);
      }
    }

    return Response.json({ title: outTitle, words, summary });
  } catch (e) {
    return Response.json({ error: String((e && e.message) || e) }, { status: 500 });
  }
}
