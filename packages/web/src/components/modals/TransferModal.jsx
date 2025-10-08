import React, { useState, useEffect, useCallback } from 'react';
import { toDateInputString } from '@shared/utils/date'; // Changed import
import Modal from '../core/Modal';

const TransferModal = ({ isOpen, onClose, accounts, onSave, transferToEdit, initialData }) => {
    const isEditing = !!transferToEdit;

    const getInitialState = useCallback(() => {
        if (isEditing) {
            const withdrawal = transferToEdit.find(t => t.amount < 0);
            const deposit = transferToEdit.find(t => t.amount > 0);
            return {
                fromAccountId: withdrawal.accountId,
                toAccountId: deposit.accountId,
                amount: Math.abs(withdrawal.amount),
                date: toDateInputString(withdrawal.date),
                description: withdrawal.notes || '',
                transferId: withdrawal.transferId,
            };
        }
        if (initialData) {
            return {
                ...initialData,
                amount: initialData.amount.toFixed(2)
            };
        }
        return {
            fromAccountId: accounts[0]?.id || '',
            toAccountId: accounts[1]?.id || '',
            amount: '',
            date: toDateInputString(new Date()),
            description: '',
        };
    }, [isEditing, transferToEdit, initialData, accounts]);

    const [transfer, setTransfer] = useState(getInitialState);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        setTransfer(getInitialState());
    }, [transferToEdit, accounts, initialData, getInitialState]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setError(''); // Clear error on change
        setTransfer(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (transfer.fromAccountId === transfer.toAccountId) {
            setError("From and To accounts cannot be the same.");
            return;
        }
        setIsSaving(true);
        await onSave(transfer);
        setIsSaving(false);
    };

    if (accounts.length < 2 && isOpen) {
        return (
            <Modal isOpen={isOpen} onClose={onClose} title="Transfer Error">
                <p className="text-sm text-finch-gray-500 mt-2">You need at least two accounts to make a transfer.</p>
            </Modal>
        );
    }

    const footer = (
        <button type="submit" form="transfer-form" disabled={isSaving} className="bg-finch-teal-700 text-white font-bold py-2 px-6 rounded-lg shadow-sm hover:bg-finch-teal-800 disabled:bg-finch-gray-400 disabled:cursor-wait">
            {isSaving ? 'Saving...' : 'Confirm Transfer'}
        </button>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Transfer' : 'Create Transfer'} footer={footer}>
            <form id="transfer-form" onSubmit={handleSave} className="space-y-4">
                {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-md">{error}</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-finch-gray-700">From Account</label>
                        <select name="fromAccountId" value={transfer.fromAccountId} onChange={handleChange} className="mt-1 block w-full form-select rounded-md border-finch-gray-300 shadow-sm focus:border-finch-teal-500 focus:ring-finch-teal-500" required>
                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-finch-gray-700">To Account</label>
                        <select name="toAccountId" value={transfer.toAccountId} onChange={handleChange} className="mt-1 block w-full form-select rounded-md border-finch-gray-300 shadow-sm focus:border-finch-teal-500 focus:ring-finch-teal-500" required>
                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-finch-gray-700">Amount</label>
                        <input type="number" name="amount" step="0.01" value={transfer.amount} onChange={handleChange} placeholder="100.00" className="mt-1 block w-full form-input rounded-md border-finch-gray-300 shadow-sm focus:border-finch-teal-500 focus:ring-finch-teal-500" required />
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-finch-gray-700">Date</label>
                        <input type="date" name="date" value={transfer.date} onChange={handleChange} className="mt-1 block w-full form-input rounded-md border-finch-gray-300 shadow-sm focus:border-finch-teal-500 focus:ring-finch-teal-500" required />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-finch-gray-700">Description (Optional)</label>
                    <input type="text" name="description" value={transfer.description} onChange={handleChange} placeholder="e.g., Savings for vacation" className="mt-1 block w-full form-input rounded-md border-finch-gray-300 shadow-sm focus:border-finch-teal-500 focus:ring-finch-teal-500" />
                </div>
            </form>
        </Modal>
    );
};

export default TransferModal;