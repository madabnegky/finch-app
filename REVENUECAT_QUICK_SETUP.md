# RevenueCat Quick Setup Guide

This is your step-by-step checklist for setting up RevenueCat subscriptions in Finch.

---

## ✅ Checklist

### Part 1: Account Setup (5 min)
- [ ] Create account at https://www.revenuecat.com/
- [ ] Create new project named "Finch"

---

### Part 2: iOS Setup (20 min)

#### App Store Connect - Create Products
- [ ] Go to https://appstoreconnect.apple.com/
- [ ] Navigate to your app → Features → In-App Purchases
- [ ] Create Subscription Group: `Premium Subscriptions`
- [ ] Create Monthly Subscription:
  - Product ID: `finch_premium_monthly`
  - Price: $4.99/month
  - Add descriptions and save
- [ ] Create Yearly Subscription:
  - Product ID: `finch_premium_yearly`
  - Price: $49.99/year
  - Add descriptions and save

#### App Store Connect - API Key
- [ ] Go to Users and Access → Integrations → App Store Connect API
- [ ] Generate API Key (or use existing)
- [ ] Download .p8 file (⚠️ only downloadable once!)
- [ ] Save these values:
  ```
  Issuer ID: _________________________________
  Key ID: _____________________________________
  .p8 file location: __________________________
  ```

#### RevenueCat - Connect iOS
- [ ] In RevenueCat Dashboard → Apps → + New
- [ ] Select "Apple App Store"
- [ ] App Name: `Finch iOS`
- [ ] Bundle ID: (check Xcode project settings)
- [ ] Upload App Store Connect API credentials
- [ ] Copy iOS API Key:
  ```
  iOS API Key: appl________________________________
  ```

---

### Part 3: Android Setup (20 min)

#### Google Play Console - Create Products
- [ ] Go to https://play.google.com/console/
- [ ] Navigate to Monetize → Products → Subscriptions
- [ ] Create Monthly Subscription:
  - Product ID: `finch_premium_monthly` (must match iOS!)
  - Price: $4.99
  - Activate
- [ ] Create Yearly Subscription:
  - Product ID: `finch_premium_yearly` (must match iOS!)
  - Price: $49.99
  - Activate

#### Google Cloud - Service Account
- [ ] In Play Console → Setup → API access
- [ ] Link to Google Cloud project (or create new)
- [ ] Create service account in Google Cloud Console
- [ ] Generate JSON key file and download
- [ ] In Play Console, grant access with permissions:
  - View financial data ✓
  - Manage orders ✓

#### RevenueCat - Connect Android
- [ ] In RevenueCat Dashboard → Apps → + New
- [ ] Select "Google Play Store"
- [ ] App Name: `Finch Android`
- [ ] Package Name: (check android/app/build.gradle)
- [ ] Upload JSON service account key
- [ ] Copy Android API Key:
  ```
  Android API Key: goog________________________________
  ```

---

### Part 4: RevenueCat Configuration (10 min)

#### Create Entitlement
- [ ] RevenueCat Dashboard → Entitlements → + New
- [ ] Identifier: `premium` (⚠️ must be exact!)
- [ ] Display Name: `Premium Access`
- [ ] Save

#### Create Offering
- [ ] RevenueCat Dashboard → Offerings → + New
- [ ] Identifier: `default`
- [ ] Add Monthly Package:
  - Identifier: `monthly` (⚠️ must be exact!)
  - iOS Product: `finch_premium_monthly`
  - Android Product: `finch_premium_monthly`
  - Entitlement: `premium`
- [ ] Add Yearly Package:
  - Identifier: `annual` (⚠️ must be exact!)
  - iOS Product: `finch_premium_yearly`
  - Android Product: `finch_premium_yearly`
  - Entitlement: `premium`
- [ ] Click "Make Current"

---

### Part 5: Update Code (5 min)

#### Update API Keys
- [ ] Open `packages/mobile/src/services/subscriptionService.ts` (line 12-16)
- [ ] Replace with your actual keys:
  ```typescript
  const REVENUECAT_API_KEY = Platform.select({
    ios: 'appl_YOUR_IOS_KEY',      // ← Paste from Part 2
    android: 'goog_YOUR_ANDROID_KEY', // ← Paste from Part 3
    default: '',
  });
  ```
- [ ] Save file

#### Verify App.tsx Integration
- [ ] Open `packages/mobile/App.tsx`
- [ ] Confirm RevenueCat initialization is present (line 207-216)
- [ ] Should see: `initializeRevenueCat(user.uid)` when user logs in

---

### Part 6: Testing (15 min)

#### iOS Testing
- [ ] Create sandbox tester in App Store Connect
- [ ] Build and run app on device
- [ ] Sign out of Apple ID in Settings
- [ ] Try to upgrade to premium in app
- [ ] Sign in with sandbox account when prompted
- [ ] Verify subscription appears in Settings countdown

#### Android Testing
- [ ] Add test email to Google Play Console license testers
- [ ] Build and run app on device
- [ ] Try to upgrade to premium in app
- [ ] Complete test purchase
- [ ] Verify subscription appears in Settings countdown

#### Verify Both
- [ ] Check RevenueCat Dashboard → Customer View for test purchases
- [ ] Verify Firestore has subscription data at `/users/{userId}/subscription/current`
- [ ] Test restore purchases on second device
- [ ] Test 30-day free trial (no payment required)

---

## 🎯 Quick Reference

### Important Identifiers (Must Be Exact!)
```
Product IDs:
  - finch_premium_monthly
  - finch_premium_yearly

RevenueCat Identifiers:
  - Entitlement: premium
  - Packages: monthly, annual
  - Offering: default
```

### Where Things Live

**API Keys:**
- `packages/mobile/src/services/subscriptionService.ts` (line 12)

**Initialization:**
- `packages/mobile/App.tsx` (line 207-216)

**UI Components:**
- Premium Status Card: `packages/mobile/src/components/PremiumStatusCard.tsx`
- Upgrade Modal: `packages/mobile/src/components/PremiumUpgradeModal.tsx`
- Settings Screen: `packages/mobile/src/screens/SettingsScreen.tsx`

**Firestore Structure:**
```
/users/{userId}/subscription/current
  - tier: 'free' | 'premium'
  - status: 'active' | 'trial' | 'cancelled' | 'none'
  - currentPeriodEnd: Timestamp
  - trialEndsAt: Timestamp (for free trials)
```

---

## 🚨 Common Issues

**"No offerings available"**
- Make sure offering is set to "Current" in RevenueCat Dashboard
- Check that package identifiers are exactly `monthly` and `annual`
- Verify products are active in App Store Connect / Play Console

**"Invalid API key"**
- Double-check you copied the correct key (iOS vs Android)
- Make sure you pasted the FULL key including `appl_` or `goog_` prefix
- Rebuild the app after changing keys

**Purchases not syncing**
- Check RevenueCat Dashboard → Customer View
- Verify App Store Connect API / Play Console service account permissions
- Check Firestore rules allow writing to `/users/{userId}/subscription/current`

**Sandbox purchases not working**
- iOS: Must sign out of real Apple ID in device Settings first
- Android: Test email must be added to license testers
- Wait a few minutes for RevenueCat to sync new products

---

## 📚 Full Documentation

For detailed explanations, see:
- [REVENUECAT_SETUP.md](./REVENUECAT_SETUP.md) - Complete setup guide
- [RevenueCat Docs](https://www.revenuecat.com/docs)
- [React Native SDK](https://www.revenuecat.com/docs/getting-started/quickstart/react-native)

---

## ✨ After Setup

Once everything is working:

1. **Remove test subscriptions** before production:
   - iOS: Sandbox purchases expire faster (auto-renew for testing)
   - Android: Cancel test subscriptions in Play Console

2. **Production checklist:**
   - Update privacy policy with subscription info
   - Add subscription management links to Settings
   - Test subscription restoration on multiple devices
   - Configure webhooks in RevenueCat (optional)
   - Set up email notifications for failed payments (RevenueCat can do this)

3. **Monitor:**
   - RevenueCat Dashboard for analytics
   - Firestore for subscription data
   - App Store Connect / Play Console for reviews about billing

---

**Need help?** Check the [RevenueCat Community](https://community.revenuecat.com/) or review app logs for errors.
