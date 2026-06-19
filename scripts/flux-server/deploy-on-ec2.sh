#!/usr/bin/env bash
set -euo pipefail

LOG="${HOME}/flux-deploy.log"
exec > >(tee -a "$LOG") 2>&1

echo "=== FLUX.2 [dev] deploy started $(date -Is) ==="

export DEBIAN_FRONTEND=noninteractive

# --- stop and remove LTX ---
if systemctl is-active --quiet ltx-api 2>/dev/null; then
  echo "Stopping ltx-api…"
  sudo systemctl stop ltx-api
  sudo systemctl disable ltx-api
fi

echo "Removing LTX models and artifacts…"
rm -rf "${HOME}/models/ltx-"* "${HOME}/models/gemma-"* 2>/dev/null || true
rm -rf "${HOME}/LTX-2" "${HOME}/ltx-api" "${HOME}/ltx-server-venv" 2>/dev/null || true
sudo rm -f /etc/systemd/system/ltx-api.service

# --- tools ---
if ! command -v uv >/dev/null 2>&1; then
  curl -LsSf https://astral.sh/uv/install.sh | sh
  export PATH="${HOME}/.local/bin:${PATH}"
fi

# --- API server ---
API_DIR="${HOME}/flux-api"
mkdir -p "$API_DIR/outputs"

if [[ ! -d "${HOME}/flux-server-venv" ]]; then
  uv venv "${HOME}/flux-server-venv" --python 3.12
fi

source "${HOME}/flux-server-venv/bin/activate"

uv pip install fastapi "uvicorn[standard]" httpx pydantic
uv pip install --upgrade torch torchvision accelerate transformers safetensors sentencepiece protobuf
uv pip install git+https://github.com/huggingface/diffusers.git

if [[ -z "${HF_TOKEN:-}" && -z "${HUGGINGFACE_HUB_TOKEN:-}" ]]; then
  if [[ ! -f "${HOME}/.cache/huggingface/token" ]]; then
    echo "ERROR: Hugging Face login required for FLUX.2-dev (gated model)."
    echo "Accept license: https://huggingface.co/black-forest-labs/FLUX.2-dev"
    echo "Re-run with: HF_TOKEN=hf_xxx ~/flux-api/deploy-on-ec2.sh"
    exit 1
  fi
fi

export HF_TOKEN="${HF_TOKEN:-${HUGGINGFACE_HUB_TOKEN:-}}"
if [[ -n "${HF_TOKEN}" ]]; then
  export HUGGINGFACE_HUB_TOKEN="${HF_TOKEN}"
fi

PUBLIC_IP=$(curl -sf --max-time 2 http://169.254.169.254/latest/meta-data/public-ipv4 \
  || curl -sf --max-time 5 https://checkip.amazonaws.com \
  || echo "54.208.114.106")
PUBLIC_IP="${PUBLIC_IP//$'\n'/}"
API_KEY="${FLUX_API_KEY:-$(openssl rand -hex 24)}"
MODEL_ID="${FLUX_MODEL_ID:-black-forest-labs/FLUX.2-klein-4B}"

cat > "${API_DIR}/.env" <<EOF
FLUX_API_KEY=${API_KEY}
FLUX_PUBLIC_BASE=http://${PUBLIC_IP}:8000
FLUX_MODEL_ID=${MODEL_ID}
FLUX_DEFAULT_STEPS=28
FLUX_GUIDANCE_SCALE=4.0
FLUX_MAX_SIDE=1536
FLUX_WARMUP=1
EOF

# --- systemd ---
sudo tee /etc/systemd/system/flux-api.service >/dev/null <<EOF
[Unit]
Description=FLUX.2 Dev Self-Hosted API
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=${API_DIR}
EnvironmentFile=${API_DIR}/.env
Environment=PATH=${HOME}/flux-server-venv/bin:/usr/local/cuda/bin:/usr/bin
Environment=CUDA_VISIBLE_DEVICES=0
Environment=PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True
Environment=HF_HOME=${HOME}/.cache/huggingface
Environment=HUGGING_FACE_HUB_TOKEN=${HF_TOKEN:-}
ExecStart=${HOME}/flux-server-venv/bin/uvicorn server:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=15
TimeoutStartSec=3600

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable flux-api
sudo systemctl restart flux-api

echo "=== Deploy complete $(date -Is) ==="
echo "PUBLIC_URL=http://${PUBLIC_IP}:8000"
echo "FLUX_API_KEY=${API_KEY}"
echo "FLUX_MODEL_ID=${MODEL_ID}"
echo "Test: curl -H 'Authorization: Bearer ${API_KEY}' http://${PUBLIC_IP}:8000/health"
