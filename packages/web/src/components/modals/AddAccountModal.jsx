import React, { useState } from 'react';
import Modal from '../core/Modal';
import CurrencyInput from '../core/CurrencyInput'; // Import CurrencyInput

const AddAccountModal = ({ isOpen, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState('Checking');
    const [startingBalance, setStartingBalance] = useState('');
    const [cushion, setCushion] = useState('');

    const handleSave = (e) => {
        e.preventDefault();
        onSave({
            name,
            type,
            startingBalance: parseFloat(startingBalance) || 0,
            cushion: parseFloat(cushion) || 0,
        });
        setName('');
        setType('Checking');
        setStartingBalance('');
        setCushion('');
    };

    const footer = (
        <button type="submit" form="add-account-form" className="bg-finch-teal-700 text-white font-bold py-2 px-6 rounded-lg shadow-sm hover:bg-finch-teal-800">
            Add Account
        </button>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Account" footer={footer}>
            <form id="add-account-form" onSubmit={handleSave} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-finch-gray-700">Account Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Chase Freedom" className="mt-1 block w-full form-input rounded-md border-finch-gray-300 shadow-sm focus:border-finch-teal-500 focus:ring-finch-teal-500" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-finch-gray-700">Account Type</label>
                    <select value={type} onChange={e => setType(e.target.value)} className="mt-1 block w-full form-select rounded-md border-finch-gray-300 shadow-sm focus:border-finch-teal-500 focus:ring-finch-teal-500">
                        <option>Checking</option>
                        <option>Savings</option>
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-finch-gray-700">Current Balance</label>
                        <CurrencyInput value={startingBalance} onChange={e => setStartingBalance(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-finch-gray-700">Balance Cushion (Optional)</label>
                        <CurrencyInput value={cushion} onChange={e => setCushion(e.target.value)} />
                    </div>
                </div>
            </form>
        </Modal>
    );
};

export default AddAccountModal;