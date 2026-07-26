# WordMind Android

This directory contains the native WordMind Android client.

- UI: Kotlin + Jetpack Compose
- Network: Android `HttpURLConnection`
- Speech: Android `TextToSpeech`
- Backend: `https://word-kind-spell-production.up.railway.app`
- Package: `com.wordmind.app`
- Version: `1.0.2-native` (`versionCode` 3)
- Minimum Android version: Android 6.0 (API 23)

The app does not use Capacitor, Cordova, WebView, Chrome, or another browser
runtime.

## Features

- Login, registration, persistent sessions, and logout
- Shared textbook, unit, tag, and word data from Railway
- Word search, textbook filtering, detail expansion, and native pronunciation
- Per-account learning queues and native spelling review
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
