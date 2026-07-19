"""
vps-crawl — Backend crawl + xử lý AI cho "cùng nhau", chạy trên VPS.

Luồng: Admin (trang web) gọi POST /crawl  ->  crawl4ai lấy nội dung sạch trang web
       ->  gọi Cloudflare Pages Function /api/extract-lesson (Workers AI) để trích
           từ vựng + tóm tắt  ->  ghi vào Supabase (library_topics / library_words)
           dưới dạng NHÁP (draft) để admin duyệt.

VPS chỉ gọi RA ngoài (Supabase REST + Pages Function). Không giữ token AI (AI chạy ở
Cloudflare). Bảo vệ bằng header X-API-Key (khoá chung, để trong .env) + CORS allowlist.

Chạy:  uvicorn main:app --host 127.0.0.1 --port 8080
Đưa ra HTTPS bằng Cloudflare Tunnel (khuyến nghị) hoặc reverse proxy có TLS. Xem README.
"""
import os, time, secrets, re
from typing import Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_KEY = os.environ["SUPABASE_KEY"]            # anon publishable key là đủ (RLS allow-all)
CRAWL_API_KEY = os.environ["CRAWL_API_KEY"]          # khoá chung với admin.html (CRAWL_API_KEY)
PAGES_BASE = os.environ.get("PAGES_BASE", "https://cungnhau.pages.dev").rstrip("/")
ALLOW_ORIGINS = [o.strip() for o in os.environ.get(
    "ALLOW_ORIGINS", "https://cungnhau.pages.dev,https://johnong55.github.io").split(",") if o.strip()]
MAX_CHARS = int(os.environ.get("MAX_CHARS", "12000"))

app = FastAPI(title="cùng nhau · crawl backend")
app.add_middleware(
    CORSMiddleware, allow_origins=ALLOW_ORIGINS, allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"], allow_credentials=False,
)


def gen_id() -> str:
    return format(int(time.time() * 1000), "x") + secrets.token_hex(3)


def sb_headers():
    return {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json", "Prefer": "return=minimal"}


class CrawlReq(BaseModel):
    url: str
    mode: str = "both"          # 'vocab' | 'summary' | 'both'
    title: Optional[str] = None
    status: str = "draft"       # 'draft' (chờ duyệt) | 'published'
    max_words: int = 20


async def fetch_markdown(url: str) -> tuple[str, str]:
    """Trả về (text, title) từ crawl4ai. Lỗi -> HTTPException."""
    from crawl4ai import AsyncWebCrawler  # import trễ để service vẫn khởi động nếu chưa cài xong
    async with AsyncWebCrawler() as crawler:
        result = await crawler.arun(url=url)
    if not getattr(result, "success", True):
        raise HTTPException(502, f"Crawl thất bại: {getattr(result, 'error_message', 'unknown')}")
    md = getattr(result, "markdown", "") or ""
    # crawl4ai mới: result.markdown là object có fit_markdown / raw_markdown
    text = ""
    for attr in ("fit_markdown", "raw_markdown"):
        v = getattr(md, attr, None)
        if v:
            text = v
            break
    if not text:
        text = str(md)
    title = ""
    meta = getattr(result, "metadata", None) or {}
    if isinstance(meta, dict):
        title = (meta.get("title") or "").strip()
    return text.strip(), title


async def extract_lesson(client: httpx.AsyncClient, text: str, mode: str, title: str, url: str, max_words: int):
    r = await client.post(f"{PAGES_BASE}/api/extract-lesson",
                          json={"text": text[:MAX_CHARS], "mode": mode, "title": title, "url": url, "max_words": max_words},
                          timeout=90)
    r.raise_for_status()
    return r.json()


@app.get("/health")
async def health():
    return {"ok": True, "pages": PAGES_BASE, "origins": ALLOW_ORIGINS}


@app.post("/crawl")
async def crawl(req: CrawlReq, x_api_key: str = Header(default="")):
    if not secrets.compare_digest(x_api_key, CRAWL_API_KEY):
        raise HTTPException(401, "Sai hoặc thiếu X-API-Key")
    if not re.match(r"^https?://", req.url):
        raise HTTPException(400, "url phải bắt đầu bằng http:// hoặc https://")
    mode = req.mode if req.mode in ("vocab", "summary", "both") else "both"

    text, page_title = await fetch_markdown(req.url)
    if len(text) < 40:
        raise HTTPException(422, "Không lấy được nội dung đủ dài từ trang này")

    title = (req.title or "").strip() or page_title

    async with httpx.AsyncClient() as client:
        data = await extract_lesson(client, text, mode, title, req.url, req.max_words)
        words = data.get("words") or []
        summary = (data.get("summary") or "").strip()
        title = (title or data.get("title") or req.url)[:120]

        topic_id = gen_id()
        topic = {
            "id": topic_id, "title": title, "kind": "vocab", "source": "crawl",
            "status": req.status if req.status in ("draft", "published") else "draft",
            "source_url": req.url, "summary": summary or None, "created_by": "crawl",
        }
        rt = await client.post(f"{SUPABASE_URL}/rest/v1/library_topics",
                               headers=sb_headers(), json=topic, timeout=30)
        if rt.status_code >= 300:
            raise HTTPException(500, f"Lỗi tạo chủ đề Supabase: {rt.status_code} {rt.text}")

        rows = []
        for i, w in enumerate(words):
            front = (w.get("front") or "").strip()
            if not front:
                continue
            rows.append({"id": gen_id(), "topic_id": topic_id, "front": front,
                         "back": (w.get("back") or "").strip(), "example": (w.get("example") or "").strip() or None,
                         "pos": i})
        if rows:
            rw = await client.post(f"{SUPABASE_URL}/rest/v1/library_words",
                                   headers=sb_headers(), json=rows, timeout=30)
            if rw.status_code >= 300:
                raise HTTPException(500, f"Lỗi thêm từ Supabase: {rw.status_code} {rw.text}")

    return {"ok": True, "topic_id": topic_id, "title": title,
            "word_count": len(rows), "summary": summary, "url": req.url}
