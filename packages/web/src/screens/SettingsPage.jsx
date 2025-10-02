import React from 'react';
import NotificationSettings from '../components/settings/NotificationSettings';

const SettingsPage = () => {
    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
            <div className="max-w-md">
                <NotificationSettings />
            </div>
        </div>
    );
};

export default SettingsPage;