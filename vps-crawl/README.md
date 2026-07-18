# vps-crawl — Backend crawl + AI (chạy trên VPS)

Biến một trang web thành **dữ liệu học**: crawl nội dung sạch → Cloudflare Workers AI trích
**từ vựng** (+ ví dụ) và **tóm tắt** → lưu vào **Thư viện chung** (Supabase) dưới dạng *nháp* để
admin duyệt.

```
Admin (cungnhau.pages.dev/admin.html)
   │  POST /crawl  { url, mode }   (header X-API-Key)
   ▼
VPS (FastAPI + crawl4ai)  ──►  crawl4ai lấy markdown sạch
   │                        ──►  POST cungnhau.pages.dev/api/extract-lesson  (Workers AI)
   │                        ──►  ghi Supabase library_topics / library_words (status=draft)
   ▼
Admin xem lại → Duyệt (published) → mọi cặp đôi học được
```

VPS **chỉ gọi ra ngoài** (Supabase REST + Pages Function). Token AI KHÔNG nằm ở VPS (AI chạy ở
Cloudflare). Bảo vệ bằng `X-API-Key` + CORS allowlist.

---

## 1. Cài đặt

Cần Python 3.10+.

```bash
cd vps-crawl
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# crawl4ai cần trình duyệt Playwright (Chromium) — chạy 1 lần:
crawl4ai-setup           # hoặc: python -m playwright install --with-deps chromium

cp .env.example .env
# sinh khoá:  python -c "import secrets;print(secrets.token_urlsafe(24))"
nano .env                # điền SUPABASE_*, CRAWL_API_KEY, PAGES_BASE, ALLOW_ORIGINS
```

Chạy thử:

```bash
uvicorn main:app --host 127.0.0.1 --port 8080
curl localhost:8080/health
```

## 2. Đưa ra Internet bằng HTTPS (bắt buộc)

Admin chạy trên HTTPS (`cungnhau.pages.dev`) nên trình duyệt **chặn gọi HTTP** (mixed content).
API của VPS PHẢI là HTTPS. Khuyến nghị **Cloudflare Tunnel** — không mở cổng vào VPS, tự có HTTPS:

```bash
# cài cloudflared trên VPS, đăng nhập, rồi:
cloudflared tunnel create cungnhau-crawl
# trỏ 1 subdomain (vd crawl.your-domain.com) tới http://127.0.0.1:8080
cloudflared tunnel route dns cungnhau-crawl crawl.your-domain.com
# config ~/.cloudflared/config.yml:  ingress -> service: http://127.0.0.1:8080
cloudflared tunnel run cungnhau-crawl
```

→ URL công khai dạng `https://crawl.your-domain.com`. Điền URL này vào `CRAWL_API_BASE` trong
`admin.html`, và thêm nó vào `ALLOW_ORIGINS` nếu cần.

(Thay thế: nginx/Caddy + Let's Encrypt trên domain trỏ vào VPS, mở cổng 443. Nhớ CORS.)

## 3. Chạy nền bằng systemd

`/etc/systemd/system/cungnhau-crawl.service`:

```ini
[Unit]
Description=cung nhau crawl backend
After=network.target

[Service]
WorkingDirectory=/home/USER/cungnhau/BeTogether/vps-crawl
ExecStart=/home/USER/cungnhau/BeTogether/vps-crawl/.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8080
Restart=always
User=USER

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now cungnhau-crawl
```

(Chạy `cloudflared` cũng nên đặt thành service riêng để tự bật lại.)

## 4. Nối vào admin

Trong `admin.html` (đầu file, chỗ cấu hình) đặt:

```js
const CRAWL_API_BASE = "https://crawl.your-domain.com";  // URL public của VPS
const CRAWL_API_KEY  = "<đúng CRAWL_API_KEY trong .env>";
```

Khi `CRAWL_API_BASE` có giá trị, thẻ **Crawl từ nguồn** trong tab *Nguồn tri thức* sẽ bật lên
(nhập URL + chọn chế độ → Bóc tách). Kết quả vào Thư viện chung dạng *nháp*.

## 5. Chạy trước SQL

Bảng `library_topics` cần 2 cột mới `summary`, `source_url` — chạy `schema.sql` (đã bổ sung).

## Bảo mật — lưu ý thật
- `CRAWL_API_KEY` sẽ nằm trong `admin.html` (mã nguồn công khai) → người xem source có thể thấy và
  gọi /crawl. Rủi ro là bị lạm dụng tài nguyên crawl/AI, KHÔNG lộ dữ liệu. Giảm thiểu: đổi khoá
  định kỳ, giới hạn `ALLOW_ORIGINS`, có thể thêm rate-limit / allowlist domain nguồn trong `main.py`,
  hoặc bọc thêm **Cloudflare Access** trước tunnel. Đừng dùng `service_role` key của Supabase ở đây —
  chỉ dùng anon publishable key.
