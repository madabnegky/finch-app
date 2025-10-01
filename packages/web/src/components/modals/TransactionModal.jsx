import React, { useState, useEffect, useCallback } from 'react';
import { doc, collection, addDoc, updateDoc, writeBatch, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db, appId } from '@finch/shared-logic/api/firebase'; // Changed import
import { parseDateString, toDateInputString } from '@finch/shared-logic/utils/date'; // Changed import
import { CATEGORIES } from '../../constants/categories';
import Modal from '../core/Modal';

const TransactionModal = ({ isOpen, onClose, accounts, userId, transactionToEdit }) => {
    const isEditing = !!transactionToEdit;

    const getInitialState = useCallback(() => {
        if (isEditing) {
            if (transactionToEdit.isInstance) {
                return { ...transactionToEdit, isRecurring: false, amount: Math.abs(transactionToEdit.amount), date: toDateInputString(transactionToEdit.date), };
            }
            return { ...transactionToEdit, amount: Math.abs(transactionToEdit.amount), date: toDateInputString(transactionToEdit.date), recurringDetails: transactionToEdit.recurringDetails ? { ...transactionToEdit.recurringDetails, nextDate: toDateInputString(transactionToEdit.recurringDetails.nextDate), } : { frequency: 'monthly', nextDate: toDateInputString(new Date()), } };
        }
        return { type: 'expense', description: '', amount: '', date: toDateInputString(new Date()), accountId: accounts[0]?.id || '', category: 'Uncategorized', isRecurring: false, recurringDetails: { frequency: 'monthly', nextDate: toDateInputString(new Date()), } };
    }, [isEditing, transactionToEdit, accounts]);

    const [transaction, setTransaction] = useState(getInitialState);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => { setTransaction(getInitialState()); }, [transactionToEdit, getInitialState]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (name === 'frequency' || name === 'nextDate') {
            setTransaction(prev => ({ ...prev, recurringDetails: { ...prev.recurringDetails, [name]: value, } }));
        } else {
            setTransaction(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value, }));
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!transaction.description || !transaction.amount || !transaction.accountId) { return; }
        setIsSaving(true);
        try {
            if (isEditing && transactionToEdit.isInstance) {
                const batch = writeBatch(db);
                const parentRef = doc(db, `artifacts/${appId}/users/${userId}/transactions`, transactionToEdit.parentId);
                batch.update(parentRef, { 'recurringDetails.excludedDates': arrayUnion(transactionToEdit.date) });
                const newTransactionRef = doc(collection(db, `artifacts/${appId}/users/${userId}/transactions`));
                const newOneTimeTx = { accountId: transaction.accountId, description: transaction.description, amount: transaction.type === 'expense' ? -Math.abs(parseFloat(transaction.amount)) : parseFloat(transaction.amount), date: parseDateString(transaction.date), category: transaction.category, type: transaction.type, isRecurring: false, createdAt: serverTimestamp(), };
                batch.set(newTransactionRef, newOneTimeTx);
                await batch.commit();
            } else {
                const { id, isRecurring, date, recurringDetails, ...rest } = transaction;
                const dataToSave = { ...rest, amount: transaction.type === 'expense' ? -Math.abs(parseFloat(transaction.amount)) : parseFloat(transaction.amount), isRecurring, };
                if (isRecurring) {
                    dataToSave.recurringDetails = { frequency: recurringDetails.frequency, nextDate: parseDateString(recurringDetails.nextDate), };
                    dataToSave.date = null;
                } else {
                    dataToSave.date = parseDateString(date);
                    dataToSave.recurringDetails = null;
                }
                if (isEditing) {
                    const transactionRef = doc(db, `artifacts/${appId}/users/${userId}/transactions`, id);
                    await updateDoc(transactionRef, dataToSave);
                } else {
                    const transactionsRef = collection(db, `artifacts/${appId}/users/${userId}/transactions`);
                    await addDoc(transactionsRef, { ...dataToSave, createdAt: serverTimestamp() });
                }
            }
            onClose();
        } catch (error) {
            console.error("Error saving transaction: ", error);
        } finally {
            setIsSaving(false);
        }
    };
    
    // Updated button styles
    const footer = (
        <button type="submit" form="transaction-form" disabled={isSaving} className="bg-finch-teal-700 text-white font-bold py-2 px-6 rounded-lg shadow-sm hover:bg-finch-teal-800 disabled:bg-finch-gray-400 disabled:cursor-wait">
            {isSaving ? 'Saving...' : (isEditing ? 'Update Transaction' : 'Save Transaction')}
        </button>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Transaction' : 'Add Transaction'} footer={footer}>
            <form id="transaction-form" onSubmit={handleSave} className="space-y-4">
                {/* Updated input/select styles to use @tailwindcss/forms classes */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-finch-gray-700">Type</label>
                        <select name="type" value={transaction.type} onChange={handleChange} className="mt-1 block w-full form-select rounded-md border-finch-gray-300 shadow-sm focus:border-finch-teal-500 focus:ring-finch-teal-500">
                            <option value="expense">Expense</option>
                            <option value="income">Income</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-finch-gray-700">Account</label>
                        <select name="accountId" value={transaction.accountId} onChange={handleChange} className="mt-1 block w-full form-select rounded-md border-finch-gray-300 shadow-sm focus:border-finch-teal-500 focus:ring-finch-teal-500" required>
                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-finch-gray-700">Description</label>
                    <input type="text" name="description" value={transaction.description} onChange={handleChange} className="mt-1 block w-full form-input rounded-md border-finch-gray-300 shadow-sm focus:border-finch-teal-500 focus:ring-finch-teal-500" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-finch-gray-700">Amount</label>
                        <input type="number" name="amount" step="0.01" value={transaction.amount} onChange={handleChange} className="mt-1 block w-full form-input rounded-md border-finch-gray-300 shadow-sm focus:border-finch-teal-500 focus:ring-finch-teal-500" required />
                    </div>
                    {transaction.type === 'expense' && (
                        <div>
                            <label className="block text-sm font-medium text-finch-gray-700">Category</label>
                            <select name="category" value={transaction.category} onChange={handleChange} className="mt-1 block w-full form-select rounded-md border-finch-gray-300 shadow-sm focus:border-finch-teal-500 focus:ring-finch-teal-500">
                                {Object.keys(CATEGORIES).map(cat => <option key={cat}>{cat}</option>)}
                            </select>
                        </div>
                    )}
                </div>
                <div className="border-t border-finch-gray-200 my-4"></div>
                <div className="flex items-center">
                    <input type="checkbox" id="isRecurring" name="isRecurring" checked={transaction.isRecurring} onChange={handleChange} className="h-4 w-4 form-checkbox rounded border-finch-gray-300 text-finch-teal-600 focus:ring-finch-teal-500"/>
                    <label htmlFor="isRecurring" className="ml-2 block text-sm font-medium text-finch-gray-700">This is a recurring transaction</label>
                </div>
                {transaction.isRecurring ? (
                    <div className="grid grid-cols-2 gap-4 mt-2 p-4 bg-finch-gray-50 rounded-lg">
                        <div>
                            <label className="block text-sm font-medium text-finch-gray-700">Frequency</label>
                            <select name="frequency" value={transaction.recurringDetails.frequency} onChange={handleChange} className="mt-1 block w-full form-select rounded-md border-finch-gray-300 shadow-sm focus:border-finch-teal-500 focus:ring-finch-teal-500">
                                <option value="weekly">Weekly</option>
                                <option value="bi-weekly">Bi-Weekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="yearly">Yearly</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-finch-gray-700">Next Date</label>
                            <input type="date" name="nextDate" value={transaction.recurringDetails.nextDate} onChange={handleChange} className="mt-1 block w-full form-input rounded-md border-finch-gray-300 shadow-sm focus:border-finch-teal-500 focus:ring-finch-teal-500" />
                        </div>
                    </div>
                ) : (
                    <div>
                        <label className="block text-sm font-medium text-finch-gray-700">Date</label>
                        <input type="date" name="date" value={transaction.date} onChange={handleChange} className="mt-1 block w-full form-input rounded-md border-finch-gray-300 shadow-sm focus:border-finch-teal-500 focus:ring-finch-teal-500" />
                    </div>
                )}
            </form>
        </Modal>
    );
};

export default TransactionModal;