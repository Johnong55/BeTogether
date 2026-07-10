-- ============================================================
--  CÙNG NHAU — Cấu trúc cơ sở dữ liệu cho Supabase
--  Mở Supabase → SQL Editor → dán toàn bộ file này → Run.
--  (Chạy lại được nhiều lần, an toàn cho dữ liệu cũ.)
-- ============================================================

-- Tài khoản (mỗi người một dòng)
create table if not exists users (
  username    text primary key,
  display     text,
  passcode    text,                       -- PIN đã được băm nhẹ (không phải bảo mật cao)
  space_id    text,
  person      text,                        -- 'a' hoặc 'b'
  created_at  timestamptz default now()
);

-- Không gian của hai người
create table if not exists spaces (
  id                text primary key,      -- mã phòng (vd: ab12-cd34)
  name              text,
  person_a          text,
  person_b          text,
  person_a_username text,
  person_b_username text,
  theme             text default 'blush',
  start_date        date,                  -- ngày bắt đầu yêu (đếm ngày bên nhau)
  streak            int  default 0,
  longest           int  default 0,
  last_active       date,
  created_at        timestamptz default now()
);

-- Lời mời ghép đôi
create table if not exists invites (
  id           text primary key,
  space_id     text,
  from_display text,
  from_username text,
  to_username  text,
  status       text default 'pending',     -- pending | accepted | declined
  created_at   timestamptz default now()
);

-- Bộ thẻ
create table if not exists decks (
  id          text primary key,
  space_id    text references spaces(id) on delete cascade,
  name        text,
  lang        text,
  color       text,
  created_at  timestamptz default now()
);

-- Thẻ
create table if not exists cards (
  id          text primary key,
  space_id    text references spaces(id) on delete cascade,
  deck_id     text references decks(id)  on delete cascade,
  front       text,
  back        text,
  example     text,
  created_by  text,
  created_at  timestamptz default now()
);

-- Bài dò
create table if not exists quizzes (
  id          text primary key,
  space_id    text references spaces(id) on delete cascade,
  from_person text,
  to_person   text,
  title       text,
  message     text,
  status      text default 'pending',      -- pending | picked | answered
  items       jsonb,
  score       int default 0,
  total       int default 0,
  created_at  timestamptz default now(),
  picked_at   timestamptz,
  answered_at timestamptz
);

-- Ghi chú chung
create table if not exists notes (
  id          text primary key,
  space_id    text references spaces(id) on delete cascade,
  author      text,                        -- 'a' | 'b'
  author_name text,
  text        text,
  color       text,
  remind_at   date,                         -- ngày nhắc (lời nhắc); null = ghi chú thường
  remind_time text,                         -- giờ nhắc cụ thể 'HH:MM' (giờ Việt Nam), null = mặc định đầu ngày
  notified_at timestamptz,                  -- lúc đã đẩy push cho lời nhắc này (chặn gửi lại)
  done        boolean default false,        -- đã xong chưa
  created_at  timestamptz default now()
);

-- Thuê bao nhận thông báo đẩy (Web Push) — mỗi máy/thiết bị đã bật thông báo là 1 dòng
create table if not exists push_subscriptions (
  id          text primary key,
  space_id    text references spaces(id) on delete cascade,
  person      text,                        -- 'a' | 'b'
  endpoint    text unique,
  p256dh      text,
  auth        text,
  created_at  timestamptz default now()
);

-- Trận thách đấu (hai người làm cùng một bộ câu hỏi)
create table if not exists duels (
  id          text primary key,
  space_id    text references spaces(id) on delete cascade,
  challenger  text,                        -- 'a' | 'b' (người thách)
  status      text default 'waiting',      -- waiting | active | done | cancelled
  stake       text,                        -- lời cược của người rủ (nếu người rủ thắng, người kia phải làm)
  stake_acceptor text,                     -- lời cược của người nhận lời (nếu người nhận thắng)
  title       text,
  questions   jsonb,                       -- bộ câu hỏi chung (y chang cho cả hai)
  score_a     int default 0,
  score_b     int default 0,
  progress_a  int default 0,
  progress_b  int default 0,
  done_a      boolean default false,
  done_b      boolean default false,
  created_at  timestamptz default now(),
  joined_at   timestamptz,
  finished_at timestamptz
);

-- Câu hỏi mỗi ngày
create table if not exists daily (
  id          text primary key,
  space_id    text references spaces(id) on delete cascade,
  day         date,
  question    text,
  answer_a    text,
  answer_b    text,
  reaction_a  text,      -- emoji người B thả cho câu trả lời của A
  reaction_b  text,      -- emoji người A thả cho câu trả lời của B
  reply_a     text,      -- lời nhắn người B viết cho câu trả lời của A
  reply_b     text,      -- lời nhắn người A viết cho câu trả lời của B
  unique (space_id, day)
);

-- Bổ sung cột nếu bảng đã tồn tại từ phiên bản cũ
alter table spaces add column if not exists person_a_username text;
alter table spaces add column if not exists person_b_username text;
alter table spaces add column if not exists start_date date;
alter table notes  add column if not exists remind_at date;
alter table notes  add column if not exists done boolean default false;
alter table duels  add column if not exists stake_acceptor text;
alter table daily  add column if not exists reaction_a text;
alter table daily  add column if not exists reaction_b text;
alter table daily  add column if not exists reply_a text;
alter table daily  add column if not exists reply_b text;
alter table spaces add column if not exists avatar_a text;   -- ảnh đại diện người A (JPEG nén dạng data URL)
alter table spaces add column if not exists avatar_b text;   -- ảnh đại diện người B
alter table quizzes add column if not exists progress jsonb; -- tiến độ đang làm dở (thoát ra vào lại không mất)
alter table notes   add column if not exists remind_time text;
alter table notes   add column if not exists notified_at timestamptz;
alter table spaces  add column if not exists learned_a jsonb default '[]'::jsonb; -- chủ đề/bộ người A đã đánh dấu "đã học" (mảng key: t:<no> hoặc d:<deckId>)
alter table spaces  add column if not exists learned_b jsonb default '[]'::jsonb; -- tương tự cho người B

-- Cache ví dụ AI theo TỪ (toàn cục, không theo phòng) để khỏi gọi AI lại tốn token
create table if not exists word_examples (
  word         text primary key,   -- từ/cụm tiếng Anh, viết thường
  vi           text,               -- nghĩa tiếng Việt tham chiếu
  example      text,
  example_vi   text,
  usage        text,
  meaning_note text,
  created_at   timestamptz default now()
);

-- ============================================================
--  QUYỀN TRUY CẬP (RLS)
--  Web riêng tư cho hai người: truy cập bằng anon key, bảo vệ
--  bằng MÃ PHÒNG khó đoán. Đừng lưu thông tin nhạy cảm ở đây.
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['users','spaces','invites','decks','cards','quizzes','notes','daily','duels','push_subscriptions','word_examples'] loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "allow all" on %I;', t);
    execute format('create policy "allow all" on %I for all using (true) with check (true);', t);
  end loop;
end $$;
