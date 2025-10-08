import React from 'react';
import { useForm } from 'react-hook-form';
import Button from '@/components/core/Button';
import Input from '@/components/core/Input';
import Select from '@/components/core/Select';
import DatePicker from '@/components/core/DatePicker';
import Modal from '@/components/core/Modal';
import CurrencyInput from '@/components/core/CurrencyInput';
import { toDateInputString } from '@shared/utils/date';

const TransactionModal = ({
    isOpen,
    onClose,
    onSubmit,
    transaction,
    accounts,
    isRecurringSetup = false,
    effectiveDate = null, // New prop to receive the effective date
}) => {
    const { register, handleSubmit, watch, reset, setValue } = useForm({
        defaultValues: transaction || {
            type: 'expense',
            isRecurring: isRecurringSetup,
            frequency: 'monthly',
            accountId: accounts && accounts.length > 0 ? accounts[0].id : ''
        },
    });

    React.useEffect(() => {
        const defaultValues = transaction ? {
            ...transaction,
            amount: Math.abs(transaction.amount) // Ensure amount is positive for the input
        } : {
            type: 'expense',
            isRecurring: isRecurringSetup,
            frequency: 'monthly',
            accountId: accounts && accounts.length > 0 ? accounts[0].id : ''
        };

        // --- START MODIFIED LOGIC ---
        // If an effectiveDate is passed, override the date field
        if (effectiveDate) {
            defaultValues.date = toDateInputString(effectiveDate);
        }
        // --- END MODIFIED LOGIC ---

        reset(defaultValues);
    }, [transaction, reset, accounts, isRecurringSetup, isOpen, effectiveDate]);


    const type = watch('type');
    const isRecurring = watch('isRecurring');
    const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

    React.useEffect(() => {
        if (type === 'income') {
            setValue('category', undefined);
        }
    }, [type, setValue]);

    const handleFormSubmit = (data) => {
        const submissionData = { ...data };
        if (submissionData.type === 'income') {
            delete submissionData.category;
        }
        onSubmit(submissionData);
    };

    const title = transaction ? 'Edit Transaction' : isRecurringSetup ? 'Add Recurring Transaction' : 'Add Transaction';
    const dateLabel = isRecurring || isRecurringSetup ? (effectiveDate ? 'Starts On' : 'Next Occurrence Date') : 'Date';


    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <form onSubmit={handleSubmit(handleFormSubmit)}>
                <div className="mt-4 space-y-4">
                    {!isRecurringSetup && (
                        <div className="flex items-center">
                            <input
                                id="isRecurring"
                                type="checkbox"
                                {...register('isRecurring')}
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="isRecurring" className="ml-2 block text-sm font-medium text-gray-700">
                                This is a recurring transaction
                            </label>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Type</label>
                        <Select {...register('type')}>
                            <option value="expense">Expense</option>
                            <option value="income">Income</option>
                        </Select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <Input {...register('description', { required: true })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Amount</label>
                        <CurrencyInput
                            {...register('amount', {
                                required: true,
                                valueAsNumber: true,
                            })}
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">
                           {dateLabel}
                        </label>
                        {/* --- START MODIFIED LOGIC --- */}
                        <DatePicker {...register('date', { required: true })} disabled={!!effectiveDate} />
                        {/* --- END MODIFIED LOGIC --- */}
                    </div>
                    {(isRecurring || isRecurringSetup) && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Frequency</label>
                            <Select {...register('frequency', { required: isRecurring || isRecurringSetup })}>
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="bi-weekly">Bi-Weekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="quarterly">Quarterly</option>
                                <option value="annually">Annually</option>
                            </Select>
                        </div>
                    )}
                    {type === 'expense' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Category</label>
                            <Select {...register('category', { required: true })}>
                                {EXPENSE_CATEGORIES.map((cat) => (
                                    <option key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    )}
                    {accounts && accounts.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Account</label>
                            <Select {...register('accountId', { required: true })}>
                                {accounts.map((acc) => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.name}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    )}
                </div>
                <div className="mt-5 sm:mt-6">
                    <Button type="submit" className="w-full">
                        Save
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

// Define constants for categories
const EXPENSE_CATEGORIES = [
    { value: 'Housing', label: 'Housing' }, { value: 'Transportation', label: 'Transportation' },
    { value: 'Food', label: 'Food' }, { value: 'Groceries', label: 'Groceries' },
    { value: 'Shopping', label: 'Shopping' }, { value: 'Health', label: 'Health' },
    { value: 'Subscriptions', label: 'Subscriptions' }, { value: 'Utilities', label: 'Utilities' },
    { value: 'Personal Care', label: 'Personal Care' }, { value: 'Travel', label: 'Travel' },
    { value: 'Gifts & Donations', label: 'Gifts & Donations' }, { value: 'Entertainment', label: 'Entertainment' },
    { value: 'Uncategorized', label: 'Uncategorized' },
];

const INCOME_CATEGORIES = [
    { value: 'Salary', label: 'Salary' }, { value: 'Freelance', label: 'Freelance' }, { value: 'Other', label: 'Other' },
];

export default TransactionModal;