import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@shared/hooks/useAuth';
import { db, functions } from '@shared/api/firebase';
import { httpsCallable } from 'firebase/functions';
import { collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';

// --- CORRECTED IMPORTS ---
import { FinchLogo, IconPlus, IconTrash, IconInfo } from '@/components/core/Icon';
import PlaidLink from '@/components/plaid/PlaidLink';
import Tooltip from '@/components/core/Tooltip';
import { parseDateString, toDateInputString } from '@shared/utils/date';
import { CATEGORIES } from '@/constants/categories';
import Input from '@/components/core/Input';
import Select from '@/components/core/Select';
import Button from '@/components/core/Button';

// --- This sub-component is preserved from your original code ---
const WizardStepAccounts = ({ accounts, updateAccounts }) => {
    // FIX: Using functional updates for reliable state changes
    const addAccount = () => {
        updateAccounts(prev => [...prev, { id: `temp-${Date.now()}`, name: '', type: 'Checking', balance: 0, cushion: 0 }]);
    };
    const removeAccount = (id) => {
        updateAccounts(prev => prev.filter(acc => acc.id !== id));
    };
    const handleChange = (id, field, value) => {
        updateAccounts(prev => prev.map(acc => {
            if (acc.id === id) {
                let parsedValue = value;
                if (field === 'balance' || field === 'cushion') {
                    parsedValue = parseFloat(value) || 0;
                }
                return { ...acc, [field]: parsedValue };
            }
            return acc;
        }));
    };
    const inputClasses = "mt-1 block w-full rounded-md border-transparent bg-slate-100 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm";
    return (
        <div>
            <div className="space-y-4">
                {accounts.map((acc) => (
                    <div key={acc.id} className="bg-slate-50 p-4 rounded-lg border relative">
                        <button onClick={() => removeAccount(acc.id)} className="absolute top-3 right-3 text-slate-400 hover:text-red-500">
                            <IconTrash className="w-5 h-5" />
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Account Name</label>
                                <Input type="text" value={acc.name} onChange={e => handleChange(acc.id, 'name', e.target.value)} placeholder="e.g., Chase Checking" className={inputClasses} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Account Type</label>
                                <Select value={acc.type} onChange={e => handleChange(acc.id, 'type', e.target.value)} className={inputClasses}>
                                    <option>Checking</option>
                                    <option>Savings</option>
                                </Select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Current Balance</label>
                                <Input type="number" step="0.01" value={acc.balance} onChange={e => handleChange(acc.id, 'balance', e.target.value)} placeholder="1000.00" className={inputClasses} />
                            </div>
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <label htmlFor={`cushion-${acc.id}`} className="block text-sm font-medium text-slate-700">Account Cushion</label>
                                    <Tooltip text="An optional safety buffer.">
                                        <IconInfo className="w-4 h-4 text-slate-400 cursor-help" />
                                    </Tooltip>
                                </div>
                                <Input id={`cushion-${acc.id}`} type="number" step="0.01" value={acc.cushion} onChange={e => handleChange(acc.id, 'cushion', e.target.value)} placeholder="200.00" className={inputClasses} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <button onClick={addAccount} className="mt-4 flex items-center gap-2 text-indigo-600 font-semibold hover:text-indigo-700">
                <IconPlus className="w-5 h-5" /> Add Account
            </button>
        </div>
    );
};

// --- This sub-component is now fully functional ---
const WizardStepTransactions = ({ accounts, transactions, updateTransactions }) => {
    // FIX: Using functional updates for reliable state changes
    const addTransaction = () => {
        updateTransactions(prev => [...prev, {
            id: `temp-tx-${Date.now()}`,
            description: '',
            amount: '',
            type: 'expense',
            category: 'other',
            accountId: accounts[0]?.id || '',
            recurringDetails: { frequency: 'monthly', nextDate: toDateInputString(new Date()) },
        }]);
    };
    const removeTransaction = (id) => {
        updateTransactions(prev => prev.filter(tx => tx.id !== id));
    };
    const handleChange = (id, field, value, isRecurringDetail = false) => {
        updateTransactions(prev => prev.map(tx => {
            if (tx.id === id) {
                if (isRecurringDetail) {
                    return { ...tx, recurringDetails: { ...tx.recurringDetails, [field]: value } };
                }
                if (field === 'type') {
                    const newCategory = value === 'income' ? 'income' : 'other';
                    return { ...tx, type: value, category: newCategory };
                }
                return { ...tx, [field]: value };
            }
            return tx;
        }));
    };
    const inputClasses = "mt-1 block w-full rounded-md border-transparent bg-slate-100 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm";
    if (accounts.length === 0) {
        return <p className="text-sm text-slate-500 mt-4">Please add an account before adding recurring transactions.</p>;
    }
    return (
        <div>
            <div className="space-y-4">
                {transactions.map(tx => (
                    <div key={tx.id} className="bg-slate-50 p-4 rounded-lg border relative">
                        <button onClick={() => removeTransaction(tx.id)} className="absolute top-3 right-3 text-slate-400 hover:text-red-500"><IconTrash className="w-5 h-5" /></button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                             <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700">Description</label>
                                <Input type="text" value={tx.description} onChange={e => handleChange(tx.id, 'description', e.target.value)} placeholder="e.g., Netflix, Paycheck" className={inputClasses} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Amount</label>
                                <Input type="number" step="0.01" value={tx.amount} onChange={e => handleChange(tx.id, 'amount', e.target.value)} placeholder="15.99" className={inputClasses} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Type</label>
                                <Select value={tx.type} onChange={e => handleChange(tx.id, 'type', e.target.value)} className={inputClasses}>
                                    <option value="expense">Expense</option>
                                    <option value="income">Income</option>
                                </Select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Frequency</label>
                                <Select value={tx.recurringDetails.frequency} onChange={e => handleChange(tx.id, 'frequency', e.target.value, true)} className={inputClasses}>
                                    <option value="weekly">Weekly</option>
                                    <option value="bi-weekly">Bi-Weekly</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="yearly">Yearly</option>
                                </Select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Next Date</label>
                                <Input type="date" value={tx.recurringDetails.nextDate} onChange={e => handleChange(tx.id, 'nextDate', e.target.value, true)} className={inputClasses} />
                            </div>
                            {/* --- FIX: Only show category for expenses --- */}
                            {tx.type === 'expense' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Category</label>
                                    <Select value={tx.category} onChange={e => handleChange(tx.id, 'category', e.target.value)} className={inputClasses}>
                                        {CATEGORIES.expense.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                                    </Select>
                                </div>
                            )}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700">Account</label>
                                <Select value={tx.accountId} onChange={e => handleChange(tx.id, 'accountId', e.target.value)} className={inputClasses}>
                                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                </Select>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <button onClick={addTransaction} className="mt-4 flex items-center gap-2 text-indigo-600 font-semibold hover:text-indigo-700">
                <IconPlus className="w-5 h-5" /> Add Recurring Transaction
            </button>
        </div>
    );
};

// --- Main Setup Wizard Component ---
const SetupWizard = () => {
    const navigate = useNavigate();
    const auth = useAuth();
    const [step, setStep] = useState(1);
    const [manualAccounts, setManualAccounts] = useState([{ id: `temp-1`, name: 'Primary Checking', type: 'checking', balance: 2500, cushion: 500 }]);
    const [manualTransactions, setManualTransactions] = useState([{ id: `temp-tx-1`, description: 'Paycheck', amount: 3000, type: 'income', category: 'income', accountId: 'temp-1', recurringDetails: { frequency: 'bi-weekly', nextDate: toDateInputString(new Date()) } }]);
    const [plaidLinkToken, setPlaidLinkToken] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const generateToken = useCallback(async () => {
        if (!auth.user) return;
        try {
            const createLinkToken = httpsCallable(functions, 'createLinkToken');
            const result = await createLinkToken({ userId: auth.user.uid });
            setPlaidLinkToken(result.data.link_token);
        } catch (error) {
            console.error("Error creating Plaid link token:", error);
        }
    }, [auth.user]);

    useEffect(() => {
        if (auth.user) {
            generateToken();
        }
    }, [auth.user, generateToken]);

    const handlePlaidSuccess = useCallback(async (public_token) => {
        try {
            const exchangePublicToken = httpsCallable(functions, 'exchangePublicToken');
            await exchangePublicToken({ public_token });
            navigate('/app');
        } catch (error) {
            console.error("Error exchanging public token:", error);
        }
    }, [navigate]);
    
    const handleFinishManualSetup = async () => {
        if (!auth.user) return console.error("Cannot save, user is not available.");
        if (manualAccounts.length === 0) return;
        
        setIsSaving(true);
        try {
            const batch = writeBatch(db);
            const userId = auth.user.uid;
            const userDocRef = doc(db, `users/${userId}`);
            const accountIdMap = new Map();

            for (const acc of manualAccounts) {
                const newAccRef = doc(collection(userDocRef, 'accounts'));
                accountIdMap.set(acc.id, newAccRef.id);
                batch.set(newAccRef, {
                    name: acc.name,
                    type: acc.type.toLowerCase(),
                    balance: acc.balance,
                    cushion: acc.cushion,
                    createdAt: serverTimestamp(),
                });
            }

            for (const tx of manualTransactions) {
                const newTxRef = doc(collection(userDocRef, 'transactions'));
                batch.set(newTxRef, {
                    description: tx.description,
                    amount: tx.type === 'expense' ? -Math.abs(parseFloat(tx.amount)) : parseFloat(tx.amount),
                    type: tx.type,
                    accountId: accountIdMap.get(tx.accountId),
                    isRecurring: true,
                    category: tx.type === 'income' ? null : tx.category,
                    recurringDetails: {
                        frequency: tx.recurringDetails.frequency,
                        nextDate: parseDateString(tx.recurringDetails.nextDate),
                    },
                    createdAt: serverTimestamp(),
                });
            }

            batch.set(userDocRef, { setupComplete: true }, { merge: true });
            await batch.commit();
            navigate('/app');
        } catch (error) {
            console.error("Failed to save manual setup data:", error);
        } finally {
            setIsSaving(false);
        }
    };
    
    const renderContent = () => {
        if (step === 1) { // Initial Choice
            return (
                 <div className="text-center">
                    <FinchLogo className="w-16 h-16 mx-auto mb-2" />
                    <h1 className="text-4xl font-bold text-slate-900">Let's get you set up.</h1>
                    <p className="text-slate-500 mt-2">Connect with Plaid (recommended) or add accounts manually.</p>
                    <div className="mt-8 space-y-4 max-w-sm mx-auto">
                        {plaidLinkToken ? (
                            <PlaidLink token={plaidLinkToken} onLinkSuccess={handlePlaidSuccess} isWizard={true} />
                        ) : (
                            <Button className="w-full" variant="primary" disabled>Loading Secure Connection...</Button>
                        )}
                        <Button className="w-full" variant="secondary" onClick={() => setStep(2)}>
                            Add Manually
                        </Button>
                    </div>
                </div>
            );
        } else { // Manual Flow
            return (
                <div>
                     <div className="text-center mb-12">
                        <FinchLogo className="w-12 h-12 mx-auto mb-2" />
                        <h1 className="text-3xl font-bold text-slate-900">Manual Setup</h1>
                    </div>
                    <div className="space-y-8">
                         <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 sm:p-8">
                            <h2 className="text-2xl font-bold text-slate-800">1. Add Your Accounts</h2>
                            <WizardStepAccounts accounts={manualAccounts} updateAccounts={setManualAccounts} />
                        </div>

                        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 sm:p-8">
                            <h2 className="text-2xl font-bold text-slate-800">2. Add Recurring Transactions</h2>
                            <p className="text-slate-500 mb-6">Add your paychecks, bills, and subscriptions.</p>
                            <WizardStepTransactions accounts={manualAccounts} transactions={manualTransactions} updateTransactions={setManualTransactions} />
                        </div>
                    </div>
                    <div className="mt-12 text-center">
                        <Button 
                            onClick={handleFinishManualSetup} 
                            disabled={manualAccounts.length === 0 || isSaving}
                            className="bg-indigo-600 text-white font-bold py-4 px-10 rounded-lg shadow-md hover:bg-indigo-700 transition-all transform hover:scale-105 disabled:bg-slate-300 disabled:cursor-not-allowed disabled:scale-100"
                        >
                            {isSaving ? 'Saving...' : "Finish & View Dashboard"}
                        </Button>
                        <button onClick={() => setStep(1)} className="mt-4 text-sm text-slate-500 hover:text-indigo-600">
                           &larr; Back to setup method
                        </button>
                    </div>
                </div>
            );
        }
    };
    
    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                {renderContent()}
            </div>
        </div>
    );
};

export default SetupWizard;