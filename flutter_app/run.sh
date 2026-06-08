#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=/dev/null
source "$ROOT/scripts/dev-env.sh" >/dev/null

cd "$ROOT"
flutter run "$@"
