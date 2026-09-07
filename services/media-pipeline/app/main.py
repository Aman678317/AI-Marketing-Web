"""Media Pipeline — research-driven generation + storage.

  POST /generate  { type: "image"|"video", prompt, title?, platform?, contentId?, brief? }
    brief (optional, from worker /media/research): { palette:["#hex"...], visual_style,
      composition, subject_action, typography, mood, scenes:[{shot,motion,seconds}] }
    image: branded social post (Pillow) driven by the brief's palette/style/action
    video: one segment per brief scene (or Ken Burns fallback), FFmpeg xfade concat
    Artifacts upload to MinIO; a presigned download URL is returned.

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

IMAGE_W, IMAGE_H = 1080, 1350          # 4:5 portrait
VIDEO_W, VIDEO_H = 720, 1280

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


def _hex_rgb(h: str, fallback):
    try:
        h = h.strip().lstrip("#")
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
    except Exception:
        return fallback


def _wrap(text: str, font, max_width: int, max_lines: int = 4):
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


def _action_glyph(draw, kind: str, x: int, y: int, s: int, color):
    """Simple vector 'subject action' glyphs driven by the research brief."""
    k = (kind or "").lower()
    if "arrow" in k or "grow" in k or "rise" in k or "growth" in k:
        draw.line([(x, y + s), (x + s, y)], fill=color, width=int(s * 0.12))
        draw.polygon([(x + s, y - s * 0.18), (x + s * 0.55, y), (x + s, y + s * 0.28)], fill=color)
    elif "rocket" in k or "launch" in k:
        draw.polygon([(x + s * 0.5, y), (x + s * 0.78, y + s * 0.75), (x + s * 0.5, y + s * 0.62),
                      (x + s * 0.22, y + s * 0.75)], fill=color)
        draw.ellipse([x + s * 0.38, y + s * 0.2, x + s * 0.62, y + s * 0.42], fill=(255, 255, 255, 220))
    elif "chart" in k or "bars" in k or "seed" in k:
        for i, h in enumerate((0.35, 0.6, 1.0)):
            draw.rectangle([x + i * s * 0.4, y + s * (1 - h), x + i * s * 0.4 + s * 0.26, y + s], fill=color)
    elif "door" in k or "step" in k or "light" in k:
        draw.rectangle([x, y, x + s * 0.62, y + s], outline=color, width=int(s * 0.08))
        draw.line([(x + s * 0.85, y + s), (x + s * 1.05, y + s * 0.5)], fill=color, width=int(s * 0.07))
    else:
        draw.ellipse([x, y, x + s, y + s], outline=color, width=int(s * 0.09))


def _render_image(prompt, title, platform, brief, scene_idx, out_path):
    palette = [_hex_rgb(c, (16, 163, 127)) for c in (brief.get("palette") or [])] or [(16, 163, 127), (13, 27, 42)]
    while len(palette) < 3:
        palette.append(palette[-1])
    style = (brief.get("visual_style") or "").lower()
    action = brief.get("subject_action") or ""
    composition = (brief.get("composition") or "").lower()

    c1, c2, c3 = palette[0], palette[1], palette[2]
    img = Image.new("RGB", (IMAGE_W, IMAGE_H))
    px = img.load()
    for y in range(IMAGE_H):
        t = y / (IMAGE_H - 1)
        row = tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))
        for x in range(IMAGE_W):
            px[x, y] = row

    shapes = Image.new("RGBA", (IMAGE_W, IMAGE_H), (0, 0, 0, 0))
    d = ImageDraw.Draw(shapes)
    if "minimal" in style:
        d.rectangle([0, IMAGE_H - 12, IMAGE_W, IMAGE_H], fill=c3 + (255,))
    elif "dark" in style or "premium" in style:
        d.ellipse([IMAGE_W * 0.45, IMAGE_H * 0.3, IMAGE_W * 1.15, IMAGE_H * 0.85], fill=c3 + (60,))
    elif "playful" in style or "gradient" in style:
        for i, (cx, cy, r) in enumerate([(IMAGE_W - 260, 120, 260), (140, IMAGE_H - 220, 200), (IMAGE_W - 180, IMAGE_H - 320, 150)]):
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c3 + (46 + i * 16,))
    else:  # bold poster / corporate clean / fallback
        d.ellipse([IMAGE_W - 420, -160, IMAGE_W + 160, 420], fill=c3 + (34,))
        d.rounded_rectangle([72, 300, 140, IMAGE_H - 300], radius=34, fill=c3 + (66,))
    img = Image.alpha_composite(img.convert("RGBA"), shapes).convert("RGB")
    draw = ImageDraw.Draw(img)

    # composition: headline block right-aligned when the brief says so
    right_side = "right" in composition
    margin = 104
    head_x = IMAGE_W * 0.30 if right_side else margin
    max_w = IMAGE_W - head_x - 104

    # eyebrow chip = scene beat (video) or title
    chip_font = _font(34)
    scene = None
    scenes = brief.get("scenes") or []
    if scenes and scene_idx is not None and scene_idx < len(scenes):
        scene = scenes[scene_idx]
        chip = str(scene.get("shot", ""))[:30].upper()
    else:
        chip = (title or platform or "campaign").upper()[:24]
    tw = chip_font.getlength(chip)
    draw.rounded_rectangle([head_x, 150, head_x + tw + 56, 224], radius=37, fill=(255, 255, 255, 235))
    draw.text((head_x + 28, 158), chip, font=chip_font, fill=(13, 27, 42))

    head_font = _font(88)
    lines = _wrap(prompt or title or "Grow your brand every day", head_font, max_w, 4)
    y = IMAGE_H * 0.42
    for line in lines:
        draw.text((head_x, y), line, font=head_font, fill=(255, 255, 255))
        y += 108

    # subject action glyph from the research brief
    if action:
        _action_glyph(draw, action, IMAGE_W - 320, IMAGE_H - 400, 190, c3 + (235,))

    foot_font = _font(30)
    footer = f"AI Marketing Agent · {platform or 'multi-platform'}" + (f" · scene {scene_idx + 1}" if scene_idx is not None and scene else "")
    draw.text((margin, IMAGE_H - 120), footer, font=foot_font, fill=(235, 240, 245))

    img.save(out_path, "PNG")
    return {"width": IMAGE_W, "height": IMAGE_H}


def _render_video_segments(images, out_path, motion_fade=True):
    """Concat scene images into one MP4 with crossfades."""
    ffmpeg = _find_ffmpeg()
    if not ffmpeg:
        raise RuntimeError("ffmpeg not found — set FFMPEG_PATH or install ffmpeg")
    seg_secs = 1.8
    segs = []
    for i, img_path in enumerate(images):
        seg = out_path.replace(".mp4", f"_s{i}.mp4")
        frames = int(seg_secs * 25)
        vf = (
            f"scale={IMAGE_W}:{IMAGE_H},"
            f"zoompan=z='min(zoom+0.0013,1.14)':d={frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={VIDEO_W}x{VIDEO_H}:fps=25"
            + (f",fade=t=in:st=0:d=0.35" if i > 0 else "")
        )
        cmd = [ffmpeg, "-y", "-loop", "1", "-i", img_path, "-vf", vf, "-t", str(seg_secs),
               "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", seg]
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
        if proc.returncode != 0:
            raise RuntimeError(f"segment {i} failed: {proc.stderr[-300:]}")
        segs.append(seg)

    if len(segs) == 1:
        shutil.copyfile(segs[0], out_path)
        return {"scenes": 1, "duration_secs": seg_secs, "generator": "ffmpeg-zoompan"}

    # xfade chain
    inputs = []
    for s in segs:
        inputs += ["-i", s]
    offset, filters, prev = seg_secs - 0.4, [], "[0:v]"
    for i in range(1, len(segs)):
        out = f"[v{i}]" if i < len(segs) - 1 else "[v]"
        filters.append(f"{prev}[{i}:v]xfade=transition=fade:duration=0.4:offset={offset:.2f}{out}")
        prev = out
        offset += seg_secs - 0.4
    cmd = [ffmpeg, "-y", *inputs, "-filter_complex", ";".join(filters), "-map", "[v]",
           "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out_path]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=240)
    if proc.returncode != 0:
        raise RuntimeError(f"concat failed: {proc.stderr[-300:]}")
    total = seg_secs + (len(segs) - 1) * (seg_secs - 0.4)
    return {"scenes": len(segs), "duration_secs": round(total, 2), "generator": "ffmpeg-scene-xfade"}


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
    brief = req.get("brief") if isinstance(req.get("brief"), dict) else {}

    if req_type not in ("image", "video"):
        return JSONResponse(status_code=400, content={"error": "type must be 'image' or 'video'"})

    run_id = uuid.uuid4().hex[:10]
    with tempfile.TemporaryDirectory() as td:
        try:
            if req_type == "image":
                local = os.path.join(td, "post.png")
                meta = _render_image(prompt, title, platform, brief, None, local)
                meta["generator"] = "local-pillow-brief" if brief else "local-pillow-branded"
                key = f"content/{content_id}/image_{run_id}.png"
                mime = "image/png"
            else:
                scenes = [s for s in (brief.get("scenes") or []) if isinstance(s, dict)][:3]
                images = []
                for i in range(max(1, len(scenes)) if scenes else 1):
                    shot_prompt = str(scenes[i].get("shot", prompt)) if scenes else prompt
                    scene_brief = dict(brief)
                    p = os.path.join(td, f"scene_{i}.png")
                    _render_image(shot_prompt or prompt, title, platform, scene_brief, i if scenes else None, p)
                    images.append(p)
                local = os.path.join(td, "post.mp4")
                meta = _render_video_segments(images, local)
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
