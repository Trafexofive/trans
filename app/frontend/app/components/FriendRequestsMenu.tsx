"use client";

import * as React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { BellIcon, Gamepad2, UserPlus, UserX, XCircle } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import Link from "next/link";
import { useMemo } from "react";
import { getAvatarSrc } from "@/lib/utils"; 

export function FriendRequestsMenu() {
    const { pendingRequests, friendAction, chats, user } = useAuth();
    const [dismissedInvites, setDismissedInvites] = React.useState<number[]>(
        [],
    );

    const gameInvites = useMemo(() => {
        if (!user) return [];
        const invites = new Map<number, any>();
        Array.from(chats.values())
            .flat()
            .forEach((msg) => {
                if (
                    msg.content.includes("[Play Now](/play") &&
                    msg.from !== user.id
                ) {
                    invites.set(msg.from, msg);
                }
            });
        return Array.from(invites.values());
    }, [chats, user]);

    const activeGameInvites = gameInvites.filter((inv) =>
        !dismissedInvites.includes(inv.id)
    );
    const totalNotifications = pendingRequests.length +
        activeGameInvites.length;

    if (totalNotifications === 0) {
        return (
            <Button variant="ghost" size="icon">
                <BellIcon className="h-5 w-5" />
            </Button>
        );
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <BellIcon className="h-5 w-5" />
                    {totalNotifications > 0 && (
                        <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                            {totalNotifications}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0">
                <Card>
                    <CardHeader>
                        <CardTitle>Notifications</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 max-h-80 overflow-y-auto p-2">
                        {totalNotifications === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No new notifications.
                            </p>
                        )}

                        {pendingRequests.map((req) => (
                            <div
                                key={`fr-${req.id}`}
                                className="flex items-center justify-between p-2 hover:bg-muted rounded-md text-sm"
                            >
                                <Link
                                    href={`/profile/${req.sender_id}`}
                                    className="flex items-center gap-3 overflow-hidden"
                                >
                                    <img
                                        src={getAvatarSrc(req.sender_avatar)}
                                        alt={req.sender_name}
                                        className="h-8 w-8 rounded-full flex-shrink-0 object-cover"
                                    />
                                    <div className="flex flex-col">
                                        <span className="font-medium truncate">
                                            {req.sender_name}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            Friend Request
                                        </span>
                                    </div>
                                </Link>
                                <div className="flex gap-1 flex-shrink-0">
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        title="Accept"
                                        onClick={() =>
                                            friendAction(
                                                req.sender_id,
                                                "accept",
                                                req.id,
                                            )}
                                    >
                                        <UserPlus className="h-4 w-4 text-green-500" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        title="Decline"
                                        onClick={() =>
                                            friendAction(
                                                req.sender_id,
                                                "decline",
                                                req.id,
                                            )}
                                    >
                                        <UserX className="h-4 w-4 text-red-500" />
                                    </Button>
                                </div>
                            </div>
                        ))}

                        {activeGameInvites.map((invite) => {
                            const linkUrl =
                                invite.content.match(/\(([^)]+)\)/)?.[1] ||
                                "/play";
                            return (
                                <div
                                    key={`gi-${invite.id}`}
                                    className="flex items-center justify-between p-2 hover:bg-muted rounded-md text-sm"
                                >
                                    <Link
                                        href={linkUrl}
                                        className="flex items-center gap-3 overflow-hidden"
                                    >
                                        <Gamepad2 className="h-8 w-8 text-blue-400 flex-shrink-0" />
                                        <div className="flex flex-col">
                                            <span className="font-medium">
                                                Game Invite
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                From a friend
                                            </span>
                                        </div>
                                    </Link>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        title="Dismiss"
                                        onClick={() =>
                                            setDismissedInvites(
                                                (prev) => [...prev, invite.id]
                                            )}
                                    >
                                        <XCircle className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            </PopoverContent>
        </Popover>
    );
}
