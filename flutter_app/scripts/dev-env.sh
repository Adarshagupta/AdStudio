#!/usr/bin/env bash
# Source this file in your shell: source scripts/dev-env.sh

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"

if [[ -z "${JAVA_HOME:-}" || ! -x "${JAVA_HOME}/bin/java" ]]; then
  for candidate in "$HOME"/.local/jdk-17*/Contents/Home; do
    if [[ -x "$candidate/bin/java" ]]; then
      export JAVA_HOME="$candidate"
      break
    fi
  done
fi

export PATH="$HOME/development/flutter/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:${JAVA_HOME:+$JAVA_HOME/bin:}$PATH"

echo "Dev env ready:"
echo "  flutter: $(command -v flutter 2>/dev/null || echo missing)"
echo "  adb:     $(command -v adb 2>/dev/null || echo missing)"
echo "  java:    $(command -v java 2>/dev/null || echo missing)"
