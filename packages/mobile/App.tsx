// packages/android/FinchAndroid/App.tsx
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { TourGuideProvider } from 'rn-tourguide';
import { AuthProvider } from '../shared-logic/src/hooks/useAuth';
import brandColors from './src/theme/colors';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Import our screens
import { SplashScreen } from './src/screens/SplashScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { GoalsScreen } from './src/screens/GoalsScreen';
import { TransactionsScreen } from './src/screens/TransactionsScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { ReportsScreen } from './src/screens/ReportsScreen';
import { BudgetScreen } from './src/screens/BudgetScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { useAuth } from '../shared-logic/src/hooks/useAuth';

// This creates the "stack" of screens and drawer
const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

// Main Drawer Navigator with professional hamburger menu
function MainDrawer() {
  return (
    <Drawer.Navigator
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
        component={DashboardScreen}
        options={{
          drawerIcon: ({ color, size}) => (
            <Icon name="view-dashboard" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Goals"
        component={GoalsScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Icon name="flag-variant" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Icon name="credit-card" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Icon name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Icon name="chart-bar" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Budget"
        component={BudgetScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Icon name="wallet" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
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
