import React from 'react';
import { useForm } from 'react-hook-form';
import Modal from '../core/Modal';
import Button from '../core/Button';
import Input from '../core/Input';
import Select from '../core/Select';
import DatePicker from '../core/DatePicker';
import CurrencyInput from '../core/CurrencyInput'; // Import CurrencyInput

const AddGoalModal = ({ isOpen, onClose, onSave, accounts }) => {
    const { register, handleSubmit, reset, formState: { errors } } = useForm();

    const handleSave = (data) => {
        onSave({
            ...data,
            targetAmount: parseFloat(data.targetAmount) || 0,
            allocatedAmount: 0,
        });
        reset();
    };
    
    const footer = (
        <Button type="submit" form="add-goal-form">
            Create Goal
        </Button>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create a New Goal" footer={footer}>
            <form id="add-goal-form" onSubmit={handleSubmit(handleSave)} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Goal Name</label>
                    <Input {...register('goalName', { required: "Goal name is required." })} placeholder="e.g., Trip to Japan" />
                    {errors.goalName && <p className="text-red-500 text-sm mt-1">{errors.goalName.message}</p>}
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700">Fund From</label>
                    <Select {...register('fundingAccountId', { required: "Please select an account." })}>
                        <option value="">Select an account</option>
                        {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                    </Select>
                    {errors.fundingAccountId && <p className="text-red-500 text-sm mt-1">{errors.fundingAccountId.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Target Amount</label>
                        <CurrencyInput {...register('targetAmount', { required: "Target amount is required." })} />
                        {errors.targetAmount && <p className="text-red-500 text-sm mt-1">{errors.targetAmount.message}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Target Date (Optional)</label>
                        <DatePicker {...register('targetDate')} />
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Icon (Optional)</label>
                    <Input {...register('icon')} placeholder="e.g., ✈️" />
                </div>
            </form>
        </Modal>
    );
};

export default AddGoalModal;