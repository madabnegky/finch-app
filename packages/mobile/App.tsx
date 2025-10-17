// packages/android/FinchAndroid/App.tsx
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider } from '../shared-logic/src/hooks/useAuth';

// Import our new screens
import { SplashScreen } from './src/screens/SplashScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { SetupWizardScreen } from './src/screens/SetupWizardScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
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
        screenOptions={{
          headerShown: false, // This hides the header bar at the top
        }}>
        {!user ? (
          // Not authenticated - show splash and welcome screens
          <>
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
          </>
        ) : (
          // Authenticated - show setup and dashboard screens
          <>
            <Stack.Screen name="Setup" component={SetupWizardScreen} />
            <Stack.Screen name="Dashboard">
              {() => (
                <AccountSetupGate>
                  <DashboardScreen />
                </AccountSetupGate>
              )}
            </Stack.Screen>
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