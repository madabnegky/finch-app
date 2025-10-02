import React from 'react';
import { useForm } from 'react-hook-form';
import Button from '@/components/core/Button';
import Input from '@/components/core/Input';
import Select from '@/components/core/Select';
import DatePicker from '@/components/core/DatePicker';
import Modal from '@/components/core/Modal';
import { CATEGORIES } from '@/constants/categories';

const TransactionModal = ({
    isOpen,
    onClose,
    onSubmit,
    transaction,
    accounts,
}) => {
    const { register, handleSubmit, watch, reset } = useForm({
        defaultValues: transaction || { type: 'expense' },
    });

    React.useEffect(() => {
        reset(transaction || { type: 'expense' });
    }, [transaction, reset]);

    const type = watch('type');

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {transaction ? 'Edit Transaction' : 'Add Transaction'}
                </h3>
                <div className="mt-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Type
                        </label>
                        <Select {...register('type')}>
                            <option value="expense">Expense</option>
                            <option value="income">Income</option>
                        </Select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Description
                        </label>
                        <Input {...register('description', { required: true })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Amount
                        </label>
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
                        <label className="block text-sm font-medium text-gray-700">
                            Date
                        </label>
                        <DatePicker {...register('date', { required: true })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Category
                        </label>
                        <Select {...register('category', { required: true })}>
                            {CATEGORIES[type].map((cat) => (
                                <option key={cat.value} value={cat.value}>
                                    {cat.label}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Account
                        </label>
                        <Select {...register('accountId', { required: true })}>
                            {accounts?.map((acc) => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.name}
                                </option>
                            ))}
                        </Select>
                    </div>
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