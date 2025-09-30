import React, { useState } from 'react';
import StaticPreview from './StaticPreview';
import AnimatedPreview from './AnimatedPreview';
import { FinchLogo, GoogleIcon, IconX } from '../core/Icon';

// Define PreviewModal directly inside this file
const PreviewModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 animate-fade-in"
            onClick={onClose}
        >
            <style>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.3s ease-out; }
            `}</style>
            <div
                className="relative bg-transparent rounded-xl w-full max-w-2xl"
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute -top-4 -right-4 z-50 bg-white rounded-full p-1 text-slate-600 hover:text-red-500 hover:scale-110 transition-all shadow-lg">
                    <IconX className="w-6 h-6"/>
                </button>
                <AnimatedPreview />
            </div>
        </div>
    );
};

// The AuthScreen component
const AuthScreen = ({ onAnonymousSignIn, onGoogleSignIn }) => {
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

    return (
        <>
            <div className="flex items-center justify-center min-h-screen p-4 bg-slate-100">
                <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 items-center gap-12">
                    <StaticPreview onClick={() => setIsPreviewModalOpen(true)} />
                    <div className="w-full max-w-sm mx-auto text-center bg-white p-8 rounded-xl shadow-md border border-slate-200">
                        <FinchLogo className="w-20 h-20 mx-auto mb-4" />
                        <h1 className="text-3xl font-bold text-slate-900">Welcome to Finch</h1>
                        <p className="mt-2 text-slate-600">The Financial Change You Need.</p>
                        <div className="mt-8 space-y-4">
                            <button
                                onClick={onGoogleSignIn}
                                className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 text-slate-700 font-semibold py-3 px-4 rounded-lg shadow-sm hover:bg-slate-50 transition-colors duration-200"
                            >
                                <GoogleIcon />
                                Sign in with Google
                            </button>
                            <button
                                onClick={onAnonymousSignIn}
                                className="w-full bg-slate-800 text-white font-semibold py-3 px-4 rounded-lg shadow-sm hover:bg-slate-700 transition-colors duration-200"
                            >
                                Continue as Guest
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-6">
                            By continuing, you can save your demo data to an account later.
                        </p>
                    </div>
                </div>
            </div>
            <PreviewModal isOpen={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} />
        </>
    );
};

export default AuthScreen;