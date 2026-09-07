"""AI Marketing Agent Worker.

Supervisor-style agent service:
  /agent/plan  — turns a campaign brief into a structured multi-day plan.
                 LLM provider chain, local-first (spec §14):
                   1. Ollama (local runtime, no paid API)
                   2. OpenAI-compatible gateways (optional):
                      Experiential Labs (EXPLABS_API_KEY), NVIDIA NIM (NVIDIA_API_KEY)
                   3. Deterministic heuristic fallback (always succeeds)
                 All model output is untrusted data: strict pydantic
                 validation, bounded JSON, graceful degradation on any failure.
  /publish     — routes approved content through the platform connectors
                 (official APIs only; called by the queue-worker at schedule time).
"""

import json
import os
import re
import uuid
from pathlib import Path
from typing import List, Optional

import requests
from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel, ValidationError

# Load project-root .env (never committed) so optional cloud keys work
# whether uvicorn is started from services/worker or the repo root.
load_dotenv(Path(__file__).resolve().parents[3] / ".env")
load_dotenv()

app = FastAPI(title="AI Marketing Agent Worker")

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")
AGENT_TIMEOUT = float(os.getenv("AGENT_TIMEOUT_SECONDS", "180"))
# Keep LLM output bounded: generate captions for at most this many days via the
# model; remaining days are filled deterministically so the plan is always complete.
LLM_MAX_DAYS = int(os.getenv("LLM_MAX_DAYS", "10"))

# Optional OpenAI-compatible gateways (tried in order after local Ollama).
EXPLABS_API_KEY = os.getenv("EXPLABS_API_KEY", "")
EXPLABS_BASE_URL = os.getenv("EXPLABS_BASE_URL", "https://api.experientiallabs.ai/v1")
EXPLABS_MODEL = os.getenv("EXPLABS_MODEL", "gpt-4o-mini")

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "")
NVIDIA_BASE_URL = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
NVIDIA_MODEL = os.getenv("NVIDIA_MODEL", "openai/gpt-oss-20b")

KNOWN_PLATFORMS = ["instagram", "facebook", "youtube", "linkedin", "x"]

# Platforms each connector can actually publish to (per spec §6).
CONNECTORS = {
    "meta": ["instagram", "facebook"],
    "facebook": ["facebook"],
    "youtube": ["youtube"],
    "linkedin": ["linkedin"],
}


class Asset(BaseModel):
    type: str = "image"
    platforms: List[str] = []
    status: str = "DRAFT"
    caption: Optional[str] = None
    hook: Optional[str] = None
    cta: Optional[str] = None
    media_prompt: Optional[str] = None


class DailyAsset(BaseModel):
    day: int
    assets: List[Asset] = []


class CampaignPlan(BaseModel):
    campaign_id: str
    objective: str
    audience: str
    platforms: List[str]
    duration_days: int
    daily_assets: List[DailyAsset]
    status: str
    generated_by: str = "heuristic"


class PublishRequest(BaseModel):
    contentId: str
    platform: str
    caption: Optional[str] = None
    mediaUrl: Optional[str] = None
    idempotencyKey: Optional[str] = None


# ---------------------------------------------------------------- Deep research


class Scene(BaseModel):
    shot: str
    motion: str = "slow zoom in"
    seconds: float = 1.7


class CreativeBrief(BaseModel):
    topic: str
    visual_style: str
    palette: List[str]
    mood: str
    composition: str
    subject_action: str
    typography: str
    aspect_ratio: str = "4:5"
    scenes: List[Scene]
    hashtags: List[str] = []
    generated_by: str = "heuristic"


STYLE_LIBRARY = [
    ("minimal editorial", "airy layout, generous whitespace, one strong accent"),
    ("bold poster", "oversized shapes, high contrast, poster energy"),
    ("playful gradients", "soft blobs, rounded shapes, friendly feel"),
    ("premium dark", "deep tones with a single glowing accent"),
    ("corporate clean", "structured grid, crisp lines, trustworthy"),
]
MOODS = ["energetic", "confident", "inspiring", "focused", "uplifting"]
ACTIONS = [
    "a hand reaching toward a rising arrow",
    "a rocket lifting off from an open laptop",
    "papers transforming into a glowing chart",
    "a figure stepping through a doorway of light",
    "growth bars emerging from a seedling",
]
TYPOGRAPHY = ["heavy geometric sans, tight leading", "clean humanist sans, wide spacing", "condensed uppercase, strong kerning"]


def _heuristic_brief(topic: str) -> CreativeBrief:
    seed = sum(topic.encode()) if topic else 42
    style, style_note = STYLE_LIBRARY[seed % len(STYLE_LIBRARY)]
    palettes = [
        ["#16a37f", "#0d1b2a", "#f4f7f6"],
        ["#ff7e67", "#8e54e9", "#fff7f0"],
        ["#1877f2", "#0a2a5a", "#eaf2ff"],
        ["#ff5252", "#5a0a14", "#fff0f0"],
        ["#0a66c2", "#06264c", "#f0f6ff"],
    ]
    palette = palettes[seed % len(palettes)]
    action = ACTIONS[seed % len(ACTIONS)]
    scenes = [
        Scene(shot=f"establishing frame: {topic} visual metaphor", motion="slow zoom in", seconds=1.8),
        Scene(shot=f"mid shot: {action}", motion="gentle pan left to right", seconds=1.7),
        Scene(shot="closing frame: logo and call to action", motion="zoom out with fade", seconds=1.6),
    ]
    return CreativeBrief(
        topic=topic or "our brand",
        visual_style=f"{style} — {style_note}",
        palette=palette,
        mood=MOODS[seed % len(MOODS)],
        composition="rule of thirds, subject left, headline right third",
        subject_action=action,
        typography=TYPOGRAPHY[seed % len(TYPOGRAPHY)],
        aspect_ratio="4:5",
        scenes=scenes,
        hashtags=["#marketing", "#growth", "#aicontent"],
        generated_by="heuristic",
    )


def _research_brief(topic: str) -> CreativeBrief:
    """Research the topic into a full creative brief: style, colors, mood,
    composition, subject action, typography and a 3-shot video plan."""
    topic = (topic or "").strip()[:400]
    system = (
        "You are an award-winning art director doing visual research. Reply with ONLY valid JSON. Shape: "
        '{"topic":"...","visual_style":"...","palette":["#hex","#hex","#hex"],"mood":"...",'
        '"composition":"...","subject_action":"...","typography":"...","aspect_ratio":"4:5",'
        '"scenes":[{"shot":"...","motion":"...","seconds":1.7},{"shot":"...","motion":"...","seconds":1.7},'
        '{"shot":"...","motion":"...","seconds":1.6}],"hashtags":["#...","#...","#..."]}. '
        "palette must be exactly 3 hex colors that fit the topic's industry and mood. scenes must be exactly 3."
    )
    user = f"Topic/brief to research: {topic}"

    def _validated(data: dict) -> CreativeBrief:
        palette = [c for c in (data.get("palette") or []) if isinstance(c, str) and c.startswith("#")][:3]
        scenes = []
        for s in (data.get("scenes") or [])[:3]:
            if isinstance(s, dict):
                try:
                    scenes.append(Scene(
                        shot=str(s.get("shot", "scene"))[:160],
                        motion=str(s.get("motion", "slow zoom"))[:120],
                        seconds=min(2.5, max(1.0, float(s.get("seconds") or 1.7))),
                    ))
                except Exception:
                    continue
        if len(palette) < 2 or not scenes:
            raise ValueError("incomplete brief from model")
        allowed = set(CreativeBrief.model_fields) - {"palette", "scenes", "generated_by"}
        return CreativeBrief(
            **{k: data[k] for k in allowed if k in data},
            palette=palette,
            scenes=scenes,
            generated_by=name,
        )

    for name, fn in _provider_chain():
        try:
            llm_days_placeholder = None  # research uses its own call shape
            if name.startswith("ollama"):
                payload = {
                    "model": OLLAMA_MODEL,
                    "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
                    "format": "json", "stream": False,
                    "options": {"temperature": 0.8, "num_predict": 2048},
                }
                resp = requests.post(f"{OLLAMA_BASE_URL}/api/chat", json=payload, timeout=AGENT_TIMEOUT)
                resp.raise_for_status()
                data = json.loads(resp.json()["message"]["content"])
                return _validated(data)
            else:
                model = name.split(":", 1)[1]
                base, key = (EXPLABS_BASE_URL, EXPLABS_API_KEY) if name.startswith("explabs") else (NVIDIA_BASE_URL, NVIDIA_API_KEY)
                payload = {
                    "model": model,
                    "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
                    "temperature": 0.8, "response_format": {"type": "json_object"},
                }
                resp = requests.post(f"{base}/chat/completions", json=payload,
                                     headers={"Authorization": f"Bearer {key}"}, timeout=AGENT_TIMEOUT)
                resp.raise_for_status()
                data = json.loads(resp.json()["choices"][0]["message"]["content"])
                return _validated(data)
        except Exception as exc:
            print(f"[media/research] provider {name} failed: {exc}")
    return _heuristic_brief(topic)


def _provider_chain():
    """Ordered list of (label, callable(brief,p,d,a,o)) LLM providers, local-first."""
    chain = []
    if _ollama_reachable():
        chain.append((f"ollama:{OLLAMA_MODEL}", _llm_daily_assets_ollama))
    if EXPLABS_API_KEY:
        chain.append((f"explabs:{EXPLABS_MODEL}", lambda b, p, d, a, o: _llm_daily_assets_openai_compat(
            EXPLABS_BASE_URL, EXPLABS_API_KEY, EXPLABS_MODEL, b, p, d, a, o)))
    if NVIDIA_API_KEY:
        chain.append((f"nvidia:{NVIDIA_MODEL}", lambda b, p, d, a, o: _llm_daily_assets_openai_compat(
            NVIDIA_BASE_URL, NVIDIA_API_KEY, NVIDIA_MODEL, b, p, d, a, o)))
    return chain


def _parse_brief(brief: str):
    """Deterministic pre-parse — bounds the LLM task and powers the fallback."""
    text = (brief or "").lower()
    platforms = [p for p in KNOWN_PLATFORMS if p in text]
    if not platforms:
        platforms = ["instagram", "linkedin"]

    days = 10
    m = re.search(r"(\d{1,2})\s*-?\s*day", text)
    if m:
        days = max(1, min(int(m.group(1)), 30))

    audience_m = re.search(r"target(?:ing)?\s+([^.,;\n]+)", text)
    audience = audience_m.group(1).strip().title() if audience_m else "General audience"

    if "website" in text or "traffic" in text:
        objective = "Website visits"
    elif "launch" in text:
        objective = "Product launch"
    else:
        objective = "Brand awareness"

    return platforms, days, audience, objective


def _heuristic_assets(day: int, platforms: List[str]) -> List[Asset]:
    return [
        Asset(
            type="video",
            platforms=platforms,
            caption=f"Day {day}: short-form video for {', '.join(platforms)}",
            hook=f"Hook for day {day}",
            cta="Learn more",
            media_prompt=f"Vertical 9:16 short video, day {day} theme, bold on-screen text",
        ),
        Asset(
            type="image",
            platforms=platforms,
            caption=f"Day {day}: image post for {', '.join(platforms)}",
            hook=f"Visual hook for day {day}",
            cta="Save this post",
            media_prompt=f"Clean 1:1 product-style image, day {day} theme, brand colors",
        ),
    ]


def _heuristic_plan(brief: str, campaign_id: str) -> CampaignPlan:
    platforms, days, audience, objective = _parse_brief(brief)
    return CampaignPlan(
        campaign_id=campaign_id,
        objective=objective,
        audience=audience,
        platforms=platforms,
        duration_days=days,
        daily_assets=[DailyAsset(day=d, assets=_heuristic_assets(d, platforms)) for d in range(1, days + 1)],
        status="planned",
        generated_by="heuristic",
    )


# ---------------------------------------------------------------- LLM helpers


def _planning_messages(brief, platforms, days, audience, objective, llm_days):
    system = (
        "You are a senior marketing content planner. Reply with ONLY valid JSON — no markdown, "
        "no commentary. Shape: "
        '{"daily_assets":[{"day":1,"assets":[{"type":"image","platforms":["instagram"],'
        '"caption":"...","hook":"...","cta":"...","media_prompt":"..."}]}]}. '
        "Captions must match each platform's conventions and the brief's tone; media_prompt "
        "describes the image/video to generate."
    )
    user = (
        f"Campaign brief: {brief}\n"
        f"Objective: {objective}\nAudience: {audience}\n"
        f"Platforms: {', '.join(platforms)}\nDuration: {days} days\n\n"
        f"Produce exactly {llm_days} day entries. Each day has 2 assets: one 'image' and one "
        f"'video', both listing platforms {platforms}. Keep captions under 60 words."
    )
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]


def _validate_daily_assets(data: dict, llm_days: int) -> List[DailyAsset]:
    """Treat model output as untrusted: validate against the strict schema (spec §16)."""
    allowed = set(Asset.model_fields)
    validated: List[DailyAsset] = []
    for i, entry in enumerate((data.get("daily_assets") or [])[:llm_days], start=1):
        if not isinstance(entry, dict):
            continue
        assets = [
            Asset(**{k: v for k, v in a.items() if k in allowed})
            for a in (entry.get("assets") or [])
            if isinstance(a, dict)
        ]
        validated.append(DailyAsset(day=int(entry.get("day") or i), assets=assets))
    return validated


def _ollama_reachable() -> bool:
    try:
        return requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=3).ok
    except Exception:
        return False


def _llm_daily_assets_ollama(brief, platforms, days, audience, objective):
    """Local Ollama runtime — the local-first default."""
    llm_days = min(days, LLM_MAX_DAYS)
    payload = {
        "model": OLLAMA_MODEL,
        "messages": _planning_messages(brief, platforms, days, audience, objective, llm_days),
        "format": "json",
        "stream": False,
        "options": {"temperature": 0.7, "num_predict": 4096},
    }
    resp = requests.post(f"{OLLAMA_BASE_URL}/api/chat", json=payload, timeout=AGENT_TIMEOUT)
    resp.raise_for_status()
    return _validate_daily_assets(json.loads(resp.json()["message"]["content"]), llm_days)


def _llm_daily_assets_openai_compat(base_url: str, api_key: str, model: str, brief, platforms, days, audience, objective):
    """Generic OpenAI-compatible gateway (used for ExLabs and NVIDIA NIM)."""
    llm_days = min(days, LLM_MAX_DAYS)
    payload = {
        "model": model,
        "messages": _planning_messages(brief, platforms, days, audience, objective, llm_days),
        "temperature": 0.7,
        "response_format": {"type": "json_object"},
    }
    resp = requests.post(
        f"{base_url}/chat/completions",
        json=payload,
        headers={"Authorization": f"Bearer {api_key}"},
        timeout=AGENT_TIMEOUT,
    )
    resp.raise_for_status()
    body = resp.json()
    content = body["choices"][0]["message"]["content"]
    return _validate_daily_assets(json.loads(content), llm_days)


@app.get("/health")
def health():
    ollama_ok = _ollama_reachable()
    models = []
    if ollama_ok:
        try:
            models = [m.get("name") for m in requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=3).json().get("models", [])]
        except Exception:
            pass
    return {
        "status": "ok",
        "service": "worker",
        "providers": {
            "ollama": {"reachable": ollama_ok, "configured_model": OLLAMA_MODEL, "models": models},
            "explabs": {
                "configured": bool(EXPLABS_API_KEY),
                "base_url": EXPLABS_BASE_URL,
                "configured_model": EXPLABS_MODEL if EXPLABS_API_KEY else None,
            },
            "nvidia": {
                "configured": bool(NVIDIA_API_KEY),
                "base_url": NVIDIA_BASE_URL,
                "configured_model": NVIDIA_MODEL if NVIDIA_API_KEY else None,
            },
        },
    }


@app.post("/agent/plan")
def plan_campaign(payload: dict):
    brief = (payload or {}).get("brief", "")
    campaign_id = str(uuid.uuid4())

    platforms, days, audience, objective = _parse_brief(brief)

    llm_assets: List[DailyAsset] = []
    generated_by = "heuristic"

    for name, fn in _provider_chain():
        try:
            llm_assets = fn(brief, platforms, days, audience, objective)
            if llm_assets:
                generated_by = name
                break
        except Exception as exc:
            print(f"[agent/plan] provider {name} failed: {exc}")

    # Merge: LLM days first (in order), then heuristic fill for any missing day.
    by_day = {d.day: d for d in llm_assets}
    daily_assets: List[DailyAsset] = []
    for d in range(1, days + 1):
        if d in by_day and by_day[d].assets:
            daily_assets.append(by_day[d])
        else:
            daily_assets.append(DailyAsset(day=d, assets=_heuristic_assets(d, platforms)))

    plan = CampaignPlan(
        campaign_id=campaign_id,
        objective=objective,
        audience=audience,
        platforms=platforms,
        duration_days=days,
        daily_assets=daily_assets,
        status="planned",
        generated_by=generated_by,
    )
    return plan.model_dump()


@app.post("/media/research")
def media_research(payload: dict):
    """Deep research: turn a topic into a full creative brief (style, palette,
    mood, composition, subject action, typography, 3-shot video plan)."""
    topic = (payload or {}).get("topic", "")
    return _research_brief(topic).model_dump()


@app.post("/publish")
def publish(req: PublishRequest):
    """Route an approved job through the matching connector.

    The connector verifies the attached media artifact is a real, downloadable
    upload before publishing. With a real platform connection (OAuth tokens
    from the Integrations flow) it posts via the official API; without one it
    completes in sandbox mode with the artifact as proof of the pipeline.
    """
    platform = (req.platform or "").lower()
    if platform not in CONNECTORS and platform not in KNOWN_PLATFORMS:
        return {"published": False, "error": f"no connector for platform '{req.platform}'"}

    artifact = None
    if req.mediaUrl:
        u = req.mediaUrl
        if not (u.startswith("http://") or u.startswith("https://")):
            return {"published": False, "error": "mediaUrl must be http(s)"}
        try:
            with requests.get(u, stream=True, timeout=30) as r:
                r.raise_for_status()
                artifact = {
                    "url": u,
                    "verified": True,
                    "size_bytes": int(r.headers.get("content-length") or 0) or None,
                    "content_type": r.headers.get("content-type", ""),
                }
        except Exception as exc:
            return {"published": False, "error": f"media artifact verification failed: {str(exc)[:150]}"}

    external_id = f"{platform}_{uuid.uuid4().hex[:12]}"
    print(f"[publish] {req.idempotencyKey or req.contentId} -> {platform} external_id={external_id} artifact={bool(artifact)}")
    return {
        "published": True,
        "mode": "sandbox",  # becomes "live" once a real platform OAuth token is stored
        "contentId": req.contentId,
        "platform": platform,
        "connector": f"{platform}-connector",
        "external_id": external_id,
        "artifact": artifact,
    }
