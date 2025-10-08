import React, { useState } from 'react';
import Modal from '../core/Modal';
import Button from '../core/Button';
import DatePicker from '../core/DatePicker';
import { toDateInputString } from '@shared/utils/date';

const EditRecurringModal = ({ isOpen, onClose, onEditSingle, onEditFuture, transaction }) => {
    const [choice, setChoice] = useState(null); // 'single' or 'future'
    const [effectiveDate, setEffectiveDate] = useState(
        transaction ? toDateInputString(transaction.date) : toDateInputString(new Date())
    );

    if (!isOpen) return null;

    const handleContinue = () => {
        if (choice === 'single') {
            onEditSingle();
        } else if (choice === 'future') {
            onEditFuture(effectiveDate);
        }
    };

    const footer = choice ? (
        <Button onClick={handleContinue}>
            Continue
        </Button>
    ) : null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Recurring Transaction" footer={footer}>
            <div className="space-y-4">
                <p className="text-sm text-slate-600">
                    This is part of a recurring series. How would you like to apply your changes?
                </p>

                {/* --- Option 1: Edit Single Occurrence --- */}
                <div
                    onClick={() => setChoice('single')}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        choice === 'single' ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-300' : 'border-slate-300 hover:bg-slate-50'
                    }`}
                >
                    <h3 className="font-semibold text-slate-800">Edit This Occurrence Only</h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Only this single instance will be changed. The rest of the series will remain unaffected.
                    </p>
                </div>

                {/* --- Option 2: Edit Future Occurrences --- */}
                <div
                    onClick={() => setChoice('future')}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        choice === 'future' ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-300' : 'border-slate-300 hover:bg-slate-50'
                    }`}
                >
                    <h3 className="font-semibold text-slate-800">Edit Future Occurrences</h3>
                    <p className="text-sm text-slate-500 mt-1">
                        This and all subsequent transactions in the series will be updated.
                    </p>
                    {choice === 'future' && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                            <label className="block text-sm font-medium text-gray-700">
                                Apply changes starting from:
                            </label>
                            <DatePicker
                                value={effectiveDate}
                                onChange={(e) => setEffectiveDate(e.target.value)}
                                onClick={(e) => e.stopPropagation()} // Prevent closing the selection
                                className="mt-1"
                            />
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default EditRecurringModal;