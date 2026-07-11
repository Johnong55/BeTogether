// Chuyển VAPID private key từ dạng PKCS8 (đang đặt ở Cloudflare: VAPID_PRIVATE_KEY_PKCS8)
// sang dạng mà thư viện web-push cần (raw 32-byte, urlsafe base64).
// → Giữ NGUYÊN cặp khoá cũ ⇒ các máy đã bật thông báo KHÔNG phải đăng ký lại,
//   và KHÔNG cần đổi VAPID_PUBLIC_KEY trong index.html.
//
// Cách chạy trên VPS (Node 18+):
//   node convert-key.js <PASTE_VAPID_PRIVATE_KEY_PKCS8_Ở_ĐÂY>
//
// Kết quả in ra chính là giá trị đặt cho VAPID_PRIVATE_KEY trong file .env.
// (Khoá riêng KHÔNG rời khỏi máy bạn — script chỉ chạy cục bộ.)

import { createPrivateKey } from 'node:crypto';

const pkcs8 = process.argv[2];
if (!pkcs8) {
  console.error('Dùng: node convert-key.js <VAPID_PRIVATE_KEY_PKCS8_base64>');
  process.exit(1);
}

try {
  const jwk = createPrivateKey({ key: Buffer.from(pkcs8, 'base64'), format: 'der', type: 'pkcs8' }).export({ format: 'jwk' });
  if (!jwk.d) throw new Error('Không tách được khoá riêng (d).');
  console.log('\nVAPID_PRIVATE_KEY (dán vào .env) =\n' + jwk.d + '\n');
} catch (e) {
  console.error('Lỗi chuyển khoá:', (e && e.message) || e);
  console.error('Kiểm tra lại bạn đã dán đúng chuỗi PKCS8 base64 (khoá đặt bằng `wrangler secret put VAPID_PRIVATE_KEY_PKCS8`).');
  process.exit(1);
}
