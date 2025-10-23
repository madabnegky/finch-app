import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

/**
 * Completely deletes a user account and all associated data from Firestore
 * This is a critical security and privacy feature required for GDPR compliance
 *
 * Data deleted:
 * - User profile
 * - All transactions
 * - All budgets
 * - All financial goals
 * - All bank account connections
 * - All notification tokens
 * - User preferences
 *
 * @returns Promise that resolves when account and data are deleted
 * @throws Error if deletion fails
 */
export async function deleteUserAccountAndData(): Promise<void> {
  const user = auth().currentUser;

  if (!user) {
    throw new Error('No authenticated user found');
  }

  const userId = user.uid;
  console.log('🗑️ Starting account deletion for user:', userId);

  try {
    // Step 1: Delete all user data from Firestore
    console.log('📦 Deleting Firestore data...');

    // Delete all subcollections and documents
    const batch = firestore().batch();

    // Delete transactions
    const transactionsSnapshot = await firestore()
      .collection('users')
      .doc(userId)
      .collection('transactions')
      .get();

    transactionsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    console.log(`  - Deleting ${transactionsSnapshot.size} transactions`);

    // Delete budgets
    const budgetsSnapshot = await firestore()
      .collection('users')
      .doc(userId)
      .collection('budgets')
      .get();

    budgetsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    console.log(`  - Deleting ${budgetsSnapshot.size} budgets`);

    // Delete goals
    const goalsSnapshot = await firestore()
      .collection('users')
      .doc(userId)
      .collection('goals')
      .get();

    goalsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    console.log(`  - Deleting ${goalsSnapshot.size} goals`);

    // Delete bank accounts
    const accountsSnapshot = await firestore()
      .collection('users')
      .doc(userId)
      .collection('bankAccounts')
      .get();

    accountsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    console.log(`  - Deleting ${accountsSnapshot.size} bank accounts`);

    // Delete notification tokens
    const tokensSnapshot = await firestore()
      .collection('users')
      .doc(userId)
      .collection('notificationTokens')
      .get();

    tokensSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    console.log(`  - Deleting ${tokensSnapshot.size} notification tokens`);

    // Delete categories (if any)
    const categoriesSnapshot = await firestore()
      .collection('users')
      .doc(userId)
      .collection('categories')
      .get();

    categoriesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    console.log(`  - Deleting ${categoriesSnapshot.size} categories`);

    // Delete user preferences
    const preferencesSnapshot = await firestore()
      .collection('users')
      .doc(userId)
      .collection('preferences')
      .get();

    preferencesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    console.log(`  - Deleting ${preferencesSnapshot.size} preferences`);

    // Commit all deletions
    await batch.commit();
    console.log('✅ All subcollection data deleted');

    // Step 2: Delete the main user document
    await firestore()
      .collection('users')
      .doc(userId)
      .delete();
    console.log('✅ User document deleted');

    // Step 3: Delete the Firebase Auth account (this must be last)
    console.log('🔐 Deleting Firebase Auth account...');
    await user.delete();
    console.log('✅ Firebase Auth account deleted');

    console.log('🎉 Account deletion completed successfully');
  } catch (error: any) {
    console.error('❌ Account deletion failed:', error);

    // Provide helpful error messages
    if (error.code === 'auth/requires-recent-login') {
      throw new Error(
        'For security, you must sign in again before deleting your account. Please sign out and sign back in, then try again.'
      );
    }

    throw new Error(
      `Failed to delete account: ${error.message || 'Unknown error'}. Please try again or contact support.`
    );
  }
}

/**
 * Re-authenticates the user before account deletion
 * This is required by Firebase if the user hasn't signed in recently
 *
 * @param email User's email
 * @param password User's password
 */
export async function reauthenticateUser(email: string, password: string): Promise<void> {
  const user = auth().currentUser;

  if (!user || !user.email) {
    throw new Error('No authenticated user found');
  }

  console.log('🔐 Re-authenticating user...');

  const credential = auth.EmailAuthProvider.credential(email, password);
  await user.reauthenticateWithCredential(credential);

  console.log('✅ Re-authentication successful');
}
