import React, { useState } from 'react';
import { useAuth } from '@shared/hooks/useAuth';
import Button from '@/components/core/Button';
import Input from '@/components/core/Input';
import { GoogleIcon } from '@/components/core/Icon';
import { FinchLogo } from '@/components/core/Icon';

function AuthScreen({ initialScreen = 'signIn' }) {
    const [screen, setScreen] = useState(initialScreen);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { signIn, signUp, signInGuest, signInWithGoogle } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (screen === 'signIn') {
                await signIn(email, password);
            } else {
                await signUp(email, password);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleGuestSignIn = async () => {
        try {
            await signInGuest();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            await signInWithGoogle();
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <FinchLogo className="h-12 w-auto text-blue-600" />
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    {screen === 'signIn' ? 'Sign in to your account' : 'Create a new account'}
                </h2>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Email address
                            </label>
                            <div className="mt-1">
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Password
                            </label>
                            <div className="mt-1">
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="text-red-500 text-sm">{error}</div>
                        )}

                        <div>
                            <Button type="submit" variant="primary" className="w-full">
                                {screen === 'signIn' ? 'Sign in' : 'Create Account'}
                            </Button>
                        </div>
                    </form>

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">
                                    Or continue with
                                </span>
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-3">
                            <div>
                                <Button
                                    variant="secondary"
                                    className="w-full inline-flex justify-center"
                                    onClick={handleGuestSignIn}
                                >
                                    <span className="sr-only">Sign in as Guest</span>
                                    Guest
                                </Button>
                            </div>
                            <div>
                                <Button
                                    variant="secondary"
                                    className="w-full inline-flex justify-center"
                                    onClick={handleGoogleSignIn}
                                >
                                    <span className="sr-only">Sign in with Google</span>
                                    <GoogleIcon className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>

                        <div className="mt-6 text-center">
                            <button
                                onClick={() => setScreen(screen === 'signIn' ? 'signUp' : 'signIn')}
                                className="font-medium text-blue-600 hover:text-blue-500"
                            >
                                {screen === 'signIn'
                                    ? "Don't have an account? Sign Up"
                                    : 'Already have an account? Sign In'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AuthScreen;