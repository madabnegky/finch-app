import React from 'react';
import { formatCurrency } from '../../utils/currency';
import { IconCreditCard, IconPlayCircle } from '../core/Icon';

const StaticPreview = ({ onClick }) => {
    return (
        <button
            onClick={onClick}
            className="hidden md:flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-md border border-slate-200 relative aspect-[4/3] overflow-hidden group hover:shadow-xl hover:border-indigo-300 transition-all duration-300"
        >
            {/* Blurred background card */}
            <div className="bg-white rounded-xl shadow-lg p-6 border w-80 relative transition-all blur-sm group-hover:blur-none">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-xl text-slate-800">Your Checking</h3>
                        <p className="text-sm text-slate-500">Chase Bank</p>
                    </div>
                    <IconCreditCard className="text-slate-400" />
                </div>
                <div className="mt-8 text-center">
                    <p className="text-sm text-slate-500">Available to Spend</p>
                    <p className="text-4xl font-bold tracking-tight text-slate-900">
                        {formatCurrency(1250.75)}
                    </p>
                </div>
                <div className="mt-6 flex justify-between text-center border-t pt-4">
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Balance</p>
                        <p className="font-semibold text-slate-800 mt-1">{formatCurrency(2450.75)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Cushion</p>
                        <p className="font-semibold text-slate-800 mt-1">{formatCurrency(200)}</p>
                    </div>
                </div>
            </div>

            {/* Overlay */}
            <div className="absolute inset-0 bg-slate-900 bg-opacity-20 group-hover:bg-opacity-50 transition-all duration-300 flex flex-col items-center justify-center text-white">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                    <IconPlayCircle className="w-12 h-12" />
                </div>
                <p className="font-bold text-xl mt-4">See Finch in Action</p>
            </div>
        </button>
    );
};

export default StaticPreview;