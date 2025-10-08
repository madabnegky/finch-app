import React from 'react';
import { IconCalendarDays } from '../core/Icon';
import ActivityFeedItem from './ActivityFeedItem';

const ActivityFeed = ({ transactions, accounts }) => {
    if (!transactions || transactions.length === 0) {
        return (
            <div className="p-4 bg-white rounded-xl shadow-sm border border-finch-gray-200 h-full">
                <h3 className="text-lg font-bold text-finch-gray-800 mb-4 flex items-center gap-2">
                    <IconCalendarDays className="w-5 h-5" /> Recent & Upcoming
                </h3>
                <div className="text-center py-10 text-finch-gray-500">
                    <p>No recent or upcoming activity.</p>
                </div>
            </div>
        );
    }
    
    const accountMap = new Map(accounts.map(acc => [acc.id, acc.name]));

    return (
        <div className="p-4 bg-white rounded-xl shadow-sm border border-finch-gray-200 h-full">
            <h3 className="text-lg font-bold text-finch-gray-800 mb-4 flex items-center gap-2">
                <IconCalendarDays className="w-5 h-5" /> Recent & Upcoming
            </h3>
            <ul className="space-y-2">
                {transactions.map(item => (
                    <ActivityFeedItem 
                        key={item.instanceId || item.id}
                        item={item}
                        accountName={accountMap.get(item.accountId) || 'Unknown'}
                    />
                ))}
            </ul>
        </div>
    );
};

export default ActivityFeed;