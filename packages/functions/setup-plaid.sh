#!/bin/bash

# Plaid Integration Setup Script
# Run this script to set up encryption and Cloud Tasks for Plaid integration

set -e  # Exit on error

echo "🏦 Finch Plaid Integration Setup"
echo "================================"
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Install it with: npm install -g firebase-tools"
    exit 1
fi

# Check if gcloud CLI is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud SDK not found. Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Step 1: Generate encryption key
echo "📝 Step 1: Generate Encryption Key"
echo "-----------------------------------"

ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

echo "Generated encryption key: $ENCRYPTION_KEY"
echo ""
echo "⚠️  IMPORTANT: Save this key somewhere secure (password manager)!"
echo "   If you lose it, you won't be able to decrypt existing Plaid tokens."
echo ""

read -p "Press Enter to continue and set this key in Firebase Config..."

firebase functions:config:set encryption.key="$ENCRYPTION_KEY"

echo "✅ Encryption key set in Firebase Config"
echo ""

# Save to .env for local development
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" > .env
echo "✅ Saved to .env for local development"
echo ""

# Step 2: Set project
echo "📝 Step 2: Configure Google Cloud Project"
echo "------------------------------------------"

PROJECT_ID="finch-app-v2"
LOCATION="us-central1"
QUEUE_NAME="plaid-sync-queue"

echo "Setting gcloud project to: $PROJECT_ID"
gcloud config set project $PROJECT_ID

echo "✅ Project configured"
echo ""

# Step 3: Enable APIs
echo "📝 Step 3: Enable Required APIs"
echo "--------------------------------"

echo "Enabling Cloud Tasks API..."
gcloud services enable cloudtasks.googleapis.com --quiet

echo "Enabling Cloud Functions API..."
gcloud services enable cloudfunctions.googleapis.com --quiet

echo "✅ APIs enabled"
echo ""

# Step 4: Create Cloud Tasks queue
echo "📝 Step 4: Create Cloud Tasks Queue"
echo "------------------------------------"

# Check if queue already exists
if gcloud tasks queues describe $QUEUE_NAME --location=$LOCATION &> /dev/null; then
    echo "⚠️  Queue '$QUEUE_NAME' already exists, skipping creation"
else
    echo "Creating queue: $QUEUE_NAME"
    gcloud tasks queues create $QUEUE_NAME \
        --location=$LOCATION \
        --max-dispatches-per-second=10 \
        --max-concurrent-dispatches=5 \
        --quiet

    echo "✅ Cloud Tasks queue created"
fi

echo ""

# Step 5: Verify Plaid config
echo "📝 Step 5: Verify Plaid Configuration"
echo "--------------------------------------"

if [ -f ".runtimeconfig.json" ]; then
    echo "✅ Found .runtimeconfig.json"

    # Check if plaid config exists
    if grep -q '"plaid"' .runtimeconfig.json; then
        echo "✅ Plaid configuration found"
        cat .runtimeconfig.json | grep -A 4 '"plaid"'
    else
        echo "⚠️  Warning: No Plaid configuration in .runtimeconfig.json"
        echo "   Make sure to add your Plaid credentials before deploying"
    fi
else
    echo "⚠️  Warning: .runtimeconfig.json not found"
    echo "   Create it with your Plaid credentials:"
    echo '   {
     "plaid": {
       "env": "sandbox",
       "secret": "YOUR_PLAID_SECRET",
       "client_id": "YOUR_PLAID_CLIENT_ID"
     }
   }'
fi

echo ""

# Step 6: Deploy functions
echo "📝 Step 6: Deploy Cloud Functions"
echo "----------------------------------"

read -p "Deploy Cloud Functions now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Deploying functions..."
    firebase deploy --only functions
    echo "✅ Functions deployed"
else
    echo "⏭️  Skipping deployment. Deploy later with: firebase deploy --only functions"
fi

echo ""
echo "================================"
echo "✅ Setup Complete!"
echo "================================"
echo ""
echo "Next Steps:"
echo "1. Test the integration in your Android app"
echo "2. Monitor logs: firebase functions:log"
echo "3. Check Cloud Tasks: gcloud tasks list --queue=$QUEUE_NAME --location=$LOCATION"
echo ""
echo "📚 For detailed documentation, see: PLAID_SETUP.md"
echo ""
echo "Encryption Key (save this): $ENCRYPTION_KEY"
echo ""
