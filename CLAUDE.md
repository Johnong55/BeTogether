# CLAUDE.md — "cùng nhau" (BeTogether)

> File này Claude Code tự đọc mỗi session. Đọc kỹ trước khi sửa. Người dùng nói **tiếng Việt**, thích tông ấm/dễ thương, emoji, pastel. Trả lời tiếng Việt.

## App là gì
Web nhỏ, riêng tư cho **một cặp đôi** (user & người yêu) học từ vựng và gắn kết. Tên hiển thị: **"cùng nhau"**. Repo GitHub: **BeTogether**.

Tính năng: đăng nhập + ghép đôi 2 người → học từ vựng (chủ đề B2 có sẵn + bộ tự tạo) bằng **thẻ lật** và **trắc nghiệm/trộn chữ** → gửi "bài dò" cho nhau → **giữ chuỗi 🔥** → **đấu trường** thách đấu trực tiếp có cược → **ghi chú/nhắc nhở có ngày** → **câu hỏi mỗi ngày** → **đếm ngày bên nhau**. Cài được như **app (PWA)**. Có **animation Lottie** (tim loading, vương miện thắng, mưa thua).

## Kiến trúc (QUAN TRỌNG)
- **Toàn bộ app nằm trong 1 file `index.html`** (~1360 dòng: CSS + JS thuần, không framework, không build). Render bằng `render()` set `innerHTML`, không có virtual DOM.
- **Backend = Supabase** (gọi trực tiếp từ trình duyệt qua `@supabase/supabase-js@2` CDN). KHÔNG có server Node riêng (user từng nhờ tách backend/frontend rồi ĐỔI Ý — đã xoá; đừng dựng lại).
- **`library.js`**: `window.LIBRARY` = 28 chủ đề, ASCII \u-escaped, trích từ PDF. Topic 1–14 = TỪ VỰNG B2 (~780 từ đơn, pdfplumber); topic 15–28 có `kind:'colloc'` = COLLOCATION TOEIC (500 cụm, PDF Benzen là ảnh scan → đã render ảnh + đọc bằng mắt). File tĩnh, nhúng sẵn (không nằm trong Supabase). Tab Học chia 2 nhóm "Từ vựng B2" / "Collocation TOEIC 🧩", cụm hiện thẻ C1..C14; trộn chữ chỉ ra với từ đơn (regex `/^[a-zA-Z]+$/` sẵn có).
- **`grammar.js`**: `window.GRAMMAR` = dữ liệu NGỮ PHÁP tĩnh, **viết tay & kiểm chuẩn** (KHÔNG sinh bằng AI — kiến thức phải đúng). **19 chủ điểm**: 12 thì (`group:present/past/future`, dùng `formula{aff,neg,ques}` → hiện +/−/?) + 7 cấu trúc (`conditional`×4 loại 0/1/2/3, `passive`, `reported`, `comparison` — dùng `forms:[{l,t}]` nhãn tự do → viewGrammar hiện "Cấu trúc"). Mỗi chủ điểm: `usage[]`, `signals[]`, `examples[{en,vi}]`, `practice[]` (type `conj` = chia động từ điền chỗ trống có `answer`+`alts`; type `mc` = trắc nghiệm `options`+`answer` index; reported dùng chủ yếu `mc`). Thêm chủ điểm mới chỉ cần append vào file (`GRAMMAR_GROUPS` tự hiện nhóm). File tĩnh, UTF-8, không nằm trong Supabase.
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
- **Nhà (home)**: đếm ngày bên nhau, chuỗi/kỷ lục, nhiệm vụ hôm nay, câu hỏi mỗi ngày (thẻ bấm vào), banner nhắc/đấu/cài-app. Thẻ "ngày bên nhau" (`.couple`) là **ly chứa tim** (`HeartTank` — canvas `#heart-tank`, ~44 tim vật lý va chạm, đổ như nước). Chống hỗn loạn: kẹp tốc độ tối đa (`MAXV`), va chạm mềm 2 lượt (nới 25%/lượt), tường triệt tiêu vận tốc đâm vào (không nảy), và cơ chế **"ngủ"** — tim đứng yên ≥16 frame thì đóng băng (`asleep`), chỉ THỨC khi nghiêng máy (đổi hướng trọng lực `gChange>0.04`) hoặc bị đẩy; nhờ đó cầm yên pile đứng im, nghiêng mới slosh (desktop không sensor thì luôn thức → đung đưa nhẹ). Nghiêng máy → lắc theo **`devicemotion.accelerationIncludingGravity`** (đọc thẳng vector trọng lực: `gx=-a.x`, `gy=+a.y` → tim luôn dồn đúng "đáy" thật; KHÔNG dùng `deviceorientation`/gamma vì công thức cũ sai làm phải lật ngược máy mới thấy tim). **Không có nút bật** — iOS tự xin `DeviceMotionEvent.requestPermission` ÂM THẦM ở lần `pointerdown` đầu tiên (`tryEnableHeartMotionOnce`); Android/desktop tự gắn trong `ensure()`; máy phẳng vẫn dồn nhẹ; không sensor → tự đung đưa (fallback khi `now-lastO>1500`). Canvas PHẢI có CSS `width/height:100%` (replaced element, nếu không sẽ hiện to hơn box → tim tràn/lọt); có kẹp biên cuối mỗi frame để tim không lọt ra. `render()` gọi `mountHeartTank()` khi ở home (giữ nguyên `parts` qua re-render), `HeartTank.stop()` khi rời/ẩn tab.
- **Học (library)**: "Bộ từ của mình" (tự tạo: thêm nhanh Enter/dán hàng loạt) + 14 chủ đề B2 có sẵn. Mỗi bộ: **Thẻ lật** (học nhớ) / **Trắc nghiệm** (thi, mix trắc nghiệm + trộn chữ) / Gửi / Rủ đấu. `startStudy(words,{mode:'flash'|'quiz',...})`, `buildQuestions()` dùng HẾT từ (không giới hạn 12). Có chip lọc **Ngữ pháp 📖** + section liệt kê chủ điểm `grammar.js` (nhóm theo `group`); bấm 1 chủ điểm → `S.sub='g:'+id` → `viewGrammar()` (công thức + cách dùng + dấu hiệu + ví dụ) → nút Luyện tập → `startGrammarPractice(id)` set `S.play.mode='grammar'` → `grammarPracticeView` (conj: input `#gr_input`+`check-grammar`; mc: `grammar-mc`; feedback `grFeedback` hiện đáp án + `explain`). `matchAnswer()` chuẩn hoá + quy đổi contractions 2 chiều (`don't`↔`do not`…) nên gõ dạng nào cũng đúng. `finishStudy` dùng chung (grammar `src!=='lesson'` → chỉ `bumpStreak`+`celebrate`).
- **Đấu (arena)**: "Rủ đấu" — chọn bộ + số câu + cược → người kia NHẬN LỜI (cược lại được, cột `stake_acceptor`) mới bắt đầu → cả hai làm **cùng 1 bộ câu hỏi** (sinh 1 lần lưu chung) → thấy tiến độ đối thủ ~trực tiếp → xong hiện thắng(👑)/thua(🥈)/hòa(🤝) + cược + lịch sử. Chữ dùng "Rủ đấu" (KHÔNG dùng "thách đấu" — user thấy gắt). **Nhấn giữ 1 trận trong lịch sử** (`data-longpress="duel-stake"`) → popup `openDuelStakeModal` chi tiết ai cược gì + ai phải làm gì (winStake = `win===challenger?stake:stake_acceptor`, khớp `duelResultView`).
- **Hộp thư (inbox)**: bài dò nhận/gửi. Bài **từ vựng** có Thẻ lật/Trắc nghiệm; bài **ngữ pháp** (gửi từ `viewGrammar` qua `sendGrammar`, `items` = câu luyện có `.type`) nhận diện bằng `isGrammarQuiz(q)` → hiện 1 nút "Luyện tập" (`study-lesson` → `startGrammarPractice(null,{quiz})`), làm xong `finishStudy` đánh dấu answered + điểm (mode `grammar` cũng được tính như `quiz`). KHÔNG cần cột DB mới (dùng lại bảng `quizzes`, items jsonb).
- **Nhắc (notes)**: ghi chú = lời nhắc có ngày (remind_at); chia Quá hạn/Hôm nay/Sắp tới/Không hẹn/Đã xong; chấm đỏ + banner; nút bật thông báo hệ thống (Notification API, chỉ khi mở app).
- **Cài đặt (⚙️)**: mã phòng, mời theo tên, ngày bắt đầu yêu, tên, tông màu, đăng xuất/rời phòng, hướng dẫn cài app.

Streak (`bumpStreak`): học/thi/trả lời câu hỏi xong → chuỗi +1 (1 lần/ngày, no-op nếu đã +hôm nay).

### Câu hỏi mỗi ngày — react & nhắn lại kiểu Messenger (index.html: `dAnswerCard`, `viewDaily`)
- Mỗi câu trả lời là 1 "comment": thẻ của mình chỉ có nút **Sửa**; thẻ người ấy có thanh hành động **🙂 Cảm xúc · 💬 Trả lời** (kiểu FB Thích|Trả lời).
- **Thanh cảm xúc nổi** (`.react-bar`, position absolute, bo 999px, animation `reactPop`): mở bằng nút "Cảm xúc" (`d-react-toggle`) HOẶC long-press 480ms (`pointerdown/up/leave/cancel/scroll`, `data-longpress="daily-react"`). Chọn 1 trong 6 emoji (`REACT_EMOJI`) → lưu + đóng. Bấm lại emoji đang chọn = bỏ (toggle). Bấm ra ngoài (listener click thứ 2, chạy SAU handler chính nên emoji vẫn nhận) → đóng thanh.
- **Ô trả lời viên thuốc** (`.reply-pill` + `.reply-send` icon send): mở bằng nút "Trả lời" (`d-reply-toggle`), Enter hoặc nút gửi để lưu (`d-reply-send`). Hiện lại dưới dạng bong bóng comment (`.reply-quote`).
- State ẩn ở `S.tmp.dReactOpen`/`dReplyOpen` (= who đang mở, mutually exclusive; reset khi `go`). Cột DB: `daily.reaction_a/b`, `reply_a/b` (a/b = câu trả lời CỦA AI được react/nhắn). `saveDailySafe()` fallback bỏ cột mới nếu Supabase chưa chạy SQL (báo toast), không chặn app.
- **Nhật ký ngày trước** (`dailyJournal`, `dayJournalCard`, `journalAnswer`): mỗi ngày đã là 1 dòng `daily` riêng → `Store.listDaily(sid)` (order day desc) nạp qua `loadDailyHistory()` vào `S.dailyHistory`, CHỈ khi `go` tới `daily` (không nằm trong poll 5s để đỡ nặng). View lọc bỏ hôm nay + ngày trống, hiện read-only kèm reaction/reply + avatar. `S.dailyHistory===null` = đang tải.

### Ảnh đại diện (index.html: `avatarEl`, `compressAndSaveAvatar`)
- Lưu **data URL JPEG** trong `spaces.avatar_a/b` (không dùng Supabase Storage). Upload: `chooseAvatar()` mở input file → vẽ canvas **128×128 cover-crop** → `toDataURL('image/jpeg',0.72)` (~1.5KB) → `updateSpace`. Catch lỗi nếu chưa chạy SQL cột avatar.
- `avatarEl(person,size,ring)`: có ảnh → `<div class="ava"><img>`, chưa có → chữ cái đầu tên trên gradient. Dùng ở: Cài đặt (đổi/bỏ ảnh của `S.me`), màn Nhà (2 avatar chồng nhẹ, `ring`), câu hỏi mỗi ngày (bong bóng reply + ô nhập). `.ava` cũ letter-only đã nâng cấp (thêm `img`, `.ring`).

### Tìm kiếm & lọc tab Học (index.html)
- 28 chủ đề (14 vựng + 14 colloc) nên có ô tìm kiếm (`data-filter="lib"`, bỏ dấu qua `noDiacritics()`, gõ "hop dong" vẫn ra "Hợp đồng") + chip lọc nhanh Tất cả/Của mình/Từ vựng/Collocation (`S.tmp.libFilter`).
- `applyLibFilter()` chạy lại sau mỗi `render()` khi ở `view==='library'` không mở topic con, ẩn cả `.lib-sec` rỗng và hiện `#lib-empty` khi không khớp gì.

## AI — Cloudflare Workers AI qua Pages Functions (KHÔNG phải server Node riêng)
- Thư mục **`functions/api/*.js`** = Cloudflare **Pages Functions**, tự thành endpoint trên cùng domain `cungnhau.pages.dev`. `wrangler.toml` khai báo binding `[ai] binding="AI"` → hàm gọi `env.AI.run(MODEL, {...})`. Deploy vẫn `wrangler pages deploy .` (thấy dòng "Uploading Functions bundle").
- 2 endpoint: **`/api/daily-question`** (POST `{recent:[]}` → `{question}`) và **`/api/word-example`** (POST `{en,vi}` → `{example,example_vi,usage}`).
- index.html gọi qua `apiPost(path,body,ms)` (có timeout, ném lỗi để fallback). **Câu hỏi mỗi ngày**: `ensureDaily` thử AI trước, lỗi/chế độ máy → dùng `DAILY_QUESTIONS` cố định (sinh 1 lần/ngày, lưu chung `daily.question`). **Ví dụ từ**: nút "Xin ví dụ (AI)" ở màn thẻ lật (`flashExample`, `aiExampleForCurrent`, cache theo từ trong `S.play.exCache`).
- ⚠️ **Model Workers AI hay bị deprecate** (báo lỗi `5028`). Dùng `npx wrangler ai models` để xem model còn sống rồi đổi hằng `MODEL` trong 2 file. Hiện dùng `@cf/meta/llama-3.3-70b-instruct-fp8-fast`.
- ⚠️ `env.AI.run` có khi trả `response` là **object** (không phải string) → luôn `String(out.response)` / kiểm tra `typeof` trước khi `.trim()`/parse. Endpoint tự parse JSON lỏng lẻo (regex `\{...\}`).
- Preview local (`python http.server`) KHÔNG có `/api` → `apiPost` 404 → fallback êm; muốn test AI thật phải deploy rồi `curl` domain thật.

## Lottie (index.html: `mountLotties`, `initLoading`)
- lottie-web cdnjs 5.12.2. 3 file trong `/lottie/`: **love** (tim đập, loading overlay `#loading`), **crown** (vương miện nảy, khi THẮNG), **rain** (mây+mưa, khi THUA).
- `mountLotties()` chạy cuối `render()`, quét `[data-lottie]:not([data-lottie-done])`. Thắng→confetti, thua→KHÔNG confetti (`celebrate` gated `iWin||tie`).
- ⚠️ **GOTCHA**: repeater Lottie LỒNG NHAU (dọc×ngang) bị nhân sai offset trong lottie-web → rain.json dùng **mỗi cột 1 repeater dọc riêng** (sinh bằng Python, 10 cột so le). Đừng lồng repeater.

## Thông báo đẩy (Web Push) — `push-worker/`
- Nhắc (notes) có `remind_at`(ngày) + `remind_time`(giờ 'HH:MM', không bắt buộc) + `notified_at` (đã đẩy push chưa, chặn gửi lại). Nút "Bật thông báo đẩy" ở tab Nhắc (`enableNotif` trong index.html) xin quyền Notification + đăng ký `PushManager.subscribe` bằng `VAPID_PUBLIC_KEY` (hardcode ở index.html, không nhạy cảm) rồi lưu endpoint/p256dh/auth vào bảng `push_subscriptions` (Supabase). Nếu subscribe lỗi (không hỗ trợ, chưa cài app trên iOS…) vẫn fallback về thông báo "chỉ khi mở app" cũ (`maybeNotify`), không chặn app.
- **`push-worker/`** là 1 **Cloudflare Worker RIÊNG** (không phải Pages Functions của app chính) — chạy cron `* * * * *` = **mỗi 1 phút** (`push-worker/wrangler.toml`; Cloudflare cron là best-effort, có thể lệch 1-2 phút; muốn đúng-giây phải chuyển sang Durable Object Alarm hẹn từng lời nhắc), tự kiểm tra `notes` tới giờ (so `remind_at`+`remind_time` theo giờ VN UTC+7, hardcode `TZ_OFFSET_HOURS=7`) rồi đẩy Web Push tới mọi `push_subscriptions` cùng `space_id` (cả hai người, giống cách `maybeNotify` cũ báo chung cho cả phòng). Gửi xong (hoặc không có ai để gửi) thì set `notified_at` — mỗi lời nhắc chỉ đẩy **1 lần**.
- **`vps-push/`** = **giải pháp thay thế chạy trên VPS người dùng** (vì Cloudflare cron trễ ~10-13 phút). Node 18+, dùng thư viện **`web-push`** (không phải tự mã hoá như push-worker) + Supabase REST, **poll mỗi 20s** (systemd, tự restart). Logic `dueAtMs`/`notified_at` giống push-worker → cột `notified_at` chặn gửi trùng nên chạy song song vẫn an toàn (nhưng README khuyên tắt cron Cloudflare sau khi VPS ổn). Dùng LẠI đúng cặp VAPID cũ: `convert-key.js` chuyển khoá riêng PKCS8 (đang ở Cloudflare) → dạng web-push (raw 32-byte urlsafe, = `jwk.d`) nên KHÔNG phải đổi `VAPID_PUBLIC_KEY` trong index.html, KHÔNG phải đăng ký lại. Đã test round-trip khoá + `generateRequestDetails` bằng web-push thật. Chỉ gọi ra ngoài, không mở cổng vào VPS.
- Tự cài đặt mã hoá **RFC 8291 (aes128gcm) + VAPID (RFC 8292)** bằng Web Crypto (`crypto.subtle`) thuần, KHÔNG dùng thư viện `web-push` (Workers runtime không cần npm install gì thêm). Đã tự kiểm chứng round-trip (mã hoá rồi giải mã lại, ký JWT rồi verify) bằng `preview_eval` trước khi tin dùng — xem lại nếu cần sửa thuật toán, đừng đoán mò vì sai sẽ SILENT FAIL (không báo lỗi rõ ràng, chỉ đơn giản là không có thông báo tới máy).
- **Deploy TÁCH RIÊNG** khỏi app chính (khác lệnh `wrangler pages deploy`):
  ```
  cd push-worker
  wrangler secret put VAPID_PRIVATE_KEY_PKCS8   # dán khoá riêng tư PKCS8 base64 (KHÔNG commit vào repo)
  wrangler deploy
  ```
- ⚠️ Mỗi lần thêm cột/bảng liên quan (`push_subscriptions`, `notes.remind_time`, `notes.notified_at`) → USER PHẢI tự chạy SQL (xem schema.sql phần "Bổ sung cột").
- ⚠️ iOS Safari: chỉ nhận được push nếu đã **cài app vào màn hình chính** (PWA installed), mở tab thường không đủ quyền push.

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
