// Cloudflare Pages Function — sinh câu ví dụ + cách dùng cho một từ/cụm bằng Workers AI.
// Gọi từ index.html: POST /api/word-example  { en: "từ tiếng Anh", vi: "nghĩa" }
// Trả về: { example, example_vi, usage, meaning_note }
// meaning_note chỉ có giá trị khi model tự kiểm tra thấy nghĩa tiếng Việt được cung cấp SAI/lệch (vd lỗi OCR từ PDF).
const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const en = (body.en || '').toString().trim();
    const vi = (body.vi || '').toString().trim();
    if (!en) return Response.json({ error: 'thiếu từ' }, { status: 400 });

    const system = [
      'Bạn là giáo viên tiếng Anh thân thiện, giải thích cho người Việt.',
      'Một từ/cụm tiếng Anh có thể có NHIỀU NGHĨA khác nhau tuỳ ngữ cảnh.',
      'BƯỚC 1 — Tự kiểm tra trước: nghĩa tiếng Việt được cung cấp có phải là một nghĩa ĐÚNG, có thật của từ/cụm tiếng Anh đó không?',
      'BƯỚC 2 — Nếu nghĩa cung cấp ĐÚNG: dùng chính nghĩa đó để đặt ví dụ, để trống "meaning_note".',
      'Nếu nghĩa cung cấp SAI hoặc không phải nghĩa thật của từ/cụm đó: dùng nghĩa ĐÚNG phổ biến nhất thay thế để đặt ví dụ, đồng thời ghi ngắn gọn nghĩa đúng vào "meaning_note" (vd: "Nghĩa đúng hơn là: ...").',
      'Trả về DUY NHẤT một JSON đúng định dạng, không thêm chữ nào khác:',
      '{"meaning_note":"<để trống \\"\\" nếu nghĩa cung cấp đã đúng ở bước 1>","example":"<một câu tiếng Anh tự nhiên, ngắn, dùng từ/cụm đúng với nghĩa đã xác nhận ở bước 1-2>","example_vi":"<dịch câu đó sang tiếng Việt>","usage":"<một câu tiếng Việt ngắn gọn về cách dùng hoặc mẹo ghi nhớ>"}'
    ].join(' ');
    const user = `Từ/cụm: "${en}"` + (vi
      ? ` — Nghĩa tiếng Việt được cung cấp: "${vi}". Hãy tự kiểm tra nghĩa này (bước 1) trước khi đặt ví dụ.`
      : ' — Không có nghĩa tiếng Việt được cung cấp, tự chọn một nghĩa phổ biến để đặt ví dụ.');

    const out = await env.AI.run(MODEL, {
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      max_tokens: 300, temperature: 0.5,
    });

    const resp = out && out.response;
    let data;
    if (resp && typeof resp === 'object') {
      data = resp; // vài model trả thẳng object
    } else {
      const txt = String(resp || '').trim();
      try { const m = txt.match(/\{[\s\S]*\}/); data = JSON.parse(m ? m[0] : txt); }
      catch (e) { data = { example: txt, example_vi: '', usage: '', meaning_note: '' }; }
    }
    const S = (v) => (v == null ? '' : String(v)).trim();
    return Response.json({
      example: S(data.example), example_vi: S(data.example_vi), usage: S(data.usage),
      meaning_note: S(data.meaning_note),
    });
  } catch (e) {
    return Response.json({ error: String((e && e.message) || e) }, { status: 500 });
  }
}
