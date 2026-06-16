#!/usr/bin/env bash
# Push LTX FastAPI server to Vast and configure R2 from local .env
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${ROOT}/.env"
VAST_HOST="${VAST_HOST:-115.124.123.240}"
VAST_PORT="${VAST_PORT:-18132}"
VAST_USER="${VAST_USER:-root}"
SSH_KEY="${VAST_SSH_KEY:-${HOME}/.ssh/vast_ed25519}"
REMOTE_API_DIR="${VAST_API_DIR:-/root/ltx-api}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

scp -i "$SSH_KEY" -P "$VAST_PORT" -o StrictHostKeyChecking=no \
  "${ROOT}/scripts/ltx-server/server.py" \
  "${ROOT}/scripts/ltx-server/deploy-on-vast.sh" \
  "${VAST_USER}@${VAST_HOST}:${REMOTE_API_DIR}/"

ssh -i "$SSH_KEY" -p "$VAST_PORT" -o StrictHostKeyChecking=no \
  "${VAST_USER}@${VAST_HOST}" bash -s <<EOF
set -euo pipefail
chmod +x ${REMOTE_API_DIR}/deploy-on-vast.sh

# If deploy still running, only refresh server.py for next restart
if pgrep -f deploy-on-vast.sh >/dev/null 2>&1; then
  echo "Deploy in progress — server.py updated; will apply on next restart."
  exit 0
fi

export VAST_PUBLIC_IP=${VAST_HOST}
export LTX_PUBLIC_PORT=10100
export LTX_PUBLIC_HOST_PORT=26436
export LTX_AUTH_DISABLED=1
export R2_ACCOUNT_ID=${R2_ACCOUNT_ID:-}
export R2_ACCESS_KEY_ID=${R2_ACCESS_KEY_ID:-}
export R2_SECRET_ACCESS_KEY=${R2_SECRET_ACCESS_KEY:-}
export R2_BUCKET=${R2_BUCKET:-}
export R2_PUBLIC_BASE_URL=${R2_PUBLIC_BASE_URL:-}

# Refresh venv deps + systemd env, restart API
source "\${HOME}/ltx-server-venv/bin/activate" 2>/dev/null || true
if [[ -d "\${HOME}/ltx-server-venv" ]]; then
  uv pip install boto3 >/dev/null 2>&1 || pip install boto3 >/dev/null 2>&1 || true
fi

# Rewrite .env with R2 + no auth
API_DIR="${REMOTE_API_DIR}"
MODELS_DIR="\${HOME}/models"
cat > "\${API_DIR}/.env" <<ENVEOF
LTX_API_KEY=
LTX_AUTH_DISABLED=1
LTX_PUBLIC_BASE=http://${VAST_HOST}:26436
LTX_MODELS_DIR=\${MODELS_DIR}
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
LTX_R2_KEY_PREFIX=generated/ltx
ENVEOF

start_ltx_api() {
  API_DIR="${REMOTE_API_DIR}"
  pkill -f "uvicorn server:app" 2>/dev/null || true
  sleep 1
  cd "\${API_DIR}"
  set -a
  # shellcheck disable=SC1091
  source "\${API_DIR}/.env"
  set +a
  export PATH="\${HOME}/ltx-server-venv/bin:\${HOME}/LTX-2/.venv/bin:\${PATH}"
  export CUDA_VISIBLE_DEVICES=0
  export HF_HOME="\${HOME}/.cache/huggingface"
  export PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True
  nohup "\${HOME}/ltx-server-venv/bin/uvicorn" server:app --host 0.0.0.0 --port 10100 \
    > "\${API_DIR}/uvicorn.log" 2>&1 &
  echo "Started uvicorn pid=\$!"
}

if systemctl restart ltx-api 2>/dev/null; then
  echo "Restarted via systemd."
else
  echo "systemd unavailable — starting uvicorn directly."
  start_ltx_api
fi
EOF

echo "Done. API: http://${VAST_HOST}:26436/health"
