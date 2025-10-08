import React from 'react';
import { IconInfo, IconSave } from '../core/Icon';

const SaveProgressBanner = ({ onSave }) => (
    <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-800 p-4 rounded-r-lg shadow-sm flex items-center justify-between mb-6 animate-fade-in">
        <style>{`
            @keyframes fade-in {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in { animation: fade-in 0.3s ease-out; }
        `}</style>
        <div className="flex items-center">
            <IconInfo className="w-6 h-6 mr-3 flex-shrink-0" />
            <div>
                <p className="font-bold">You're using a Guest account.</p>
                <p className="text-sm">Sign up with Google to save your data and access it from any device.</p>
            </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
            <button onClick={onSave} className="bg-blue-500 text-white font-bold py-2 px-4 rounded-lg shadow-sm hover:bg-blue-600 transition-all text-sm whitespace-nowrap flex items-center gap-2">
                <IconSave className="w-4 h-4" /> Save Progress
            </button>
        </div>
    </div>
);

export default SaveProgressBanner;