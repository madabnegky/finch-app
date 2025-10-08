import React from 'react';
import Modal from '../core/Modal';

const AddAccountChoiceModal = ({ isOpen, onClose, onPlaid, onManual }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add a New Account">
            <div className="space-y-4">
                <button onClick={onPlaid} className="w-full p-6 border-2 border-indigo-500 bg-indigo-50 rounded-lg text-left hover:bg-indigo-100">
                    <h3 className="font-bold text-lg text-indigo-800">Connect with Plaid</h3>
                    <p className="text-sm text-indigo-700 mt-1">Automatically and securely sync a new bank account.</p>
                </button>
                <button onClick={onManual} className="w-full p-6 border border-slate-300 rounded-lg text-left hover:bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800">Add Manually</h3>
                    <p className="text-sm text-slate-600 mt-1">Enter account details yourself for things like cash.</p>
                </button>
            </div>
        </Modal>
    );
};

export default AddAccountChoiceModal;