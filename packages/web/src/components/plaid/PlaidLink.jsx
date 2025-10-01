import React, { useState, useEffect, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { IconBank, IconPlus } from '../core/Icon';

const PlaidLink = ({ onLinkSuccess, buttonText, isWizard = false }) => {
    const [linkToken, setLinkToken] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Connecting...');

    const createLinkToken = useCallback(async () => {
        setIsLoading(true);
        setLoadingMessage('Initializing...');
        try {
            const functions = getFunctions();
            const createToken = httpsCallable(functions, 'createLinkToken');
            const result = await createToken();
            const { link_token } = result.data;
            setLinkToken(link_token);
        } catch (error) {
            console.error("Error creating link token:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        createLinkToken();
    }, [createLinkToken]);

    const onSuccess = useCallback(async (public_token, metadata) => {
        setIsLoading(true);
        try {
            const functions = getFunctions();
            
            setLoadingMessage('Saving accounts...');
            const exchangeToken = httpsCallable(functions, 'exchangePublicToken');
            const exchangeResult = await exchangeToken({ public_token: public_token });
            const { item_id } = exchangeResult.data;

            setLoadingMessage('Syncing transactions...');
            const syncTransactions = httpsCallable(functions, 'syncTransactions');
            await syncTransactions({ item_id: item_id });

            // Reverted to call the original Plaid-powered function
            setLoadingMessage('Analyzing recurring transactions...');
            const identifyRecurring = httpsCallable(functions, 'identifyRecurringTransactions');
            await identifyRecurring({ item_id: item_id });

            onLinkSuccess();
        } catch (error) {
            console.error("Error during Plaid success callback:", error);
        } finally {
            setIsLoading(false);
        }
    }, [onLinkSuccess]);

    const { open, ready } = usePlaidLink({
        token: linkToken,
        onSuccess,
    });

    const wizardButton = (
        <button
            onClick={() => open()}
            disabled={!ready || isLoading}
            className="w-full max-w-sm mx-auto flex items-center justify-center gap-3 bg-indigo-600 text-white font-bold py-4 px-6 rounded-lg shadow-md hover:bg-indigo-700 transition-all transform hover:scale-105 disabled:bg-slate-400 disabled:cursor-not-allowed"
        >
            <IconBank />
            {isLoading ? loadingMessage : 'Connect Your Bank Account'}
        </button>
    );

    const dashboardButton = (
        <button
            onClick={() => open()}
            disabled={!ready || isLoading}
            className="w-full bg-white/50 border-2 border-dashed border-finch-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-finch-gray-500 hover:bg-white hover:border-finch-teal-400 hover:text-finch-teal-600 transition-all h-full"
        >
            <IconPlus />
            <span className="mt-2 font-bold text-lg">{isLoading ? loadingMessage : buttonText}</span>
        </button>
    );
    
    useEffect(() => {
        if (ready && !isWizard) {
            open();
        }
    }, [ready, isWizard, open]);


    if (isWizard) {
        return wizardButton;
    }
    
    return null;
};

export default PlaidLink;