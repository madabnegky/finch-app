import React from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import brandColors from '../theme/colors';

export const TermsOfServiceScreen = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.lastUpdated}>Last Updated: January 2025</Text>
      </View>

      <Section title="1. Acceptance of Terms">
        <Text style={styles.text}>
          By downloading, installing, or using the Finch mobile application ("App"), you agree
          to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms,
          do not use the App.
        </Text>
        <Text style={styles.text}>
          These Terms constitute a legally binding agreement between you and Finch ("we," "our,"
          or "us").
        </Text>
      </Section>

      <Section title="2. Description of Service">
        <Text style={styles.text}>
          Finch is a personal finance and budgeting application that helps you:
        </Text>
        <Text style={styles.bulletText}>• Connect and sync your bank accounts securely</Text>
        <Text style={styles.bulletText}>• Track income and expenses</Text>
        <Text style={styles.bulletText}>• Create and manage budgets</Text>
        <Text style={styles.bulletText}>• Set and monitor financial goals</Text>
        <Text style={styles.bulletText}>• View spending analytics and reports</Text>
        <Text style={styles.bulletText}>• Receive transaction notifications</Text>
      </Section>

      <Section title="3. Eligibility">
        <Text style={styles.text}>
          You must be at least 18 years old to use this App. By using the App, you represent
          and warrant that you are at least 18 years of age and have the legal capacity to
          enter into these Terms.
        </Text>
      </Section>

      <Section title="4. Account Registration and Security">
        <Subsection title="4.1 Account Creation">
          <Text style={styles.text}>
            To use the App, you must create an account. You agree to:
          </Text>
          <Text style={styles.bulletText}>• Provide accurate and complete information</Text>
          <Text style={styles.bulletText}>• Keep your account credentials secure</Text>
          <Text style={styles.bulletText}>• Notify us immediately of any unauthorized access</Text>
          <Text style={styles.bulletText}>• Accept responsibility for all activities under your account</Text>
        </Subsection>

        <Subsection title="4.2 Authentication">
          <Text style={styles.text}>
            We use Google Firebase Authentication for secure sign-in. You can sign in using:
          </Text>
          <Text style={styles.bulletText}>• Email and password</Text>
          <Text style={styles.bulletText}>• Google Sign-In</Text>
        </Subsection>

        <Subsection title="4.3 Session Management">
          <Text style={styles.text}>
            For security, your session will automatically expire after 15 minutes of inactivity.
            You will be required to sign in again.
          </Text>
        </Subsection>
      </Section>

      <Section title="5. Bank Account Connection">
        <Text style={styles.text}>
          We use Plaid, a third-party service, to connect your bank accounts. By connecting
          your bank account:
        </Text>
        <Text style={styles.bulletText}>• You authorize Finch to access your account information through Plaid</Text>
        <Text style={styles.bulletText}>• You agree to Plaid's terms of service and privacy policy</Text>
        <Text style={styles.bulletText}>• You understand we cannot access your banking passwords directly</Text>
        <Text style={styles.bulletText}>• You can disconnect your accounts at any time in Settings</Text>
        <Text style={styles.text}>
          <Text style={styles.bold}>Important:</Text> Finch is a budgeting tool only. We do not
          move money, make transactions, or have the ability to access your funds.
        </Text>
      </Section>

      <Section title="6. User Responsibilities">
        <Text style={styles.text}>You agree to:</Text>
        <Text style={styles.bulletText}>• Use the App only for lawful purposes</Text>
        <Text style={styles.bulletText}>• Ensure the accuracy of financial data you enter</Text>
        <Text style={styles.bulletText}>• Keep your device and app updated for security</Text>
        <Text style={styles.bulletText}>• Not attempt to reverse engineer or hack the App</Text>
        <Text style={styles.bulletText}>• Not use the App to violate any laws or regulations</Text>
        <Text style={styles.bulletText}>• Not share your account with others</Text>
      </Section>

      <Section title="7. Prohibited Activities">
        <Text style={styles.text}>You may not:</Text>
        <Text style={styles.bulletText}>• Use the App for illegal money laundering or fraud</Text>
        <Text style={styles.bulletText}>• Interfere with the security or operation of the App</Text>
        <Text style={styles.bulletText}>• Introduce viruses, malware, or harmful code</Text>
        <Text style={styles.bulletText}>• Scrape, crawl, or harvest data from the App</Text>
        <Text style={styles.bulletText}>• Impersonate another user or entity</Text>
        <Text style={styles.bulletText}>• Sell or transfer your account to another party</Text>
      </Section>

      <Section title="8. Financial Advice Disclaimer">
        <Text style={styles.text}>
          <Text style={styles.bold}>Finch is NOT a financial advisor.</Text> The App provides
          budgeting tools and spending insights but does not offer financial, investment, tax,
          or legal advice.
        </Text>
        <Text style={styles.text}>
          You should consult with qualified professionals before making significant financial
          decisions. We are not responsible for financial losses resulting from your use of
          the App.
        </Text>
      </Section>

      <Section title="9. Data Accuracy and Reliability">
        <Text style={styles.text}>
          While we strive to provide accurate transaction data and account balances:
        </Text>
        <Text style={styles.bulletText}>• Data is sourced from third-party providers (Plaid, your banks)</Text>
        <Text style={styles.bulletText}>• Delays or errors may occur in transaction syncing</Text>
        <Text style={styles.bulletText}>• You should verify critical information with your bank</Text>
        <Text style={styles.bulletText}>• We are not liable for inaccuracies in third-party data</Text>
      </Section>

      <Section title="10. Intellectual Property">
        <Text style={styles.text}>
          The App, including its design, code, graphics, and content, is owned by Finch and
          protected by copyright, trademark, and other intellectual property laws.
        </Text>
        <Text style={styles.text}>
          You are granted a limited, non-exclusive, non-transferable license to use the App
          for personal, non-commercial purposes. You may not:
        </Text>
        <Text style={styles.bulletText}>• Copy, modify, or distribute the App</Text>
        <Text style={styles.bulletText}>• Create derivative works</Text>
        <Text style={styles.bulletText}>• Remove copyright or trademark notices</Text>
      </Section>

      <Section title="11. Fees and Payment">
        <Text style={styles.text}>
          Finch is currently free to use. We reserve the right to introduce paid features or
          subscriptions in the future. If we do:
        </Text>
        <Text style={styles.bulletText}>• We will provide advance notice</Text>
        <Text style={styles.bulletText}>• Existing features may remain free or become paid</Text>
        <Text style={styles.bulletText}>• You can cancel at any time</Text>
      </Section>

      <Section title="12. Service Availability">
        <Text style={styles.text}>
          We strive to provide reliable service, but we do not guarantee:
        </Text>
        <Text style={styles.bulletText}>• Uninterrupted or error-free operation</Text>
        <Text style={styles.bulletText}>• Availability during maintenance or updates</Text>
        <Text style={styles.bulletText}>• Compatibility with all devices or OS versions</Text>
        <Text style={styles.text}>
          We may modify, suspend, or discontinue the App at any time without liability.
        </Text>
      </Section>

      <Section title="13. Termination">
        <Subsection title="13.1 Your Right to Terminate">
          <Text style={styles.text}>
            You may delete your account at any time through Settings → Account → Delete Account.
            This will permanently delete all your data.
          </Text>
        </Subsection>

        <Subsection title="13.2 Our Right to Terminate">
          <Text style={styles.text}>
            We may suspend or terminate your account if:
          </Text>
          <Text style={styles.bulletText}>• You violate these Terms</Text>
          <Text style={styles.bulletText}>• We suspect fraudulent or illegal activity</Text>
          <Text style={styles.bulletText}>• We discontinue the service</Text>
        </Subsection>
      </Section>

      <Section title="14. Limitation of Liability">
        <Text style={styles.text}>
          <Text style={styles.bold}>TO THE MAXIMUM EXTENT PERMITTED BY LAW:</Text>
        </Text>
        <Text style={styles.bulletText}>
          • Finch is provided "AS IS" without warranties of any kind
        </Text>
        <Text style={styles.bulletText}>
          • We are not liable for any direct, indirect, incidental, or consequential damages
        </Text>
        <Text style={styles.bulletText}>
          • We are not responsible for losses resulting from:
          {'\n'}  - Data breaches or security incidents
          {'\n'}  - Inaccurate financial data
          {'\n'}  - Service interruptions
          {'\n'}  - Third-party service failures (Plaid, Firebase)
          {'\n'}  - Your financial decisions based on App data
        </Text>
        <Text style={styles.bulletText}>
          • Our total liability shall not exceed $100 USD or the amount you paid us (if any)
        </Text>
      </Section>

      <Section title="15. Indemnification">
        <Text style={styles.text}>
          You agree to indemnify and hold harmless Finch from any claims, damages, or expenses
          arising from:
        </Text>
        <Text style={styles.bulletText}>• Your use of the App</Text>
        <Text style={styles.bulletText}>• Your violation of these Terms</Text>
        <Text style={styles.bulletText}>• Your violation of any third-party rights</Text>
      </Section>

      <Section title="16. Privacy">
        <Text style={styles.text}>
          Your use of the App is also governed by our Privacy Policy. Please review it to
          understand how we collect, use, and protect your data.
        </Text>
      </Section>

      <Section title="17. Changes to Terms">
        <Text style={styles.text}>
          We may modify these Terms at any time. We will notify you of significant changes
          through the App or via email. Continued use of the App after changes constitutes
          acceptance of the new Terms.
        </Text>
      </Section>

      <Section title="18. Governing Law">
        <Text style={styles.text}>
          These Terms are governed by the laws of [Your State/Country], without regard to
          conflict of law principles. Any disputes shall be resolved in the courts of
          [Your Jurisdiction].
        </Text>
      </Section>

      <Section title="19. Dispute Resolution">
        <Text style={styles.text}>
          If you have a dispute with Finch, you agree to first contact us to resolve it
          informally. If we cannot resolve it within 30 days, disputes may be submitted to
          binding arbitration in accordance with [Arbitration Rules].
        </Text>
      </Section>

      <Section title="20. Severability">
        <Text style={styles.text}>
          If any provision of these Terms is found to be unenforceable, the remaining provisions
          will remain in full effect.
        </Text>
      </Section>

      <Section title="21. Contact Information">
        <Text style={styles.text}>
          For questions about these Terms, please contact us:
        </Text>
        <Text style={styles.bulletText}>• Email: support@finchapp.com</Text>
        <Text style={styles.bulletText}>• In-App: Settings → Help & Support → Contact Us</Text>
      </Section>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          By using Finch, you acknowledge that you have read, understood, and agree to be
          bound by these Terms of Service.
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

export default TermsOfServiceScreen;
