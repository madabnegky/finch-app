import React from 'react';
import useNotifications from '../../hooks/useNotifications';
import Button from '../core/Button';

const NotificationSettings = () => {
    const { requestPermission } = useNotifications();

    return (
        <div className="p-4 bg-white rounded-lg shadow">
            <h3 className="text-lg font-bold mb-2">Notifications</h3>
            <p className="text-gray-600 mb-4">
                Enable push notifications to receive important alerts about your accounts, such as upcoming bill reminders and low balance warnings.
            </p>
            <Button onClick={requestPermission} variant="primary">
                Enable Notifications
            </Button>
        </div>
    );
};

export default NotificationSettings;