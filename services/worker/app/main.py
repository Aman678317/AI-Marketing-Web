from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import uuid

app = FastAPI(title="AI Marketing Agent Worker")

class CampaignPlan(BaseModel):
    campaign_id: str
    objective: str
    audience: str
    platforms: List[str]
    duration_days: int
    daily_assets: List[dict]
    status: str

@app.get("/health")
def health():
    return {"status": "ok", "service": "worker"}

@app.post("/agent/plan")
def plan_campaign(payload: dict):
    brief = payload.get("brief", "")
    # Simple heuristic parsing for demo
    platforms = []
    if "instagram" in brief.lower() or "instagram" in brief.lower():
        platforms.append("instagram")
    if "facebook" in brief.lower():
        platforms.append("facebook")
    if "youtube" in brief.lower():
        platforms.append("youtube")
    if "linkedin" in brief.lower():
        platforms.append("linkedin")
    if not platforms:
        platforms = ["instagram", "linkedin"]

    days = 10
    if "7 days" in brief.lower():
        days = 7
    elif "30 days" in brief.lower():
        days = 30

    daily_assets = []
    for day in range(1, days+1):
        daily_assets.append({
            "day": day,
            "assets": [
                {"type": "video", "platforms": platforms, "status": "DRAFT"},
                {"type": "image", "platforms": platforms, "status": "DRAFT"}
            ]
        })

    plan = CampaignPlan(
        campaign_id=str(uuid.uuid4()),
        objective="Website visits",
        audience="Startup founders",
        platforms=platforms,
        duration_days=days,
        daily_assets=daily_assets,
        status="planned"
    )
    return plan.dict()
