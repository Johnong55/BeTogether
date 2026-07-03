# CLAUDE.md — "cùng nhau" (BeTogether)

> File này Claude Code tự đọc mỗi session. Đọc kỹ trước khi sửa. Người dùng nói **tiếng Việt**, thích tông ấm/dễ thương, emoji, pastel. Trả lời tiếng Việt.

## App là gì
Web nhỏ, riêng tư cho **một cặp đôi** (user & người yêu) học từ vựng và gắn kết. Tên hiển thị: **"cùng nhau"**. Repo GitHub: **BeTogether**.

Tính năng: đăng nhập + ghép đôi 2 người → học từ vựng (chủ đề B2 có sẵn + bộ tự tạo) bằng **thẻ lật** và **trắc nghiệm/trộn chữ** → gửi "bài dò" cho nhau → **giữ chuỗi 🔥** → **đấu trường** thách đấu trực tiếp có cược → **ghi chú/nhắc nhở có ngày** → **câu hỏi mỗi ngày** → **đếm ngày bên nhau**. Cài được như **app (PWA)**. Có **animation Lottie** (tim loading, vương miện thắng, mưa thua).

## Kiến trúc (QUAN TRỌNG)
- **Toàn bộ app nằm trong 1 file `index.html`** (~1360 dòng: CSS + JS thuần, không framework, không build). Render bằng `render()` set `innerHTML`, không có virtual DOM.
- **Backend = Supabase** (gọi trực tiếp từ trình duyệt qua `@supabase/supabase-js@2` CDN). KHÔNG có server Node riêng (user từng nhờ tách backend/frontend rồi ĐỔI Ý — đã xoá; đừng dựng lại).
- **`library.js`**: `window.LIBRARY` = 14 chủ đề B2 (~780 từ Anh–Việt), ASCII \u-escaped, trích từ 1 PDF bằng pdfplumber. File dữ liệu tĩnh, nhúng sẵn (không nằm trong Supabase).
- **`lottie/*.json`**: 3 animation TỰ TẠO (love/crown/rain) + lottie-web từ cdnjs.
- **PWA**: `manifest.json` + `sw.js` (service worker) + `icons/*`.
- **`schema.sql`**: toàn bộ bảng Supabase (chạy lại an toàn, idempotent).

### Config Supabase (đã điền sẵn trong index.html, ~dòng 220)
```
SUPABASE_URL = "https://vklsqexomaconbzoufmu.supabase.co"
SUPABASE_ANON_KEY = "sb_publishable_YDj6liDtYbMFq38GhwCwIQ_KlS-lNwI"   // publishable key MỚI, an toàn công khai
```
- Key mới dạng `sb_publishable_` (không phải `eyJ...` cũ) — supabase-js hiểu được. TUYỆT ĐỐI không commit `sb_secret_`.
- Bảng dùng RLS với policy "allow all" (using(true)/with check(true)) — bảo mật dựa vào **mã phòng khó đoán**, không phải RLS thật. Đủ cho web 2 người, đừng lưu thông tin nhạy cảm.

### Tầng dữ liệu `Store` (index.html)
Object `Store` có 2 chế độ: **cloud** (Supabase, khi có key) và **local** (localStorage, khi trống key — chỉ để demo). Mọi thao tác DB đi qua `Store.*` (getUser/createUser/updateUser, createInvite/listInvites/updateInvite, createSpace/getSpace/updateSpace, listDecks/saveDeck/deleteDeck, listCards/saveCard/saveCards/deleteCard, listQuizzes/saveQuiz, listNotes/saveNote/deleteNote, listDuels/saveDuel/updateDuel, getDaily/saveDaily). Poll mỗi 5s (`startPolling`) để đồng bộ; đấu trường poll nhanh 2.5s (`duelTick`).

### State chính (biến `S`)
`S = { user, space, me('a'|'b'), view, sub, decks, cards, quizzes, notes, dailyToday, invites, duel, duelPlay, duelHistory, play(study), compose, inboxTab, authTab, tmp }`. Người dùng là `a` hoặc `b` trong một `space` (phòng). `render()` đọc `S.view`.

### Bảng Supabase (schema.sql)
`users`(username pk, display, password_hash, space_id, person), `spaces`(id=mã phòng, person_a/b, person_a/b_username, theme, start_date, streak, longest, last_active), `invites`, `decks`, `cards`, `quizzes`(items jsonb), `notes`(+remind_at date, +done bool), `daily`, `duels`(challenger, status, stake, questions jsonb, score_a/b, progress_a/b, done_a/b).
> ⚠️ Mỗi lần thêm cột/bảng, USER PHẢI tự chạy SQL trong Supabase SQL Editor (mình không có quyền). Luôn đưa đoạn SQL rõ ràng cho họ.

## Các màn/tab (nav dưới cùng): Nhà · Học · Đấu · Hộp thư · Nhắc
- **Nhà (home)**: đếm ngày bên nhau, chuỗi/kỷ lục, nhiệm vụ hôm nay, câu hỏi mỗi ngày (thẻ bấm vào), banner nhắc/đấu/cài-app.
- **Học (library)**: "Bộ từ của mình" (tự tạo: thêm nhanh Enter/dán hàng loạt) + 14 chủ đề B2 có sẵn. Mỗi bộ: **Thẻ lật** (học nhớ) / **Trắc nghiệm** (thi, mix trắc nghiệm + trộn chữ) / Gửi / Rủ đấu. `startStudy(words,{mode:'flash'|'quiz',...})`, `buildQuestions()` dùng HẾT từ (không giới hạn 12).
- **Đấu (arena)**: "Rủ đấu" — chọn bộ + số câu + cược → người kia NHẬN LỜI mới bắt đầu → cả hai làm **cùng 1 bộ câu hỏi** (sinh 1 lần lưu chung) → thấy tiến độ đối thủ ~trực tiếp → xong hiện thắng/thua + cược + lịch sử. Chữ dùng "Rủ đấu" (KHÔNG dùng "thách đấu" — user thấy gắt).
- **Hộp thư (inbox)**: bài dò nhận/gửi, mỗi bài có Thẻ lật/Trắc nghiệm cho cả hai.
- **Nhắc (notes)**: ghi chú = lời nhắc có ngày (remind_at); chia Quá hạn/Hôm nay/Sắp tới/Không hẹn/Đã xong; chấm đỏ + banner; nút bật thông báo hệ thống (Notification API, chỉ khi mở app).
- **Cài đặt (⚙️)**: mã phòng, mời theo tên, ngày bắt đầu yêu, tên, tông màu, đăng xuất/rời phòng, hướng dẫn cài app.

Streak (`bumpStreak`): học/thi/trả lời câu hỏi xong → chuỗi +1 (1 lần/ngày, no-op nếu đã +hôm nay).

## Lottie (index.html: `mountLotties`, `initLoading`)
- lottie-web cdnjs 5.12.2. 3 file trong `/lottie/`: **love** (tim đập, loading overlay `#loading`), **crown** (vương miện nảy, khi THẮNG), **rain** (mây+mưa, khi THUA).
- `mountLotties()` chạy cuối `render()`, quét `[data-lottie]:not([data-lottie-done])`. Thắng→confetti, thua→KHÔNG confetti (`celebrate` gated `iWin||tie`).
- ⚠️ **GOTCHA**: repeater Lottie LỒNG NHAU (dọc×ngang) bị nhân sai offset trong lottie-web → rain.json dùng **mỗi cột 1 repeater dọc riêng** (sinh bằng Python, 10 cột so le). Đừng lồng repeater.

## Triển khai (deploy)
- **Chính: Cloudflare Pages** → **https://cungnhau.pages.dev** . Lệnh (đã đăng nhập wrangler):
  ```
  npx wrangler pages deploy . --project-name=cungnhau --branch=main --commit-dirty=true
  ```
- **Phụ: GitHub Pages** → https://johnong55.github.io/BeTogether/ (repo PUBLIC). Tự deploy khi `git push`, NHƯNG hay bị nghẽn hàng đợi "deployment_queued" → dùng Cloudflare là chính.
- Quy trình: sửa → `git add/commit/push` → `wrangler pages deploy`. `.wrangler/` đã gitignore (chỉ chứa account id, không secret).
- ⚠️ Cloudflare redirect `/index.html`→`/` (308). `manifest.json start_url` và `sw.js` phải trỏ `./` (KHÔNG `./index.html`). SW dùng **network-first**, tăng `CACHE` version mỗi lần đổi shell.

## Cách test (QUAN TRỌNG)
- Preview: `.claude/launch.json` chạy `python -m http.server 4599`. Dùng `preview_start`/`preview_eval`.
- ⚠️ **`preview_screenshot` HAY TREO** khi trang có animation chạy liên tục (lottie/confetti) — kể cả sau `Lot.freeze()`. **Xác minh bằng DOM** qua `preview_eval` (đếm số phần tử SVG, đọc textContent) thay vì ảnh.
- Test không đụng DB thật: giả lập bằng cách gán `S.user/S.space/S.me/S.view` và **stub** `Store.*`, `bumpStreak`, `ensureDaily`, `maybeNotify` bằng bộ nhớ tạm rồi gọi `render()`/`handle(act,v,id,el)`.
- ⚠️ `render()` kiểm tra `S.view==='auth'` TRƯỚC → khi test phải set `S.view` đúng, không thì thấy màn đăng nhập.
- lottie load JSON bất đồng bộ → sau `render()` phải chờ ~500ms mới thấy `<svg>`.

## Sự cố đã xử lý (đừng lặp lại)
- Nút trong popup không chạy: do `onclick="event.stopPropagation()"` chặn event delegation → đã thay bằng `data-act="stop"` + case no-op. Nếu "nút bấm không gọi API", nghi ngờ delegation bị chặn.
- Local mode (không key) khác cloud mode — mọi hàm Store phải làm được cả hai.

## Đặc điểm người dùng
Không rành kỹ thuật. Muốn thấy kết quả chạy thật. Thích chữ nhẹ nhàng ("Rủ đấu", "Biết rồi 💕" thay vì câu gượng). Test trên iPhone (Safari) và Android. Luôn deploy Cloudflare + đưa link + hướng dẫn Ctrl+Shift+R / cài lại app sau khi đổi.
