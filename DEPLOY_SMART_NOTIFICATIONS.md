# Deploy Smart Notifications - Step by Step Guide

## 🎯 What You're Deploying

Smart transaction notifications with:
- Real-time notifications during active hours (7:30 AM - 10 PM)
- Queued overnight transactions sent as morning summary
- Available-to-spend balance context
- Low balance warnings
- Paycheck detection

---

## ✅ Pre-Deployment Checklist

Before deploying, ensure:

- [ ] Firebase project is set up (`finch-app-v2`)
- [ ] Firebase CLI is installed and authenticated
- [ ] Cloud Functions are configured with Plaid credentials
- [ ] Encryption key is set (for Plaid access tokens)
- [ ] Cloud Tasks queue exists (`plaid-sync-queue`)
- [ ] Mobile app has FCM tokens being saved to Firestore

---

## 📦 Step 1: Deploy Cloud Functions

### **Deploy All Functions:**

```bash
cd /Volumes/FInchRecovery/finch-app/packages/functions
firebase deploy --only functions --project finch-app-v2
```

### **Or Deploy Specific Functions:**

```bash
# Deploy just the new/updated functions
firebase deploy --only functions:processSyncTask,functions:sendQueuedNotifications --project finch-app-v2
```

**Expected Output:**
```
✔  functions[us-central1-processSyncTask]: Successful update operation.
✔  functions[us-central1-sendQueuedNotifications]: Successful create operation.
```

**Deployment Time:** ~2-3 minutes

---

## 🗄️ Step 2: Create Firestore Index

The `sendQueuedNotifications` function uses a compound query that requires an index.

### **Option A: Auto-Create (Recommended)**

1. Let the function run once
2. Check Firebase Functions logs for index creation link
3. Click the link to auto-create the index

```bash
# Watch logs for the index link
firebase functions:log --only sendQueuedNotifications --project finch-app-v2
```

Look for:
```
Error: The query requires an index. You can create it here: https://console.firebase.google.com/...
```

Click the link, then click **Create Index**.

### **Option B: Manual Creation**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `finch-app-v2`
3. Navigate to **Firestore Database** → **Indexes** → **Composite**
4. Click **Create Index**

**Index Configuration:**
```
Collection Group: pendingNotifications
Fields:
  - processed: Ascending
  - scheduledFor: Ascending
Query scope: Collection group
```

5. Click **Create**
6. Wait 2-5 minutes for index to build

---

## 👤 Step 3: Add Timezone to Users (Optional)

Users need a `timezone` field for accurate 7:30 AM delivery. Default is `America/New_York`.

### **For Existing Users:**

Run this script to add timezone to all existing users:

```javascript
// In Firebase Console > Firestore > Run Query
const users = await db.collection('users').get();

const batch = db.batch();
users.docs.forEach(doc => {
  if (!doc.data().timezone) {
    batch.update(doc.ref, {
      timezone: 'America/New_York' // Or detect from user's location
    });
  }
});

await batch.commit();
console.log(`Updated ${users.docs.length} users with timezone`);
```

### **For New Users:**

Add timezone when user signs up (in your mobile app):

```javascript
// packages/mobile/src/hooks/useAuth.jsx or similar
await firestore().collection('users').doc(user.uid).set({
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Auto-detect
  // ... other user data
}, { merge: true });
```

---

## 🧪 Step 4: Test the System

### **Test 1: Check Scheduled Function is Running**

```bash
# Wait 15 minutes after deployment, then check logs
firebase functions:log --only sendQueuedNotifications --project finch-app-v2
```

**Expected Every 15 Minutes:**
```
Checking for queued notifications to send...
No queued notifications to send
```

### **Test 2: Trigger a Daytime Transaction**

**Time:** Between 7:30 AM - 10 PM

1. Open your Finch mobile app
2. Link a Plaid account (if not already)
3. Trigger a Plaid webhook or wait for real transaction
4. Check your phone for immediate notification

**Check Logs:**
```bash
firebase functions:log --only processSyncTask --project finch-app-v2 | grep notification
```

**Expected:**
```
Sending immediate notification for Starbucks
✅ Sent immediate notification for Starbucks
```

### **Test 3: Trigger an Overnight Transaction**

**Time:** Between 10 PM - 7:30 AM

1. Trigger a Plaid sync (webhook or manual)
2. Check Firestore for queued notification

**In Firestore Console:**
```
users/{your-uid}/pendingNotifications
```

**Expected Document:**
```json
{
  "transactionId": "abc123",
  "merchantName": "Shell Gas",
  "amount": -45.00,
  "scheduledFor": "2025-01-XX 07:30:00",
  "processed": false
}
```

3. Wait until after 7:30 AM
4. Check your phone for morning summary
5. Verify notification is marked as processed

**Check Logs:**
```bash
firebase functions:log --only sendQueuedNotifications --project finch-app-v2
```

**Expected:**
```
Found 1 queued notifications
✅ Sent batched morning notification to user abc123
✅ Processed 1 notifications for user abc123
```

### **Test 4: Low Balance Alert**

1. Create test account with < $100 available balance
2. Trigger a transaction
3. Verify you get 🔴 LOW BALANCE ALERT notification

---

## 📊 Step 5: Monitor Production

### **View Real-Time Logs:**

```bash
# All logs
firebase functions:log --project finch-app-v2

# Just notification-related
firebase functions:log --project finch-app-v2 | grep notification

# Specific function
firebase functions:log --only processSyncTask --project finch-app-v2

# Follow logs in real-time
firebase functions:log --project finch-app-v2 --follow
```

### **Key Metrics to Watch:**

1. **Immediate Notification Success Rate**
   ```bash
   firebase functions:log --project finch-app-v2 | grep "Sent immediate notification"
   ```

2. **Queued Notification Count**
   ```bash
   firebase functions:log --project finch-app-v2 | grep "Queuing notification"
   ```

3. **Morning Batch Delivery**
   ```bash
   firebase functions:log --only sendQueuedNotifications --project finch-app-v2 | grep "Processed queued notifications"
   ```

4. **Errors**
   ```bash
   firebase functions:log --project finch-app-v2 | grep ERROR
   ```

### **Firestore Monitoring:**

Check these collections daily:
- `users/{uid}/pendingNotifications` - Should clear out after 7:30 AM
- Any stuck notifications? Investigate why `processed: false` persists

---

## 🚨 Troubleshooting

### **Issue: Function fails to deploy**

**Error:** `Billing account not configured`

**Fix:**
```bash
# Enable billing for your project
https://console.firebase.google.com/project/finch-app-v2/settings/billing
```

---

### **Issue: "Index not found" error**

**Error:** `The query requires an index`

**Fix:**
1. Get the index creation URL from the error message
2. Click the URL to auto-create the index
3. Wait 2-5 minutes for index to build
4. Function will automatically start working

---

### **Issue: Notifications not sending**

**Check 1:** User has FCM token
```bash
# In Firestore console
users/{uid}
# Look for: fcmTokens: ["token..."]
```

**Check 2:** Transaction is posted (not pending)
```bash
firebase functions:log --only processSyncTask --project finch-app-v2 | grep "pending"
```

**Check 3:** Function is running
```bash
firebase functions:log --only processSyncTask --project finch-app-v2
# Should see: "Processing sync task for user..."
```

---

### **Issue: Morning notifications not arriving**

**Check 1:** Scheduled function is running
```bash
firebase functions:log --only sendQueuedNotifications --project finch-app-v2
# Should run every 15 minutes
```

**Check 2:** Notifications are queued
```bash
# In Firestore: users/{uid}/pendingNotifications
# Should have documents with processed: false
```

**Check 3:** scheduledFor timestamp is correct
```javascript
// scheduledFor should be 7:30 AM in user's timezone
// Check that it's in the past when function runs
```

---

### **Issue: Wrong notification timezone**

**Fix:** Add/update user's timezone
```javascript
await db.collection('users').doc(userId).set({
  timezone: 'America/Los_Angeles' // User's actual timezone
}, { merge: true });
```

**Common US Timezones:**
- `America/New_York` - Eastern
- `America/Chicago` - Central
- `America/Denver` - Mountain
- `America/Los_Angeles` - Pacific

---

## 🎉 Success Checklist

After deployment, verify:

- [ ] `processSyncTask` function deployed successfully
- [ ] `sendQueuedNotifications` function deployed and scheduled (every 15 min)
- [ ] Firestore index created for `pendingNotifications`
- [ ] Test user has `timezone` field
- [ ] Test user has `fcmTokens` array
- [ ] Daytime transaction sends immediate notification
- [ ] Nighttime transaction queues for morning
- [ ] Morning summary arrives at 7:30 AM
- [ ] Low balance alert triggers correctly
- [ ] Paycheck notification shows 💰
- [ ] No errors in Cloud Functions logs

---

## 📈 Next Steps

1. **Monitor for 1 week** - Watch logs and user feedback
2. **Gather metrics:**
   - Notification delivery rate
   - User engagement (do they tap notifications?)
   - Balance of immediate vs. queued notifications
3. **User feedback:**
   - Too many notifications?
   - Timing feels right?
   - Context helpful?
4. **Iterate:**
   - Add user preferences UI
   - Adjust thresholds based on data
   - Add more notification types

---

## 💰 Cost Estimate

**Free Tier:**
- Scheduled function runs: 15 min × 60 × 24 = 96 invocations/day
- Transaction notifications: ~10-50/day/user
- Total: Well within 2M invocations/month free tier

**With 1000 Active Users:**
- ~100,000 invocations/month
- Still FREE (under 2M limit)

**Firestore:**
- pendingNotifications writes: ~5/day/user = 150K/month
- pendingNotifications reads: ~96/day = 3K/month
- Cost: ~$0.50/month

**Total Estimated Cost:** < $1/month 🎉

---

## 📝 Deployment Log Template

Use this to track your deployment:

```
Date: ___________
Deployed by: ___________

✅ Functions deployed
   - processSyncTask: v___
   - sendQueuedNotifications: v___

✅ Firestore index created
   - Collection: pendingNotifications
   - Status: Active

✅ Testing completed
   - Immediate notification: Pass/Fail
   - Queued notification: Pass/Fail
   - Morning batch: Pass/Fail
   - Low balance alert: Pass/Fail

✅ Monitoring setup
   - Logs checked: Yes/No
   - Errors found: Yes/No
   - Actions taken: ___________

Notes:
___________________________________________
```

---

**You're ready to deploy! 🚀**

Need help? Check the logs or review [SMART_NOTIFICATIONS_IMPLEMENTATION.md](./SMART_NOTIFICATIONS_IMPLEMENTATION.md) for more details.
