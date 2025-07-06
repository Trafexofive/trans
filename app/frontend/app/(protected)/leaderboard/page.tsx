'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

interface LeaderboardUser { id: number; name: string; avatar: string; wins: number; loses: number; }

export default function LeaderboardPage() {
    const { user: loggedInUser, accessToken, friendIds, requestStatuses, friendAction, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

    const [users, setUsers] = useState<LeaderboardUser[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);

    useEffect(() => {
        if (!accessToken) return;
        const fetchAllUsers = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/users`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                });
                const data = await response.json();
                if (data.success) setUsers(data.result);
            } catch (error) {
                console.error("Failed to fetch users", error);
            } finally {
                setIsLoadingUsers(false);
            }
        };
        fetchAllUsers();
    }, [accessToken, API_BASE_URL]);

    const sortedUsers = useMemo(() => [...users].sort((a, b) => b.wins - a.wins), [users]);
    
    if (isLoadingUsers || isAuthLoading) return <div className="p-10 text-center text-white">Loading Leaderboard...</div>;

    return (
        <div className="page-container">
            <h1 className="text-3xl font-bold text-white mb-6">Leaderboard</h1>
            <div className="bg-[#1a1a1c] rounded-lg overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-[#29282b]">
                        <tr>
                            <th className="p-4 text-sm font-semibold text-gray-400">Rank</th>
                            <th className="p-4 text-sm font-semibold text-gray-400">Player</th>
                            <th className="p-4 text-sm font-semibold text-gray-400">Wins</th>
                            <th className="p-4 text-sm font-semibold text-gray-400">Losses</th>
                            <th className="p-4 text-sm font-semibold text-gray-400 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedUsers.map((user, index) => {
                            if (!loggedInUser || loggedInUser.id === user.id) return null;

                            const isFriend = friendIds.has(user.id);
                            const sentRequest = requestStatuses.sent.find(req => req.receiver_id === user.id);
                            const receivedRequest = requestStatuses.received.find(req => req.sender_id === user.id);
                            
                            let actionButton;
                            if (isFriend) {
                                actionButton = <button onClick={() => friendAction(user.id, 'remove')} className="btn btn-danger text-xs">Remove</button>;
                            } else if (sentRequest) {
                                actionButton = <button onClick={() => friendAction(user.id, 'cancel', sentRequest.id)} className="btn btn-secondary text-xs">Cancel</button>;
                            } else if (receivedRequest) {
                                actionButton = <button onClick={() => friendAction(user.id, 'accept', receivedRequest.id)} className="btn btn-primary text-xs">Accept</button>;
                            } else {
                                actionButton = <button onClick={() => friendAction(user.id, 'invite')} className="btn btn-secondary text-xs">Invite</button>;
                            }

                            return (
                                <tr key={user.id} className="border-b border-gray-800">
                                    <td className="p-4 font-bold text-white">{index + 1}</td>
                                    <td className="p-4 hover:bg-[#252528] cursor-pointer" onClick={() => router.push(`/profile/${user.id}`)}>
                                        <div className="flex items-center gap-3">
                                            <img src={user.avatar || '/avatars/default.png'} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                                            <span className="font-semibold text-white">{user.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-green-400 font-semibold">{user.wins}</td>
                                    <td className="p-4 text-red-400 font-semibold">{user.loses}</td>
                                    <td className="p-4 text-right">{actionButton}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
