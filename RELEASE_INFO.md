# Umingle Release Information

This file contains critical information for generating production builds (APK/AAB) for the Umingle Android application.

## 🔑 Keystore Credentials
These credentials are used to sign the production app. **Do not lose the `android/app/release.keystore` file**, as you will need it for all future Play Store updates.

| Field | Value |
|-------|-------|
| **Keystore File** | `android/app/release.keystore` |
| **Store Password** | `umingleapp123` |
| **Key Alias** | `umingleapp` |
| **Key Password** | `umingleapp123` |

## 🛡️ Fingerprints (SHA Keys)
Add these to your Firebase / Google Cloud Console for Google Sign-In to work.

### Production (Release)
- **SHA-1**: `13:56:19:97:32:89:8B:60:E7:FD:14:4B:6A:3E:22:47:A2:85:BA:44`
- **SHA-256**: `06:1B:8A:D5:39:B2:43:F2:E7:62:91:0A:1B:CA:B7:CD:24:EE:23:BB:BD:EE:E1:C7:67:DC:90:3B:E3:74:20:BD`

### Development (Debug)
- **SHA-1**: `62:89:AF:A1:08:C5:5E:D5:B1:58:02:0A:7D:D6:5C:9A:E9:10:01:BA`
- **SHA-256**: `E1:F5:DC:C6:E2:B1:01:8C:01:B1:76:09:30:88:A7:46:E7:3D:08:2F:32:0D:F1:7B:7D:AB:96:C2:3D:75:35:2D`

> [!IMPORTANT]
> These values are also stored in the `keystore.properties` file in the root directory, which the Gradle build system reads automatically.

## 📦 Build Commands
To generate new release files, run the following commands from the project root:

1. **Navigate to Android directory**:
   ```bash
   cd android
   ```

2. **Clean and Build APK & AAB**:
   ```bash
   ./gradlew clean assembleRelease bundleRelease
   ```

## 📂 Output Locations
- **APK (Direct Install)**: `android/app/build/outputs/apk/release/app-release.apk`
- **AAB (Play Store)**: `android/app/build/outputs/bundle/release/app-release.aab`

---
*Created on: 2026-02-03*
