// packages/android/FinchAndroid/App.tsx
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { TourGuideProvider } from 'rn-tourguide';
import { AuthProvider } from '../shared-logic/src/hooks/useAuth';
import brandColors from './src/theme/colors';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
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
  return (
    <TourGuideProvider
      androidStatusBarVisible={true}
      backdropColor="rgba(0, 0, 0, 0.8)"
    >
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </TourGuideProvider>
  );
}

export default App;
