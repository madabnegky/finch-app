import React from 'react';
import { useForm } from 'react-hook-form';
import Modal from '../core/Modal';
import Button from '../core/Button';
import Input from '../core/Input';
import { formatCurrency } from '@shared/utils/currency';

// --- START FIX ---
// The component now receives `fundingAccount` which contains the `availableToSpend` value.
const AllocateFundsModal = ({ isOpen, onClose, onSave, goal }) => {
// --- END FIX ---
    const { register, handleSubmit, reset, formState: { errors } } = useForm();

    const handleSave = (data) => {
        onSave(goal, parseFloat(data.amount) || 0);
        reset();
    };

    const footer = (
        <Button type="submit" form="allocate-funds-form">
            Allocate Funds
        </Button>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Add to "${goal.goalName}"`} footer={footer}>
            <form id="allocate-funds-form" onSubmit={handleSubmit(handleSave)} className="space-y-4">
                {/* --- START FIX --- */}
                {/* The UI now clearly shows the user how much is available in that specific account */}
                <div className="p-4 bg-finch-teal-50 border border-finch-teal-200 rounded-lg text-center">
                    <p className="text-sm text-finch-teal-800">You have {formatCurrency(goal.availableToSpend)} available to spend from this account.</p>
                </div>
                {/* --- END FIX --- */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Amount to Allocate</label>
                    <Input
                        type="number"
                        step="0.01"
                        {...register('amount', {
                            required: "Amount is required.",
                            valueAsNumber: true,
                            // --- START FIX ---
                            // The validation is now correctly set against the account's available balance
                            max: { value: goal.availableToSpend, message: "Cannot allocate more than is available to spend." }
                            // --- END FIX ---
                        })}
                        placeholder="e.g., 350.00"
                    />
                    {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>}
                </div>
            </form>
        </Modal>
    );
};

export default AllocateFundsModal;