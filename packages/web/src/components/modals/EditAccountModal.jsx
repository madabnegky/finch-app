import React, { useState, useEffect } from 'react';
import Modal from '../core/Modal';

const EditAccountModal = ({ isOpen, onClose, account, onSave }) => {
    const [accountData, setAccountData] = useState(account);

    useEffect(() => {
        setAccountData(account);
    }, [account]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        let parsedValue = value;
        if (name === 'cushion' || name === 'startingBalance') {
            parsedValue = parseFloat(value) || 0;
        }
        setAccountData(prev => ({ ...prev, [name]: parsedValue }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        onSave(accountData);
    };

    const footer = (
        <button type="submit" form="edit-account-form" className="bg-finch-teal-700 text-white font-bold py-2 px-6 rounded-lg shadow-sm hover:bg-finch-teal-800">
            Save Changes
        </button>
    );
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Account" footer={footer}>
            <form id="edit-account-form" onSubmit={handleSave} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-finch-gray-700">Account Name</label>
                    <input type="text" name="name" value={accountData.name} onChange={handleChange} className="mt-1 block w-full form-input rounded-md border-finch-gray-300 shadow-sm focus:border-finch-teal-500 focus:ring-finch-teal-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-finch-gray-700">Account Type</label>
                        <select name="type" value={accountData.type} onChange={handleChange} className="mt-1 block w-full form-select rounded-md border-finch-gray-300 shadow-sm focus:border-finch-teal-500 focus:ring-finch-teal-500">
                            <option>Checking</option>
                            <option>Savings</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-finch-gray-700">Starting Balance</label>
                        <input type="number" step="0.01" name="startingBalance" value={accountData.startingBalance} onChange={handleChange} className="mt-1 block w-full form-input rounded-md border-finch-gray-300 shadow-sm focus:border-finch-teal-500 focus:ring-finch-teal-500" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-finch-gray-700">Account Cushion</label>
                    <input type="number" step="0.01" name="cushion" value={accountData.cushion} onChange={handleChange} className="mt-1 block w-full form-input rounded-md border-finch-gray-300 shadow-sm focus:border-finch-teal-500 focus:ring-finch-teal-500" />
                </div>
            </form>
        </Modal>
    );
};

export default EditAccountModal;