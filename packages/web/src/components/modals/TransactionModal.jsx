import React from 'react';
import { useForm } from 'react-hook-form';
import Button from '@/components/core/Button';
import Input from '@/components/core/Input';
import Select from '@/components/core/Select';
import DatePicker from '@/components/core/DatePicker';
import Modal from '@/components/core/Modal';

const EXPENSE_CATEGORIES = [
    { value: 'Housing', label: 'Housing' },
    { value: 'Transportation', label: 'Transportation' },
    { value: 'Food', label: 'Food' },
    { value: 'Groceries', label: 'Groceries' },
    { value: 'Shopping', label: 'Shopping' },
    { value: 'Health', label: 'Health' },
    { value: 'Subscriptions', label: 'Subscriptions' },
    { value: 'Utilities', label: 'Utilities' },
    { value: 'Personal Care', label: 'Personal Care' },
    { value: 'Travel', label: 'Travel' },
    { value: 'Gifts & Donations', label: 'Gifts & Donations' },
    { value: 'Entertainment', label: 'Entertainment' },
    { value: 'Uncategorized', label: 'Uncategorized' },
];

const INCOME_CATEGORIES = [
    { value: 'Salary', label: 'Salary' },
    { value: 'Freelance', label: 'Freelance' },
    { value: 'Other', label: 'Other' },
];

const TransactionModal = ({
    isOpen,
    onClose,
    onSubmit,
    transaction,
    accounts,
    isRecurringSetup = false, 
}) => {
    const { register, handleSubmit, watch, reset, setValue } = useForm({
        defaultValues: transaction || { type: 'expense', frequency: 'monthly' },
    });

    React.useEffect(() => {
        if (accounts && accounts.length === 1) {
            setValue('accountId', accounts[0].id);
        }
        reset(transaction || { type: 'expense', frequency: 'monthly' });
    }, [transaction, reset, accounts, setValue]);

    const type = watch('type');
    const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

    const handleFormSubmit = (data) => {
        const submissionData = { ...data };
        if (isRecurringSetup) {
            submissionData.recurring = {
                frequency: data.frequency,
            };
        }
        if (accounts && accounts.length === 1) {
            submissionData.accountId = accounts[0].id;
        }
        onSubmit(submissionData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <form onSubmit={handleSubmit(handleFormSubmit)}>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {transaction ? 'Edit Transaction' : isRecurringSetup ? 'Add Recurring Transaction' : 'Add Transaction'}
                </h3>
                <div className="mt-4 space-y-4">
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
                        <Input
                            type="number"
                            step="0.01"
                            {...register('amount', {
                                required: true,
                                valueAsNumber: true,
                            })}
                        />
                    </div>
                    <div>
                        {/* FIX: Changed label from 'Start Date' to 'Next Occurrence Date' */}
                        <label className="block text-sm font-medium text-gray-700">
                            {isRecurringSetup ? 'Next Occurrence Date' : 'Date'}
                        </label>
                        <DatePicker {...register('date', { required: true })} />
                    </div>

                    {isRecurringSetup && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Frequency</label>
                            <Select {...register('frequency', { required: true })}>
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
                                {categories.map((cat) => (
                                    <option key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    )}

                    {accounts && accounts.length > 1 && (
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
                    <Button type="submit" variant="primary" className="w-full">
                        Save
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default TransactionModal;