// Cloudflare Pages Function — "AI đọc tài liệu" (tính năng ẨN, trang ai-lab-124.html).
// Mọi request PHẢI có header x-lab-key đúng, sai thì trả 404 y như endpoint không tồn tại.
// POST /api/lab/analyze { task, ... }:
//   task='summary_full'  { text }                     → { tldr, points[], terms[] }
//   task='summary_chunk' { text, part, total }        → { notes }   (tóm tắt 1 phần của tài liệu dài)
//   task='summary_merge' { notes }                    → { tldr, points[], terms[] }
//   task='questions'     { summary, excerpts, count, difficulty?, qtype?, focus? }
//                        difficulty: easy|medium|hard · qtype: mc|tf|mix (tf = Đúng–Sai, options 2 mục)
//                        → { questions:[{q,options[2|4],answer,explain}] }
// Model chính: gpt-oss-120b (mạnh nhất trên Workers AI hiện tại, dùng Responses API: input/instructions,
// output là MẢNG có type:'message'). Lỗi/deprecate (5028) → tự fallback llama-3.3-70b (messages API).

const LAB_KEY = 'cn-lab-124-tim';
const MODEL_MAIN = '@cf/openai/gpt-oss-120b';
const MODEL_FALLBACK = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const MAX_TEXT = 24000; // ký tự mỗi lần gọi — client đã chia đoạn ~6k, đây chỉ là hàng rào an toàn

export async function onRequestPost({ request, env }) {
  if (request.headers.get('x-lab-key') !== LAB_KEY) return new Response('Not found', { status: 404 });
  let body = {};
  try { body = await request.json(); } catch (e) {}
  const task = String(body.task || '');
  try {
    if (task === 'summary_full') {
      const { result, model } = await runJSON(env, SUM_SYSTEM, 'TÀI LIỆU:\n"""\n' + clip(body.text) + '\n"""', validSummary);
      return Response.json({ ...result, model });
    }
    if (task === 'summary_chunk') {
      const sys = 'Bạn tóm tắt MỘT PHẦN của một tài liệu dài (phần ' + (body.part || '?') + '/' + (body.total || '?') + '). ' +
        'Ghi 3-6 gạch đầu dòng ý chính của phần này bằng tiếng Việt, giữ nguyên số liệu, tên riêng và thuật ngữ gốc quan trọng. ' +
        'CHỈ trả về các gạch đầu dòng, không mở bài, không kết luận.';
      const notes = await runText(env, sys, 'PHẦN TÀI LIỆU:\n"""\n' + clip(body.text) + '\n"""');
      if (!notes) throw new Error('empty notes');
      return Response.json({ notes });
    }
    if (task === 'summary_merge') {
      const { result, model } = await runJSON(env, SUM_SYSTEM,
        'Dưới đây là ghi chú tóm tắt TỪNG PHẦN của cùng một tài liệu dài. Hãy tổng hợp lại thành một tóm tắt chung:\n"""\n' + clip(body.notes) + '\n"""',
        validSummary);
      return Response.json({ ...result, model });
    }
    if (task === 'questions') {
      const n = Math.max(3, Math.min(15, parseInt(body.count, 10) || 8));
      const diff = String(body.difficulty || 'medium');
      const qtype = String(body.qtype || 'mc');
      const focus = String(body.focus || '').slice(0, 300).trim();
      // Gợi ý độ khó nói về "lựa chọn gây nhiễu" sẽ đá nhau với kiểu Đúng–Sai (chỉ có 2 mục cố định),
      // model gặp mâu thuẫn thì quay về trắc nghiệm 4 lựa chọn — nên tách riêng bộ gợi ý cho tf.
      const DIFF_HINT = qtype === 'tf' ? {
        easy: 'Độ khó CƠ BẢN: phát biểu về các ý chính dễ nhớ, đúng/sai rõ ràng.',
        medium: 'Độ khó VỪA SỨC: phát biểu kiểm tra mức độ hiểu nội dung, phân biệt được nếu đã đọc kỹ.',
        hard: 'Độ khó THỬ THÁCH: phát biểu đòi hỏi suy luận/so sánh từ nội dung, sai lệch tinh vi ở chi tiết (vẫn KHÔNG hỏi ngoài tài liệu).',
      } : {
        easy: 'Độ khó CƠ BẢN: hỏi các ý chính dễ nhớ, lựa chọn sai khác biệt rõ ràng với đáp án đúng.',
        medium: 'Độ khó VỪA SỨC: kiểm tra mức độ hiểu nội dung, lựa chọn sai hợp lý nhưng phân biệt được nếu đã đọc kỹ.',
        hard: 'Độ khó THỬ THÁCH: ưu tiên câu suy luận/so sánh/vận dụng từ nội dung tài liệu, lựa chọn gây nhiễu sát nghĩa, đòi hỏi đọc thật kỹ (vẫn KHÔNG hỏi ngoài tài liệu).',
      };
      const TYPE_HINT = {
        mc: 'Tất cả câu hỏi là TRẮC NGHIỆM 4 lựa chọn ("options" đúng 4 mục, "answer" là chỉ số 0-3).',
        tf: 'Tất cả câu hỏi là ĐÚNG–SAI: "q" là một phát biểu về nội dung tài liệu, "options" ĐÚNG 2 mục ["Đúng","Sai"], "answer" là 0 hoặc 1. Trộn đều phát biểu đúng và phát biểu sai.',
        mix: 'Trộn khoảng một nửa câu TRẮC NGHIỆM 4 lựa chọn (options 4 mục, answer 0-3) và một nửa câu ĐÚNG–SAI (q là một phát biểu, options đúng 2 mục ["Đúng","Sai"], answer 0 hoặc 1).',
      };
      const sys = 'Bạn là giáo viên ra đề. Dựa vào TÓM TẮT và TRÍCH ĐOẠN của một tài liệu, tạo ĐÚNG ' + n +
        ' câu hỏi kiểm tra mức độ HIỂU nội dung tài liệu đó (không hỏi mẹo, không hỏi kiến thức ngoài tài liệu, không bịa). ' +
        (DIFF_HINT[diff] || DIFF_HINT.medium) + ' ' + (TYPE_HINT[qtype] || TYPE_HINT.mc) + ' ' +
        'Câu hỏi và lựa chọn bằng tiếng Việt, giữ nguyên thuật ngữ/tên riêng gốc nếu có. ' +
        'Trả về DUY NHẤT một JSON object đúng dạng: {"questions":[{"q":"câu hỏi","options":["các lựa chọn"],"answer":0,"explain":"giải thích ngắn vì sao đáp án đúng"}]}. ' +
        '"answer" là chỉ số của lựa chọn đúng, vị trí đáp án đúng phải phân bố ngẫu nhiên giữa các câu. Không markdown, không chữ nào ngoài JSON.';
      const user = 'TÓM TẮT TÀI LIỆU:\n' + clip(body.summary, 6000) + '\n\nTRÍCH ĐOẠN GỐC:\n"""\n' + clip(body.excerpts, 12000) + '\n"""' +
        (focus ? '\n\nYÊU CẦU THÊM TỪ NGƯỜI HỌC (ưu tiên bám theo nếu hợp lý, vẫn chỉ dựa vào tài liệu): ' + focus : '');
      const { result, model } = await runJSON(env, sys, user, (v) => {
        const qs = Array.isArray(v && v.questions) ? v.questions.map(normQuestion).filter(Boolean) : [];
        return qs.length ? { questions: qs } : null;
      });
      return Response.json({ ...result, model });
    }
    return Response.json({ error: 'unknown task' }, { status: 400 });
  } catch (e) {
    return Response.json({ error: String((e && e.message) || e) }, { status: 500 });
  }
}

const SUM_SYSTEM = 'Bạn là trợ lý học tập. Nhiệm vụ: đọc tài liệu và tóm tắt CHÍNH XÁC theo nội dung có thật trong đó (không bịa, không thêm kiến thức ngoài). ' +
  'Viết tiếng Việt, giữ nguyên thuật ngữ/tên riêng gốc. Trả về DUY NHẤT một JSON object đúng dạng: ' +
  '{"tldr":"tóm tắt 2-3 câu","points":["5-8 ý chính, mỗi ý một câu ngắn"],"terms":[{"term":"thuật ngữ/từ khóa quan trọng (ngôn ngữ gốc)","vi":"giải nghĩa tiếng Việt thật ngắn"}]}. ' +
  '"terms" tối đa 10 mục. Không markdown, không chữ nào ngoài JSON.';

function clip(s, max) { return String(s || '').slice(0, max || MAX_TEXT); }

function validSummary(v) {
  if (!v || typeof v.tldr !== 'string' || !v.tldr.trim() || !Array.isArray(v.points) || !v.points.length) return null;
  return {
    tldr: v.tldr.trim(),
    points: v.points.map((p) => String(p || '').trim()).filter(Boolean).slice(0, 10),
    terms: (Array.isArray(v.terms) ? v.terms : []).map((t) => t && t.term ? { term: String(t.term).trim(), vi: String(t.vi || t.meaning || '').trim() } : null).filter(Boolean).slice(0, 12),
  };
}

function normQuestion(it) {
  if (!it || !it.q || !Array.isArray(it.options)) return null;
  const options = it.options.map((o) => String(o == null ? '' : o).trim()).filter(Boolean).slice(0, 4);
  if (options.length < 2) return null;
  let answer = parseInt(it.answer, 10);
  if (!(answer >= 0 && answer < options.length)) answer = 0;
  return { q: String(it.q).trim(), options, answer, explain: String(it.explain || it.explanation || '').trim() };
}

// ── Gọi model: thử model chính, hỏng thì fallback ─────────────────────────────
async function runText(env, system, user) {
  try {
    const out = await env.AI.run(MODEL_MAIN, { instructions: system, input: user });
    const t = extractText(out);
    if (t) return t;
    throw new Error('empty main output');
  } catch (e) {
    const out = await env.AI.run(MODEL_FALLBACK, {
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      max_tokens: 2048, temperature: 0.4,
    });
    return extractText(out);
  }
}

async function runJSON(env, system, user, validate) {
  // Thử main → parse; parse hỏng hoặc lỗi mạng model → thử fallback; cả hai hỏng mới ném lỗi.
  // Trả kèm `model` đã tạo ra kết quả (để trang lưu lại phục vụ so sánh/đánh giá).
  let lastErr = null;
  try {
    const out = await env.AI.run(MODEL_MAIN, { instructions: system, input: user });
    const v = validate(looseJson(extractText(out)));
    if (v) return { result: v, model: MODEL_MAIN };
    lastErr = new Error('main model: bad JSON');
  } catch (e) { lastErr = e; }
  try {
    const out = await env.AI.run(MODEL_FALLBACK, {
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      max_tokens: 2600, temperature: 0.4,
    });
    const v = validate(looseJson(extractText(out)));
    if (v) return { result: v, model: MODEL_FALLBACK };
    throw new Error('fallback model: bad JSON');
  } catch (e) {
    throw (lastErr && String(lastErr.message || lastErr) !== 'main model: bad JSON') ? lastErr : e;
  }
}

// env.AI.run trả đủ kiểu tuỳ model: string, {response}, Responses-API {output:[{type:'message',content:[{text}]}]}…
function extractText(out) {
  if (out == null) return '';
  if (typeof out === 'string') return out.trim();
  if (typeof out.response === 'string') return out.response.trim();
  if (out.response && typeof out.response === 'object') return extractText(out.response);
  if (typeof out.output_text === 'string') return out.output_text.trim();
  if (Array.isArray(out.output)) {
    for (const item of out.output) {
      if (item && item.type === 'message' && Array.isArray(item.content)) {
        const t = item.content.map((c) => (c && (c.text || c.output_text)) || '').join('').trim();
        if (t) return t;
      }
    }
  }
  if (Array.isArray(out.choices) && out.choices[0] && out.choices[0].message) return String(out.choices[0].message.content || '').trim();
  return '';
}

function looseJson(s) {
  if (!s) return null;
  s = String(s).replace(/```json/gi, '').replace(/```/g, '').trim();
  const tryParse = (t) => { try { return JSON.parse(t); } catch (e) { return null; } };
  let v = tryParse(s);
  if (v) return v;
  const obj = s.match(/\{[\s\S]*\}/);
  if (obj) { v = tryParse(obj[0]); if (v) return v; }
  const arr = s.match(/\[[\s\S]*\]/);
  if (arr) { v = tryParse(arr[0]); if (v) return { questions: v }; }
  return null;
}
