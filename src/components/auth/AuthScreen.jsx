import React, { useState } from 'react';
import { FinchLogo, GoogleIcon } from '../core/Icon';
import { createUser, signInUser } from '../../api/firebase';

const AuthScreen = ({ onGoogleSignIn, onAnonymousSignIn, onBack }) => {
    const [isSignUp, setIsSignUp] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (isSignUp) {
                await createUser(email, password);
            } else {
                await signInUser(email, password);
            }
            // onAuthStateChanged will handle the rest
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen p-4 bg-slate-100">
            <div className="w-full max-w-sm mx-auto">
                <div className="text-center mb-8">
                    {/* NEW: Back to Home link */}
                    <button onClick={onBack} className="text-sm text-slate-500 hover:text-indigo-600 mb-4">
                        &larr; Back to Home
                    </button>
                    <FinchLogo className="w-16 h-16 mx-auto mb-2" />
                    <h1 className="text-3xl font-bold text-slate-900">
                        {isSignUp ? 'Create your Account' : 'Welcome Back'}
                    </h1>
                    <p className="mt-2 text-slate-600">
                        {isSignUp ? 'Start your journey to financial clarity.' : 'Sign in to continue.'}
                    </p>
                </div>

                <div className="bg-white p-8 rounded-xl shadow-md border border-slate-200">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-finch-gray-700">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="mt-1 block w-full form-input rounded-md border-finch-gray-300 shadow-sm focus:border-finch-teal-500 focus:ring-finch-teal-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-finch-gray-700">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="mt-1 block w-full form-input rounded-md border-finch-gray-300 shadow-sm focus:border-finch-teal-500 focus:ring-finch-teal-500"
                                required
                            />
                        </div>
                        {error && <p className="text-sm text-red-600">{error}</p>}
                        <div>
                            <button
                                type="submit"
                                className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg shadow-sm hover:bg-indigo-700 transition-colors duration-200"
                            >
                                {isSignUp ? 'Create Account' : 'Sign In'}
                            </button>
                        </div>
                    </form>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-300" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-slate-500">Or</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={onGoogleSignIn}
                            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 text-slate-700 font-semibold py-3 px-4 rounded-lg shadow-sm hover:bg-slate-50 transition-colors duration-200"
                        >
                            <GoogleIcon />
                            Continue with Google
                        </button>
                        <button
                            onClick={onAnonymousSignIn}
                            className="w-full bg-slate-800 text-white font-semibold py-3 px-4 rounded-lg shadow-sm hover:bg-slate-700 transition-colors duration-200"
                        >
                            Continue as Guest
                        </button>
                    </div>
                </div>
                <div className="mt-6 text-center text-sm">
                    {isSignUp ? (
                        <p className="text-slate-600">
                            Already have an account?{' '}
                            <button onClick={() => setIsSignUp(false)} className="font-semibold text-indigo-600 hover:text-indigo-500">
                                Sign In
                            </button>
                        </p>
                    ) : (
                        <p className="text-slate-600">
                            Don't have an account?{' '}
                            <button onClick={() => setIsSignUp(true)} className="font-semibold text-indigo-600 hover:text-indigo-500">
                                Create one
                            </button>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuthScreen;