from fastapi import FastAPI
from pydantic import BaseModel
from typing import Dict, Any

app = FastAPI(title="Analytics Collector")

class MetricsIn(BaseModel):
    content_id: str
    platform: str
    raw: Dict[str, Any]

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/collect")
def collect(m: MetricsIn):
    # Normalize metrics per platform
    normalized = {
        "impressions": m.raw.get("impressions", 0),
        "reach": m.raw.get("reach", 0),
        "views": m.raw.get("views", 0),
        "likes": m.raw.get("likes", 0),
        "comments": m.raw.get("comments", 0),
        "shares": m.raw.get("shares", 0),
        "clicks": m.raw.get("clicks", 0),
    }
    return {"normalized": normalized, "platform": m.platform}
