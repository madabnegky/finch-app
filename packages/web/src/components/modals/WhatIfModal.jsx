import React, { useState } from 'react';
import { parseDateString, toDateInputString } from '@shared/utils/date';
import Modal from '../core/Modal';
import CurrencyInput from '../core/CurrencyInput'; // Import CurrencyInput
import Input from '../core/Input'; // Import standard Input for description

const WhatIfModal = ({ isOpen, onClose, onSimulate, accounts }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(toDateInputString(new Date()));
    const [accountId, setAccountId] = useState(accounts[0]?.id || '');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSimulate({ description, amount, date: parseDateString(date), accountId });
    };
    
    const footer = (
        <button type="submit" form="what-if-form" className="bg-purple-600 text-white font-bold py-2 px-6 rounded-lg shadow-sm hover:bg-purple-700">
            Run Simulation
        </button>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title='"What If?" Scenario' footer={footer}>
             <form id="what-if-form" onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-finch-gray-600">See how a potential purchase could impact your future balance. This won't be saved as a real transaction.</p>
                <div>
                    <label className="block text-sm font-medium text-finch-gray-700">Purchase Description</label>
                    <Input
                        type="text"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="e.g., New TV"
                        required
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-finch-gray-700">Amount</label>
                        <CurrencyInput
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-finch-gray-700">Account</label>
                        <select 
                            value={accountId} 
                            onChange={e => setAccountId(e.target.value)} 
                            className="mt-1 block w-full form-select rounded-md border-finch-gray-300 shadow-sm focus:border-finch-teal-500 focus:ring-finch-teal-500"
                            required
                        >
                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-finch-gray-700">Purchase Date</label>
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="mt-1 block w-full form-input rounded-md border-finch-gray-300 shadow-sm focus:border-finch-teal-500 focus:ring-finch-teal-500"
                        required
                    />
                </div>
            </form>
        </Modal>
    );
};

export default WhatIfModal;