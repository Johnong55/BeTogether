# Push service chạy trên VPS — cho app "cùng nhau"

Thay cho cron Cloudflare (best-effort, hay trễ 10–13 phút), service này chạy nền **liên tục** trên VPS và **kiểm tra mỗi 20 giây** → lời nhắc tới trong vài giây.

- Chỉ **gọi ra ngoài** (Supabase + endpoint push của Google/Apple/Mozilla). **Không cần mở cổng vào VPS.**
- Dùng lại **đúng cặp khoá VAPID cũ** → các máy đã bật thông báo **không phải đăng ký lại**, không phải đổi `index.html`.
- Cần **Node 18 trở lên** trên VPS.

---

## Bước 1 — Chép thư mục này lên VPS

Từ máy tính (hoặc dùng git trên VPS), đưa thư mục `vps-push/` vào `/opt/cungnhau-push`. Ví dụ dùng `scp`:

```bash
scp -r vps-push root@36.50.26.113:/opt/cungnhau-push
```

Rồi SSH vào VPS:

```bash
ssh root@36.50.26.113
cd /opt/cungnhau-push
```

## Bước 2 — Cài Node (nếu chưa có) và thư viện

Kiểm tra: `node -v` (cần v18+). Nếu chưa có, cài (Ubuntu/Debian):

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
```

Cài thư viện web-push:

```bash
cd /opt/cungnhau-push
npm install
```

## Bước 3 — Khoá VAPID (quan trọng)

Service cần **khoá riêng dạng web-push**. Khoá cũ của bạn đang ở dạng PKCS8 (đặt ở Cloudflare bằng `wrangler secret put VAPID_PRIVATE_KEY_PKCS8`).

**Cách A — Giữ nguyên khoá cũ (khuyến nghị):** nếu bạn còn chuỗi PKCS8 đó, chuyển nó sang dạng web-push:

```bash
node convert-key.js <DÁN_CHUỖI_PKCS8_Ở_ĐÂY>
```

Nó in ra `VAPID_PRIVATE_KEY = ...` — copy giá trị đó cho Bước 4. (Khoá không rời khỏi VPS.)

**Cách B — Nếu KHÔNG còn khoá cũ:** tạo cặp mới:

```bash
npx web-push generate-vapid-keys
```

Nó in ra **Public** và **Private**. Khi đó bạn cần:
- Gửi mình chuỗi **Public** để mình cập nhật `index.html` + deploy lại.
- Dùng **Private** cho Bước 4.
- Hai người mở app bật lại "Bật thông báo đẩy" (đăng ký lại với khoá mới).

## Bước 4 — Tạo file .env

```bash
cp .env.example .env
nano .env
```

Điền `VAPID_PRIVATE_KEY` bằng giá trị lấy ở Bước 3. (Các giá trị khác đã điền sẵn; nếu dùng Cách B thì đổi cả `VAPID_PUBLIC_KEY`.)

## Bước 5 — Chạy nền bằng systemd

```bash
cp /opt/cungnhau-push/cungnhau-push.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now cungnhau-push
```

Xem log trực tiếp:

```bash
journalctl -u cungnhau-push -f
```

Bạn sẽ thấy dòng `cùng nhau push service — kiểm tra mỗi 20s…`. Khi có lời nhắc tới giờ: `✅ nhắc "..." → 1/1 máy`.

## Bước 6 — Thử

Trên app, đặt một lời nhắc sau ~1 phút. Trong vòng ~20 giây kể từ giờ hẹn, thông báo sẽ tới. Xem `journalctl` để chắc chắn service gửi.

## Bước 7 — Tắt cron Cloudflare cũ (tránh chạy trùng)

Sau khi VPS chạy ổn, tắt worker cũ để khỏi song song (dù cột `notified_at` đã chặn gửi trùng, tắt cho gọn):

```bash
# trên máy có wrangler:
cd push-worker
# đổi crons trong wrangler.toml thành:  crons = []
wrangler deploy
# hoặc xoá hẳn worker trong Cloudflare Dashboard → Workers → cungnhau-push-cron → Delete
```

---

## Gỡ lỗi nhanh
- **Không thấy log gửi:** kiểm tra `.env` đủ 4 biến; `journalctl -u cungnhau-push -e` xem lỗi.
- **status 401/403:** sai `VAPID_*` → khoá công khai/riêng không cùng cặp. Dùng lại Cách A đúng chuỗi PKCS8, hoặc Cách B tạo mới cả 2.
- **status 410/404:** sub hết hạn — service tự xoá; người dùng bật lại thông báo trên app.
- **iPhone không nhận:** phải **cài app vào Màn hình chính** (PWA) và tắt chế độ im lặng.
- **Giờ lệch:** chỉnh `TZ_OFFSET_HOURS` trong `.env` (VN = 7).
