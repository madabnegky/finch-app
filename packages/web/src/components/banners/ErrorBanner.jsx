import React from 'react';
import { IconAlertTriangle, IconX } from '../core/Icon';

const ErrorBanner = ({ error, onClear }) => {
    if (!error) return null;

    const errorMessage = error.message || 'An unexpected error occurred. Please try again later.';

    return (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 rounded-r-lg shadow-sm mb-6 flex justify-between items-center animate-fade-in">
             <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in { animation: fade-in 0.3s ease-out; }
            `}</style>
            <div className="flex items-center">
                <IconAlertTriangle className="w-6 h-6 mr-3 flex-shrink-0" />
                <div>
                    <p className="font-bold">Error</p>
                    <p className="text-sm">{errorMessage}</p>
                </div>
            </div>
            {onClear && (
                 <button onClick={onClear} className="text-red-600 hover:text-red-800">
                    <IconX className="w-5 h-5"/>
                </button>
            )}
        </div>
    );
};

export default ErrorBanner;