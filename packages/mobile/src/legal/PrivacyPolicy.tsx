import React from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import brandColors from '../theme/colors';

export const PrivacyPolicyScreen = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.lastUpdated}>Last Updated: January 2025</Text>
      </View>

      <Section title="1. Introduction">
        <Text style={styles.text}>
          Finch ("we," "our," or "us") is committed to protecting your privacy. This Privacy
          Policy explains how we collect, use, disclose, and safeguard your information when
          you use our mobile application (the "App").
        </Text>
        <Text style={styles.text}>
          Please read this Privacy Policy carefully. By using the App, you agree to the
          collection and use of information in accordance with this policy.
        </Text>
      </Section>

      <Section title="2. Information We Collect">
        <Subsection title="2.1 Personal Information">
          <Text style={styles.text}>
            When you register for an account, we collect:
          </Text>
          <Text style={styles.bulletText}>• Email address</Text>
          <Text style={styles.bulletText}>• Name (if provided)</Text>
          <Text style={styles.bulletText}>• Profile information (if provided)</Text>
        </Subsection>

        <Subsection title="2.2 Financial Information">
          <Text style={styles.text}>
            When you connect your bank accounts through Plaid:
          </Text>
          <Text style={styles.bulletText}>• Bank account information (account numbers, balances)</Text>
          <Text style={styles.bulletText}>• Transaction history</Text>
          <Text style={styles.bulletText}>• Account holder information</Text>
          <Text style={styles.text}>
            Note: We use Plaid for secure bank connections. Plaid encrypts your banking
            credentials and we never have direct access to your banking passwords.
          </Text>
        </Subsection>

        <Subsection title="2.3 Usage Information">
          <Text style={styles.bulletText}>• App interaction data</Text>
          <Text style={styles.bulletText}>• Device information (model, OS version)</Text>
          <Text style={styles.bulletText}>• Crash reports and performance data</Text>
          <Text style={styles.bulletText}>• Push notification tokens</Text>
        </Subsection>

        <Subsection title="2.4 Budget and Financial Data">
          <Text style={styles.bulletText}>• Budget categories and amounts</Text>
          <Text style={styles.bulletText}>• Financial goals</Text>
          <Text style={styles.bulletText}>• Spending patterns and analytics</Text>
          <Text style={styles.bulletText}>• Custom categories and tags</Text>
        </Subsection>
      </Section>

      <Section title="3. How We Use Your Information">
        <Text style={styles.text}>We use your information to:</Text>
        <Text style={styles.bulletText}>• Provide and maintain our budgeting services</Text>
        <Text style={styles.bulletText}>• Sync your financial data across devices</Text>
        <Text style={styles.bulletText}>• Send you transaction notifications and budget alerts</Text>
        <Text style={styles.bulletText}>• Analyze spending patterns and provide insights</Text>
        <Text style={styles.bulletText}>• Improve app functionality and user experience</Text>
        <Text style={styles.bulletText}>• Detect and prevent fraud or security issues</Text>
        <Text style={styles.bulletText}>• Comply with legal obligations</Text>
      </Section>

      <Section title="4. Data Storage and Security">
        <Text style={styles.text}>
          <Text style={styles.bold}>Firebase Cloud Services:</Text> Your data is stored securely in Google
          Firebase Cloud Firestore with industry-standard encryption at rest and in transit.
        </Text>
        <Text style={styles.text}>
          <Text style={styles.bold}>Security Measures:</Text>
        </Text>
        <Text style={styles.bulletText}>• End-to-end encryption for sensitive data</Text>
        <Text style={styles.bulletText}>• Secure authentication via Firebase Auth</Text>
        <Text style={styles.bulletText}>• Automatic session timeout after 15 minutes of inactivity</Text>
        <Text style={styles.bulletText}>• Regular security audits and updates</Text>
        <Text style={styles.bulletText}>• Code obfuscation in production releases</Text>
        <Text style={styles.text}>
          While we implement robust security measures, no method of transmission over the
          internet is 100% secure. We cannot guarantee absolute security.
        </Text>
      </Section>

      <Section title="5. Third-Party Services">
        <Subsection title="5.1 Plaid">
          <Text style={styles.text}>
            We use Plaid to securely connect to your bank accounts. Plaid's privacy policy
            governs their handling of your banking credentials:
            https://plaid.com/legal/#consumers
          </Text>
        </Subsection>

        <Subsection title="5.2 Google Firebase">
          <Text style={styles.text}>
            We use Firebase for authentication, cloud storage, push notifications, and
            analytics. Google's privacy policy applies:
            https://policies.google.com/privacy
          </Text>
        </Subsection>

        <Subsection title="5.3 Firebase Crashlytics">
          <Text style={styles.text}>
            We use Crashlytics to monitor app crashes and improve stability. Crash reports
            may include device information but no personal financial data.
          </Text>
        </Subsection>
      </Section>

      <Section title="6. Data Sharing and Disclosure">
        <Text style={styles.text}>
          <Text style={styles.bold}>We do not sell your personal information.</Text>
        </Text>
        <Text style={styles.text}>We may share your information only in these limited circumstances:</Text>
        <Text style={styles.bulletText}>• With your explicit consent</Text>
        <Text style={styles.bulletText}>• With service providers (Firebase, Plaid) who assist in providing our services</Text>
        <Text style={styles.bulletText}>• To comply with legal obligations or court orders</Text>
        <Text style={styles.bulletText}>• To protect our rights, property, or safety, or that of our users</Text>
        <Text style={styles.bulletText}>• In connection with a business transfer (merger, acquisition, bankruptcy)</Text>
      </Section>

      <Section title="7. Your Rights and Choices">
        <Subsection title="7.1 Access and Correction">
          <Text style={styles.text}>
            You can access and update your personal information in the Settings section of the app.
          </Text>
        </Subsection>

        <Subsection title="7.2 Data Deletion">
          <Text style={styles.text}>
            You have the right to request deletion of your account and all associated data.
            To delete your account:
          </Text>
          <Text style={styles.bulletText}>1. Go to Settings → Account</Text>
          <Text style={styles.bulletText}>2. Tap "Delete Account"</Text>
          <Text style={styles.bulletText}>3. Confirm deletion</Text>
          <Text style={styles.text}>
            This will permanently delete all your financial data, budgets, and transaction
            history. This action cannot be undone.
          </Text>
        </Subsection>

        <Subsection title="7.3 Opt-Out of Notifications">
          <Text style={styles.text}>
            You can disable push notifications in the app settings or your device settings.
          </Text>
        </Subsection>

        <Subsection title="7.4 Data Portability">
          <Text style={styles.text}>
            You can export your data in CSV format from the Settings section.
          </Text>
        </Subsection>
      </Section>

      <Section title="8. Data Retention">
        <Text style={styles.text}>
          We retain your information for as long as your account is active or as needed to
          provide you services. When you delete your account, we will delete your personal
          and financial data within 30 days, except where we are required to retain it for
          legal, regulatory, or security purposes.
        </Text>
      </Section>

      <Section title="9. Children's Privacy">
        <Text style={styles.text}>
          Our App is not intended for children under 13 years of age. We do not knowingly
          collect personal information from children under 13. If you believe we have
          collected information from a child under 13, please contact us immediately.
        </Text>
      </Section>

      <Section title="10. International Users">
        <Text style={styles.text}>
          Your information may be transferred to and processed in countries other than your
          country of residence. These countries may have data protection laws different from
          your country. By using the App, you consent to such transfers.
        </Text>
      </Section>

      <Section title="11. Changes to This Privacy Policy">
        <Text style={styles.text}>
          We may update this Privacy Policy from time to time. We will notify you of any
          changes by posting the new Privacy Policy in the app and updating the "Last Updated"
          date. You are advised to review this Privacy Policy periodically for any changes.
        </Text>
      </Section>

      <Section title="12. Contact Us">
        <Text style={styles.text}>
          If you have questions about this Privacy Policy or our data practices, please contact us:
        </Text>
        <Text style={styles.bulletText}>• Email: privacy@finchapp.com</Text>
        <Text style={styles.bulletText}>• In-App: Settings → Help & Support → Contact Us</Text>
      </Section>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          By using Finch, you acknowledge that you have read and understood this Privacy Policy.
        </Text>
      </View>
    </ScrollView>
  );
};

// Reusable section component
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

// Reusable subsection component
const Subsection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={styles.subsection}>
    <Text style={styles.subsectionTitle}>{title}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors.white,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: brandColors.tealDark,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: brandColors.tealDark,
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 14,
    color: brandColors.textGray,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: brandColors.tealDark,
    marginBottom: 12,
  },
  subsection: {
    marginTop: 12,
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.tealMedium,
    marginBottom: 8,
  },
  text: {
    fontSize: 15,
    lineHeight: 24,
    color: brandColors.textDark,
    marginBottom: 12,
  },
  bulletText: {
    fontSize: 15,
    lineHeight: 24,
    color: brandColors.textDark,
    marginBottom: 6,
    marginLeft: 8,
  },
  bold: {
    fontWeight: 'bold',
    color: brandColors.tealDark,
  },
  footer: {
    marginTop: 32,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: brandColors.backgroundGray,
  },
  footerText: {
    fontSize: 14,
    lineHeight: 22,
    color: brandColors.textGray,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default PrivacyPolicyScreen;
