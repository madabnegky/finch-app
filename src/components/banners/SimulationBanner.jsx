import React from 'react';
import { formatCurrency } from '../../utils/currency';
import { IconSparkles, IconX } from '../core/Icon';

const SimulationBanner = ({ transaction, onClear }) => (
    <div className="relative z-20 bg-purple-50 border-l-4 border-purple-500 text-purple-800 p-4 rounded-r-lg shadow-sm flex items-center justify-between mb-6 animate-fade-in">
        <style>{`
            @keyframes fade-in {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in { animation: fade-in 0.3s ease-out; }
        `}</style>
        <div className="flex items-center">
            <IconSparkles className="w-6 h-6 mr-3" />
            <div>
                <p className="font-bold">Simulation Mode</p>
                <p className="text-sm">Viewing impact of a hypothetical "{transaction.description}" purchase for {formatCurrency(transaction.amount)}.</p>
            </div>
        </div>
        <button onClick={onClear} className="text-purple-800 hover:bg-purple-100 p-2 rounded-full font-bold flex items-center gap-1 text-sm">
            <IconX className="w-5 h-5" /> Clear
        </button>
    </div>
);

export default SimulationBanner;