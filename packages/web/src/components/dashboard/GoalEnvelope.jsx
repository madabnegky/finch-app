import React from 'react';
import { formatCurrency } from '@shared/utils/currency';
import { IconPlus } from '../core/Icon';

const GoalEnvelope = ({ goal, onAllocate }) => {
    const { goalName, targetAmount, allocatedAmount, icon } = goal;
    const progress = targetAmount > 0 ? (allocatedAmount / targetAmount) * 100 : 0;

    return (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-finch-gray-200 h-full flex flex-col justify-between">
            <div>
                <div className="flex justify-between items-start">
                    <h3 className="font-bold text-xl text-finch-gray-800 flex items-center gap-2">
                        <span>{icon || '🎯'}</span>
                        {goalName}
                    </h3>
                    <button 
                        onClick={() => onAllocate(goal)} 
                        className="flex items-center gap-1 text-sm font-semibold text-finch-teal-700 hover:text-finch-teal-800"
                    >
                        <IconPlus className="w-4 h-4" /> Add
                    </button>
                </div>
                <div className="mt-4">
                    <div className="flex justify-between items-baseline mb-1">
                        <p className="text-2xl font-bold text-finch-teal-700">{formatCurrency(allocatedAmount)}</p>
                        <p className="text-sm text-finch-gray-500">of {formatCurrency(targetAmount)}</p>
                    </div>
                    <div className="w-full bg-finch-gray-200 rounded-full h-2.5">
                        <div
                            className="bg-finch-teal-600 h-2.5 rounded-full"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                        ></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GoalEnvelope;