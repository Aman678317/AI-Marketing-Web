from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
import subprocess
from app.generate import router as gen_router

app = FastAPI(title="Media Pipeline")
app.include_router(gen_router)

@app.get("/health")
def health():
    return {"status": "ok", "service": "media-pipeline"}

@app.post("/transcode")
async def transcode(file: UploadFile = File(...)):
    tmp_path = f"/tmp/{file.filename}"
    with open(tmp_path, "wb") as f:
        f.write(await file.read())
    out_path = f"/tmp/out_{file.filename}"
    cmd = ["ffmpeg", "-y", "-i", tmp_path, "-vf", "scale=1080:-2", out_path]
    try:
        subprocess.run(cmd, check=True, capture_output=True)
        return {"status": "transcoded", "output": out_path}
    except subprocess.CalledProcessError as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    return {"status": "uploaded", "filename": file.filename}
