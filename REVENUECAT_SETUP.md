# RevenueCat Setup Guide

This guide walks you through setting up RevenueCat for cross-platform subscription management in the Finch app.

## Overview

RevenueCat handles:
- ✅ In-app purchase processing for iOS and Android
- ✅ Subscription receipt validation (server-side)
- ✅ Cross-platform subscription sharing (iOS, Android, Web)
- ✅ Free up to $10k MRR

## 1. Create RevenueCat Account

1. Go to [https://www.revenuecat.com/](https://www.revenuecat.com/)
2. Sign up for a free account
3. Create a new project called "Finch"

## 2. Configure App Store Connect (iOS)

### Step 2.1: Create In-App Purchase Products

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Navigate to your Finch app
3. Go to **Monetization** > **Subscriptions**
4. Create two auto-renewable subscriptions:

   **Monthly Subscription:**
   - Product ID: `finch_premium_monthly`
   - Reference Name: `Finch Premium Monthly`
   - Subscription Group: `premium_subscriptions`
   - Duration: 1 Month
   - Price: $4.99/month

   **Yearly Subscription:**
   - Product ID: `finch_premium_yearly`
   - Reference Name: `Finch Premium Yearly`
   - Subscription Group: `premium_subscriptions`
   - Duration: 1 Year
   - Price: $49.99/year

5. Add subscription descriptions, screenshots, and promotional images as required by Apple

### Step 2.2: Get App Store Connect API Key

1. In App Store Connect, go to **Users and Access** > **Integrations** > **App Store Connect API**
2. Click **Generate API Key** or use an existing one
3. Download the `.p8` private key file
4. Note the following:
   - Issuer ID
   - Key ID
   - Private Key (`.p8` file)

### Step 2.3: Configure iOS in RevenueCat

1. Go to your RevenueCat dashboard
2. Navigate to **Project Settings** > **Apps**
3. Click **+ New** to add an iOS app
4. Enter:
   - **App Name:** Finch iOS
   - **Bundle ID:** `com.yourcompany.finch` (your actual bundle ID)
   - **App Store Connect API credentials:**
     - Issuer ID
     - Key ID
     - Upload the `.p8` private key file

5. Copy the **iOS API Key** (starts with `appl_...`)
6. Update [subscriptionService.ts](packages/mobile/src/services/subscriptionService.ts):
   ```typescript
   const REVENUECAT_API_KEY = Platform.select({
     ios: 'appl_YOUR_IOS_KEY', // ← Paste your iOS key here
     android: 'goog_YOUR_ANDROID_KEY',
     default: '',
   });
   ```

## 3. Configure Google Play Console (Android)

### Step 3.1: Create In-App Products

1. Go to [Google Play Console](https://play.google.com/console/)
2. Select your Finch app
3. Navigate to **Monetize** > **Products** > **Subscriptions**
4. Create two subscriptions:

   **Monthly Subscription:**
   - Product ID: `finch_premium_monthly`
   - Name: `Finch Premium Monthly`
   - Description: `Premium access with all features`
   - Billing period: 1 Month
   - Price: $4.99

   **Yearly Subscription:**
   - Product ID: `finch_premium_yearly`
   - Name: `Finch Premium Yearly`
   - Description: `Premium access with all features - Save 17%!`
   - Billing period: 1 Year
   - Price: $49.99

### Step 3.2: Configure Service Account

1. In Google Play Console, go to **Setup** > **API access**
2. Link to a Google Cloud project (or create one)
3. Create a **Service Account**
4. Grant the following permissions:
   - **Financial data, orders, and cancellation survey responses**
   - **Admin** (only if you want RevenueCat to handle refunds)
5. Download the JSON key file

### Step 3.3: Configure Android in RevenueCat

1. In RevenueCat dashboard, go to **Project Settings** > **Apps**
2. Click **+ New** to add an Android app
3. Enter:
   - **App Name:** Finch Android
   - **Package Name:** `com.yourcompany.finch` (your actual package name)
   - **Service Account JSON:** Upload the JSON key file from Google Cloud

4. Copy the **Android API Key** (starts with `goog_...`)
5. Update [subscriptionService.ts](packages/mobile/src/services/subscriptionService.ts):
   ```typescript
   const REVENUECAT_API_KEY = Platform.select({
     ios: 'appl_YOUR_IOS_KEY',
     android: 'goog_YOUR_ANDROID_KEY', // ← Paste your Android key here
     default: '',
   });
   ```

## 4. Configure Entitlements & Offerings

### Step 4.1: Create Entitlement

1. In RevenueCat dashboard, go to **Entitlements**
2. Click **+ New**
3. Create an entitlement:
   - **Identifier:** `premium`
   - **Name:** `Premium Access`
   - **Description:** `Access to all premium features`

### Step 4.2: Create Offerings

1. Go to **Offerings** in RevenueCat dashboard
2. Click **+ New**
3. Create the default offering:
   - **Identifier:** `default`
   - **Name:** `Default Offering`
   - **Description:** `Standard subscription options`

4. Add packages to the offering:

   **Monthly Package:**
   - Click **+ Add Package**
   - **Identifier:** `monthly` (use this exact identifier)
   - **Product:** Select `finch_premium_monthly` for both iOS and Android
   - **Entitlement:** `premium`

   **Annual Package:**
   - Click **+ Add Package**
   - **Identifier:** `annual` (use this exact identifier)
   - **Product:** Select `finch_premium_yearly` for both iOS and Android
   - **Entitlement:** `premium`

5. Make this the **Current Offering**

## 5. Initialize RevenueCat in Your App

### Step 5.1: Update App.tsx

Add RevenueCat initialization in your `App.tsx` or main app component:

```typescript
import { initializeRevenueCat } from './services/subscriptionService';

// Inside your app component, after user authentication:
useEffect(() => {
  if (user?.uid) {
    initializeRevenueCat(user.uid).catch(error => {
      console.error('Failed to initialize RevenueCat:', error);
    });
  }
}, [user]);
```

### Step 5.2: Add Listener for Subscription Updates

To keep subscription status in sync automatically:

```typescript
import { addCustomerInfoUpdateListener } from './services/subscriptionService';

useEffect(() => {
  if (user?.uid) {
    addCustomerInfoUpdateListener(user.uid, (customerInfo) => {
      console.log('Subscription status updated:', customerInfo);
      // Optionally trigger a UI refresh here
    });
  }
}, [user]);
```

## 6. Firestore Structure

RevenueCat syncs subscription data to Firestore at:

```
/users/{userId}/subscription/current
```

Structure:
```typescript
{
  tier: 'free' | 'premium',
  status: 'active' | 'trial' | 'expired' | 'cancelled' | 'none',
  productId?: string,
  platform?: 'ios' | 'android' | 'web',
  trialEndsAt?: Timestamp,
  currentPeriodEnd?: Timestamp,
  cancelledAt?: Timestamp,
  updatedAt: Timestamp
}
```

## 7. Testing

### Test with Sandbox Accounts

**iOS:**
1. Create a Sandbox tester account in App Store Connect
2. Sign out of your Apple ID on the test device
3. When prompted during purchase, use your sandbox account

**Android:**
1. Add test users in Google Play Console under **Setup** > **License Testing**
2. Use those Google accounts on your test device

### Test Free Trial

The 30-day free trial is managed separately in Firestore (no RevenueCat involved):

```typescript
import { startFreeTrial } from './services/subscriptionService';

// Trigger the trial
await startFreeTrial(userId);
```

This creates a trial subscription in Firestore that expires in 30 days.

## 8. Production Checklist

Before launching:

- [ ] Create real products in App Store Connect and Google Play Console
- [ ] Configure RevenueCat with production API keys
- [ ] Update `subscriptionService.ts` with real API keys
- [ ] Test end-to-end purchase flow on both platforms
- [ ] Test subscription restoration (`restorePurchases`)
- [ ] Test cross-platform subscription sharing
- [ ] Configure webhooks in RevenueCat (optional, for additional events)
- [ ] Review App Store and Google Play subscription guidelines
- [ ] Add subscription management links to settings screen
- [ ] Add privacy policy and terms of service links

## 9. Premium Feature Gates

Premium features are gated using these functions:

```typescript
import { hasPremiumAccess, canAddAccount, canUsePlaid } from './services/subscriptionService';

// Check general premium access
const isPremium = await hasPremiumAccess(userId);

// Check if user can add another account (free = 1, premium = unlimited)
const canAdd = await canAddAccount(userId, currentAccountCount);

// Check if user can use Plaid (premium only)
const canUse = await canUsePlaid(userId);
```

Example usage in [DashboardConcept4.tsx](packages/mobile/src/screens/DashboardConcept4.tsx):

```typescript
const handleAddManualAccount = async () => {
  const canAdd = await canAddAccount(user.uid, accounts.length);
  if (!canAdd) {
    // Show premium upgrade modal
    setPremiumFeature('Multiple Accounts');
    setShowPremiumUpgrade(true);
    return;
  }
  // Proceed with adding account
  setShowManageAccount(true);
};
```

## 10. Resources

- [RevenueCat Documentation](https://www.revenuecat.com/docs)
- [React Native SDK Quickstart](https://www.revenuecat.com/docs/getting-started/quickstart/react-native)
- [App Store Connect](https://appstoreconnect.apple.com/)
- [Google Play Console](https://play.google.com/console/)
- [RevenueCat Dashboard](https://app.revenuecat.com/)

## Support

If you encounter issues:
1. Check [RevenueCat Community](https://community.revenuecat.com/)
2. Review logs in RevenueCat dashboard under **Customer View**
3. Enable debug logging in development:
   ```typescript
   import Purchases, { LOG_LEVEL } from 'react-native-purchases';
   await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
   ```
