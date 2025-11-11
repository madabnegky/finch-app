# Google Secret Manager Setup Guide

This guide will help you migrate from storing secrets in `.env` files to using Google Secret Manager for secure secret storage.

## Why Use Secret Manager?

- ✅ **Secure**: Secrets are encrypted at rest and in transit
- ✅ **Centralized**: Manage all secrets in one place
- ✅ **Versioned**: Track changes and rotate secrets easily
- ✅ **Access Control**: Fine-grained IAM permissions
- ✅ **Audit Logging**: Track who accessed which secrets and when
- ✅ **Never Committed**: Secrets never appear in your code repository

## Prerequisites

1. **gcloud CLI** installed: https://cloud.google.com/sdk/docs/install
2. **Firebase CLI** installed: `npm install -g firebase-tools`
3. **Project access**: You must have `Owner` or `Editor` role on `finch-app-v2`

## Quick Start

### Option 1: Automated Setup (Recommended)

Run the setup script from the functions directory:

```bash
cd packages/functions
./setup-secrets.sh
```

This script will:
1. Enable Secret Manager API
2. Create all required secrets
3. Grant Cloud Functions access
4. Guide you through the migration

### Option 2: Manual Setup

#### Step 1: Enable Secret Manager API

```bash
gcloud services enable secretmanager.googleapis.com --project=finch-app-v2
```

Or enable via [Google Cloud Console](https://console.cloud.google.com/apis/library/secretmanager.googleapis.com?project=finch-app-v2).

#### Step 2: Create Secrets

Create each secret using the gcloud CLI:

```bash
# 1. Encryption Key (use the SAME key from your .env to avoid breaking existing data)
echo "YOUR_CURRENT_ENCRYPTION_KEY" | gcloud secrets create ENCRYPTION_KEY \
  --project=finch-app-v2 \
  --replication-policy="automatic" \
  --data-file=-

# 2. Plaid Client ID
echo "YOUR_PLAID_CLIENT_ID" | gcloud secrets create PLAID_CLIENT_ID \
  --project=finch-app-v2 \
  --replication-policy="automatic" \
  --data-file=-

# 3. Plaid Secret
echo "YOUR_PLAID_SECRET" | gcloud secrets create PLAID_SECRET \
  --project=finch-app-v2 \
  --replication-policy="automatic" \
  --data-file=-

# 4. RevenueCat Webhook Secret
echo "YOUR_REVENUECAT_WEBHOOK_SECRET" | gcloud secrets create REVENUECAT_WEBHOOK_SECRET \
  --project=finch-app-v2 \
  --replication-policy="automatic" \
  --data-file=-
```

#### Step 3: Grant Cloud Functions Access

```bash
# Get your project's default service account
PROJECT_ID="finch-app-v2"
SERVICE_ACCOUNT="${PROJECT_ID}@appspot.gserviceaccount.com"

# Grant access to each secret
for SECRET in ENCRYPTION_KEY PLAID_CLIENT_ID PLAID_SECRET REVENUECAT_WEBHOOK_SECRET; do
  gcloud secrets add-iam-policy-binding $SECRET \
    --project=$PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor"
done
```

## Managing Secrets

### View All Secrets

```bash
gcloud secrets list --project=finch-app-v2
```

### View a Secret Value

```bash
gcloud secrets versions access latest --secret=ENCRYPTION_KEY --project=finch-app-v2
```

### Update a Secret (Add New Version)

```bash
echo "NEW_SECRET_VALUE" | gcloud secrets versions add ENCRYPTION_KEY \
  --project=finch-app-v2 \
  --data-file=-
```

### Rotate a Secret

To rotate the encryption key (advanced):

1. **Generate a new key:**
   ```bash
   NEW_KEY=$(openssl rand -hex 32)
   echo $NEW_KEY
   ```

2. **Deploy a migration function** that:
   - Fetches all encrypted Plaid tokens
   - Decrypts with old key
   - Encrypts with new key
   - Updates Firestore

3. **Add the new key version:**
   ```bash
   echo "$NEW_KEY" | gcloud secrets versions add ENCRYPTION_KEY \
     --project=finch-app-v2 \
     --data-file=-
   ```

4. **Redeploy Cloud Functions** to pick up the new key

### Delete a Secret

```bash
gcloud secrets delete ENCRYPTION_KEY --project=finch-app-v2
```

## Using Secrets in Cloud Functions

The code has been updated to automatically fetch secrets from Secret Manager.

### Example Usage:

```javascript
const { getEncryptionKey, getPlaidSecret } = require('./secretManager');

// In an async function
async function myFunction() {
  const encryptionKey = await getEncryptionKey();
  const plaidSecret = await getPlaidSecret();

  // Use the secrets...
}
```

### Caching

Secrets are automatically cached in memory to reduce API calls:
- First access: Fetches from Secret Manager
- Subsequent accesses: Returns cached value
- Cache persists for the lifetime of the Cloud Function instance

## Local Development

For local development with Firebase Emulator, keep your `.env` file with secrets:

```bash
# packages/functions/.env
ENCRYPTION_KEY=your-dev-key-here
PLAID_CLIENT_ID=your-plaid-client-id
PLAID_SECRET=your-plaid-secret
REVENUECAT_WEBHOOK_SECRET=your-webhook-secret
```

The code automatically falls back to environment variables when running in emulator mode.

**IMPORTANT:** Ensure `.env` is in `.gitignore` and never committed to the repository!

## Security Best Practices

### ✅ DO:
- Use Secret Manager for all production secrets
- Rotate secrets regularly (every 90 days recommended)
- Use separate secrets for dev/staging/prod environments
- Grant least-privilege IAM permissions
- Enable audit logging to track secret access
- Keep `.env` in `.gitignore`

### ❌ DON'T:
- Commit secrets to git (even in private repos)
- Share secrets via email, Slack, or other messaging
- Use the same encryption key across environments
- Log secret values (even in development)
- Hard-code secrets in your application code

## Removing Secrets from Git History

If secrets were previously committed, remove them from git history:

```bash
# Remove .env from all commits
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch packages/functions/.env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push to remote (WARNING: This rewrites history)
git push origin --force --all
git push origin --force --tags

# Clean up local repository
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

**⚠️ WARNING:** This rewrites git history. Coordinate with your team before running these commands.

## Troubleshooting

### Error: "Permission Denied"

**Problem:** Cloud Functions can't access secrets

**Solution:** Ensure IAM permissions are set correctly:
```bash
gcloud secrets add-iam-policy-binding ENCRYPTION_KEY \
  --project=finch-app-v2 \
  --member="serviceAccount:finch-app-v2@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Error: "Secret not found"

**Problem:** Secret doesn't exist in Secret Manager

**Solution:** Create the secret:
```bash
echo "YOUR_VALUE" | gcloud secrets create SECRET_NAME \
  --project=finch-app-v2 \
  --replication-policy="automatic" \
  --data-file=-
```

### Error: "Decryption failed after migration"

**Problem:** Encryption key changed during migration

**Solution:** You must use the **exact same encryption key** that was used to encrypt existing data. Check your previous `.env` file or environment configuration.

### Cloud Functions Still Using .env

**Problem:** Functions deployed before Secret Manager setup

**Solution:** Redeploy functions:
```bash
cd packages/functions
firebase deploy --only functions
```

## Costs

Google Secret Manager pricing (as of 2024):
- **Storage:** $0.06 per secret version per month
- **Access:** $0.03 per 10,000 access operations

For typical usage:
- ~10 secrets × 2 versions = ~$1.20/month storage
- ~100,000 function invocations = ~$0.30/month access
- **Total: ~$1.50/month**

First 6 active secret versions are free. Free tier includes 10,000 access operations per month.

## Additional Resources

- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Secret Manager Pricing](https://cloud.google.com/secret-manager/pricing)
- [Best Practices for Managing Secrets](https://cloud.google.com/secret-manager/docs/best-practices)
- [Using Secrets in Cloud Functions](https://cloud.google.com/functions/docs/configuring/secrets)

## Support

If you encounter issues:
1. Check the [troubleshooting section](#troubleshooting)
2. Review Cloud Functions logs: `firebase functions:log`
3. Check Secret Manager IAM permissions in [Cloud Console](https://console.cloud.google.com/security/secret-manager?project=finch-app-v2)

---

**Last Updated:** 2024
**Project:** finch-app-v2
