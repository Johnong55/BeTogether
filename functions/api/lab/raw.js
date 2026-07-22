// Cloudflare Pages Function — TẢI HỘ BYTES CỦA MỘT PDF cho "AI đọc tài liệu" (tính năng ẨN).
// POST /api/lab/raw { url } (header x-lab-key) → chính file PDF đó (application/pdf).
//
// Vì sao cần: trang muốn hiện BẢN PDF GỐC bằng PDF.js ngay trong trình duyệt, nhưng trình duyệt
// tải thẳng PDF từ tên miền khác thì bị CORS chặn. Endpoint này tải hộ ở phía máy chủ (cùng gốc
// với trang nên không dính CORS) rồi trả nguyên bytes.
//
// ⚠️ Đây KHÔNG phải proxy vạn năng — cố ý siết chặt để không thành công cụ ẩn danh cho người khác:
//   - phải có x-lab-key đúng (sai → 404 giả vờ không tồn tại, cùng triết lý với các endpoint lab)
//   - dùng lại `safeUrl` của fetch.js để chặn địa chỉ nội bộ (SSRF)
//   - CHỈ trả về khi nội dung thật sự là PDF (kiểm cả content-type lẫn chữ ký "%PDF-" đầu tệp),
//     kèm nosniff để trình duyệt không tự đoán thành HTML rồi chạy mã của trang lạ.

import { safeUrl, readCapped } from './fetch.js';

const LAB_KEY = 'cn-lab-124-tim';
const MAX_BYTES = 14 * 1024 * 1024;  // giáo trình PDF vài trăm trang vẫn lọt
const FETCH_TIMEOUT = 25000;
const UA = 'Mozilla/5.0 (compatible; CungNhauReader/1.0; +https://cungnhau.pages.dev)';

export async function onRequestPost({ request }) {
  if (request.headers.get('x-lab-key') !== LAB_KEY) return new Response('Not found', { status: 404 });
  let body = {};
  try { body = await request.json(); } catch (e) {}
  const check = safeUrl(String(body.url || '').trim());
  if (!check.ok) return Response.json({ error: check.error }, { status: 400 });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(check.url, {
      signal: ctrl.signal, redirect: 'follow',
      headers: { 'user-agent': UA, 'accept': 'application/pdf,*/*;q=0.8' },
    });
    if (!res.ok) return Response.json({ error: 'Tải PDF lỗi ' + res.status }, { status: 422 });
    const buf = await readCapped(res, MAX_BYTES);
    if (!looksPdf(res.headers.get('content-type'), buf)) {
      return Response.json({ error: 'Đường dẫn này không phải PDF' }, { status: 415 });
    }
    return new Response(buf, {
      headers: {
        'content-type': 'application/pdf',
        'x-content-type-options': 'nosniff',
        'content-disposition': 'inline',
        'cache-control': 'private, max-age=600',
      },
    });
  } catch (e) {
    const msg = (e && e.name === 'AbortError') ? 'PDF tải quá lâu (quá 25 giây)' : String((e && e.message) || e);
    return Response.json({ error: msg }, { status: 502 });
  } finally { clearTimeout(timer); }
}

// Content-type nói gì cũng chỉ là gợi ý — kiểm thêm chữ ký "%PDF-" ở đầu tệp cho chắc.
export function looksPdf(ctype, buf) {
  const head = new Uint8Array(buf.slice ? buf.slice(0, 5) : buf).subarray(0, 5);
  const sig = String.fromCharCode(...head);
  if (sig === '%PDF-') return true;
  return String(ctype || '').toLowerCase().includes('pdf') && buf.byteLength > 0;
}
