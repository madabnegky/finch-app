import React, { useState } from 'react';
import Modal from '../core/Modal';
import Input from '../core/Input';
import Button from '../core/Button';
import { GoogleIcon } from '../core/Icon';
import { useAuth } from '@shared/hooks/useAuth';

const UpgradeAccountModal = ({ isOpen, onClose }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(null); // 'google', 'email', or null
    const { linkAccountWithGoogle, linkAccountWithEmail } = useAuth();

    const handleGoogleUpgrade = async () => {
        setError('');
        setLoading('google');
        try {
            await linkAccountWithGoogle();
            onClose(); // Close on success
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(null);
        }
    };

    const handleEmailUpgrade = async (e) => {
        e.preventDefault();
        setError('');
        setLoading('email');
        try {
            await linkAccountWithEmail(email, password);
            onClose(); // Close on success
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(null);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Save Your Progress">
            <div className="space-y-6">
                <p className="text-center text-sm text-finch-gray-600">Create a permanent account to save your data and access it from any device. Choose your preferred method below.</p>
                
                {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-md text-center">{error}</p>}

                <div>
                    <Button
                        onClick={handleGoogleUpgrade}
                        disabled={!!loading}
                        className="w-full inline-flex justify-center items-center gap-2 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-indigo-500 disabled:bg-slate-200"
                    >
                        {loading === 'google' ? 'Connecting...' : <><GoogleIcon className="w-5 h-5" /> Continue with Google</>}
                    </Button>
                </div>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">
                            Or continue with email
                        </span>
                    </div>
                </div>

                <form className="space-y-4" onSubmit={handleEmailUpgrade}>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email address</label>
                        <Input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={!!loading}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <Input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={!!loading}
                        />
                    </div>
                     <div>
                        <Button type="submit" disabled={!!loading} className="w-full">
                            {loading === 'email' ? 'Creating Account...' : 'Create Account'}
                        </Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default UpgradeAccountModal;