'use client';

import { useAuth } from '@/app/contexts/AuthContext';
import DropdownMenu from './DropdownMenu';
import type { FriendRequest } from '@/app/contexts/AuthContext';

export default function FriendRequestsMenu() {
    const { pendingRequests, friendAction } = useAuth();

    const trigger = (
        <div className="relative cursor-pointer">
            <span>🔔</span>
            {pendingRequests.length > 0 && (
                <span className="absolute top-0 right-0 -mt-1 -mr-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-gray-800"></span>
            )}
        </div>
    );

    return (
        <DropdownMenu trigger={trigger}>
            <div className="p-2 font-semibold border-b">Friend Requests</div>
            <div className="max-h-60 overflow-y-auto">
                {pendingRequests.length > 0 ? (
                    pendingRequests.map((req: FriendRequest) => (
                        <div key={req.id} className="p-2 flex items-center justify-between gap-4">
                            <span>{req.sender_name}</span>
                            <div className="flex gap-2">
                                <button onClick={() => friendAction(0, 'accept', req.id)} className="btn btn-primary text-xs">Accept</button>
                                <button onClick={() => friendAction(0, 'decline', req.id)} className="btn btn-secondary text-xs">Decline</button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="p-2 text-gray-400">No pending requests.</div>
                )}
            </div>
        </DropdownMenu>
    );
}
