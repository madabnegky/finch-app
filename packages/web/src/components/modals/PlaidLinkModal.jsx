import React, { useState, useEffect, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { getFunctions, httpsCallable } from 'firebase/functions';
import Modal from '../core/Modal';
import { IconBank } from '../core/Icon';
import { formatCurrency } from '@shared/utils/currency'; // Changed import

const PlaidLinkModal = ({ isOpen, onClose, manualAccount, onLinkSuccess }) => {
    const [linkToken, setLinkToken] = useState(null);
    const [step, setStep] = useState('loading'); // loading, selecting, linking, error
    const [plaidData, setPlaidData] = useState({ public_token: null, accounts: [] });
    const [selectedPlaidAccountId, setSelectedPlaidAccountId] = useState('');
    const [error, setError] = useState('');

    const functions = getFunctions();
    const createToken = httpsCallable(functions, 'createLinkToken');
    const getAccounts = httpsCallable(functions, 'getAccountsFromPublicToken');
    const linkAccount = httpsCallable(functions, 'linkManualAccountToPlaid');

    // 1. Create a link token when the modal opens
    useEffect(() => {
        if (isOpen) {
            const generateToken = async () => {
                try {
                    setStep('loading');
                    const result = await createToken();
                    setLinkToken(result.data.link_token);
                } catch (err) {
                    setError('Could not initialize Plaid. Please try again later.');
                    setStep('error');
                }
            };
            generateToken();
        }
    }, [isOpen]);

    // 2. Define the Plaid success callback
    const onSuccess = useCallback(async (public_token) => {
        try {
            setStep('loading');
            const result = await getAccounts({ public_token });
            setPlaidData({ public_token, accounts: result.data.accounts });
            setSelectedPlaidAccountId(result.data.accounts[0]?.account_id || '');
            setStep('selecting');
        } catch (err) {
            setError('Could not fetch accounts from your bank.');
            setStep('error');
        }
    }, []);

    // 3. Handle the final link confirmation
    const handleLinkConfirm = async () => {
        try {
            setStep('linking');
            await linkAccount({
                public_token: plaidData.public_token,
                manualAccountId: manualAccount.id,
                selectedPlaidAccountId: selectedPlaidAccountId,
            });
            onLinkSuccess();
        } catch (err) {
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
                        Select the real bank account that corresponds to your manual account named <strong>"{manualAccount.name}"</strong>.
                    </p>
                    <select
                        value={selectedPlaidAccountId}
                        onChange={(e) => setSelectedPlaidAccountId(e.target.value)}
                        className="mt-1 block w-full form-select rounded-md border-finch-gray-300 shadow-sm focus:border-finch-teal-500 focus:ring-finch-teal-500"
                    >
                        {plaidData.accounts.map(acc => (
                            <option key={acc.account_id} value={acc.account_id}>
                                {acc.name} ({acc.subtype}) - {formatCurrency(acc.balances.current)}
                            </option>
                        ))}
                    </select>
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