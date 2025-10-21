# Plaid Integration Setup Guide

This guide will walk you through setting up the Plaid integration with encryption and real-time syncing.

## Prerequisites

- Firebase CLI installed (`npm install -g firebase-tools`)
- Firebase project configured (`firebase use finch-app-v2`)
- Google Cloud SDK installed (for Cloud Tasks)

---

## Step 1: Generate Encryption Key

The encryption key is used to encrypt Plaid access tokens in Firestore.

### Generate a secure random key:

```bash
# Option 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: Using OpenSSL
openssl rand -hex 32
```

### Set the encryption key in Firebase:

```bash
firebase functions:config:set encryption.key="YOUR_GENERATED_KEY_HERE"
```

**IMPORTANT:** Save this key somewhere secure (like a password manager). If you lose it, you won't be able to decrypt existing access tokens.

### For local development:

Create a `.env` file in `packages/functions/`:

```bash
ENCRYPTION_KEY=YOUR_GENERATED_KEY_HERE
```

---

## Step 2: Create Cloud Tasks Queue

The queue handles asynchronous transaction syncing triggered by Plaid webhooks.

### Using gcloud CLI:

```bash
# Set your project
gcloud config set project finch-app-v2

# Create the queue
gcloud tasks queues create plaid-sync-queue \
  --location=us-central1 \
  --max-dispatches-per-second=10 \
  --max-concurrent-dispatches=5
```

### Verify the queue was created:

```bash
gcloud tasks queues describe plaid-sync-queue --location=us-central1
```

---

## Step 3: Enable Required APIs

```bash
# Enable Cloud Tasks API
gcloud services enable cloudtasks.googleapis.com

# Enable Cloud Functions API (if not already enabled)
gcloud services enable cloudfunctions.googleapis.com
```

---

## Step 4: Deploy Cloud Functions

```bash
cd packages/functions
firebase deploy --only functions
```

This will deploy all functions including:
- `createLinkToken`
- `exchangePublicToken`
- `linkAccountToPlaid`
- `syncTransactions`
- `identifyRecurringTransactions`
- `plaidWebhook`
- `processSyncTask` (called by Cloud Tasks)

---

## Step 5: Verify Plaid Configuration

Ensure your Plaid credentials are set in `.runtimeconfig.json`:

```json
{
  "plaid": {
    "env": "sandbox",
    "secret": "YOUR_PLAID_SANDBOX_SECRET",
    "client_id": "YOUR_PLAID_CLIENT_ID"
  }
}
```

For production, update to:
```bash
firebase functions:config:set plaid.env="production"
firebase functions:config:set plaid.secret="YOUR_PRODUCTION_SECRET"
firebase functions:config:set plaid.client_id="YOUR_CLIENT_ID"
```

---

## Step 6: Test the Integration

### Test encryption (local):

```bash
cd packages/functions
node -e "
const { encrypt, decrypt } = require('./encryption');
process.env.ENCRYPTION_KEY = 'YOUR_KEY_HERE';
const encrypted = encrypt('test-access-token-123');
console.log('Encrypted:', encrypted);
console.log('Decrypted:', decrypt(encrypted));
"
```

### Test Plaid Link flow:

1. Open your Android app
2. Go to Setup Wizard
3. Select "Plaid (Recommended)"
4. Use Plaid Sandbox credentials:
   - Institution: Search for "Chase" or any bank
   - Username: `user_good`
   - Password: `pass_good`

5. Monitor Cloud Functions logs:
```bash
firebase functions:log --only createLinkToken,exchangePublicToken,syncTransactions
```

---

## Step 7: Test Webhook (Optional)

### Using Plaid's webhook simulator:

1. Go to Plaid Dashboard → Developers → Webhooks
2. Send a test `TRANSACTIONS.DEFAULT_UPDATE` webhook
3. Check Cloud Tasks:
```bash
gcloud tasks list --queue=plaid-sync-queue --location=us-central1
```

4. Monitor processSyncTask logs:
```bash
firebase functions:log --only processSyncTask
```

---

## Security Best Practices

### ✅ What's Implemented:

1. **Access Token Encryption**: All Plaid access tokens are encrypted with AES-256 before storing in Firestore
2. **Key Management**: Encryption key stored in Firebase Config (not in code)
3. **Async Processing**: Cloud Tasks prevents webhook timeouts and ensures reliable syncing
4. **Error Handling**: Graceful fallbacks if Cloud Tasks fail

### 🔒 Production Checklist:

- [ ] Use Firebase Secret Manager instead of `functions.config()` for production
- [ ] Rotate encryption keys periodically (requires re-encrypting all tokens)
- [ ] Set up monitoring/alerting for failed Cloud Tasks
- [ ] Enable Cloud Tasks authentication (OIDC tokens)
- [ ] Set up proper IAM roles for Cloud Functions
- [ ] Use Plaid's production environment with proper credentials
- [ ] Implement rate limiting on webhook endpoint
- [ ] Set up proper Firestore security rules

---

## Troubleshooting

### Error: "ENCRYPTION_KEY not found"

**Solution:** Set the encryption key using:
```bash
firebase functions:config:set encryption.key="YOUR_KEY"
firebase deploy --only functions
```

### Error: "Queue does not exist"

**Solution:** Create the queue:
```bash
gcloud tasks queues create plaid-sync-queue --location=us-central1
```

### Webhooks not triggering syncs

**Check:**
1. Cloud Tasks queue exists: `gcloud tasks queues list --location=us-central1`
2. IAM permissions for Cloud Functions to create tasks
3. Cloud Functions logs: `firebase functions:log --only plaidWebhook,processSyncTask`

### Decryption failures

**Cause:** Encryption key mismatch or corrupted data

**Solution:**
1. Verify the key: `firebase functions:config:get encryption.key`
2. Re-link Plaid accounts (will re-encrypt with current key)

---

## Architecture Overview

```
┌─────────────┐
│  Plaid API  │
└──────┬──────┘
       │
       │ (1) User connects bank
       ↓
┌─────────────────────┐
│  exchangePublicToken │ ──→ Encrypts access_token
└──────────┬──────────┘
           │
           │ (2) Stores encrypted token
           ↓
    ┌──────────────┐
    │  Firestore   │
    └──────┬───────┘
           │
           │ (3) Webhook notification
           ↓
    ┌──────────────┐
    │ plaidWebhook │ ──→ Creates Cloud Task
    └──────┬───────┘
           │
           │ (4) Async task
           ↓
    ┌──────────────────┐
    │ processSyncTask  │ ──→ Decrypts token, syncs transactions
    └──────────────────┘
```

---

## Cost Estimates

**Cloud Tasks:**
- Free tier: 1M invocations/month
- Beyond free tier: $0.40 per million invocations
- **Typical usage:** ~100 syncs/day = ~3K/month = **FREE**

**Cloud Functions:**
- Free tier: 2M invocations/month
- **Typical usage:** Plaid functions = ~5K/month = **FREE**

**Firestore:**
- Encrypted tokens stored as strings (same cost as unencrypted)
- No additional cost for encryption

---

## Next Steps

1. Set up production Plaid credentials
2. Migrate to Firebase Secret Manager (see [Firebase docs](https://firebase.google.com/docs/functions/config-env))
3. Implement push notifications when new transactions sync
4. Add user-facing "Last Synced" timestamp in UI
5. Build admin dashboard to monitor sync health

---

For questions or issues, check the [Plaid documentation](https://plaid.com/docs/) or [Firebase Cloud Tasks docs](https://cloud.google.com/tasks/docs).
