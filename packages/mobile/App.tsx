// packages/android/FinchAndroid/App.tsx
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider } from '../shared-logic/src/hooks/useAuth';

// Import our screens
import { SplashScreen } from './src/screens/SplashScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { SetupWizardScreen } from './src/screens/SetupWizardScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { TransactionsScreen } from './src/screens/TransactionsScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { ReportsScreen } from './src/screens/ReportsScreen';
import { BudgetScreen } from './src/screens/BudgetScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { AccountSetupGate } from './src/components/AccountSetupGate';
import { useAuth } from '../shared-logic/src/hooks/useAuth';

// This creates the "stack" of screens
const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { user, loading } = useAuth();

  // Debug: Log auth state changes
  useEffect(() => {
    console.log('AppNavigator - Auth state:', { user: user?.uid || 'null', loading });
  }, [user, loading]);

  if (loading) {
    console.log('AppNavigator - Showing loading screen');
    return <SplashScreen />;
  }

  console.log('AppNavigator - Rendering stack for:', user ? 'authenticated' : 'unauthenticated');

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={user ? 'Dashboard' : 'Auth'}
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: '#4F46E5', // primaryBlue
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}>
        {!user ? (
          // Not authenticated - show auth screen
          <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
        ) : (
          // Authenticated - show all screens as stack, Dashboard first
          <>
            <Stack.Screen name="Dashboard" options={{ title: 'Finch', headerShown: false }}>
              {() => (
                <AccountSetupGate>
                  <DashboardScreen />
                </AccountSetupGate>
              )}
            </Stack.Screen>
            <Stack.Screen name="Setup" component={SetupWizardScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Transactions" component={TransactionsScreen} options={{ title: 'Transactions' }} />
            <Stack.Screen name="Calendar" component={CalendarScreen} options={{ title: 'Calendar' }} />
            <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: 'Reports' }} />
            <Stack.Screen name="Budget" component={BudgetScreen} options={{ title: 'Budget' }} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function App(): React.JSX.Element {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}

export default App;