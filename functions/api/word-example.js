// Cloudflare Pages Function — sinh câu ví dụ + cách dùng cho một từ/cụm bằng Workers AI.
// Gọi từ index.html: POST /api/word-example  { en: "từ tiếng Anh", vi: "nghĩa" }
// Trả về: { example, example_vi, usage }
const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const en = (body.en || '').toString().trim();
    const vi = (body.vi || '').toString().trim();
    if (!en) return Response.json({ error: 'thiếu từ' }, { status: 400 });

    const system = [
      'Bạn là giáo viên tiếng Anh thân thiện, giải thích cho người Việt.',
      'Với từ hoặc cụm được cho, trả về DUY NHẤT một JSON đúng định dạng, không thêm chữ nào khác:',
      '{"example":"<một câu tiếng Anh tự nhiên, ngắn, có dùng từ đó>","example_vi":"<dịch câu đó sang tiếng Việt>","usage":"<một câu tiếng Việt ngắn gọn về cách dùng hoặc mẹo ghi nhớ>"}'
    ].join(' ');
    const user = `Từ: "${en}"` + (vi ? ` (nghĩa tiếng Việt: ${vi})` : '');

    const out = await env.AI.run(MODEL, {
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      max_tokens: 260, temperature: 0.5,
    });

    const resp = out && out.response;
    let data;
    if (resp && typeof resp === 'object') {
      data = resp; // vài model trả thẳng object
    } else {
      const txt = String(resp || '').trim();
      try { const m = txt.match(/\{[\s\S]*\}/); data = JSON.parse(m ? m[0] : txt); }
      catch (e) { data = { example: txt, example_vi: '', usage: '' }; }
    }
    const S = (v) => (v == null ? '' : String(v)).trim();
    return Response.json({ example: S(data.example), example_vi: S(data.example_vi), usage: S(data.usage) });
  } catch (e) {
    return Response.json({ error: String((e && e.message) || e) }, { status: 500 });
  }
}
