import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/core/Button';
import { FinchLogo } from '@/components/core/Icon';
import AuthScreen from '@/components/auth/AuthScreen';
import AnimatedPreview from '@/components/auth/AnimatedPreview';
import { useAuth } from '@shared/hooks/useAuth';

function LandingPage() {
    const { signInGuest } = useAuth();
    const [showAuthScreen, setShowAuthScreen] = useState(false);
    const [initialScreen, setInitialScreen] = useState('signIn');
    const navigate = useNavigate();

    const handleAuthClick = (screen) => {
        setInitialScreen(screen);
        setShowAuthScreen(true);
    };

    const handleGuestSignIn = async () => {
        try {
            await signInGuest();
            navigate('/setup');
        } catch (error) {
            console.error("Guest sign-in failed", error);
        }
    };

    if (showAuthScreen) {
        return <AuthScreen initialScreen={initialScreen} />;
    }

    return (
        <div className="flex flex-col md:flex-row h-screen bg-gray-50">
            <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-8">
                <div className="max-w-md w-full">
                    <div className="flex items-center mb-6">
                        <FinchLogo className="h-10 w-10 text-blue-600 mr-3" />
                        <h1 className="text-4xl font-bold text-gray-800">Finch</h1>
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-700 mb-4">
                        A clear view of your cash flow.
                    </h2>
                    <p className="text-gray-600 mb-8">
                        Finch helps you understand your spending and see what's ahead.
                        Connect your bank accounts for an automated, secure, and
                        up-to-date picture of your finances.
                    </p>
                    <div className="space-y-4">
                        <Button
                            variant="primary"
                            className="w-full"
                            onClick={handleGuestSignIn}
                        >
                            Give it a Try
                        </Button>
                        <div className="flex space-x-4">
                           <Button
                                variant="secondary"
                                className="w-full"
                                onClick={() => handleAuthClick('signUp')}
                            >
                                Create Account
                            </Button>
                             <Button
                                variant="secondary"
                                className="w-full"
                                onClick={() => handleAuthClick('signIn')}
                            >
                                Sign In
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="hidden md:block w-1/2 bg-blue-600 p-8">
                <AnimatedPreview />
            </div>
        </div>
    );
}

export default LandingPage;