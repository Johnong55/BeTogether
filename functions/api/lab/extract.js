// Cloudflare Pages Function — trích chữ từ tệp cho "AI đọc tài liệu" (tính năng ẨN).
// POST /api/lab/extract — body = BYTES THÔ của tệp, headers: x-lab-key, x-file-name, content-type.
// Ảnh (image/*)  → OCR bằng model vision llama-3.2-11b (đọc chữ trong ảnh chụp/scan).
// PDF/HTML/CSV… → env.AI.toMarkdown (Workers AI Markdown Conversion, không cần thư viện ngoài).
// Trả { text } — client tự làm sạch/chia đoạn rồi gọi tiếp /api/lab/analyze.

const LAB_KEY = 'cn-lab-124-tim';
const VISION_MODEL = '@cf/meta/llama-3.2-11b-vision-instruct';
const MAX_BYTES = 10 * 1024 * 1024;

export async function onRequestPost({ request, env }) {
  if (request.headers.get('x-lab-key') !== LAB_KEY) return new Response('Not found', { status: 404 });
  try {
    const type = String(request.headers.get('x-file-type') || request.headers.get('content-type') || 'application/octet-stream').toLowerCase();
    let name = 'tai-lieu';
    try { name = decodeURIComponent(request.headers.get('x-file-name') || name); } catch (e) {}
    const buf = await request.arrayBuffer();
    if (!buf.byteLength) return Response.json({ error: 'Tệp rỗng' }, { status: 400 });
    if (buf.byteLength > MAX_BYTES) return Response.json({ error: 'Tệp quá lớn (tối đa 10MB)' }, { status: 413 });

    let text = '';
    if (type.startsWith('image/')) {
      text = await ocrImage(env, buf);
      if (!text) text = await toMarkdownText(env, name, buf, type); // đường lui: toMarkdown cũng mô tả được ảnh
    } else {
      text = await toMarkdownText(env, name, buf, type);
    }
    text = String(text || '').trim();
    if (!text) return Response.json({ error: 'Không đọc được chữ nào từ tệp này' }, { status: 422 });
    return Response.json({ text });
  } catch (e) {
    return Response.json({ error: String((e && e.message) || e) }, { status: 500 });
  }
}

async function ocrImage(env, buf) {
  try {
    const out = await env.AI.run(VISION_MODEL, {
      prompt: 'Transcribe ALL text visible in this image exactly as written, keeping the original language and line breaks. ' +
        'Output ONLY the transcribed text, no commentary. If there is no text, output an empty string.',
      image: [...new Uint8Array(buf)],
      max_tokens: 2048,
    });
    let t = String((out && out.response) || (typeof out === 'string' ? out : '') || '').trim();
    if (/^(there is no text|no text)/i.test(t)) t = '';
    return t;
  } catch (e) {
    return '';
  }
}

async function toMarkdownText(env, name, buf, type) {
  const r = await env.AI.toMarkdown({ name, blob: new Blob([buf], { type }) });
  const one = Array.isArray(r) ? r[0] : r;
  return (one && one.data) || '';
}
