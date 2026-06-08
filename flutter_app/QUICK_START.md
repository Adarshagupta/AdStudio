# Android App - Quick Start

## Project Structure

```
flutter_app/
├── android/                    # Android-specific files
│   ├── app/
│   │   ├── build.gradle         # App build config
│   │   ├── proguard-rules.pro   # ProGuard rules
│   │   └── src/main/
│   │       ├── AndroidManifest.xml    # App permissions
│   │       ├── kotlin/com/adstudio/app/
│   │       │   └── MainActivity.kt     # Entry point
│   │       └── res/             # Resources
│   ├── build.gradle             # Root build config
│   ├── gradle.properties        # Gradle settings
│   ├── settings.gradle          # Plugin settings
│   └── gradlew                  # Gradle wrapper
├── lib/                         # Flutter code
│   ├── main.dart               # App entry
│   ├── core/                   # Theme & Router
│   ├── models/                 # Data models
│   ├── providers/              # State management
│   ├── screens/                # All screens
│   └── services/               # API service
└── pubspec.yaml                # Dependencies
```

## Step-by-Step Setup

### Step 1: Install Flutter SDK

**Using Homebrew (Recommended):**
```bash
# Install Homebrew if not installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Java
brew install --cask adoptopenjdk11

# Install Flutter
brew install flutter

# Install Android SDK
brew install --cask android-sdk
brew install --cask android-studio
```

**Or download manually:**
1. Download Flutter from: https://docs.flutter.dev/get-started/install
2. Extract to `~/development/flutter`
3. Add to PATH: `export PATH="$PATH:$HOME/development/flutter/bin"`

### Step 2: Configure Environment

Add to `~/.zshrc` (or `~/.bash_profile`):
```bash
# Flutter
export PATH="$PATH:$HOME/development/flutter/bin"

# Android SDK
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/emulator"
export PATH="$PATH:$ANDROID_HOME/platform-tools"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin"

# Java
export JAVA_HOME=$(/usr/libexec/java_home -v 11)
```

Reload:
```bash
source ~/.zshrc
```

### Step 3: Verify Flutter

```bash
flutter doctor
```

Expected output:
```
[✓] Flutter (Channel stable, 3.16.0, ...)
[✓] Android toolchain - develop for Android devices
[✓] Android Studio (version 2023.1)
[✓] Connected device (1 available)
```

### Step 4: Configure Project

1. Create `local.properties`:
```bash
cd "/Users/prazwol/Documents/New project/flutter_app/android"
```

Create `local.properties` file:
```properties
flutter.sdk=/path/to/flutter/sdk
flutter.versionName=1.0.0
flutter.versionCode=1
flutter.buildMode=debug
```

**Find your Flutter SDK path:**
```bash
which flutter
# Example: /Users/prazwol/development/flutter/bin/flutter
# So SDK path is: /Users/prazwol/development/flutter
```

### Step 5: Install Dependencies

```bash
cd "/Users/prazwol/Documents/New project/flutter_app"
flutter pub get
```

### Step 6: Start Android Emulator

**Option A: Using Android Studio**
1. Open Android Studio
2. Tools → Device Manager
3. Create Device → Pixel 4 → API 33
4. Click Start

**Option B: Using Command Line**
```bash
# List available emulators
flutter emulators

# Launch emulator
flutter emulators --launch Pixel_4_API_33

# Or use Android SDK emulator
$ANDROID_HOME/emulator/emulator -list-avds
$ANDROID_HOME/emulator/emulator -avd Pixel_4_API_33
```

### Step 7: Run the App

```bash
cd "/Users/prazwol/Documents/New project/flutter_app"

# Run on connected device/emulator
flutter run

# Or specify device
flutter run -d emulator-5554

# Run in release mode
flutter run --release

# Build APK
flutter build apk

# Build App Bundle for Play Store
flutter build appbundle
```

## Common Commands

```bash
# Get dependencies
flutter pub get

# Check setup
flutter doctor

# List devices
flutter devices

# Run with hot reload
flutter run

# Build release APK
flutter build apk --release

# Build App Bundle
flutter build appbundle

# Clean build
flutter clean

# Run tests
flutter test

# Analyze code
flutter analyze
```

## Troubleshooting

### Issue: `flutter: command not found`
```bash
# Add Flutter to PATH
echo 'export PATH="$PATH:$HOME/development/flutter/bin"' >> ~/.zshrc
source ~/.zshrc
```

### Issue: `JAVA_HOME not set`
```bash
# Find Java home
/usr/libexec/java_home -v 11

# Set it
export JAVA_HOME=$(/usr/libexec/java_home -v 11)
```

### Issue: `Android SDK not found`
```bash
# Configure Android SDK path
flutter config --android-sdk $HOME/Library/Android/sdk

# Install command line tools
mkdir -p ~/Library/Android/sdk/cmdline-tools
cd ~/Library/Android/sdk/cmdline-tools
curl -O https://dl.google.com/android/repository/commandlinetools-mac-11076708_latest.zip
unzip commandlinetools-mac-11076708_latest.zip
mv cmdline-tools latest
rm commandlinetools-mac-11076708_latest.zip

# Accept licenses
flutter doctor --android-licenses
```

### Issue: `Gradle sync failed`
```bash
cd "/Users/prazwol/Documents/New project/flutter_app/android"
./gradlew clean
./gradlew build
```

### Issue: `Cannot find compatible Android device`
```bash
# List devices
flutter devices

# If no devices, start emulator
flutter emulators --launch <emulator_id>

# Or connect physical device with USB debugging enabled
```

## App Features

Once running, the app provides:

- **Landing Page** - App overview with gradient design
- **Login/Signup** - Full authentication with validation
- **Dashboard** - AI chat sessions, quick actions
- **AI Chat** - Generate videos, images, edit/extend content
- **Generations** - View all generated content with status
- **Studio Pro** - Visual node editor (placeholder)
- **Settings** - Profile, workspace, billing, logout

## API Configuration

The app connects to your production API:
```
Base URL: https://ugc-ad-platform.vercel.app/api
```

Authentication uses session cookies stored in SharedPreferences.

## Next Steps

1. ✅ Install Flutter SDK
2. ✅ Configure `local.properties`
3. ✅ Run `flutter pub get`
4. ✅ Start emulator or connect device
5. ✅ Run `flutter run`
6. 🚀 Test all features

## Support

For issues:
1. Check `flutter doctor` output
2. Review `ANDROID_SETUP.md` for detailed troubleshooting
3. Check Flutter logs: `flutter run --verbose`
