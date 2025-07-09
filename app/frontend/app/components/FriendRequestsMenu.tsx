"use client";

import { useAuth } from "@/app/contexts/AuthContext";
import DropdownMenu from "./DropdownMenu";
import type { FriendRequest } from "@/app/contexts/AuthContext";

export default function FriendRequestsMenu() {
    const { pendingRequests, friendAction } = useAuth();

    const handleRequestAction = (
        request: FriendRequest,
        action: "accept" | "decline",
    ) => {
        friendAction(request.sender_id, action, request.id);
    };

    const trigger = (
        <div className="relative cursor-pointer">
            <span>🔔</span>
            {pendingRequests.length > 0 && (
                <span className="absolute top-0 right-0 -mt-1 -mr-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white">
                </span>
            )}
        </div>
    );

    return (
        <DropdownMenu trigger={trigger}>
            <div className="p-2 font-semibold border-b">Friend Requests</div>
            <div className="max-h-60 overflow-y-auto">
                {pendingRequests.length > 0
                    ? (
                        pendingRequests.map((req) => (
                            <div
                                key={req.id}
                                className="p-2 flex items-center justify-between gap-4"
                            >
                                <div className="flex items-center gap-2">
                                    <img
                                        src={req.sender_avatar ||
                                            "/avatars/default.png"}
                                        alt={req.sender_name}
                                        className="w-8 h-8 rounded-full"
                                    />
                                    <span>{req.sender_name}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() =>
                                            handleRequestAction(req, "accept")}
                                        className="btn btn-primary text-xs"
                                    >
                                        Accept
                                    </button>
                                    <button
                                        onClick={() =>
                                            handleRequestAction(req, "decline")}
                                        className="btn btn-secondary text-xs"
                                    >
                                        Decline
                                    </button>
                                </div>
                            </div>
                        ))
                    )
                    : (
                        <div className="p-2 text-gray-400">
                            No pending requests.
                        </div>
                    )}
            </div>
        </DropdownMenu>
    );
}
