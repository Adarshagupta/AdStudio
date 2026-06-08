# Android Setup Guide for Ad Studio Flutter App

## Prerequisites

Before running the Android app, you need to install:

1. **Flutter SDK** (v3.0+)
2. **Android Studio** (with SDK)
3. **Java JDK** (11 or 17)
4. **Android Emulator** or physical device

## Quick Setup (macOS)

### Option 1: Automated Setup

Run the setup script:
```bash
cd "/Users/prazwol/Documents/New project"
chmod +x setup_flutter.sh
./setup_flutter.sh
```

### Option 2: Manual Setup

#### Step 1: Install Homebrew
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

#### Step 2: Install Java
```bash
brew install --cask adoptopenjdk/openjdk/adoptopenjdk11
```

#### Step 3: Install Flutter
```bash
brew install flutter
```

#### Step 4: Install Android SDK
```bash
brew install --cask android-sdk
brew install --cask android-studio
```

#### Step 5: Configure Environment

Add to `~/.zshrc` or `~/.bash_profile`:
```bash
# Android SDK
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin

# Flutter
export PATH=$PATH:$HOME/flutter/bin
```

Then reload:
```bash
source ~/.zshrc
```

#### Step 6: Accept Android Licenses
```bash
flutter doctor --android-licenses
```

## Project Configuration

### 1. Create local.properties

Create `flutter_app/android/local.properties`:
```properties
flutter.sdk=/path/to/your/flutter/sdk
flutter.versionName=1.0.0
flutter.versionCode=1
flutter.buildMode=debug
```

**Example for macOS with Homebrew:**
```properties
flutter.sdk=/opt/homebrew/Caskroom/flutter/3.16.0/flutter
flutter.versionName=1.0.0
flutter.versionCode=1
flutter.buildMode=debug
```

**To find your Flutter SDK path:**
```bash
which flutter
# or
flutter --version
```

### 2. Verify Setup

```bash
flutter doctor
```

You should see:
- [✓] Flutter (Channel stable, ...)
- [✓] Android toolchain - develop for Android devices
- [✓] Android Studio (version ...)
- [✓] Connected device (1 available)

## Running the App

### Option 1: Using VS Code
1. Open the `flutter_app` folder in VS Code
2. Install the Flutter extension
3. Press F5 or click "Run > Start Debugging"
4. Select an Android device

### Option 2: Using Terminal
```bash
cd "/Users/prazwol/Documents/New project/flutter_app"

# Get dependencies
flutter pub get

# List available devices
flutter devices

# Run on Android
flutter run

# Run in release mode
flutter run --release

# Build APK
flutter build apk

# Build App Bundle
flutter build appbundle
```

### Option 3: Using Android Studio
1. Open Android Studio
2. Select "Open an Existing Project"
3. Navigate to `flutter_app/android`
4. Wait for Gradle sync
5. Click the Run button (▶)

## Troubleshooting

### Issue: `flutter command not found`
**Solution:** Add Flutter to PATH:
```bash
echo 'export PATH="$PATH:'$(dirname $(which flutter))'"' >> ~/.zshrc
source ~/.zshrc
```

### Issue: `JAVA_HOME not set`
**Solution:**
```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 11)
```

### Issue: `Android SDK not found`
**Solution:**
```bash
flutter config --android-sdk $HOME/Library/Android/sdk
```

### Issue: `Gradle sync failed`
**Solution:**
```bash
cd flutter_app/android
./gradlew clean
./gradlew build
```

### Issue: `Cannot find compatible Android device`
**Solution:** 
1. Open Android Studio
2. Go to Tools > Device Manager
3. Create a new Virtual Device (Pixel 4 API 33)
4. Start the emulator

### Issue: `minSdkVersion error`
The app requires `minSdkVersion 21` (Android 5.0). Ensure your emulator/device meets this.

### Issue: `MultiDex error`
Already configured in build.gradle with `multiDexEnabled true`.

## Device Requirements

- **Minimum Android Version:** 5.0 (API 21)
- **Recommended Android Version:** 10.0+ (API 29+)
- **Minimum RAM:** 2GB
- **Storage:** 100MB

## Features Tested on Android

- ✅ Authentication (Login/Signup)
- ✅ AI Chat with image/video generation
- ✅ File upload (images & videos)
- ✅ Video playback
- ✅ Navigation with Go Router
- ✅ Real-time chat status
- ✅ Offline storage with SharedPreferences

## Build Configurations

### Debug Build
```bash
flutter build apk --debug
```
Output: `build/app/outputs/flutter-apk/app-debug.apk`

### Release Build
```bash
flutter build apk --release
```
Output: `build/app/outputs/flutter-apk/app-release.apk`

### App Bundle (for Play Store)
```bash
flutter build appbundle
```
Output: `build/app/outputs/bundle/release/app-release.aab`

## Signing for Release

Create `flutter_app/android/key.properties`:
```properties
storePassword=your_password
keyPassword=your_password
keyAlias=upload
storeFile=your_keystore.jks
```

Generate keystore:
```bash
keytool -genkey -v -keystore ~/upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

## Additional Resources

- [Flutter Android Setup](https://docs.flutter.dev/get-started/install/macos/android)
- [Flutter Build Modes](https://docs.flutter.dev/testing/build-modes)
- [Android Studio Emulator](https://developer.android.com/studio/run/emulator)

## Next Steps

1. ✅ Install Flutter & Android SDK
2. ✅ Configure local.properties
3. ✅ Run `flutter pub get`
4. ✅ Start Android emulator
5. ✅ Run `flutter run`
6. 🚀 Your app is live!
