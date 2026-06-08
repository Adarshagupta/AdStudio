#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
JAVA_HOME_DIR="${JAVA_HOME:-}"

if [[ -z "$JAVA_HOME_DIR" || ! -x "$JAVA_HOME_DIR/bin/java" ]]; then
  JAVA_HOME_DIR="$(find "$HOME/.local" -maxdepth 1 -type d -name 'jdk-17*' 2>/dev/null | head -1)/Contents/Home"
fi

if [[ ! -x "$JAVA_HOME_DIR/bin/java" ]]; then
  echo "No JDK 17 found. Install one with:"
  echo "  mkdir -p ~/.local && cd ~/.local"
  echo "  curl -fsSL -o temurin17.tar.gz \\"
  echo "    https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.14%2B7/OpenJDK17U-jdk_aarch64_mac_hotspot_17.0.14_7.tar.gz"
  echo "  tar -xzf temurin17.tar.gz"
  exit 1
fi

LOCAL_PROPS="$ROOT/android/local.properties"
touch "$LOCAL_PROPS"

if grep -q '^org.gradle.java.home=' "$LOCAL_PROPS"; then
  sed -i '' "s|^org.gradle.java.home=.*|org.gradle.java.home=$JAVA_HOME_DIR|" "$LOCAL_PROPS"
else
  printf '\norg.gradle.java.home=%s\n' "$JAVA_HOME_DIR" >> "$LOCAL_PROPS"
fi

echo "Using JAVA_HOME=$JAVA_HOME_DIR"
export JAVA_HOME="$JAVA_HOME_DIR"
export PATH="$JAVA_HOME/bin:$PATH"
