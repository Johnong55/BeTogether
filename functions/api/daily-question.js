// Cloudflare Pages Function — sinh câu hỏi gắn kết mỗi ngày bằng Workers AI.
// Gọi từ index.html: POST /api/daily-question  { recent: [chuỗi câu hỏi gần đây] }
// Trả về: { question: "..." }  (app tự fallback danh sách cố định nếu lỗi)
const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'; // đổi model ở đây (xem: npx wrangler ai models)

export async function onRequestPost({ request, env }) {
  try {
    let recent = [];
    try { const b = await request.json(); if (Array.isArray(b.recent)) recent = b.recent.slice(0, 8); } catch (e) {}

    const system = [
      'Bạn viết CÂU HỎI GẮN KẾT mỗi ngày cho một CẶP ĐÔI đang yêu, bằng tiếng Việt.',
      'Yêu cầu: chỉ MỘT câu hỏi, ngắn (dưới 22 từ), ấm áp, dễ thương, gợi mở chia sẻ cảm xúc hoặc kỷ niệm.',
      'Xưng hô nhẹ nhàng (bạn / hai đứa / người ấy). Không sáo rỗng, không nhạy cảm.',
      'CHỈ trả về đúng câu hỏi, không giải thích, không đánh số, không thêm dấu ngoặc kép.'
    ].join(' ');
    const user = 'Viết một câu hỏi mới cho hôm nay.' +
      (recent.length ? (' Tránh trùng ý với các câu đã hỏi gần đây: ' + recent.join(' | ')) : '');

    const out = await env.AI.run(MODEL, {
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      max_tokens: 80, temperature: 0.9,
    });

    let q = String((out && out.response) || '').trim();
    q = q.split('\n').map(s => s.trim()).filter(Boolean)[0] || '';
    q = q.replace(/^\d+[\.\)]\s*/, '').replace(/^["'“”]+|["'“”]+$/g, '').trim();
    if (!q) throw new Error('empty');
    if (!/[?？]$/.test(q)) q += '?';

    return Response.json({ question: q });
  } catch (e) {
    return Response.json({ error: String((e && e.message) || e) }, { status: 500 });
  }
}
