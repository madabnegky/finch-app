import React, { useState } from 'react';
import { writeBatch, doc, collection, serverTimestamp } from 'firebase/firestore';
import { db, appId } from '../api/firebase';
import { parseDateString, toDateInputString } from '../utils/date';
import { CATEGORIES } from '../constants/categories';
import { FinchLogo, IconPlus, IconTrash, IconInfo } from '../components/core/Icon';
import Tooltip from '../components/core/Tooltip';

const WizardStepItemForm = ({ items, setItems, singular, fields }) => {
    const addItem = () => {
        const newItem = fields.reduce((acc, field) => ({ ...acc, [field.id]: field.default }), {});
        setItems([...items, { ...newItem, id: `temp-${Date.now()}` }]);
    };

    const removeItem = (id) => {
        setItems(items.filter(item => item.id !== id));
    };

    const handleChange = (id, field, value) => {
        const newItems = items.map(item => {
            if (item.id === id) {
                let parsedValue = value;
                const fieldDef = fields.find(f => f.id === field);
                if (fieldDef.type === 'number') {
                    parsedValue = parseFloat(value) || 0;
                }
                return { ...item, [field]: parsedValue };
            }
            return item;
        });
        setItems(newItems);
    };

    const inputClasses = "mt-1 block w-full rounded-md border-transparent bg-slate-100 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm";

    return (
        <div className="space-y-4">
            {items.map(item => (
                <div key={item.id} className="bg-slate-50 p-4 rounded-lg border relative">
                    <button onClick={() => removeItem(item.id)} className="absolute top-3 right-3 text-slate-400 hover:text-red-500">
                        <IconTrash />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {fields.map(field => (
                            <div key={field.id}>
                                <label className="block text-sm font-medium text-slate-700">{field.label}</label>
                                {field.type === 'select' ? (
                                    <select value={item[field.id]} onChange={e => handleChange(item.id, field.id, e.target.value)} className={inputClasses}>
                                        {field.options.map(opt => <option key={opt}>{opt}</option>)}
                                    </select>
                                ) : (
                                    <input
                                        type={field.type}
                                        value={item[field.id]}
                                        onChange={e => handleChange(item.id, field.id, e.target.value)}
                                        placeholder={field.placeholder}
                                        className={inputClasses}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
            <button onClick={addItem} className="mt-2 flex items-center gap-2 text-indigo-600 font-semibold hover:text-indigo-700">
                <IconPlus /> Add {singular}
            </button>
        </div>
    );
};

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
                                    <Tooltip text="An optional safety buffer. We'll treat this amount as 'unavailable' when calculating your 'Available to Spend' to help you avoid overdrafts.">
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

const SetupStep = ({ title, subtitle, enabled = true, children }) => (
    <div className={`bg-white rounded-xl shadow-md border border-slate-200 p-6 sm:p-8 transition-opacity duration-500 ${!enabled && 'opacity-50'}`}>
        <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
        <p className="text-slate-500 mb-6">{subtitle}</p>
        <div className={`${!enabled && 'pointer-events-none'}`}>
            {children}
        </div>
    </div>
);

const SetupWizard = ({ user, onComplete }) => {
    const [accounts, setAccounts] = useState([]);
    const [incomes, setIncomes] = useState({}); // { accountId: [income1, ...] }
    const [expenses, setExpenses] = useState({}); // { accountId: [expense1, ...] }
    const [isSaving, setIsSaving] = useState(false);

    const updateAccounts = (newAccounts) => setAccounts(newAccounts);
    const updateIncomes = (accountId, newIncomes) => setIncomes(prev => ({ ...prev, [accountId]: newIncomes }));
    const updateExpenses = (accountId, newExpenses) => setExpenses(prev => ({ ...prev, [accountId]: newExpenses }));

    const handleFinish = async () => {
        setIsSaving(true);
        try {
            const userDocRef = doc(db, `artifacts/${appId}/users`, user.uid);
            const batch = writeBatch(db);

            const accountIdMap = new Map();
            for (const acc of accounts) {
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

            const transactionsRef = collection(userDocRef, 'transactions');

            Object.keys(incomes).forEach(tempAccountId => {
                const firestoreAccountId = accountIdMap.get(tempAccountId);
                if (firestoreAccountId) {
                    incomes[tempAccountId].forEach(income => {
                        const newTransRef = doc(transactionsRef);
                        batch.set(newTransRef, {
                            accountId: firestoreAccountId,
                            description: income.source,
                            amount: parseFloat(income.amount),
                            type: 'income',
                            isRecurring: true,
                            recurringDetails: {
                                frequency: income.frequency,
                                nextDate: parseDateString(income.nextDate),
                            },
                            createdAt: serverTimestamp(),
                        });
                    });
                }
            });

            Object.keys(expenses).forEach(tempAccountId => {
                const firestoreAccountId = accountIdMap.get(tempAccountId);
                if (firestoreAccountId) {
                    expenses[tempAccountId].forEach(expense => {
                        const newTransRef = doc(transactionsRef);
                        batch.set(newTransRef, {
                            accountId: firestoreAccountId,
                            description: expense.name,
                            amount: -Math.abs(parseFloat(expense.amount)),
                            type: 'expense',
                            isRecurring: true,
                            recurringDetails: {
                                frequency: expense.frequency,
                                nextDate: parseDateString(expense.nextDate),
                            },
                            category: expense.category || 'Uncategorized',
                            createdAt: serverTimestamp(),
                        });
                    });
                }
            });

            batch.set(userDocRef, { setupComplete: true }, { merge: true });

            await batch.commit();
            onComplete();
        } catch (error) {
            console.error("Failed to save setup data:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const isStep2Enabled = accounts.length > 0;
    const isStep3Enabled = isStep2Enabled;

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <FinchLogo className="w-16 h-16 mx-auto mb-2" />
                    <h1 className="text-4xl font-bold text-slate-900">Let's get you set up.</h1>
                    <p className="text-slate-500 mt-2">Add your accounts and any recurring income or expenses.</p>
                </div>

                <div className="space-y-6">
                    <SetupStep title="1. Add Your Accounts" subtitle="Start by adding at least one checking or savings account.">
                        <WizardStepAccounts accounts={accounts} updateAccounts={updateAccounts} />
                    </SetupStep>

                    <SetupStep title="2. Add Recurring Deposits" subtitle="Next, add any regular sources of deposits like paychecks." enabled={isStep2Enabled}>
                        {isStep2Enabled && accounts.map(account => (
                            <div key={account.id} className="mt-4 first:mt-0">
                                <h3 className="font-semibold text-slate-700 mb-2">Deposits for "{account.name}"</h3>
                                <WizardStepItemForm
                                    items={incomes[account.id] || []}
                                    setItems={(items) => updateIncomes(account.id, items)}
                                    singular="Deposit Source"
                                    fields={[
                                        { id: 'source', label: 'Deposit Source', type: 'text', placeholder: "e.g., Salary", default: '' },
                                        { id: 'amount', label: 'Amount', type: 'number', placeholder: "2000.00", default: 0 },
                                        { id: 'frequency', label: 'Frequency', type: 'select', options: ['weekly', 'bi-weekly', 'monthly'], default: 'bi-weekly' },
                                        { id: 'nextDate', label: 'Next Deposit Date', type: 'date', default: toDateInputString(new Date()) },
                                    ]}
                                />
                            </div>
                        ))}
                    </SetupStep>

                    <SetupStep title="3. Add Recurring Expenses" subtitle="Finally, add any regular bills like rent or subscriptions." enabled={isStep3Enabled}>
                        {isStep3Enabled && accounts.map(account => (
                            <div key={account.id} className="mt-4 first:mt-0">
                                <h3 className="font-semibold text-slate-700 mb-2">Expenses from "{account.name}"</h3>
                                <WizardStepItemForm
                                    items={expenses[account.id] || []}
                                    setItems={(items) => updateExpenses(account.id, items)}
                                    singular="Expense"
                                    fields={[
                                        { id: 'name', label: 'Expense Name', type: 'text', placeholder: "e.g., Rent", default: '' },
                                        { id: 'amount', label: 'Amount', type: 'number', placeholder: "800.00", default: 0 },
                                        { id: 'category', label: 'Category', type: 'select', options: Object.keys(CATEGORIES), default: 'Uncategorized' },
                                        { id: 'frequency', label: 'Frequency', type: 'select', options: ['weekly', 'bi-weekly', 'monthly', 'yearly'], default: 'monthly' },
                                        { id: 'nextDate', label: 'Next Due Date', type: 'date', default: toDateInputString(new Date()) },
                                    ]}
                                />
                            </div>
                        ))}
                    </SetupStep>
                </div>

                <div className="mt-12 text-center">
                    <button onClick={handleFinish} disabled={isSaving || !isStep2Enabled} className="bg-indigo-600 text-white font-bold py-4 px-10 rounded-lg shadow-md hover:bg-indigo-700 transition-all transform hover:scale-105 disabled:bg-slate-300 disabled:cursor-not-allowed disabled:scale-100">
                        {isSaving ? 'Saving...' : "Finish & View Dashboard"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SetupWizard;