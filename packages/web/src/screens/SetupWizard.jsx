import React, { useState } from 'react';
import { writeBatch, doc, collection, serverTimestamp } from 'firebase/firestore';
import { db, appId } from '@finch/shared-logic/api/firebase';
import { FinchLogo, IconPlus, IconTrash, IconInfo } from '../components/core/Icon';
import PlaidLink from '../components/plaid/PlaidLink';
import Tooltip from '../components/core/Tooltip';
import { parseDateString, toDateInputString } from '@finch/shared-logic/utils/date';
import { CATEGORIES } from '../constants/categories'; // Import categories

// This component for adding accounts is unchanged
const WizardStepAccounts = ({ accounts, updateAccounts }) => {
    // ... (This component's code remains exactly the same)
    const addAccount = () => {
        updateAccounts([...accounts, { id: `temp-${Date.now()}`, name: '', type: 'Checking', balance: 0, cushion: 0 }]);
    };

    const removeAccount = (id) => {
        updateAccounts(accounts.filter(acc => acc.id !== id));
    };

    const handleChange = (id, field, value) => {
        const newAccounts = accounts.map(acc => {
            if (acc.id === id) {
                let parsedValue = value;
                if (field === 'balance' || field === 'cushion') {
                    parsedValue = parseFloat(value) || 0;
                }
                return { ...acc, [field]: parsedValue };
            }
            return acc;
        });
        updateAccounts(newAccounts);
    };

    const inputClasses = "mt-1 block w-full rounded-md border-transparent bg-slate-100 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm";

    return (
        <div>
            <div className="space-y-4">
                {accounts.map((acc) => (
                    <div key={acc.id} className="bg-slate-50 p-4 rounded-lg border relative">
                        <button onClick={() => removeAccount(acc.id)} className="absolute top-3 right-3 text-slate-400 hover:text-red-500">
                            <IconTrash />
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Account Name</label>
                                <input type="text" value={acc.name} onChange={e => handleChange(acc.id, 'name', e.target.value)} placeholder="e.g., Chase Checking" className={inputClasses} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Account Type</label>
                                <select value={acc.type} onChange={e => handleChange(acc.id, 'type', e.target.value)} className={inputClasses}>
                                    <option>Checking</option>
                                    <option>Savings</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Current Balance</label>
                                <input type="number" step="0.01" value={acc.balance} onChange={e => handleChange(acc.id, 'balance', e.target.value)} placeholder="1000.00" className={inputClasses} />
                            </div>
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <label htmlFor={`cushion-${acc.id}`} className="block text-sm font-medium text-slate-700">Account Cushion</label>
                                    <Tooltip text="An optional safety buffer.">
                                        <IconInfo className="w-4 h-4 text-slate-400 cursor-help" />
                                    </Tooltip>
                                </div>
                                <input id={`cushion-${acc.id}`} type="number" step="0.01" value={acc.cushion} onChange={e => handleChange(acc.id, 'cushion', e.target.value)} placeholder="200.00" className={inputClasses} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <button onClick={addAccount} className="mt-4 flex items-center gap-2 text-indigo-600 font-semibold hover:text-indigo-700">
                <IconPlus /> Add Account
            </button>
        </div>
    );
};

// UPDATED: This component now includes the category field
const WizardStepTransactions = ({ accounts, transactions, updateTransactions }) => {
    const addTransaction = () => {
        updateTransactions([...transactions, {
            id: `temp-tx-${Date.now()}`,
            description: '',
            amount: '',
            type: 'expense',
            category: 'Uncategorized', // Add category to default state
            accountId: accounts[0]?.id || '',
            recurringDetails: {
                frequency: 'monthly',
                nextDate: toDateInputString(new Date()),
            },
        }]);
    };

    const removeTransaction = (id) => {
        updateTransactions(transactions.filter(tx => tx.id !== id));
    };

    const handleChange = (id, field, value, isRecurringDetail = false) => {
        const newTransactions = transactions.map(tx => {
            if (tx.id === id) {
                if (isRecurringDetail) {
                    return { ...tx, recurringDetails: { ...tx.recurringDetails, [field]: value } };
                }
                return { ...tx, [field]: value };
            }
            return tx;
        });
        updateTransactions(newTransactions);
    };

    const inputClasses = "mt-1 block w-full rounded-md border-transparent bg-slate-100 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm";
    
    if (accounts.length === 0) {
        return <p className="text-sm text-slate-500 mt-4">Please add an account above before adding recurring transactions.</p>;
    }

    return (
        <div>
            <div className="space-y-4">
                {transactions.map(tx => (
                    <div key={tx.id} className="bg-slate-50 p-4 rounded-lg border relative">
                        <button onClick={() => removeTransaction(tx.id)} className="absolute top-3 right-3 text-slate-400 hover:text-red-500"><IconTrash /></button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700">Description</label>
                                <input type="text" value={tx.description} onChange={e => handleChange(tx.id, 'description', e.target.value)} placeholder="e.g., Netflix, Paycheck" className={inputClasses} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Amount</label>
                                <input type="number" step="0.01" value={tx.amount} onChange={e => handleChange(tx.id, 'amount', e.target.value)} placeholder="15.99" className={inputClasses} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Type</label>
                                <select value={tx.type} onChange={e => handleChange(tx.id, 'type', e.target.value)} className={inputClasses}>
                                    <option value="expense">Expense</option>
                                    <option value="income">Income</option>
                                </select>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-700">Frequency</label>
                                <select value={tx.recurringDetails.frequency} onChange={e => handleChange(tx.id, 'frequency', e.target.value, true)} className={inputClasses}>
                                    <option value="weekly">Weekly</option>
                                    <option value="bi-weekly">Bi-Weekly</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="yearly">Yearly</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Next Date</label>
                                <input type="date" value={tx.recurringDetails.nextDate} onChange={e => handleChange(tx.id, 'nextDate', e.target.value, true)} className={inputClasses} />
                            </div>
                            
                            {/* NEW: Conditional Category Dropdown */}
                            {tx.type === 'expense' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Category</label>
                                    <select value={tx.category} onChange={e => handleChange(tx.id, 'category', e.target.value)} className={inputClasses}>
                                        {Object.keys(CATEGORIES).map(cat => <option key={cat}>{cat}</option>)}
                                    </select>
                                </div>
                            )}

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700">Account</label>
                                <select value={tx.accountId} onChange={e => handleChange(tx.id, 'accountId', e.target.value)} className={inputClasses}>
                                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <button onClick={addTransaction} className="mt-4 flex items-center gap-2 text-indigo-600 font-semibold hover:text-indigo-700">
                <IconPlus /> Add Recurring Transaction
            </button>
        </div>
    )
};


// Main Setup Wizard Component
const SetupWizard = ({ user, onComplete, onBack }) => {
    const [setupMethod, setSetupMethod] = useState(null);
    const [plaidSuccess, setPlaidSuccess] = useState(false);
    const [manualAccounts, setManualAccounts] = useState([]);
    const [manualTransactions, setManualTransactions] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    // UPDATED: This function now saves the category field
    const handleFinishManualSetup = async () => {
        if (manualAccounts.length === 0) return;
        setIsSaving(true);
        try {
            const userDocRef = doc(db, `artifacts/${appId}/users`, user.uid);
            const batch = writeBatch(db);

            const accountIdMap = new Map();
            for (const acc of manualAccounts) {
                const newAccRef = doc(collection(userDocRef, 'accounts'));
                accountIdMap.set(acc.id, newAccRef.id);
                batch.set(newAccRef, {
                    name: acc.name,
                    type: acc.type,
                    startingBalance: acc.balance,
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
                    category: tx.type === 'expense' ? tx.category : null, // Save category for expenses
                    recurringDetails: {
                        frequency: tx.recurringDetails.frequency,
                        nextDate: parseDateString(tx.recurringDetails.nextDate),
                    },
                    createdAt: serverTimestamp(),
                });
            }

            batch.set(userDocRef, { setupComplete: true }, { merge: true });
            await batch.commit();
            onComplete();
        } catch (error) {
            console.error("Failed to save manual setup data:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const isFinishEnabled = plaidSuccess || manualAccounts.length > 0;

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                 <div className="mb-4">
                    <button onClick={onBack} className="text-sm text-slate-500 hover:text-indigo-600">
                        &larr; Start Over
                    </button>
                </div>

                <div className="text-center mb-12">
                    <FinchLogo className="w-16 h-16 mx-auto mb-2" />
                    <h1 className="text-4xl font-bold text-slate-900">Let's get you set up.</h1>
                    <p className="text-slate-500 mt-2">Add your accounts and recurring transactions to get started.</p>
                </div>

                <div className="space-y-8">
                    {!setupMethod && (
                         <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 sm:p-8">
                            <h2 className="text-2xl font-bold text-slate-800">1. Choose a Setup Method</h2>
                            <p className="text-slate-500 mb-6">Connect securely with Plaid (recommended) or add accounts manually.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button onClick={() => setSetupMethod('plaid')} className="p-6 border-2 border-indigo-500 bg-indigo-50 rounded-lg text-left hover:bg-indigo-100">
                                    <h3 className="font-bold text-lg text-indigo-800">Connect with Plaid</h3>
                                    <p className="text-sm text-indigo-700 mt-1">Automatically and securely sync your accounts.</p>
                                </button>
                                <button onClick={() => setSetupMethod('manual')} className="p-6 border border-slate-300 rounded-lg text-left hover:bg-slate-50">
                                    <h3 className="font-bold text-lg text-slate-800">Add Manually</h3>
                                    <p className="text-sm text-slate-600 mt-1">Enter your account details yourself.</p>
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {setupMethod === 'plaid' && (
                        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 sm:p-8">
                             <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800">Connect with Plaid</h2>
                                    <p className="text-slate-500">Follow the prompts to securely link your bank.</p>
                                </div>
                                <button onClick={() => setSetupMethod(null)} className="text-sm text-slate-500 hover:text-indigo-600">Change Method</button>
                             </div>
                            {!plaidSuccess ? (
                               <PlaidLink onLinkSuccess={() => setPlaidSuccess(true)} isWizard={true} />
                            ) : (
                                <div className="text-center p-8 bg-green-50 rounded-lg">
                                    <h3 className="text-xl font-bold text-green-800">Success! Accounts Linked.</h3>
                                    <p className="text-green-700 mt-2">You can now finish setup and view your dashboard.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {setupMethod === 'manual' && (
                        <>
                            <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 sm:p-8">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-800">1. Add Your Accounts</h2>
                                        <p className="text-slate-500">Enter the details for each of your accounts.</p>
                                    </div>
                                    <button onClick={() => setSetupMethod(null)} className="text-sm text-slate-500 hover:text-indigo-600">Change Method</button>
                                </div>
                                <WizardStepAccounts accounts={manualAccounts} updateAccounts={setManualAccounts} />
                            </div>

                            <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 sm:p-8">
                                <h2 className="text-2xl font-bold text-slate-800">2. Add Recurring Transactions</h2>
                                <p className="text-slate-500 mb-6">Add your paychecks, bills, and subscriptions.</p>
                                <WizardStepTransactions accounts={manualAccounts} transactions={manualTransactions} updateTransactions={setManualTransactions} />
                            </div>
                        </>
                    )}
                </div>

                <div className="mt-12 text-center">
                    <button 
                        onClick={setupMethod === 'manual' ? handleFinishManualSetup : onComplete} 
                        disabled={!isFinishEnabled || isSaving}
                        className="bg-indigo-600 text-white font-bold py-4 px-10 rounded-lg shadow-md hover:bg-indigo-700 transition-all transform hover:scale-105 disabled:bg-slate-300 disabled:cursor-not-allowed disabled:scale-100"
                    >
                        {isSaving ? 'Saving...' : "Finish & View Dashboard"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SetupWizard;