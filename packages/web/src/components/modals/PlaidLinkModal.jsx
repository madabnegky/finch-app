import React, { useState, useEffect, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { getFunctions, httpsCallable } from 'firebase/functions';
import Modal from '../core/Modal';
import { IconBank } from '../core/Icon';
import { formatCurrency } from '@shared/utils/currency'; // Changed import

const PlaidLinkModal = ({ isOpen, onClose, manualAccount, onLinkSuccess }) => {
    const [linkToken, setLinkToken] = useState(null);
    const [step, setStep] = useState('loading'); // loading, selecting, linking, error
    const [plaidData, setPlaidData] = useState({ itemId: null, plaidAccounts: [], institutionName: '' });
    const [selectedPlaidAccountId, setSelectedPlaidAccountId] = useState('');
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [error, setError] = useState('');

    const functions = getFunctions();

    // 1. Create a link token when the modal opens
    useEffect(() => {
        if (isOpen) {
            const generateToken = async () => {
                try {
                    setStep('loading');
                    const createToken = httpsCallable(functions, 'createLinkToken');
                    const result = await createToken({ accountId: manualAccount.id });
                    setLinkToken(result.data.link_token);
                } catch (err) {
                    console.error('Error creating link token:', err);
                    setError('Could not initialize Plaid. Please try again later.');
                    setStep('error');
                }
            };
            generateToken();
        }
    }, [isOpen, functions, manualAccount.id]);

    // 2. Define the Plaid success callback
    const onSuccess = useCallback(async (public_token, metadata) => {
        try {
            setStep('loading');
            const exchangeToken = httpsCallable(functions, 'exchangePublicToken');
            const result = await exchangeToken({ publicToken: public_token });
            const { itemId, plaidAccounts, institutionName } = result.data;

            setPlaidData({ itemId, plaidAccounts, institutionName });
            setSelectedPlaidAccountId(plaidAccounts[0]?.plaidAccountId || '');
            setSelectedAccount(plaidAccounts[0] || null);
            setStep('selecting');
        } catch (err) {
            console.error('Error exchanging token:', err);
            setError('Could not fetch accounts from your bank.');
            setStep('error');
        }
    }, [functions]);

    // 3. Handle account selection change
    const handleAccountChange = (accountId) => {
        setSelectedPlaidAccountId(accountId);
        const account = plaidData.plaidAccounts.find(acc => acc.plaidAccountId === accountId);
        setSelectedAccount(account);
    };

    // 4. Handle the final link confirmation
    const handleLinkConfirm = async () => {
        try {
            setStep('linking');
            const linkAccountToPlaid = httpsCallable(functions, 'linkAccountToPlaid');
            const linkResult = await linkAccountToPlaid({
                accountId: manualAccount.id,
                itemId: plaidData.itemId,
                plaidAccountId: selectedPlaidAccountId,
            });

            // Now sync transactions and detect recurring
            const syncTransactions = httpsCallable(functions, 'syncTransactions');
            await syncTransactions({
                itemId: plaidData.itemId,
                accountId: manualAccount.id,
            });

            const identifyRecurring = httpsCallable(functions, 'identifyRecurringTransactions');
            await identifyRecurring({
                itemId: plaidData.itemId,
                accountId: manualAccount.id,
            });

            onLinkSuccess(linkResult.data);
        } catch (err) {
            console.error('Error linking account:', err);
            setError('There was a problem linking your account. Please try again.');
            setStep('error');
        }
    };
    
    const { open, ready } = usePlaidLink({ token: linkToken, onSuccess });
    
    // 4. Automatically open Plaid once the token is ready
    useEffect(() => {
        if (ready && isOpen && step === 'loading') {
            open();
        }
    }, [ready, isOpen, step, open]);

    const renderContent = () => {
        if (step === 'loading') {
            return <p className="text-center text-slate-500">Initializing secure connection...</p>;
        }
        if (step === 'linking') {
            return <p className="text-center text-slate-500">Linking and syncing account...</p>;
        }
        if (step === 'error') {
            return <p className="text-center text-red-600 bg-red-50 p-4 rounded-lg">{error}</p>;
        }
        if (step === 'selecting') {
            return (
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                        Select the real bank account from <strong>{plaidData.institutionName}</strong> that corresponds to your manual account named <strong>"{manualAccount.name}"</strong>.
                    </p>
                    <select
                        value={selectedPlaidAccountId}
                        onChange={(e) => handleAccountChange(e.target.value)}
                        className="mt-1 block w-full form-select rounded-md border-finch-gray-300 shadow-sm focus:border-finch-teal-500 focus:ring-finch-teal-500"
                    >
                        {plaidData.plaidAccounts.map(acc => (
                            <option key={acc.plaidAccountId} value={acc.plaidAccountId}>
                                {acc.name || acc.officialName} ({acc.subtype}) - {formatCurrency(acc.currentBalance)}
                            </option>
                        ))}
                    </select>
                    {selectedAccount && (
                        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-sm text-amber-900">
                                <strong>Note:</strong> Your manual balance (<strong>{formatCurrency(manualAccount.currentBalance)}</strong>) will be updated to match your bank balance (<strong>{formatCurrency(selectedAccount.currentBalance)}</strong>).
                            </p>
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    const footer = step === 'selecting' ? (
        <button onClick={handleLinkConfirm} className="bg-finch-teal-700 text-white font-bold py-2 px-6 rounded-lg shadow-sm hover:bg-finch-teal-800">
            Confirm Link
        </button>
    ) : null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Link "${manualAccount.name}"`} footer={footer}>
            {renderContent()}
        </Modal>
    );
};

export default PlaidLinkModal;