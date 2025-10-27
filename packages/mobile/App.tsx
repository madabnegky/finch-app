// packages/android/FinchAndroid/App.tsx
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { TourGuideProvider } from 'rn-tourguide';
import { AuthProvider } from '../shared-logic/src/hooks/useAuth';
import brandColors from './src/theme/colors';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import crashlytics from '@react-native-firebase/crashlytics';
// import { Alert } from 'react-native'; // Disabled with session timeout
import { GoogleSignin } from '@react-native-google-signin/google-signin';
// import { useSessionTimeout } from './src/hooks/useSessionTimeout'; // Disabled - see AppNavigator
import { CustomTooltip } from './src/components/CustomTooltip';
import {
  registerDeviceForNotifications,
  setupForegroundNotificationHandler,
  setupBackgroundNotificationHandler,
  setupNotificationOpenHandler,
  setupTokenRefreshHandler,
} from './src/services/notificationService';

// Import our screens
import { SplashScreen } from './src/screens/SplashScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { DashboardConcept4 } from './src/screens/DashboardConcept4';
import { GoalsScreen } from './src/screens/GoalsScreen';
import { TransactionsScreen } from './src/screens/TransactionsScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { ReportsScreen } from './src/screens/ReportsScreen';
import { BudgetScreen } from './src/screens/BudgetScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { useAuth } from '../shared-logic/src/hooks/useAuth';
import CustomDrawer from './src/components/CustomDrawer';
import { ErrorBoundary } from './src/components/ErrorBoundary';

// This creates the "stack" of screens and drawer
const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

// Main Drawer Navigator with professional hamburger menu
function MainDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawer {...props} />}
      screenOptions={{
        drawerActiveTintColor: brandColors.orangeAccent,
        drawerInactiveTintColor: brandColors.textGray,
        drawerStyle: {
          backgroundColor: brandColors.white,
          width: 280,
        },
        drawerLabelStyle: {
          fontSize: 16,
          fontWeight: '600',
          marginLeft: 0,
        },
        drawerItemStyle: {
          marginVertical: 4,
          paddingLeft: 8,
        },
        headerStyle: {
          backgroundColor: brandColors.tealDark,
        },
        headerTintColor: brandColors.white,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerShown: true,
        drawerActiveBackgroundColor: brandColors.orangeAccent + '15',
        swipeEnabled: true,
      }}
    >
      <Drawer.Screen
        name="Dashboard"
        component={DashboardConcept4}
        options={{
          headerShown: false,
          drawerIcon: ({ color, size}) => (
            <Icon name="view-dashboard" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Goals"
        component={GoalsScreen}
        options={{
          headerShown: false,
          drawerIcon: ({ color, size }) => (
            <Icon name="flag-variant" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{
          headerShown: false,
          drawerIcon: ({ color, size }) => (
            <Icon name="credit-card" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          headerShown: false,
          drawerIcon: ({ color, size }) => (
            <Icon name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          headerShown: false,
          drawerIcon: ({ color, size }) => (
            <Icon name="chart-bar" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Budget"
        component={BudgetScreen}
        options={{
          headerShown: false,
          drawerIcon: ({ color, size }) => (
            <Icon name="wallet" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerShown: false,
          drawerIcon: ({ color, size }) => (
            <Icon name="cog" size={size} color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
}

function AppNavigator() {
  const { user, loading } = useAuth();

  // Session timeout - DISABLED: Was logging out even during active use
  // TODO: Re-implement with proper user interaction tracking (taps, scrolls, etc.)
  // useSessionTimeout(
  //   () => {
  //     // Warning: 1 minute before logout
  //     Alert.alert(
  //       'Session Expiring',
  //       'Your session will expire in 1 minute due to inactivity. Please interact with the app to stay logged in.',
  //       [{ text: 'OK' }]
  //     );
  //   },
  //   () => {
  //     // Timeout: Session expired
  //     Alert.alert(
  //       'Session Expired',
  //       'You have been logged out due to inactivity for security reasons.',
  //       [{ text: 'OK' }]
  //     );
  //   }
  // );

  // Debug: Log auth state changes
  useEffect(() => {
    console.log('AppNavigator - Auth state:', { user: user?.uid || 'null', loading });
  }, [user, loading]);

  // Setup push notifications when user logs in
  useEffect(() => {
    if (!user) return;

    console.log('📱 Setting up push notifications for user:', user.uid);

    // Register device and request permissions
    registerDeviceForNotifications(user.uid);

    // Setup notification handlers
    const unsubscribeForeground = setupForegroundNotificationHandler();
    const unsubscribeTokenRefresh = setupTokenRefreshHandler(user.uid);
    const unsubscribeNotificationOpen = setupNotificationOpenHandler((notification) => {
      console.log('User tapped notification:', notification);
      // You can add navigation logic here based on notification data
    });

    // Cleanup on unmount or user change
    return () => {
      unsubscribeForeground();
      unsubscribeTokenRefresh();
      unsubscribeNotificationOpen();
    };
  }, [user]);

  if (loading) {
    console.log('AppNavigator - Showing loading screen');
    return <SplashScreen />;
  }

  console.log('AppNavigator - Rendering stack for:', user ? 'authenticated' : 'unauthenticated');

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={user ? 'Main' : 'Auth'}
        screenOptions={{
          headerShown: false,
        }}>
        {!user ? (
          // Not authenticated - show auth screen
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          // Authenticated - show drawer
          <Stack.Screen name="Main" component={MainDrawer} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Setup background notification handler (runs outside React lifecycle)
setupBackgroundNotificationHandler();

function App(): React.JSX.Element {
  // Configure Google Sign-In
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '271671331037-90pnnqenl2enkc9es1gr6qcer1ugf8at.apps.googleusercontent.com',
      iosClientId: '271671331037-gmnhja4s0v01eveg492obflctto072j2.apps.googleusercontent.com',
      offlineAccess: true,
    });
    console.log('✅ Google Sign-In configured');
  }, []);

  // Enable Crashlytics crash reporting
  useEffect(() => {
    // Enable Crashlytics collection
    crashlytics().setCrashlyticsCollectionEnabled(true);

    // Log that Crashlytics is enabled
    console.log('🛡️ Firebase Crashlytics enabled');

    // Optionally set a custom key for debugging
    crashlytics().setAttribute('app_version', '1.0.0');
  }, []);

  return (
    <ErrorBoundary>
      <TourGuideProvider
        androidStatusBarVisible={true}
        backdropColor="rgba(0, 0, 0, 0.8)"
        tooltipComponent={CustomTooltip}
      >
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </TourGuideProvider>
    </ErrorBoundary>
  );
}

export default App;
