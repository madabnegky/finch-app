// packages/mobile/src/components/PlaidLinkHandler.tsx
import { useEffect } from 'react';
import { Alert } from 'react-native';
import { create, open, LinkSuccess, LinkExit, LinkTokenConfiguration } from 'react-native-plaid-link-sdk';
import functions from '@react-native-firebase/functions';

type PlaidLinkHandlerProps = {
  onSuccess: (publicToken: string, metadata: any) => void;
  onExit: () => void;
  trigger: boolean; // Set to true to trigger the flow
  onReset: () => void; // Called after flow completes to reset trigger
};

export const usePlaidLink = ({
  onSuccess,
  onExit,
  trigger,
  onReset,
}: PlaidLinkHandlerProps) => {
  useEffect(() => {
    if (!trigger) return;

    console.log('🔵 usePlaidLink: Trigger is TRUE, initiating Plaid...');

    let hasCompleted = false;

    const initiatePlaidLink = async () => {
      try {
        // Create link token from backend
        const createLinkToken = functions().httpsCallable('createLinkToken');
        const tokenResult = await createLinkToken();
        const { link_token } = tokenResult.data;

        console.log('🔵 usePlaidLink: Got link token, creating Plaid session...');

        // Initialize Plaid Link session
        const config: LinkTokenConfiguration = {
          token: link_token,
        };

        // Create the Plaid Link session
        create(config);

        // Open Plaid Link
        open({
          onSuccess: async (success: LinkSuccess) => {
            if (hasCompleted) {
              console.log('⚠️ usePlaidLink: Already completed, ignoring duplicate onSuccess');
              return;
            }
            hasCompleted = true;

            console.log('✅ usePlaidLink: Plaid success!');
            onSuccess(success.publicToken, success.metadata);
            onReset();
          },
          onExit: (exit: LinkExit) => {
            if (hasCompleted) {
              console.log('⚠️ usePlaidLink: Already completed, ignoring duplicate onExit');
              return;
            }
            hasCompleted = true;

            console.log('❌ usePlaidLink: Plaid exited');
            if (exit.error) {
              Alert.alert('Error', exit.error.displayMessage || 'Failed to connect to your bank.');
            }
            onExit();
            onReset();
          },
        });
      } catch (error: any) {
        console.error('Plaid link error:', error);
        Alert.alert('Error', `Failed to start Plaid: ${error.message || 'Unknown error'}`);
        onExit();
        onReset();
      }
    };

    initiatePlaidLink();
  }, [trigger]); // Only depend on trigger, not the callbacks
};
