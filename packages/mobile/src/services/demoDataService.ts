import firestore from '@react-native-firebase/firestore';

/**
 * Demo Data Service
 * Provides realistic demo data for guest users to explore the app
 */

export const initializeDemoData = async (userId: string) => {
  try {
    console.log('🎬 Initializing demo data for user:', userId);

    // Check if demo data already exists
    const accountsSnapshot = await firestore()
      .collection(`users/${userId}/accounts`)
      .get();

    if (!accountsSnapshot.empty) {
      console.log('✅ Demo data already exists, skipping initialization');
      return;
    }

    // Create demo checking account
    const checkingAccountRef = await firestore()
      .collection(`users/${userId}/accounts`)
      .add({
        name: 'Demo Checking',
        type: 'checking',
        currentBalance: 3250.00,
        cushion: 500.00,
        isPrimary: true,
        isDemo: true,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

    console.log('✅ Created demo checking account:', checkingAccountRef.id);

    // Create demo savings account
    const savingsAccountRef = await firestore()
      .collection(`users/${userId}/accounts`)
      .add({
        name: 'Demo Savings',
        type: 'savings',
        currentBalance: 8500.00,
        cushion: 0,
        isPrimary: false,
        isDemo: true,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

    console.log('✅ Created demo savings account:', savingsAccountRef.id);

    // Create demo recurring transactions
    const today = new Date();
    const getNextDate = (daysFromToday: number) => {
      const date = new Date(today);
      date.setDate(date.getDate() + daysFromToday);
      return firestore.Timestamp.fromDate(date);
    };

    const demoTransactions = [
      // Income
      {
        name: 'Salary',
        description: 'Bi-weekly paycheck',
        amount: 2400.00,
        type: 'income',
        category: 'Salary',
        date: getNextDate(7),
        accountId: checkingAccountRef.id,
        isRecurring: true,
        frequency: 'biweekly',
      },
      // Recurring expenses
      {
        name: 'Rent',
        description: 'Monthly rent payment',
        amount: -1200.00,
        type: 'expense',
        category: 'Housing',
        date: getNextDate(3),
        accountId: checkingAccountRef.id,
        isRecurring: true,
        frequency: 'monthly',
      },
      {
        name: 'Electric Bill',
        description: 'Monthly electricity',
        amount: -85.00,
        type: 'expense',
        category: 'Utilities',
        date: getNextDate(10),
        accountId: checkingAccountRef.id,
        isRecurring: true,
        frequency: 'monthly',
      },
      {
        name: 'Internet',
        description: 'Home internet service',
        amount: -60.00,
        type: 'expense',
        category: 'Utilities',
        date: getNextDate(15),
        accountId: checkingAccountRef.id,
        isRecurring: true,
        frequency: 'monthly',
      },
      {
        name: 'Spotify Premium',
        description: 'Music streaming',
        amount: -10.99,
        type: 'expense',
        category: 'Entertainment',
        date: getNextDate(5),
        accountId: checkingAccountRef.id,
        isRecurring: true,
        frequency: 'monthly',
      },
      {
        name: 'Netflix',
        description: 'Streaming service',
        amount: -15.99,
        type: 'expense',
        category: 'Entertainment',
        date: getNextDate(8),
        accountId: checkingAccountRef.id,
        isRecurring: true,
        frequency: 'monthly',
      },
      {
        name: 'Car Insurance',
        description: 'Monthly auto insurance',
        amount: -120.00,
        type: 'expense',
        category: 'Insurance',
        date: getNextDate(12),
        accountId: checkingAccountRef.id,
        isRecurring: true,
        frequency: 'monthly',
      },
      {
        name: 'Gym Membership',
        description: 'Monthly gym fee',
        amount: -35.00,
        type: 'expense',
        category: 'Health',
        date: getNextDate(6),
        accountId: checkingAccountRef.id,
        isRecurring: true,
        frequency: 'monthly',
      },
      {
        name: 'Groceries',
        description: 'Weekly grocery shopping',
        amount: -120.00,
        type: 'expense',
        category: 'Food',
        date: getNextDate(2),
        accountId: checkingAccountRef.id,
        isRecurring: true,
        frequency: 'weekly',
      },
    ];

    for (const transaction of demoTransactions) {
      await firestore()
        .collection(`users/${userId}/transactions`)
        .add({
          ...transaction,
          isDemo: true,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
    }

    console.log(`✅ Created ${demoTransactions.length} demo transactions`);

    // Create demo goals
    const demoGoals = [
      {
        name: 'Emergency Fund',
        targetAmount: 10000.00,
        allocatedAmount: 2500.00,
        accountId: savingsAccountRef.id,
        isDemo: true,
        createdAt: firestore.FieldValue.serverTimestamp(),
      },
      {
        name: 'Vacation to Hawaii',
        targetAmount: 4000.00,
        allocatedAmount: 800.00,
        accountId: savingsAccountRef.id,
        isDemo: true,
        createdAt: firestore.FieldValue.serverTimestamp(),
      },
      {
        name: 'New Laptop',
        targetAmount: 1500.00,
        allocatedAmount: 350.00,
        accountId: checkingAccountRef.id,
        isDemo: true,
        createdAt: firestore.FieldValue.serverTimestamp(),
      },
    ];

    for (const goal of demoGoals) {
      await firestore()
        .collection(`users/${userId}/goals`)
        .add(goal);
    }

    console.log(`✅ Created ${demoGoals.length} demo goals`);
    console.log('🎉 Demo data initialization complete!');

  } catch (error) {
    console.error('❌ Error initializing demo data:', error);
    throw error;
  }
};

export const clearDemoData = async (userId: string) => {
  try {
    console.log('🧹 Clearing demo data for user:', userId);

    const batch = firestore().batch();

    // Delete only demo accounts (isDemo: true)
    const accountsSnapshot = await firestore()
      .collection(`users/${userId}/accounts`)
      .where('isDemo', '==', true)
      .get();

    accountsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete only demo transactions (isDemo: true)
    const transactionsSnapshot = await firestore()
      .collection(`users/${userId}/transactions`)
      .where('isDemo', '==', true)
      .get();

    transactionsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete only demo goals (isDemo: true)
    const goalsSnapshot = await firestore()
      .collection(`users/${userId}/goals`)
      .where('isDemo', '==', true)
      .get();

    goalsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Commit all deletes in a single batch
    await batch.commit();

    console.log('✅ Demo data cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing demo data:', error);
    throw error;
  }
};
