# Secret Manager Quick Start 🚀

## 1️⃣ Run Setup Script

```bash
cd packages/functions
./setup-secrets.sh
```

The script will guide you through creating all secrets.

## 2️⃣ Common Commands

### Create a secret
```bash
echo "SECRET_VALUE" | gcloud secrets create SECRET_NAME \
  --project=finch-app-v2 \
  --replication-policy="automatic" \
  --data-file=-
```

### View all secrets
```bash
gcloud secrets list --project=finch-app-v2
```

### Get secret value
```bash
gcloud secrets versions access latest --secret=ENCRYPTION_KEY --project=finch-app-v2
```

### Update a secret (add new version)
```bash
echo "NEW_VALUE" | gcloud secrets versions add SECRET_NAME \
  --project=finch-app-v2 \
  --data-file=-
```

## 3️⃣ Deploy Functions

```bash
cd packages/functions
firebase deploy --only functions
```

## 4️⃣ Verify It Works

Check the logs after deployment:
```bash
firebase functions:log
```

You should see: `✅ Secret fetched successfully: ENCRYPTION_KEY`

## 🔐 Secrets You Need

1. **ENCRYPTION_KEY** - For encrypting Plaid tokens (use your current key!)
2. **PLAID_CLIENT_ID** - From Plaid Dashboard
3. **PLAID_SECRET** - From Plaid Dashboard
4. **REVENUECAT_WEBHOOK_SECRET** - From RevenueCat webhook settings

## ⚠️ IMPORTANT: Migration Notes

### Use Your Current Encryption Key!
When creating `ENCRYPTION_KEY`, you **MUST** use the same key that's currently in your `.env` file. Otherwise, all existing Plaid tokens will fail to decrypt.

Use the same key that's currently in your `.runtimeconfig.json` file to avoid breaking existing encrypted data.

### For Local Development
Keep your `.env` file for emulator use - it won't be deployed:
```bash
# packages/functions/.env (for local development only)
ENCRYPTION_KEY=<your-encryption-key-here>
```

## 🧹 Clean Up Git History

After migration, remove `.env` from git history:

```bash
cd /Volumes/FInchRecovery/finch-app

# Remove from history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch packages/functions/.env" \
  --prune-empty --tag-name-filter cat -- --all

# Clean up
git push origin --force --all
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

## ✅ Verification Checklist

- [ ] Secret Manager API enabled
- [ ] All 4 secrets created
- [ ] IAM permissions granted to Cloud Functions service account
- [ ] Functions deployed successfully
- [ ] Logs show secrets being fetched
- [ ] Test a Plaid connection to verify encryption works
- [ ] `.env` removed from git history
- [ ] `.env` in `.gitignore`

## 📚 Full Documentation

See [SECRET_MANAGER_SETUP.md](../../SECRET_MANAGER_SETUP.md) for complete documentation.
