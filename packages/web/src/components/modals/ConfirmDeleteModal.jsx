import React from 'react';
import { IconAlertTriangle } from '../core/Icon';

const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, transaction }) => {
    if (!isOpen) return null;

    return (
        // The modal overlay and positioning is unchanged
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
             {/* We apply our new styles to the modal card */}
             <div className="bg-white rounded-xl shadow-md border border-finch-gray-200 w-full max-w-sm p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <IconAlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-finch-gray-900">Delete Transaction</h3>
                <div className="mt-2">
                    <p className="text-sm text-finch-gray-500">
                        Are you sure you want to delete "{transaction.description}"?
                        {transaction.type === 'transfer' && <span className="font-semibold block mt-1">This will remove the transaction from both accounts.</span>}
                        {transaction.isRecurring && !transaction.isInstance && <span className="font-semibold block mt-1">This will delete the entire recurring series.</span>}
                        {transaction.isInstance && <span className="font-semibold block mt-1">This will delete only this single occurrence.</span>}
                    </p>
                </div>
                {/* Updated button styles */}
                <div className="mt-6 flex justify-center gap-4">
                     <button type="button" onClick={onClose} className="bg-white px-4 py-2 text-sm font-medium text-finch-gray-900 shadow-sm ring-1 ring-inset ring-finch-gray-300 hover:bg-finch-gray-50 rounded-lg">
                        Cancel
                    </button>
                    <button type="button" onClick={onConfirm} className="bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 rounded-lg">
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDeleteModal;