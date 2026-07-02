# cùng nhau

Một web nhỏ cho hai người **học từ vựng & dò bài cho nhau**, **giữ chuỗi** mỗi ngày, **đếm ngày bên nhau** và **cùng ghi chú**.

- **Nhà** — đếm ngày bên nhau, chuỗi ngày liên tiếp, nhiệm vụ hôm nay
- **Học** — bộ **từ vựng B2 có sẵn** (14 chủ đề, ~780 từ, lấy từ file PDF), học bằng **trắc nghiệm** + **trộn chữ cái** (không phải flashcard). Cả hai đứa đều học được cùng một chủ đề.
- **Hộp thư** — gửi một chủ đề cho người ấy; **cả người gửi lẫn người nhận** đều học được → giữ chuỗi
- **Ghi chú** — khu ghi chú chung hai đứa cùng viết và lưu giữ
- **Câu hỏi mỗi ngày** — một câu hỏi, cả hai trả lời rồi mới lộ đáp án của nhau

> Bộ từ vựng được **nhúng sẵn** trong file `library.js` — dùng ngay, không cần tự tạo. Muốn thêm/sửa chủ đề thì sửa `library.js`.

Mỗi người có **tài khoản riêng** (tên đăng nhập + mã PIN). Ghép đôi bằng cách **gửi lời mời theo tên** hoặc **chia sẻ mã phòng**.

---

## 1. Xem thử ngay (không cần cài gì)

Mở file `index.html` bằng trình duyệt (nhấp đúp). App chạy ở **chế độ thử** — dữ liệu lưu trên máy này. Đủ để xem giao diện và chơi thử.

> Lưu ý: chế độ thử **không** đồng bộ giữa hai máy. Muốn hai người dùng riêng ở hai nơi → làm bước 2.

---

## 2. Bật đồng bộ qua mạng (Supabase — miễn phí)

### Bước 1 — Tạo dự án Supabase
1. Vào https://supabase.com → đăng ký (miễn phí).
2. **New project** → đặt tên, đặt mật khẩu database (lưu lại), chọn region gần (Singapore).
3. Đợi ~1 phút cho dự án khởi tạo xong.

### Bước 2 — Tạo bảng dữ liệu
1. Bên trái chọn **SQL Editor** → **New query**.
2. Mở file `schema.sql` trong dự án này, **copy toàn bộ**, dán vào và bấm **Run**.
3. Thấy "Success" là xong.

### Bước 3 — Lấy khoá kết nối
1. Bên trái: **Project Settings** (bánh răng) → **API**.
2. Copy hai thứ:
   - **Project URL** (vd: `https://abcdxyz.supabase.co`)
   - **anon public** key (chuỗi dài bắt đầu bằng `eyJ...`)

### Bước 4 — Dán khoá vào app
Mở `index.html`, tìm đoạn gần đầu phần `<script>`:

```js
const SUPABASE_URL = "";       // dán Project URL vào đây
const SUPABASE_ANON_KEY = "";  // dán anon public key vào đây
```

Điền vào, lưu lại. Mở lại app → giờ đã đồng bộ qua mạng ☁️ (góc Cài đặt sẽ ghi "Đồng bộ qua mạng đang BẬT").

---

## 3. Đưa web lên mạng để hai người cùng vào (miễn phí)

🌐 **Đang chạy tại: https://cungnhau.pages.dev** (Cloudflare Pages)

Cập nhật sau này bằng lệnh (từ thư mục dự án):
```
npx wrangler pages deploy . --project-name=cungnhau --branch=main --commit-dirty=true
```

Cách khác nếu cần — **Netlify Drop**:
1. Vào https://app.netlify.com/drop
2. Kéo–thả **cả thư mục `love`** vào trang đó.
3. Netlify cho bạn một link (vd: `https://ten-gi-do.netlify.app`). Gửi link này cho người yêu.

> Cũng có thể dùng **Vercel** hoặc **GitHub Pages** — đều miễn phí cho web tĩnh như thế này.

---

## 4. Dùng thế nào?

1. **Người tạo (A)**: mở app → *Tạo tài khoản* (tên + tên đăng nhập + mã PIN) → *Tạo phòng* → đặt ngày bắt đầu yêu → có **mã phòng**.
2. **Mời người yêu** bằng một trong hai cách:
   - Vào ⚙️ **Cài đặt** → *Mời người yêu bằng tên đăng nhập* (người kia sẽ thấy lời mời khi đăng nhập), **hoặc**
   - **Gửi mã phòng** cho người kia.
3. **Người kia (B)**: mở cùng link → *Tạo tài khoản* → bấm **Đồng ý** ở lời mời, *hoặc* nhập **mã phòng** → *Vào phòng*.
4. Tạo **bộ thẻ** → thêm thẻ (gõ nhanh + Enter, hoặc **Thêm nhiều** để dán cả danh sách) → vào **Dò bài** chọn bộ → gửi.
5. Người nhận vào **Hộp thư** → **Nhận & làm bài** → giữ chuỗi.
6. Cùng viết **Ghi chú** và trả lời **Câu hỏi mỗi ngày**.

**Giữ chuỗi:** mỗi ngày chỉ cần **làm xong một bài** *hoặc* **trả lời câu hỏi hôm nay** là chuỗi +1. Bỏ trọn một ngày thì chuỗi về 0.

**Thêm nhiều thẻ một lúc:** trong một bộ, bấm *Thêm nhiều* rồi dán mỗi dòng một thẻ, ngăn cách từ và nghĩa bằng dấu `=`, `,` hoặc tab. Ví dụ:
```
apple = quả táo
hello, xin chào
thank you    cảm ơn
```

---

## Ghi chú nhỏ
- Web riêng tư cho hai người: đăng nhập bằng tên + PIN, dữ liệu bảo vệ bằng **mã phòng khó đoán**. Mã PIN chỉ được băm nhẹ — **đừng dùng PIN trùng mật khẩu quan trọng** và đừng lưu thông tin nhạy cảm.
- Muốn đổi tên, tông màu, ngày bắt đầu: vào ⚙️ **Cài đặt** trong app.
- Mọi thứ gói gọn trong **một file** `index.html` — dễ sao lưu, dễ chỉnh.

Chúc hai bạn học vui và giữ chuỗi thật dài nha.
