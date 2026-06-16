#!/bin/bash

# Flutter & Android Setup Script for macOS
# This script installs Flutter, Android SDK, and configures the environment

set -e

echo "🚀 LiteMoov Flutter - Android Setup"
echo "======================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo -e "${YELLOW}Installing Homebrew...${NC}"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
    echo -e "${GREEN}✓ Homebrew is installed${NC}"
fi

# Install Java (OpenJDK)
echo -e "${YELLOW}Installing Java (OpenJDK)...${NC}"
brew install --cask adoptopenjdk/openjdk/adoptopenjdk11

# Install Flutter
echo -e "${YELLOW}Installing Flutter...${NC}"
brew install flutter

# Install Android SDK
echo -e "${YELLOW}Installing Android SDK...${NC}"
brew install --cask android-sdk

# Install Android Studio
echo -e "${YELLOW}Installing Android Studio...${NC}"
brew install --cask android-studio

# Create Android SDK directory
mkdir -p ~/Library/Android/sdk

# Install Android command line tools
if [ ! -d ~/Library/Android/sdk/cmdline-tools ]; then
    echo -e "${YELLOW}Installing Android command line tools...${NC}"
    cd ~/Library/Android/sdk
    curl -O https://dl.google.com/android/repository/commandlinetools-mac-11076708_latest.zip
    unzip commandlinetools-mac-11076708_latest.zip
    mkdir -p cmdline-tools/latest
    mv cmdline-tools/* cmdline-tools/latest/ 2>/dev/null || true
    rm commandlinetools-mac-11076708_latest.zip
fi

# Add to PATH
PROFILE_FILE=""
if [ -f ~/.zshrc ]; then
    PROFILE_FILE="~/.zshrc"
elif [ -f ~/.bash_profile ]; then
    PROFILE_FILE="~/.bash_profile"
else
    PROFILE_FILE="~/.zshrc"
    touch ~/.zshrc
fi

echo -e "${YELLOW}Configuring environment variables...${NC}"

# Add Flutter and Android SDK to PATH
if ! grep -q "export ANDROID_HOME" ~/.zshrc; then
    cat >> ~/.zshrc << 'EOF'

# Android SDK
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin

# Flutter
export PATH=$PATH:$HOME/flutter/bin
EOF
fi

# Source the profile
source ~/.zshrc

# Accept Android licenses
echo -e "${YELLOW}Accepting Android licenses...${NC}"
flutter doctor --android-licenses || true

# Run Flutter doctor
echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "Running Flutter doctor..."
flutter doctor

echo ""
echo "======================================"
echo -e "${GREEN}✓ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Open Android Studio and install an Android emulator"
echo "2. Run: flutter devices"
echo "3. cd to your flutter_app directory"
echo "4. Run: flutter run"
echo ""
echo "If you see issues, run: flutter doctor"
