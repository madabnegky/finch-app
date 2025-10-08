import React from 'react';
import { IconAlertTriangle, IconX } from '../core/Icon';
import { formatCurrency } from '@shared/utils/currency'; // Changed import

const SimulationBanner = ({ transaction, onClear }) => {
    return (
        <div className="bg-purple-100 border-l-4 border-purple-500 text-purple-800 p-4 rounded-md shadow-sm mb-6 flex justify-between items-center">
            <div className="flex items-center">
                <IconAlertTriangle className="w-6 h-6 mr-3 text-purple-600"/>
                <div>
                    <p className="font-bold">Simulation Mode</p>
                    <p className="text-sm">Showing projected balance including a one-time purchase of "{transaction.description}" for {formatCurrency(Math.abs(transaction.amount))}.</p>
                </div>
            </div>
            <button onClick={onClear} className="text-purple-600 hover:text-purple-800">
                <IconX className="w-5 h-5"/>
            </button>
        </div>
    );
};

export default SimulationBanner;