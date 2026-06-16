"""Self-hosted FLUX.2 API for LiteMoov."""

from __future__ import annotations

import asyncio
import os
import threading
import traceback
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "outputs"
MODEL_ID = os.environ.get("FLUX_MODEL_ID", "black-forest-labs/FLUX.2-klein-4B")
PUBLIC_BASE = os.environ.get("FLUX_PUBLIC_BASE", "").rstrip("/")
DEFAULT_STEPS = int(os.environ.get("FLUX_DEFAULT_STEPS", "4"))
DEFAULT_GUIDANCE = float(os.environ.get("FLUX_GUIDANCE_SCALE", "1.0"))
MAX_SIDE = int(os.environ.get("FLUX_MAX_SIDE", "1536"))
WARMUP_ON_START = os.environ.get("FLUX_WARMUP", "0").strip() not in {"0", "false", "no"}
LOCAL_FILES_ONLY = os.environ.get("FLUX_LOCAL_ONLY", "0").strip() not in {"0", "false", "no"}

pipe = None
pipe_error: str | None = None
loaded_at: str | None = None
loading = False
generation_lock = threading.Lock()
load_lock = threading.Lock()


def snap16(value: int) -> int:
    return max(256, (value // 16) * 16)


def clamp_size(width: int, height: int) -> tuple[int, int]:
    w, h = snap16(width), snap16(height)
    scale = min(1.0, MAX_SIDE / max(w, h))
    if scale < 1.0:
        w, h = snap16(int(w * scale)), snap16(int(h * scale))
    return w, h


def is_klein_model() -> bool:
    return "klein" in MODEL_ID.lower()


def load_pipeline() -> None:
    global pipe, pipe_error, loaded_at, loading

    with load_lock:
        if pipe is not None or loading:
            return
        loading = True

    try:
        import torch

        print(f"[flux] Loading {MODEL_ID}…")
        load_kwargs: dict = {"torch_dtype": torch.bfloat16}
        if LOCAL_FILES_ONLY:
            load_kwargs["local_files_only"] = True

        if is_klein_model():
            from diffusers import Flux2KleinPipeline

            pipeline = Flux2KleinPipeline.from_pretrained(MODEL_ID, **load_kwargs)
            pipeline.to("cuda")
        elif "FLUX.2" in MODEL_ID or "flux.2" in MODEL_ID.lower():
            from diffusers import Flux2Pipeline

            pipeline = Flux2Pipeline.from_pretrained(MODEL_ID, **load_kwargs)
            pipeline.enable_model_cpu_offload()
        else:
            from diffusers import FluxPipeline

            pipeline = FluxPipeline.from_pretrained(MODEL_ID, **load_kwargs)
            pipeline.enable_model_cpu_offload()

        pipe_error = None
        loaded_at = datetime.now(timezone.utc).isoformat()
        print("[flux] Pipeline ready.")

        if WARMUP_ON_START:
            print("[flux] Running warmup generation…")
            with generation_lock:
                pipeline(
                    prompt="warmup",
                    num_inference_steps=1,
                    guidance_scale=1.0,
                    height=256,
                    width=256,
                )
            print("[flux] Warmup complete.")

        globals()["pipe"] = pipeline
    except Exception as exc:  # noqa: BLE001
        pipe_error = str(exc)
        globals()["pipe"] = None
        loaded_at = None
        traceback.print_exc()
    finally:
        loading = False


@asynccontextmanager
async def lifespan(_: FastAPI):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    threading.Thread(target=load_pipeline, daemon=True).start()
    yield


app = FastAPI(title="FLUX.2 Self-Hosted API", lifespan=lifespan)


class GenerateRequest(BaseModel):
    prompt: str
    width: int = 1024
    height: int = 1024
    steps: int = Field(default=4, ge=1, le=50)
    seed: int | None = None
    guidance_scale: float = Field(default=1.0, ge=0.0, le=20.0)


@app.get("/")
@app.get("/health")
async def health():
    return {
        "status": "running",
        "ready": pipe is not None,
        "loading": loading,
        "model": MODEL_ID,
        "pipeline_error": pipe_error,
        "loaded_at": loaded_at,
    }


@app.post("/generate")
async def generate(body: GenerateRequest):
    if pipe is None:
        raise HTTPException(
            status_code=503,
            detail=pipe_error or "FLUX pipeline is still loading. Retry shortly.",
        )

    width, height = clamp_size(body.width, body.height)
    steps = body.steps if body.steps else DEFAULT_STEPS
    guidance = body.guidance_scale if body.guidance_scale is not None else DEFAULT_GUIDANCE

    job_id = str(uuid.uuid4())
    output_path = OUTPUT_DIR / f"{job_id}.png"

    def run() -> None:
        import torch

        device = "cuda" if torch.cuda.is_available() else "cpu"
        generator = None
        if body.seed is not None:
            generator = torch.Generator(device=device).manual_seed(body.seed)

        with generation_lock:
            result = pipe(
                prompt=body.prompt,
                num_inference_steps=steps,
                guidance_scale=guidance,
                height=height,
                width=width,
                generator=generator,
            )
            result.images[0].save(output_path)

    await asyncio.to_thread(run)

    path = f"/outputs/{job_id}.png"
    image_url = f"{PUBLIC_BASE}{path}" if PUBLIC_BASE else path
    provider = "self-hosted/flux-2-klein" if is_klein_model() else "self-hosted/flux-2-dev"
    return {
        "imageUrl": image_url,
        "provider": provider,
        "width": width,
        "height": height,
    }


@app.get("/outputs/{filename}")
async def serve_output(filename: str):
    path = OUTPUT_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Output not found.")
    return FileResponse(path, media_type="image/png")
