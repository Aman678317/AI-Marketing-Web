"""Media Pipeline — real generation + storage.

  POST /generate  { type: "image"|"video", prompt, title?, platform?, contentId? }
    image: programmatic branded social post (Pillow) — local-first, no paid API
    video: FFmpeg animated MP4 (Ken Burns zoom + fade) rendered from the image
    Both artifacts are uploaded to MinIO and a presigned download URL is returned.

  GET /health     ffmpeg + MinIO availability
"""

import glob
import hashlib
import os
import shutil
import subprocess
import tempfile
import uuid
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from PIL import Image, ImageDraw, ImageFont

from app.storage import BUCKET, ensure_bucket, object_stats, upload_file

load_dotenv(Path(__file__).resolve().parents[3] / ".env")
load_dotenv()

app = FastAPI(title="Media Pipeline")

IMAGE_W, IMAGE_H = 1080, 1350          # 4:5 portrait — Instagram-friendly
VIDEO_W, VIDEO_H, VIDEO_SECS = 720, 1280, 5

PALETTES = {
    "instagram": [(255, 126, 103), (142, 84, 233)],
    "facebook": [(24, 119, 242), (10, 42, 90)],
    "youtube": [(255, 82, 82), (90, 10, 20)],
    "linkedin": [(10, 102, 194), (6, 38, 76)],
    "meta": [(24, 119, 242), (142, 84, 233)],
}
DEFAULT_PALETTE = [(16, 163, 127), (13, 27, 42)]

FONT_CANDIDATES = [
    "C:/Windows/Fonts/arialbd.ttf",
    "C:/Windows/Fonts/arial.ttf",
    "C:/Windows/Fonts/segoeuib.ttf",
]


def _font(size: int):
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def _find_ffmpeg() -> str:
    explicit = os.getenv("FFMPEG_PATH")
    if explicit and os.path.exists(explicit):
        return explicit
    which = shutil.which("ffmpeg")
    if which:
        return which
    tools = Path.home() / "claude-skills-pdf" / "output" / "ffmpeg-tools"
    for hit in glob.glob(str(tools / "**" / "ffmpeg.exe"), recursive=True):
        return hit
    return ""


def _wrap(text: str, font, max_width: int, max_lines: int = 4) -> list:
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if font.getlength(trial) <= max_width:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
        if len(lines) >= max_lines:
            break
    if cur and len(lines) < max_lines:
        lines.append(cur)
    return lines or ["Your Brand Story"]


def _generate_image(prompt: str, platform: str, title: str, out_path: str) -> dict:
    """Programmatic branded social post — deterministic, local, zero-cost."""
    c1, c2 = PALETTES.get(platform.lower(), DEFAULT_PALETTE)
    img = Image.new("RGB", (IMAGE_W, IMAGE_H))
    px = img.load()
    for y in range(IMAGE_H):
        t = y / (IMAGE_H - 1)
        row = tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))
        for x in range(IMAGE_W):
            px[x, y] = row

    # soft geometric accents
    shapes = Image.new("RGBA", (IMAGE_W, IMAGE_H), (0, 0, 0, 0))
    d = ImageDraw.Draw(shapes)
    d.ellipse([IMAGE_W - 420, -160, IMAGE_W + 160, 420], fill=(255, 255, 255, 28))
    d.ellipse([-180, IMAGE_H - 460, 320, IMAGE_H + 120], fill=(255, 255, 255, 22))
    d.rounded_rectangle([72, 300, 140, IMAGE_H - 300], radius=34, fill=(255, 255, 255, 46))
    img = Image.alpha_composite(img.convert("RGBA"), shapes).convert("RGB")

    draw = ImageDraw.Draw(img)

    # eyebrow chip
    chip_font = _font(34)
    chip = (title or platform or "campaign").upper()[:24]
    tw = chip_font.getlength(chip)
    draw.rounded_rectangle([104, 150, 104 + tw + 56, 224], radius=37, fill=(255, 255, 255, 235))
    draw.text((104 + 28, 158), chip, font=chip_font, fill=(13, 27, 42))

    # headline from the prompt
    head_font = _font(88)
    lines = _wrap(prompt or title or "Grow your brand every day", head_font, IMAGE_W - 208, 4)
    y = IMAGE_H * 0.42
    for line in lines:
        draw.text((104, y), line, font=head_font, fill=(255, 255, 255))
        y += 108

    # footer
    foot_font = _font(30)
    draw.text((104, IMAGE_H - 120), f"AI Marketing Agent · {platform or 'multi-platform'}",
              font=foot_font, fill=(235, 240, 245))

    img.save(out_path, "PNG")
    return {"width": IMAGE_W, "height": IMAGE_H, "generator": "local-pillow-branded"}


def _generate_video(image_path: str, out_path: str) -> dict:
    ffmpeg = _find_ffmpeg()
    if not ffmpeg:
        raise RuntimeError("ffmpeg not found — set FFMPEG_PATH or install ffmpeg")
    frames = VIDEO_SECS * 25
    vf = (
        f"scale={IMAGE_W}:{IMAGE_H},"
        f"zoompan=z='min(zoom+0.0013,1.16)':d={frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={VIDEO_W}x{VIDEO_H}:fps=25,"
        f"fade=t=in:st=0:d=0.5,fade=t=out:st={VIDEO_SECS - 0.5}:d=0.5"
    )
    cmd = [
        ffmpeg, "-y", "-loop", "1", "-i", image_path,
        "-vf", vf, "-t", str(VIDEO_SECS),
        "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        out_path,
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {proc.stderr[-400:]}")
    return {"width": VIDEO_W, "height": VIDEO_H, "duration_secs": VIDEO_SECS, "generator": "ffmpeg-zoompan"}


@app.get("/health")
def health():
    ffmpeg = _find_ffmpeg()
    minio_ok = False
    try:
        ensure_bucket()
        minio_ok = True
    except Exception:
        pass
    return {
        "status": "ok",
        "service": "media-pipeline",
        "ffmpeg": {"found": bool(ffmpeg), "path": ffmpeg or None},
        "minio": {"reachable": minio_ok, "bucket": BUCKET},
    }


@app.post("/generate")
def generate(req: dict):
    req_type = (req.get("type") or "").lower()
    prompt = (req.get("prompt") or "").strip() or "Grow your brand with daily stories"
    title = (req.get("title") or "").strip()
    platform = (req.get("platform") or "").lower()
    content_id = (req.get("contentId") or "adhoc").replace("/", "_")

    if req_type not in ("image", "video"):
        return JSONResponse(status_code=400, content={"error": "type must be 'image' or 'video'"})

    run_id = uuid.uuid4().hex[:10]
    with tempfile.TemporaryDirectory() as td:
        try:
            if req_type == "image":
                local = os.path.join(td, "post.png")
                meta = _generate_image(prompt, platform, title, local)
                key = f"content/{content_id}/image_{run_id}.png"
                mime = "image/png"
            else:
                img_local = os.path.join(td, "frame.png")
                _generate_image(prompt, platform, title, img_local)
                local = os.path.join(td, "post.mp4")
                meta = _generate_video(img_local, local)
                key = f"content/{content_id}/video_{run_id}.mp4"
                mime = "video/mp4"

            size = os.path.getsize(local)
            sha = hashlib.sha256(open(local, "rb").read()).hexdigest()
            stored = upload_file(local, key)

            return {
                "ok": True,
                "type": req_type,
                "url": stored["url"],
                "bucket": stored["bucket"],
                "key": stored["key"],
                "size_bytes": size,
                "sha256": sha[:16],
                "content_type": mime,
                "meta": meta,
            }
        except Exception as exc:
            return JSONResponse(status_code=500, content={"error": str(exc)[:400]})


@app.get("/artifact")
def artifact(key: str, bucket: str = BUCKET):
    try:
        return {"ok": True, **object_stats(key, bucket)}
    except Exception as exc:
        return JSONResponse(status_code=404, content={"error": str(exc)[:200]})
