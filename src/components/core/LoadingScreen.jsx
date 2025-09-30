import React from 'react';
import { FinchLogo } from './Icon';

const LoadingScreen = () => (
    <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
            <FinchLogo className="w-24 h-24 animate-pulse" />
            <p className="text-lg text-slate-600 font-semibold">Loading your financial future...</p>
        </div>
    </div>
);

export default LoadingScreen;