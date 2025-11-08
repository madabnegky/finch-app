// packages/mobile/src/services/subscriptionService.ts
import Purchases, {
  PurchasesOffering,
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
} from 'react-native-purchases';
import firestore from '@react-native-firebase/firestore';
import { Platform } from 'react-native';

// RevenueCat API Keys (get these from RevenueCat dashboard)
const REVENUECAT_API_KEY = Platform.select({
  ios: 'appl_YOUR_IOS_KEY', // Replace with your iOS key
  android: 'goog_YOUR_ANDROID_KEY', // Replace with your Android key
  default: '',
});

export type SubscriptionTier = 'free' | 'premium';
export type SubscriptionStatus = 'active' | 'trial' | 'expired' | 'cancelled' | 'none';

export type SubscriptionData = {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  productId?: string;
  platform?: 'ios' | 'android' | 'web';
  trialEndsAt?: any;
  currentPeriodEnd?: any;
  cancelledAt?: any;
  updatedAt?: any;
};

/**
 * Initialize RevenueCat SDK
 * Call this once when the app starts
 */
export async function initializeRevenueCat(userId: string): Promise<void> {
  try {
    if (!REVENUECAT_API_KEY) {
      console.warn('⚠️ RevenueCat API key not configured');
      return;
    }

    // Configure RevenueCat
    Purchases.configure({
      apiKey: REVENUECAT_API_KEY!,
      appUserID: userId, // Use your Firebase UID
    });

    // Set debug mode in development
    if (__DEV__) {
      await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    console.log('✅ RevenueCat initialized for user:', userId);

    // Sync initial subscription status
    await syncSubscriptionStatus(userId);
  } catch (error) {
    console.error('❌ Error initializing RevenueCat:', error);
    throw error;
  }
}

/**
 * Get available subscription offerings from RevenueCat
 */
export async function getSubscriptionOfferings(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();

    if (offerings.current !== null) {
      console.log('✅ Available offerings:', offerings.current);
      return offerings.current;
    }

    console.warn('⚠️ No offerings configured in RevenueCat');
    return null;
  } catch (error) {
    console.error('❌ Error fetching offerings:', error);
    return null;
  }
}

/**
 * Purchase a subscription package
 */
export async function purchasePackage(
  userId: string,
  packageToPurchase: PurchasesPackage
): Promise<{ customerInfo: CustomerInfo; success: boolean }> {
  try {
    console.log('🛒 Purchasing package:', packageToPurchase.identifier);

    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);

    // Sync subscription status with Firestore
    await syncSubscriptionStatus(userId);

    console.log('✅ Purchase successful');
    return { customerInfo, success: true };
  } catch (error: any) {
    if (error.userCancelled) {
      console.log('🚫 User cancelled purchase');
      throw { code: 'E_USER_CANCELLED', message: 'User cancelled purchase' };
    }

    console.error('❌ Purchase error:', error);
    throw error;
  }
}

/**
 * Restore previous purchases (for when user reinstalls app or switches devices)
 */
export async function restorePurchases(userId: string): Promise<CustomerInfo> {
  try {
    console.log('🔄 Restoring purchases...');

    const customerInfo = await Purchases.restorePurchases();

    // Sync restored subscription status with Firestore
    await syncSubscriptionStatus(userId);

    console.log('✅ Purchases restored');
    return customerInfo;
  } catch (error) {
    console.error('❌ Error restoring purchases:', error);
    throw error;
  }
}

/**
 * Sync subscription status from RevenueCat to Firestore
 * RevenueCat is the source of truth!
 */
export async function syncSubscriptionStatus(userId: string): Promise<void> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();

    // Check if user has an active subscription
    const hasActiveSubscription =
      typeof customerInfo.entitlements.active['premium'] !== 'undefined';

    const premiumEntitlement = customerInfo.entitlements.active['premium'];

    let subscriptionData: Partial<SubscriptionData>;

    if (hasActiveSubscription && premiumEntitlement) {
      // User has premium access
      const expirationDate = premiumEntitlement.expirationDate
        ? new Date(premiumEntitlement.expirationDate)
        : null;

      const willRenew = premiumEntitlement.willRenew;
      const isInTrial = premiumEntitlement.periodType === 'TRIAL';

      subscriptionData = {
        tier: 'premium',
        status: isInTrial ? 'trial' : willRenew ? 'active' : 'cancelled',
        productId: premiumEntitlement.productIdentifier,
        platform: Platform.OS as 'ios' | 'android',
        currentPeriodEnd: expirationDate
          ? firestore.Timestamp.fromDate(expirationDate)
          : null,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      console.log('✅ Premium subscription active:', subscriptionData);
    } else {
      // User is on free tier
      subscriptionData = {
        tier: 'free',
        status: 'none',
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      console.log('ℹ️ User is on free tier');
    }

    // Update Firestore
    await firestore()
      .collection('users')
      .doc(userId)
      .collection('subscription')
      .doc('current')
      .set(subscriptionData, { merge: true });

  } catch (error) {
    console.error('❌ Error syncing subscription status:', error);
    throw error;
  }
}

/**
 * Check if user has premium access
 * This checks RevenueCat first, then falls back to Firestore
 */
export async function hasPremiumAccess(userId: string): Promise<boolean> {
  try {
    // Always check RevenueCat as source of truth
    const customerInfo = await Purchases.getCustomerInfo();
    const hasActiveSubscription =
      typeof customerInfo.entitlements.active['premium'] !== 'undefined';

    if (hasActiveSubscription) {
      return true;
    }

    // Fallback: Check Firestore (for free trials we manage ourselves)
    const subscriptionDoc = await firestore()
      .collection('users')
      .doc(userId)
      .collection('subscription')
      .doc('current')
      .get();

    if (!subscriptionDoc.exists) {
      return false;
    }

    const data = subscriptionDoc.data() as SubscriptionData;

    // Check if premium tier and active/trial status
    if (data.tier === 'premium' && (data.status === 'active' || data.status === 'trial')) {
      // If trial, check if it's expired
      if (data.status === 'trial' && data.trialEndsAt) {
        const trialEnd = data.trialEndsAt.toDate();
        if (trialEnd < new Date()) {
          return false;
        }
      }
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Error checking premium access:', error);
    return false;
  }
}

/**
 * Start free trial (30 days, no payment required)
 * This is managed by Firestore, not RevenueCat
 */
export async function startFreeTrial(userId: string): Promise<void> {
  try {
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 30); // 30-day trial

    await firestore()
      .collection('users')
      .doc(userId)
      .collection('subscription')
      .doc('current')
      .set({
        tier: 'premium',
        status: 'trial',
        trialEndsAt: firestore.Timestamp.fromDate(trialEndDate),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

    console.log('✅ Free trial started, ends:', trialEndDate);
  } catch (error) {
    console.error('❌ Error starting trial:', error);
    throw error;
  }
}

/**
 * Get subscription data for current user
 */
export async function getSubscriptionData(userId: string): Promise<SubscriptionData | null> {
  try {
    const subscriptionDoc = await firestore()
      .collection('users')
      .doc(userId)
      .collection('subscription')
      .doc('current')
      .get();

    if (!subscriptionDoc.exists) {
      return {
        tier: 'free',
        status: 'none',
      };
    }

    return subscriptionDoc.data() as SubscriptionData;
  } catch (error) {
    console.error('❌ Error fetching subscription:', error);
    return null;
  }
}

/**
 * Check account limit based on subscription tier
 */
export async function canAddAccount(userId: string, currentAccountCount: number): Promise<boolean> {
  const hasAccess = await hasPremiumAccess(userId);

  if (hasAccess) {
    return true; // Premium = unlimited accounts
  }

  return currentAccountCount < 1; // Free = max 1 account
}

/**
 * Check if user can use Plaid (premium only)
 */
export async function canUsePlaid(userId: string): Promise<boolean> {
  return await hasPremiumAccess(userId);
}

/**
 * Get customer info from RevenueCat
 */
export async function getCustomerInfo(): Promise<CustomerInfo> {
  return await Purchases.getCustomerInfo();
}

/**
 * Listen to subscription status changes
 * Call this in your App.tsx to keep subscription status in sync
 */
export function addCustomerInfoUpdateListener(
  userId: string,
  callback: (customerInfo: CustomerInfo) => void
): void {
  Purchases.addCustomerInfoUpdateListener((customerInfo) => {
    console.log('📡 Subscription status changed');
    callback(customerInfo);

    // Sync to Firestore
    syncSubscriptionStatus(userId).catch((error) => {
      console.error('Error syncing after update:', error);
    });
  });
}
