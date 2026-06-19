#!/usr/bin/env bash
set -euo pipefail

LOG="${HOME}/ltx-deploy.log"
exec > >(tee -a "$LOG") 2>&1

echo "=== LTX 2.3 deploy started $(date -Is) ==="

export DEBIAN_FRONTEND=noninteractive

# --- tools ---
if ! command -v uv >/dev/null 2>&1; then
  curl -LsSf https://astral.sh/uv/install.sh | sh
  export PATH="${HOME}/.local/bin:${PATH}"
fi

# --- repo ---
if [[ ! -d "${HOME}/LTX-2" ]]; then
  git clone --depth 1 https://github.com/Lightricks/LTX-2.git "${HOME}/LTX-2"
fi

cd "${HOME}/LTX-2"
uv sync --frozen --extra xformers

# --- models ---
MODELS_DIR="${HOME}/models"
mkdir -p "$MODELS_DIR"

if [[ -z "${HF_TOKEN:-}" && -z "${HUGGINGFACE_HUB_TOKEN:-}" ]]; then
  if [[ -f "${HOME}/.cache/huggingface/token" ]]; then
    echo "Using cached Hugging Face login token."
  else
    echo "ERROR: Hugging Face login required for Gemma text encoder."
    echo "1) Accept license: https://huggingface.co/google/gemma-3-12b-it-qat-q4_0-unquantized"
    echo "2) Create a read token: https://huggingface.co/settings/tokens"
    echo "3) Re-run with: HF_TOKEN=hf_xxx ~/ltx-api/deploy-on-ec2.sh"
    exit 1
  fi
fi

export HF_TOKEN="${HF_TOKEN:-${HUGGINGFACE_HUB_TOKEN:-}}"
if [[ -n "${HF_TOKEN}" ]]; then
  export HUGGINGFACE_HUB_TOKEN="${HF_TOKEN}"
fi

download_hf() {
  local repo="$1"
  shift
  uv run huggingface-cli download "$repo" "$@" --local-dir "$MODELS_DIR/$(basename "$repo")" --local-dir-use-symlinks False
}

if [[ ! -f "$MODELS_DIR/ltx-2.3-22b-distilled-1.1.safetensors" ]]; then
  uv run huggingface-cli download Lightricks/LTX-2.3 \
    ltx-2.3-22b-distilled-1.1.safetensors \
    ltx-2.3-spatial-upscaler-x2-1.1.safetensors \
    --local-dir "$MODELS_DIR" \
    --local-dir-use-symlinks False
fi

if [[ ! -d "$MODELS_DIR/gemma-3-12b-it-qat-q4_0-unquantized" ]] || [[ ! -f "$MODELS_DIR/gemma-3-12b-it-qat-q4_0-unquantized/config.json" ]]; then
  uv run huggingface-cli download google/gemma-3-12b-it-qat-q4_0-unquantized \
    --local-dir "$MODELS_DIR/gemma-3-12b-it-qat-q4_0-unquantized" \
    --local-dir-use-symlinks False
fi

# --- API server venv ---
API_DIR="${HOME}/ltx-api"
mkdir -p "$API_DIR/outputs" "$API_DIR/uploads"

if [[ ! -d "${HOME}/ltx-server-venv" ]]; then
  uv venv "${HOME}/ltx-server-venv" --python 3.12
fi

source "${HOME}/ltx-server-venv/bin/activate"
uv pip install fastapi "uvicorn[standard]" httpx pydantic "torchvision==0.24.1" "torchaudio==2.9.1"

# Link LTX packages into server venv
uv pip install -e "${HOME}/LTX-2/packages/ltx-core" -e "${HOME}/LTX-2/packages/ltx-pipelines"

# --- env ---
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 || echo "127.0.0.1")
API_KEY="${LTX_API_KEY:-$(openssl rand -hex 24)}"

cat > "${API_DIR}/.env" <<EOF
LTX_API_KEY=${API_KEY}
LTX_PUBLIC_BASE=http://${PUBLIC_IP}:8000
LTX_MODELS_DIR=${MODELS_DIR}
LTX_FRAME_RATE=24
EOF

cp "${API_DIR}/server.py" "${API_DIR}/server.py.bak" 2>/dev/null || true

# --- systemd ---
sudo tee /etc/systemd/system/ltx-api.service >/dev/null <<EOF
[Unit]
Description=LTX 2.3 Self-Hosted API (model always loaded on GPU)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=${API_DIR}
EnvironmentFile=${API_DIR}/.env
Environment=PATH=${HOME}/ltx-server-venv/bin:${HOME}/LTX-2/.venv/bin:/usr/local/cuda/bin:/usr/bin
Environment=CUDA_VISIBLE_DEVICES=0
Environment=PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True
Environment=LTX_MAX_WIDTH=1280
Environment=LTX_MAX_HEIGHT=1920
Environment=LTX_MAX_FRAMES=96
Environment=LTX_OFFLOAD_MODE=cpu
Environment=LTX_WARMUP=0
ExecStart=${HOME}/ltx-server-venv/bin/uvicorn server:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10
TimeoutStartSec=600

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable ltx-api
sudo systemctl restart ltx-api

echo "=== Deploy complete $(date -Is) ==="
echo "PUBLIC_URL=http://${PUBLIC_IP}:8000"
echo "LTX_API_KEY=${API_KEY}"
echo "Test: curl -H 'Authorization: Bearer ${API_KEY}' http://${PUBLIC_IP}:8000/health"
