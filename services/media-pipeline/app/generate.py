from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class GenRequest(BaseModel):
    prompt: str
    type: str = "image"
    size: str = "1024x1024"

@router.post("/generate")
def generate(req: GenRequest):
    # Placeholder for Ollama/ComfyUI generation
    return {
        "status": "generated",
        "type": req.type,
        "prompt": req.prompt,
        "url": "http://minio/ai-marketing-assets/demo.png"
    }
