"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";

interface LeaderboardUser {
    id: number;
    name: string;
    avatar: string;
    wins: number;
    loses: number;
}

export default function LeaderboardPage() {
    const { user: loggedInUser, accessToken, friendIds, requestStatuses, friendAction, isLoading: isAuthLoading } = useAuth();
    const [users, setUsers] = useState<LeaderboardUser[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const router = useRouter();
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

    useEffect(() => {
        if (!accessToken) return;
        const fetchAllUsers = async () => {
            setIsLoadingUsers(true);
            try {
                const response = await fetch(`${API_BASE_URL}/api/users`, {
                    headers: { "Authorization": `Bearer ${accessToken}` },
                });
                const data = await response.json();
                setUsers(data.success ? data.result : []);
            } catch (error) {
                console.error("Failed to fetch users", error);
            } finally {
                setIsLoadingUsers(false);
            }
        };
        fetchAllUsers();
    }, [accessToken, API_BASE_URL]);

    const sortedUsers = useMemo(() => [...users].sort((a, b) => b.wins - a.wins), [users]);

    if (isAuthLoading || isLoadingUsers) {
        return <div className="flex h-full items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-4 border-secondary border-t-primary" /></div>;
    }

    return (
        <div className="container mx-auto max-w-7xl py-8">
            <h1 className="text-3xl font-bold mb-6">Leaderboard</h1>
            <div className="border rounded-lg bg-card">
                <table className="w-full text-sm">
                    <thead className="[&>tr]:border-b">
                        <tr className="border-b transition-colors hover:bg-muted/50">
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Rank</th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Player</th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Wins</th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Losses</th>
                            <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="[&>tr:last-child]:border-0">
                        {sortedUsers.map((user, index) => {
                            if (!loggedInUser || loggedInUser.id === user.id) return null;
                            const isFriend = friendIds.has(user.id);
                            const sentRequest = requestStatuses.sent.find((req) => req.receiver_id === user.id);
                            const receivedRequest = requestStatuses.received.find((req) => req.sender_id === user.id);
                            
                            return (
                                <tr key={user.id} className="border-b transition-colors hover:bg-muted/50">
                                    <td className="p-4 align-middle font-medium">{index + 1}</td>
                                    <td className="p-4 align-middle cursor-pointer" onClick={() => router.push(`/profile/${user.id}`)}>
                                        <div className="flex items-center gap-3">
                                            <img src={user.avatar || "/avatars/default.png"} alt={user.name} className="w-10 h-10 rounded-full object-cover"/>
                                            <span>{user.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 align-middle text-green-400">{user.wins}</td>
                                    <td className="p-4 align-middle text-red-400">{user.loses}</td>
                                    <td className="p-4 align-middle text-right">
                                        {isFriend ? (
                                            <Button variant="destructive" size="sm" onClick={() => friendAction(user.id, "remove")}>Remove</Button>
                                        ) : sentRequest ? (
                                            <Button variant="secondary" size="sm" onClick={() => friendAction(user.id, "cancel", sentRequest.id)}>Cancel Request</Button>
                                        ) : receivedRequest ? (
                                            <Button size="sm" onClick={() => friendAction(user.id, "accept", receivedRequest.id)}>Accept</Button>
                                        ) : (
                                            <Button variant="outline" size="sm" onClick={() => friendAction(user.id, "invite")}>Add Friend</Button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
