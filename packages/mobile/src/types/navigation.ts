// packages/mobile/src/types/navigation.ts
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Setup: undefined;
  Dashboard: undefined;
  Transactions: undefined;
  Calendar: undefined;
  Reports: undefined;
  Budget: undefined;
  Settings: undefined;
};

export type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
