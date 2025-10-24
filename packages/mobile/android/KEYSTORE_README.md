# Android Keystore Management

## Production Keystore Information

**⚠️ CRITICAL: Keep this information secure!**

### Keystore Details
- **File**: `finch-release.keystore`
- **Location**: `/packages/mobile/android/app/`
- **Alias**: `finch-release-key`
- **Password**: `FinchSecure2025!`
- **Validity**: 10,000 days (~27 years) until March 2053

### SHA-256 Fingerprint (for Firebase/Google Sign-In)
```
9A:15:D5:E4:2F:CB:EF:0E:DA:D0:B7:9A:FE:CD:F8:F8:CD:FB:53:29:50:19:D9:11:D3:D0:A3:EB:C0:3F:46:5C
```

### SHA-1 Fingerprint
```
75:95:B9:9E:74:3A:B4:64:BD:05:89:6B:09:9C:27:32:E7:07:F9:C2
```

## Important Steps

### 1. Add SHA-256 to Firebase Console
1. Go to Firebase Console → Project Settings
2. Select your Android app
3. Add the SHA-256 fingerprint above
4. Download the new `google-services.json`
5. Replace the file in `/packages/mobile/android/app/`

### 2. Update Google Cloud Console (for Google Sign-In)
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Find your OAuth 2.0 Client ID for Android
3. Add the SHA-256 fingerprint above
4. Save changes

### 3. Backup the Keystore
**CRITICAL**: Back up these files to a secure location:
- `finch-release.keystore`
- `keystore.properties`
- This README file

**If you lose the keystore, you cannot update your app on the Play Store!**

Recommended backup locations:
- Password manager (1Password, LastPass, etc.)
- Encrypted cloud storage (not regular cloud storage!)
- Offline encrypted USB drive

### 4. Building Release APK
```bash
cd /Users/kylechristian/Documents/finch-app/packages/mobile/android
./gradlew assembleRelease
```

The signed APK will be at:
```
app/build/outputs/apk/release/app-release.apk
```

### 5. Building Release AAB (for Play Store)
```bash
cd /Users/kylechristian/Documents/finch-app/packages/mobile/android
./gradlew bundleRelease
```

The signed AAB will be at:
```
app/build/outputs/bundle/release/app-release.aab
```

## Security Notes

- ✅ `keystore.properties` is in `.gitignore` - secrets won't be committed
- ✅ ProGuard/R8 is enabled for code obfuscation
- ✅ Resource shrinking is enabled to reduce APK size
- ⚠️ Never commit the keystore file to version control
- ⚠️ Never share the keystore password publicly
- ⚠️ Use environment variables for CI/CD pipelines

## Changing the Password (if needed)

If you need to change the keystore password:

```bash
keytool -storepasswd -keystore finch-release.keystore
keytool -keypasswd -keystore finch-release.keystore -alias finch-release-key
```

Then update `keystore.properties` with the new passwords.

## Emergency Recovery

If something goes wrong:
1. Check that `keystore.properties` exists and has correct values
2. Verify the keystore file is in `/packages/mobile/android/app/`
3. Test with: `keytool -list -v -keystore finch-release.keystore -alias finch-release-key`
4. If you can't access the keystore, restore from backup immediately

## Contact

For keystore-related emergencies, contact:
- Kyle Christian (kyle.christian@gmail.com)
