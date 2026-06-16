"""Self-hosted LTX 2.3 API — LiteMoov-compatible FastAPI with optional R2 upload."""

from __future__ import annotations

import asyncio
import os
import threading
import traceback
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.request import urlretrieve

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "outputs"
UPLOAD_DIR = BASE_DIR / "uploads"
MODELS_DIR = Path(os.environ.get("LTX_MODELS_DIR", "/home/ubuntu/models"))

API_KEY = os.environ.get("LTX_API_KEY", "").strip()
AUTH_DISABLED = os.environ.get("LTX_AUTH_DISABLED", "").strip().lower() in {
    "1",
    "true",
    "yes",
}
PUBLIC_BASE = os.environ.get("LTX_PUBLIC_BASE", "").rstrip("/")
FRAME_RATE = float(os.environ.get("LTX_FRAME_RATE", "24"))
MAX_WIDTH = int(os.environ.get("LTX_MAX_WIDTH", "1280"))
MAX_HEIGHT = int(os.environ.get("LTX_MAX_HEIGHT", "1920"))
MAX_FRAMES = int(os.environ.get("LTX_MAX_FRAMES", "96"))
WARMUP_ON_START = os.environ.get("LTX_WARMUP", "0").strip() not in {"0", "false", "no"}
OFFLOAD_MODE = os.environ.get("LTX_OFFLOAD_MODE", "cpu").strip().lower()

R2_ACCOUNT_ID = os.environ.get("R2_ACCOUNT_ID", "").strip()
R2_ACCESS_KEY_ID = os.environ.get("R2_ACCESS_KEY_ID", "").strip()
R2_SECRET_ACCESS_KEY = os.environ.get("R2_SECRET_ACCESS_KEY", "").strip()
R2_BUCKET = os.environ.get("R2_BUCKET", "").strip()
R2_PUBLIC_BASE_URL = os.environ.get("R2_PUBLIC_BASE_URL", "").strip().rstrip("/")
R2_KEY_PREFIX = os.environ.get("LTX_R2_KEY_PREFIX", "generated/ltx").strip().strip("/")

jobs: dict[str, dict[str, Any]] = {}
jobs_lock = threading.Lock()
generation_lock = threading.Lock()
pipeline = None
pipeline_error: str | None = None
loaded_at: str | None = None
_r2_client = None

CHECKPOINT = MODELS_DIR / "ltx-2.3-22b-distilled-1.1.safetensors"
SPATIAL_UPSAMPLER = MODELS_DIR / "ltx-2.3-spatial-upscaler-x2-1.1.safetensors"
GEMMA_ROOT = MODELS_DIR / "gemma-3-12b-it-qat-q4_0-unquantized"


def snap64(value: int) -> int:
    return max(64, round(value / 64) * 64)


def clamp_resolution(width: int, height: int) -> tuple[int, int]:
    w, h = snap64(width), snap64(height)
    scale = min(1.0, MAX_WIDTH / w, MAX_HEIGHT / h)
    if scale < 1.0:
        w, h = snap64(int(w * scale)), snap64(int(h * scale))
    return w, h


def parse_resolution(value: str) -> tuple[int, int]:
    if "x" in value.lower():
        w, h = value.lower().split("x", 1)
        return clamp_resolution(int(w), int(h))
    return clamp_resolution(1280, 1920)


def gpu_memory_mb() -> int | None:
    try:
        import torch

        if not torch.cuda.is_available():
            return None
        return round(torch.cuda.memory_allocated() / (1024 * 1024))
    except Exception:
        return None


def public_url(path: str) -> str:
    if PUBLIC_BASE:
        return f"{PUBLIC_BASE}{path}"
    return path


def auth_required() -> bool:
    return bool(API_KEY) and not AUTH_DISABLED


def r2_configured() -> bool:
    return bool(
        R2_ACCOUNT_ID
        and R2_ACCESS_KEY_ID
        and R2_SECRET_ACCESS_KEY
        and R2_BUCKET
        and R2_PUBLIC_BASE_URL
    )


def r2_public_url(key: str) -> str:
    return f"{R2_PUBLIC_BASE_URL}/{key.lstrip('/')}"


def get_r2_client():
    global _r2_client
    if _r2_client is not None:
        return _r2_client

    import boto3

    _r2_client = boto3.client(
        "s3",
        region_name="auto",
        endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
    )
    return _r2_client


def upload_video_to_r2(job_id: str, local_path: Path) -> str:
    key = f"{R2_KEY_PREFIX}/{job_id}.mp4"
    client = get_r2_client()
    client.upload_file(
        str(local_path),
        R2_BUCKET,
        key,
        ExtraArgs={"ContentType": "video/mp4"},
    )
    return r2_public_url(key)


def verify_auth(request: Request) -> None:
    if not auth_required():
        return

    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token.")
    token = auth.removeprefix("Bearer ").strip()
    if token != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key.")


def require_pipeline() -> None:
    if pipeline is None:
        raise HTTPException(
            status_code=503,
            detail=pipeline_error or "LTX pipeline is still loading. Retry shortly.",
        )


def load_pipeline() -> None:
    """Load once at startup and keep weights on GPU for all user requests."""
    global pipeline, pipeline_error, loaded_at

    missing = [
        p.name
        for p in (CHECKPOINT, SPATIAL_UPSAMPLER, GEMMA_ROOT)
        if not p.exists()
    ]
    if missing:
        pipeline_error = f"Missing model files: {', '.join(missing)}"
        return

    try:
        import torch
        from ltx_core.quantization.fp8_cast import build_policy as build_fp8_cast_policy
        from ltx_pipelines.distilled import DistilledPipeline
        from ltx_pipelines.utils.types import OffloadMode

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"[ltx] Loading pipeline onto {device} (kept resident for all requests)…")

        offload_mode = {
            "none": OffloadMode.NONE,
            "cpu": OffloadMode.CPU,
            "disk": OffloadMode.DISK,
        }.get(OFFLOAD_MODE, OffloadMode.CPU)

        pipeline = DistilledPipeline(
            distilled_checkpoint_path=str(CHECKPOINT),
            spatial_upsampler_path=str(SPATIAL_UPSAMPLER),
            gemma_root=str(GEMMA_ROOT),
            loras=[],
            device=device,
            quantization=build_fp8_cast_policy(str(CHECKPOINT)),
            offload_mode=offload_mode,
        )
        pipeline_error = None
        loaded_at = datetime.now(timezone.utc).isoformat()
        print(f"[ltx] Pipeline ready. GPU memory: {gpu_memory_mb()} MiB")

        if WARMUP_ON_START:
            warmup_pipeline()
    except Exception as exc:  # noqa: BLE001
        pipeline_error = str(exc)
        pipeline = None
        loaded_at = None
        traceback.print_exc()


def warmup_pipeline() -> None:
    """Run a tiny generation so weights are on GPU before the first user request."""
    if pipeline is None:
        return

    try:
        from ltx_core.model.video_vae import TilingConfig

        print("[ltx] Warming up GPU (one-time load, ~3-8 min)…")
        tiling_config = TilingConfig.default()
        with generation_lock:
            pipeline(
                prompt="warmup clip",
                seed=0,
                height=512,
                width=512,
                num_frames=8,
                frame_rate=FRAME_RATE,
                images=[],
                tiling_config=tiling_config,
                enhance_prompt=False,
            )
        print(f"[ltx] Warmup complete. GPU memory: {gpu_memory_mb()} MiB")
    except Exception as exc:  # noqa: BLE001
        print(f"[ltx] Warmup failed (first user request will load GPU): {exc}")


def run_generation(job_id: str, payload: dict[str, Any]) -> None:
    with jobs_lock:
        jobs[job_id]["status"] = "processing"

    try:
        if pipeline is None:
            raise RuntimeError(pipeline_error or "LTX pipeline is not loaded.")

        from ltx_core.model.video_vae import TilingConfig, get_video_chunks_number
        from ltx_pipelines.utils.args import ImageConditioningInput
        from ltx_pipelines.utils.media_io import encode_video

        prompt = payload["prompt"]
        width, height = parse_resolution(payload["resolution"])
        duration = int(payload["duration"])
        num_frames = max(8, min(duration * int(FRAME_RATE), MAX_FRAMES))
        seed = int(payload.get("seed", 42))
        image_uri = payload.get("image_uri")

        images: list[ImageConditioningInput] = []
        if image_uri:
            local_path = UPLOAD_DIR / f"{job_id}-ref.jpg"
            UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
            if image_uri.startswith("http"):
                httpx.get(image_uri, timeout=120).raise_for_status()
                urlretrieve(image_uri, local_path)
            images.append(ImageConditioningInput(str(local_path), 1.0, 0))

        tiling_config = TilingConfig.default()
        video_chunks_number = get_video_chunks_number(num_frames, tiling_config)

        with generation_lock:
            video, audio = pipeline(
                prompt=prompt,
                seed=seed,
                height=height,
                width=width,
                num_frames=num_frames,
                frame_rate=FRAME_RATE,
                images=images,
                tiling_config=tiling_config,
                enhance_prompt=False,
            )

        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        output_path = OUTPUT_DIR / f"{job_id}.mp4"
        encode_video(
            video=video,
            fps=FRAME_RATE,
            audio=audio if payload.get("generate_audio", True) else None,
            output_path=str(output_path),
            video_chunks_number=video_chunks_number,
        )

        storage = "local"
        video_url = public_url(f"/outputs/{job_id}.mp4")
        if r2_configured():
            try:
                video_url = upload_video_to_r2(job_id, output_path)
                storage = "r2"
                print(f"[ltx] Uploaded {job_id} to R2: {video_url}")
            except Exception as exc:  # noqa: BLE001
                print(f"[ltx] R2 upload failed for {job_id}, serving locally: {exc}")
                traceback.print_exc()

        with jobs_lock:
            jobs[job_id].update(
                {
                    "status": "completed",
                    "result": {
                        "video_url": video_url,
                        "storage": storage,
                    },
                }
            )
    except Exception as exc:  # noqa: BLE001
        with jobs_lock:
            jobs[job_id].update(
                {
                    "status": "failed",
                    "error": {
                        "type": "generation_error",
                        "message": str(exc),
                    },
                }
            )
        traceback.print_exc()


@asynccontextmanager
async def lifespan(_: FastAPI):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    await asyncio.to_thread(load_pipeline)
    yield


app = FastAPI(
    title="LTX 2.3 Self-Hosted API",
    description="LiteMoov-compatible text/image-to-video with optional Cloudflare R2 storage.",
    lifespan=lifespan,
)


class TextToVideoRequest(BaseModel):
    prompt: str
    model: str = "ltx-2-3-fast"
    duration: int = 8
    resolution: str = "1080x1920"
    generate_audio: bool = True
    seed: int = 42


class ImageToVideoRequest(TextToVideoRequest):
    image_uri: str


@app.get("/")
async def root():
    return {
        "status": "running",
        "ready": pipeline is not None,
        "pipeline_loaded": pipeline is not None,
        "pipeline_error": pipeline_error,
        "loaded_at": loaded_at,
        "gpu_memory_mb": gpu_memory_mb(),
        "models_dir": str(MODELS_DIR),
        "auth_required": auth_required(),
        "r2_configured": r2_configured(),
        "endpoints": {
            "health": "/health",
            "text_to_video": "POST /v2/text-to-video",
            "image_to_video": "POST /v2/image-to-video",
            "job_status": "GET /v2/text-to-video/{job_id}",
        },
    }


@app.get("/health")
async def health():
    return await root()


def create_job(payload: dict[str, Any]) -> dict[str, Any]:
    require_pipeline()

    job_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    record = {
        "id": job_id,
        "status": "pending",
        "created_at": created_at,
        "request": payload,
    }
    with jobs_lock:
        jobs[job_id] = record

    thread = threading.Thread(target=run_generation, args=(job_id, payload), daemon=True)
    thread.start()
    return {"id": job_id, "created_at": created_at}


@app.post("/v2/text-to-video")
async def text_to_video(body: TextToVideoRequest, _: None = Depends(verify_auth)):
    return create_job(body.model_dump())


@app.post("/v2/image-to-video")
async def image_to_video(body: ImageToVideoRequest, _: None = Depends(verify_auth)):
    return create_job(body.model_dump())


@app.get("/v2/text-to-video/{job_id}")
async def get_text_job(job_id: str, _: None = Depends(verify_auth)):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job


@app.get("/v2/image-to-video/{job_id}")
async def get_image_job(job_id: str, _: None = Depends(verify_auth)):
    return await get_text_job(job_id, _)


@app.get("/outputs/{filename}")
async def serve_output(filename: str):
    path = OUTPUT_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Output not found.")
    return FileResponse(path, media_type="video/mp4")
