#!/usr/bin/env bash
set -euo pipefail

LOG="${HOME}/ltx-deploy.log"
exec > >(tee -a "$LOG") 2>&1

echo "=== LTX 2.3 deploy on Vast started $(date -Is) ==="

export DEBIAN_FRONTEND=noninteractive
export PATH="${HOME}/.local/bin:${PATH}"

if ! command -v uv >/dev/null 2>&1; then
  curl -LsSf https://astral.sh/uv/install.sh | sh
  export PATH="${HOME}/.local/bin:${PATH}"
fi

if [[ ! -d "${HOME}/LTX-2" ]]; then
  git clone --depth 1 https://github.com/Lightricks/LTX-2.git "${HOME}/LTX-2"
fi

cd "${HOME}/LTX-2"
uv sync --frozen --extra xformers

MODELS_DIR="${HOME}/models"
mkdir -p "$MODELS_DIR"

if [[ -z "${HF_TOKEN:-}" && -z "${HUGGINGFACE_HUB_TOKEN:-}" ]]; then
  if [[ -f "${HOME}/.cache/huggingface/token" ]]; then
    echo "Using cached Hugging Face token."
  else
    echo "ERROR: Set HF_TOKEN for Gemma + LTX downloads."
    exit 1
  fi
fi

export HF_TOKEN="${HF_TOKEN:-${HUGGINGFACE_HUB_TOKEN:-}}"
export HUGGINGFACE_HUB_TOKEN="${HF_TOKEN}"

if [[ ! -f "$MODELS_DIR/ltx-2.3-22b-distilled-1.1.safetensors" ]]; then
  uv run huggingface-cli download Lightricks/LTX-2.3 \
    ltx-2.3-22b-distilled-1.1.safetensors \
    ltx-2.3-spatial-upscaler-x2-1.1.safetensors \
    --local-dir "$MODELS_DIR" \
    --local-dir-use-symlinks False
fi

if [[ ! -f "$MODELS_DIR/gemma-3-12b-it-qat-q4_0-unquantized/config.json" ]]; then
  uv run huggingface-cli download google/gemma-3-12b-it-qat-q4_0-unquantized \
    --local-dir "$MODELS_DIR/gemma-3-12b-it-qat-q4_0-unquantized" \
    --local-dir-use-symlinks False
fi

API_DIR="${HOME}/ltx-api"
mkdir -p "$API_DIR/outputs" "$API_DIR/uploads"

if [[ ! -d "${HOME}/ltx-server-venv" ]]; then
  uv venv "${HOME}/ltx-server-venv" --python 3.12
fi

source "${HOME}/ltx-server-venv/bin/activate"
uv pip install fastapi "uvicorn[standard]" httpx pydantic boto3 "torchvision==0.24.1" "torchaudio==2.9.1"
uv pip install -e "${HOME}/LTX-2/packages/ltx-core" -e "${HOME}/LTX-2/packages/ltx-pipelines"

PUBLIC_IP="${VAST_PUBLIC_IP:-115.124.123.240}"
PUBLIC_PORT="${LTX_PUBLIC_PORT:-10100}"
PUBLIC_HOST_PORT="${LTX_PUBLIC_HOST_PORT:-26436}"
API_KEY="${LTX_API_KEY:-}"
AUTH_DISABLED="${LTX_AUTH_DISABLED:-1}"

cat > "${API_DIR}/.env" <<EOF
LTX_API_KEY=${API_KEY}
LTX_AUTH_DISABLED=${AUTH_DISABLED}
LTX_PUBLIC_BASE=http://${PUBLIC_IP}:${PUBLIC_HOST_PORT}
LTX_MODELS_DIR=${MODELS_DIR}
LTX_FRAME_RATE=24
LTX_OFFLOAD_MODE=cpu
LTX_WARMUP=0
LTX_MAX_WIDTH=1280
LTX_MAX_HEIGHT=1920
LTX_MAX_FRAMES=96
R2_ACCOUNT_ID=${R2_ACCOUNT_ID:-}
R2_ACCESS_KEY_ID=${R2_ACCESS_KEY_ID:-}
R2_SECRET_ACCESS_KEY=${R2_SECRET_ACCESS_KEY:-}
R2_BUCKET=${R2_BUCKET:-}
R2_PUBLIC_BASE_URL=${R2_PUBLIC_BASE_URL:-}
LTX_R2_KEY_PREFIX=${LTX_R2_KEY_PREFIX:-generated/ltx}
EOF

cat > /etc/systemd/system/ltx-api.service <<EOF
[Unit]
Description=LTX 2.3 Self-Hosted API
After=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=${API_DIR}
EnvironmentFile=${API_DIR}/.env
Environment=PATH=${HOME}/ltx-server-venv/bin:${HOME}/LTX-2/.venv/bin:/usr/local/cuda/bin:/usr/bin
Environment=CUDA_VISIBLE_DEVICES=0
Environment=PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True
Environment=HF_HOME=${HOME}/.cache/huggingface
Environment=HUGGING_FACE_HUB_TOKEN=${HF_TOKEN:-}
ExecStart=${HOME}/ltx-server-venv/bin/uvicorn server:app --host 0.0.0.0 --port ${PUBLIC_PORT}
Restart=always
RestartSec=15
TimeoutStartSec=3600

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ltx-api
systemctl restart ltx-api

echo "=== Deploy complete $(date -Is) ==="
echo "PUBLIC_URL=http://${PUBLIC_IP}:${PUBLIC_PORT}"
echo "AUTH_DISABLED=${AUTH_DISABLED}"
echo "R2_CONFIGURED=$([[ -n \"${R2_BUCKET:-}\" ]] && echo yes || echo no)"
