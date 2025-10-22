import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import FinchLogo from './FinchLogo';
import brandColors from '../theme/colors';
import { navigationIcons } from '../theme/icons';

export default function CustomDrawer(props: DrawerContentComponentProps) {
  const { state, navigation } = props;
  const currentRoute = state.routes[state.index].name;

  const financialScreens = ['Dashboard', 'Goals', 'Transactions', 'Budget'];
  const toolScreens = ['Calendar', 'Reports'];

  const getIconForScreen = (screenName: string) => {
    const screenIcons: { [key: string]: string } = {
      'Dashboard': navigationIcons.dashboard,
      'Goals': navigationIcons.goals,
      'Transactions': navigationIcons.transactions,
      'Budget': navigationIcons.budget,
      'Calendar': navigationIcons.calendar,
      'Reports': navigationIcons.reports,
    };
    return screenIcons[screenName] || 'circle';
  };

  const renderNavItem = (screenName: string, index: number) => {
    const isActive = currentRoute === screenName;
    const icon = getIconForScreen(screenName);

    return (
      <TouchableOpacity
        key={`${screenName}-${index}`}
        style={[styles.navItem, isActive && styles.navItemActive]}
        onPress={() => navigation.navigate(screenName)}
        activeOpacity={0.7}
      >
        {isActive && <View style={styles.activeIndicator} />}
        <Icon
          name={icon}
          size={24}
          color={isActive ? brandColors.orangeAccent : brandColors.textGray}
          style={styles.navIcon}
        />
        <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
          {screenName}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <FinchLogo size={64} />
        </View>
        <Text style={styles.tagline}>The Financial Change You Need</Text>
      </View>

      {/* NAVIGATION SECTIONS */}
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Financial Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>FINANCIAL</Text>
          {financialScreens.map((screen, index) => renderNavItem(screen, index))}
        </View>

        {/* Tools Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TOOLS</Text>
          {toolScreens.map((screen, index) => renderNavItem(screen, index))}
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SUPPORT</Text>
          <TouchableOpacity style={styles.navItem} onPress={() => {}}>
            <Icon name={navigationIcons.help} size={24} color={brandColors.textGray} style={styles.navIcon} />
            <Text style={styles.navLabel}>Help & Support</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => {}}>
            <Icon name={navigationIcons.about} size={24} color={brandColors.textGray} style={styles.navIcon} />
            <Text style={styles.navLabel}>About</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* FOOTER */}
      <View style={styles.footer}>
        <Icon name="shield-check" size={16} color={brandColors.success} />
        <Text style={styles.footerText}>Bank-level encryption</Text>
        <Text style={styles.version}>v1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors.white,
  },

  // Header
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    backgroundColor: brandColors.tealPrimary,
    alignItems: 'center',
  },
  logoContainer: {
    width: 48,
    height: 48,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 24,
    fontWeight: '800',
    color: brandColors.white,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '500',
    color: brandColors.white + 'CC',
    marginTop: 4,
  },

  // Scroll Content
  scrollContent: {
    flex: 1,
    paddingTop: 16,
  },

  // Section
  section: {
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: brandColors.textGray,
    letterSpacing: 1,
    marginLeft: 16,
    marginBottom: 8,
  },

  // Nav Item
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
    position: 'relative',
  },
  navItemActive: {
    backgroundColor: brandColors.orangeAccent + '15',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: brandColors.tealPrimary,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  navIcon: {
    marginRight: 16,
  },
  navLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textGray,
  },
  navLabelActive: {
    color: brandColors.orangeAccent,
    fontWeight: '700',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: brandColors.border,
    gap: 8,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
    color: brandColors.textGray,
  },
  version: {
    fontSize: 10,
    fontWeight: '500',
    color: brandColors.textGray + '80',
    marginLeft: 'auto',
  },
});
