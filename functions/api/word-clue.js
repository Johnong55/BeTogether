// Cloudflare Pages Function — sinh 1 CÂU GỢI Ý DỄ ĐOÁN cho trò Ô chữ bằng Workers AI.
// Gọi từ index.html: POST /api/word-clue  { en: "từ tiếng Anh", vi: "nghĩa (tuỳ chọn)" }
// Trả về: { clue }  — một câu tiếng Anh TỰ NHIÊN, NHIỀU NGỮ CẢNH, chứa ĐÚNG từ đó (client tự che thành ____).
// Khác /api/word-example ở chỗ: câu ở đây cố tình DÀI & GIÀU MANH MỐI để người học đoán được từ còn thiếu.
const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const en = (body.en || '').toString().trim();
    const vi = (body.vi || '').toString().trim();
    if (!en) return Response.json({ error: 'thiếu từ' }, { status: 400 });

    const system = [
      'You write fill-in-the-blank clue sentences for an English vocabulary crossword game for learners.',
      'Given ONE target English word, write ONE simple, natural English sentence that makes the target word EASY TO GUESS from context.',
      'Rules:',
      '- The sentence MUST contain the target word EXACTLY as given (same spelling, do NOT change it to plural/past/other form).',
      '- Give plenty of everyday context and strong clues so a beginner can guess the word, but do NOT use the target word\'s obvious synonym right next to it.',
      '- Keep it 8 to 16 words, clear and concrete (a real-life situation), present tense when possible.',
      '- Use easy, common vocabulary for the rest of the sentence.',
      'Return ONLY a JSON object, nothing else: {"clue":"<the sentence, containing the exact target word>"}'
    ].join(' ');
    const user = `Target word: "${en}"` + (vi ? ` (nghĩa tiếng Việt để bạn hiểu đúng: "${vi}")` : '') +
      '. Write the clue sentence now.';

    const out = await env.AI.run(MODEL, {
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      max_tokens: 120, temperature: 0.6,
    });

    const resp = out && out.response;
    let data;
    if (resp && typeof resp === 'object') {
      data = resp;
    } else {
      const txt = String(resp || '').trim();
      try { const m = txt.match(/\{[\s\S]*\}/); data = JSON.parse(m ? m[0] : txt); }
      catch (e) { data = { clue: txt }; }
    }
    const clue = (data.clue == null ? '' : String(data.clue)).trim();
    return Response.json({ clue });
  } catch (e) {
    return Response.json({ error: String((e && e.message) || e) }, { status: 500 });
  }
}
