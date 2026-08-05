# 词音岛 Android

This directory contains the native 词音岛 Android client.

- UI: Kotlin + Jetpack Compose
- Network: Android `HttpURLConnection`
- Speech: Android `TextToSpeech`
- Backend: `https://121.43.35.47`
- Package: `com.wordmind.app`
- Version: `1.0.9-native` (`versionCode` 10)
- Minimum Android version: Android 6.0 (API 23)

The app does not use Capacitor, Cordova, WebView, Chrome, or another browser
runtime.

## Features

- Login, registration, persistent sessions, and logout
- Shared textbook, unit, tag, and word data from Alibaba Cloud ECS
- Native phonics library with alphabetically sorted letter patterns and a
  British-English 44-sound IPA guide with spoken examples
- Compact word search, textbook/unit/tag filtering, latest/oldest/alphabetical
  sorting, clickable tag details, word detail expansion, and native pronunciation
- Cross-device daily word selection and four native practice modes: letter
  blocks, fill-in-the-blank, speed challenge, and dictation
- Admin word, textbook, unit, and tag management

## Build

Use JDK 17 and Android SDK 35:

```bash
cd android
./gradlew assembleDebug
```

The signed debug APK is generated at:

```text
app/build/outputs/apk/debug/app-debug.apk
```

With a phone connected over ADB, install it with:

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

For public distribution, configure a private release signing key and build an
Android App Bundle with `./gradlew bundleRelease`.
