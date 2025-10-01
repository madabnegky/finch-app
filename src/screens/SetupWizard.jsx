import React, { useState } from 'react';
import { writeBatch, doc, collection, serverTimestamp } from 'firebase/firestore';
import { db, appId } from '../api/firebase';
import { FinchLogo, IconPlus, IconTrash, IconInfo } from '../components/core/Icon';
import PlaidLink from '../components/plaid/PlaidLink'; // We'll use our Plaid component
import Tooltip from '../components/core/Tooltip';

// Re-introducing the manual account form component from the original file
const WizardStepAccounts = ({ accounts, updateAccounts }) => {
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


const SetupStep = ({ title, subtitle, children }) => (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
        <p className="text-slate-500 mb-6">{subtitle}</p>
        <div>{children}</div>
    </div>
);

const SetupWizard = ({ user, onComplete }) => {
    const [setupMethod, setSetupMethod] = useState(null); // 'plaid' or 'manual'
    const [plaidSuccess, setPlaidSuccess] = useState(false);
    const [manualAccounts, setManualAccounts] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    const handleFinishManualSetup = async () => {
        if (manualAccounts.length === 0) return;
        setIsSaving(true);
        try {
            const userDocRef = doc(db, `artifacts/${appId}/users`, user.uid);
            const batch = writeBatch(db);

            for (const acc of manualAccounts) {
                const newAccRef = doc(collection(userDocRef, 'accounts'));
                batch.set(newAccRef, {
                    name: acc.name,
                    type: acc.type,
                    startingBalance: acc.balance,
                    cushion: acc.cushion,
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
                <div className="text-center mb-12">
                    <FinchLogo className="w-16 h-16 mx-auto mb-2" />
                    <h1 className="text-4xl font-bold text-slate-900">Let's get you set up.</h1>
                    <p className="text-slate-500 mt-2">Add your first account to get started.</p>
                </div>

                <div className="space-y-6">
                    <SetupStep title="1. Add Your Account" subtitle="Connect securely with Plaid (recommended) or add an account manually.">
                        {!setupMethod && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button onClick={() => setSetupMethod('plaid')} className="p-6 border-2 border-indigo-500 bg-indigo-50 rounded-lg text-left hover:bg-indigo-100">
                                    <h3 className="font-bold text-lg text-indigo-800">Connect with Plaid</h3>
                                    <p className="text-sm text-indigo-700 mt-1">Automatically and securely sync your accounts. The easiest way to get started.</p>
                                </button>
                                <button onClick={() => setSetupMethod('manual')} className="p-6 border border-slate-300 rounded-lg text-left hover:bg-slate-50">
                                    <h3 className="font-bold text-lg text-slate-800">Add Manually</h3>
                                    <p className="text-sm text-slate-600 mt-1">Enter your account details yourself. You'll need to add transactions manually too.</p>
                                </button>
                            </div>
                        )}

                        {setupMethod === 'plaid' && !plaidSuccess && (
                           <PlaidLink onLinkSuccess={() => setPlaidSuccess(true)} isWizard={true} />
                        )}

                        {plaidSuccess && (
                            <div className="text-center p-8 bg-green-50 rounded-lg">
                                <h3 className="text-xl font-bold text-green-800">Success! Accounts Linked.</h3>
                                <p className="text-green-700 mt-2">You can now finish setup and view your dashboard.</p>
                            </div>
                        )}

                        {setupMethod === 'manual' && (
                            <WizardStepAccounts accounts={manualAccounts} updateAccounts={setManualAccounts} />
                        )}
                    </SetupStep>
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