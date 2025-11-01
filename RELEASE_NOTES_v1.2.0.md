# Finch Android v1.2.0 Release Notes
**Release Date**: November 1, 2025
**Version Code**: 12
**Build Type**: Production Release

---

## 🎉 Major Features

### **Push Notifications for Transactions**
- **Real-time transaction notifications** when you make a purchase
- See your **Available to Spend** balance instantly in the notification
- Smart notification timing (7:30 AM - 10 PM, queued outside hours)
- Notifications account for:
  - Your safety cushion
  - Goal allocations
  - Upcoming recurring bills
  - 60-day balance projections

---

## 🔧 Improvements

### **Transaction Syncing**
- Fixed Firestore indexing for faster webhook processing
- Improved Plaid integration reliability
- Balance updates now sync automatically with transactions

### **Notification System**
- Upgraded to modern FCM HTTP v1 API for better reliability
- Improved error handling and automatic token cleanup
- Granular notification preferences in Settings
- Support for high-priority critical alerts (low balance warnings)

### **Security Enhancements**
- Completed biometric authentication integration
- Enhanced session timeout security
- Improved secure storage for sensitive data

---

## 🐛 Bug Fixes

- Fixed "Available to Spend" calculation in notifications
- Resolved projection calculation for accounts without starting balance
- Fixed balance sync timing issues
- Corrected cushion and goal allocation deductions in notifications

---

## 📱 Settings & Preferences

Users can now control:
- Master notification toggle (enable/disable all)
- Transaction notifications
- Paycheck/income notifications
- Biometric authentication lock
- Session timeout preferences

---

## 🔮 What's Next (v1.3.0)

- Enhanced onboarding tour improvements
- Loading states for Plaid account linking
- Additional notification customization
- Performance optimizations

---

## 🛡️ Security Notice

This release includes important security enhancements:
- All Firebase credentials properly secured
- Plaid access tokens encrypted at rest
- No sensitive data exposed in client code
- Enhanced .gitignore protections

---

## 📊 Technical Details

**Notification Format:**
```
Spending Account • {Merchant Name}
${amount} • Available: ${availableToSpend} ✓
```

**Calculation:**
```
Available to Spend = Lowest 60-Day Balance - Cushion - Goal Allocations
```

---

## 🙏 Testing & Quality Assurance

- End-to-end notification flow tested
- FCM token validation confirmed
- Production Plaid API verified
- Balance calculations validated
- Security audit completed

---

**For support or questions, contact: kyle.christian@gmail.com**
