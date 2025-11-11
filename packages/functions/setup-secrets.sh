#!/bin/bash

# Secret Manager Setup Script for Finch App
# This script helps you create and manage secrets in Google Secret Manager

set -e

PROJECT_ID="finch-app-v2"
REGION="us-central1"

echo "🔐 Setting up Google Secret Manager for Finch App"
echo "=================================================="
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed. Please install it first:"
    echo "   https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set the project
echo "📋 Setting GCP project to: $PROJECT_ID"
gcloud config set project $PROJECT_ID

# Enable Secret Manager API
echo ""
echo "🔌 Enabling Secret Manager API..."
gcloud services enable secretmanager.googleapis.com

echo ""
echo "✅ Secret Manager API enabled"
echo ""

# Function to create or update a secret
create_or_update_secret() {
    local SECRET_NAME=$1
    local SECRET_DESCRIPTION=$2
    local CURRENT_VALUE=$3

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔑 Setting up: $SECRET_NAME"
    echo "   Description: $SECRET_DESCRIPTION"

    # Check if secret already exists
    if gcloud secrets describe $SECRET_NAME --project=$PROJECT_ID &> /dev/null; then
        echo "   ℹ️  Secret already exists"
        read -p "   Do you want to add a new version? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            read -sp "   Enter new value for $SECRET_NAME: " SECRET_VALUE
            echo
            echo "$SECRET_VALUE" | gcloud secrets versions add $SECRET_NAME \
                --project=$PROJECT_ID \
                --data-file=-
            echo "   ✅ New version added"
        else
            echo "   ⏭️  Skipped"
        fi
    else
        echo "   Creating new secret..."

        # Show current value if available (for migration)
        if [ ! -z "$CURRENT_VALUE" ]; then
            echo "   ⚠️  Current value in .env file: $CURRENT_VALUE"
            echo "   You should use this same value to avoid breaking existing data"
            read -p "   Use this value? (y/n): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                SECRET_VALUE=$CURRENT_VALUE
            else
                read -sp "   Enter value for $SECRET_NAME: " SECRET_VALUE
                echo
            fi
        else
            read -sp "   Enter value for $SECRET_NAME: " SECRET_VALUE
            echo
        fi

        # Create the secret
        echo "$SECRET_VALUE" | gcloud secrets create $SECRET_NAME \
            --project=$PROJECT_ID \
            --replication-policy="automatic" \
            --data-file=-

        echo "   ✅ Secret created"
    fi

    # Grant Cloud Functions access to the secret
    echo "   🔓 Granting Cloud Functions access..."
    gcloud secrets add-iam-policy-binding $SECRET_NAME \
        --project=$PROJECT_ID \
        --member="serviceAccount:$PROJECT_ID@appspot.gserviceaccount.com" \
        --role="roles/secretmanager.secretAccessor" \
        &> /dev/null || true

    echo "   ✅ Access granted to Cloud Functions"
}

# Generate a new encryption key if needed
generate_encryption_key() {
    echo ""
    echo "🔐 Generating new encryption key..."
    echo "   ⚠️  WARNING: Changing the encryption key will invalidate all existing encrypted data!"
    echo "   Only generate a new key if this is a fresh install or you plan to re-encrypt all data."
    echo ""
    read -p "   Generate new encryption key? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Generate a secure 256-bit key
        NEW_KEY=$(openssl rand -hex 32)
        echo "   ✅ New encryption key generated"
        echo "$NEW_KEY"
    else
        echo ""
    fi
}

# Read current .env file if it exists
CURRENT_ENCRYPTION_KEY=""
if [ -f ".env" ]; then
    echo "📄 Found existing .env file"
    CURRENT_ENCRYPTION_KEY=$(grep "^ENCRYPTION_KEY=" .env | cut -d '=' -f2 || echo "")
fi

echo ""
echo "Setting up secrets..."
echo ""

# 1. Encryption Key
if [ ! -z "$CURRENT_ENCRYPTION_KEY" ]; then
    create_or_update_secret "ENCRYPTION_KEY" \
        "Encryption key for Plaid access tokens" \
        "$CURRENT_ENCRYPTION_KEY"
else
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔑 Setting up: ENCRYPTION_KEY"
    echo "   No existing key found in .env"
    NEW_KEY=$(generate_encryption_key)
    if [ ! -z "$NEW_KEY" ]; then
        echo "$NEW_KEY" | gcloud secrets create ENCRYPTION_KEY \
            --project=$PROJECT_ID \
            --replication-policy="automatic" \
            --data-file=-
        echo "   ✅ ENCRYPTION_KEY created"

        # Grant access
        gcloud secrets add-iam-policy-binding ENCRYPTION_KEY \
            --project=$PROJECT_ID \
            --member="serviceAccount:$PROJECT_ID@appspot.gserviceaccount.com" \
            --role="roles/secretmanager.secretAccessor" \
            &> /dev/null || true
    fi
fi

# 2. Plaid Client ID
echo ""
create_or_update_secret "PLAID_CLIENT_ID" \
    "Plaid API Client ID" \
    ""

# 3. Plaid Secret
echo ""
create_or_update_secret "PLAID_SECRET" \
    "Plaid API Secret" \
    ""

# 4. RevenueCat Webhook Secret
echo ""
create_or_update_secret "REVENUECAT_WEBHOOK_SECRET" \
    "RevenueCat webhook signature verification secret" \
    ""

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Secret Manager setup complete!"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Verify secrets were created:"
echo "   gcloud secrets list --project=$PROJECT_ID"
echo ""
echo "2. View a secret value:"
echo "   gcloud secrets versions access latest --secret=ENCRYPTION_KEY --project=$PROJECT_ID"
echo ""
echo "3. Deploy your Cloud Functions:"
echo "   cd packages/functions && firebase deploy --only functions"
echo ""
echo "4. IMPORTANT: Update .env file for local development"
echo "   Keep ENCRYPTION_KEY in .env for emulator (it won't be deployed)"
echo ""
echo "5. SECURITY: Remove .env from git history:"
echo "   git filter-branch --force --index-filter \\"
echo "     'git rm --cached --ignore-unmatch packages/functions/.env' \\"
echo "     --prune-empty --tag-name-filter cat -- --all"
echo ""
echo "6. Ensure .env is in .gitignore"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
