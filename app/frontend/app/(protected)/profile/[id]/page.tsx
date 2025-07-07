'use client';

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/app/contexts/AuthContext";
import Link from 'next/link';
import { useRouter } from "next/navigation";

// Interfaces
interface UserProfile { id: number; name: string; avatar: string; wins: number; loses: number; }
interface MatchHistory { id: number; player1_name: string; player2_name: string | null; winner_id: number; created_at: string; }
interface Friend { id: number; name: string; avatar: string; }
interface ProfilePageProps { params: { id: string; }; }

// Reusable Components
const StatCard = ({ title, value }: { title: string; value: string | number }) => (
    <div className="stat-card">
        <h4 className="uppercase text-sm text-gray-400 font-medium">{title}</h4>
        <p className="stat-number">{value}</p>
    </div>
);

const ActionButton = ({ targetUser, loggedInUser, friendIds, requestStatuses, friendAction }: any) => {
    if (!loggedInUser || loggedInUser.id === targetUser.id) {
        return <Link href="/settings" className="btn btn-secondary">Edit Profile</Link>;
    }

    const isFriend = friendIds.has(targetUser.id);
    const sentRequest = requestStatuses.sent.find((req: any) => req.receiver_id === targetUser.id);
    const receivedRequest = requestStatuses.received.find((req: any) => req.sender_id === targetUser.id);

    if (isFriend) return <button onClick={() => friendAction(targetUser.id, 'remove')} className="btn btn-danger">Remove Friend</button>;
    if (sentRequest) return <button onClick={() => friendAction(targetUser.id, 'cancel', sentRequest.id)} className="btn btn-secondary">Cancel Request</button>;
    if (receivedRequest) return <button onClick={() => friendAction(targetUser.id, 'accept', receivedRequest.id)} className="btn btn-primary">Accept Request</button>;
    return <button onClick={() => friendAction(targetUser.id, 'invite')} className="btn btn-primary">Add Friend</button>;
};

// Main Profile Page Component
export default function ProfilePage({ params }: ProfilePageProps) {
    const { user: loggedInUser, accessToken, friendIds, requestStatuses, friendAction, fetchFriendData } = useAuth();
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const router = useRouter();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [matchHistory, setMatchHistory] = useState<MatchHistory[]>([]);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const userId = params.id;

    const fetchProfileData = useCallback(async () => {
        if (!userId || !accessToken) return;
        setIsLoading(true);
        setError(null);
        try {
            const [profileRes, historyRes, friendsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/users/${userId}`, { headers: { "Authorization": `Bearer ${accessToken}` } }),
                fetch(`${API_BASE_URL}/api/users/${userId}/matches`, { headers: { "Authorization": `Bearer ${accessToken}` } }),
                fetch(`${API_BASE_URL}/api/friendships/user/${userId}`, { headers: { "Authorization": `Bearer ${accessToken}` } })
            ]);

            const profileData = await profileRes.json();
            const historyData = await historyRes.json();
            const friendsData = await friendsRes.json();

            if (!profileData.success) throw new Error(profileData.result || "User not found.");
            
            setProfile(profileData.result);
            setMatchHistory(historyData.success ? historyData.result : []);
            setFriends(friendsData.success ? friendsData.result : []);
            
        } catch (err: any) { setError(err.message);
        } finally { setIsLoading(false); }
    }, [userId, accessToken, API_BASE_URL]);

    useEffect(() => {
        fetchProfileData();
        if (loggedInUser) fetchFriendData();
    }, [userId, fetchProfileData, loggedInUser, fetchFriendData]);

    if (isLoading) return <div className="p-10 text-center text-white">Loading Profile...</div>;
    if (error) return <div className="p-10 text-center text-red-500">Error: {error}</div>;
    if (!profile) return <div className="p-10 text-center text-gray-400">Profile not found.</div>;

    return (
        <div className="page-container">
            <div className="profile-content">
                <div className="chat-area-gradient w-full max-w-5xl mx-auto">
                    <div className="chat-area solid-effect">
                        <div className="settings-header">
                            <div className="flex items-center gap-6">
                                <img src={profile.avatar || "/avatars/default.png"} alt={`${profile.name}'s avatar`} className="w-24 h-24 rounded-full border-4 border-gray-600 object-cover"/>
                                <div>
                                    <h2 className="settings-title">{profile.name}</h2>
                                    <p className="text-gray-400">Transcendence Player</p>
                                </div>
                            </div>
                            <div className="settings-actions">
                                <ActionButton targetUser={profile} loggedInUser={loggedInUser} friendIds={friendIds} requestStatuses={requestStatuses} friendAction={friendAction} />
                            </div>
                        </div>
                        <div className="settings-content grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2">
                                <h3 className="section-title">Player Statistics</h3>
                                <div className="profile-stats">
                                    <StatCard title="Wins" value={profile.wins} />
                                    <StatCard title="Losses" value={profile.loses} />
                                    <StatCard title="Win/Loss Ratio" value={(profile.loses > 0 ? (profile.wins / profile.loses) : profile.wins).toFixed(2)} />
                                    <StatCard title="Total Games" value={profile.wins + profile.loses} />
                                </div>
                                <div className="mt-8">
                                    <h3 className="section-title">Match History</h3>
                                    <div className="bg-[#1a1a1c] p-4 rounded-lg space-y-3 max-h-96 overflow-y-auto">
                                        {matchHistory.length > 0 ? matchHistory.map(match => {
                                            const isWinner = match.winner_id === profile.id;
                                            const opponentName = match.player1_name === profile.name ? match.player2_name : match.player1_name;
                                            return (
                                                <div key={match.id} className={`p-3 rounded-lg flex justify-between items-center border-l-4 ${isWinner ? 'border-green-500' : 'border-red-500'}`}>
                                                    <div>
                                                        <span className={`font-bold ${isWinner ? 'text-green-400' : 'text-red-400'}`}>{isWinner ? 'WIN' : 'LOSS'}</span>
                                                        <span className="text-gray-400 mx-2">vs</span>
                                                        <span className="font-semibold text-white">{opponentName || "N/A"}</span>
                                                    </div>
                                                    <span className="text-sm text-gray-500">{new Date(match.created_at).toLocaleDateString()}</span>
                                                </div>
                                            );
                                        }) : <p className="text-gray-400 text-center py-8">No match history available.</p>}
                                    </div>
                                </div>
                            </div>
                            <div className="md:col-span-1 bg-[#1a1a1c] p-4 rounded-lg">
                                <h3 className="section-title">Friends ({friends.length})</h3>
                                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                                    {friends.length > 0 ? friends.map(friend => (
                                        <Link href={`/profile/${friend.id}`} key={friend.id} className="flex items-center gap-3 p-2 rounded hover:bg-[#29282b] transition-colors">
                                            <img src={friend.avatar || '/avatars/default.png'} alt={friend.name} className="w-10 h-10 rounded-full object-cover"/>
                                            <p className="font-semibold text-white">{friend.name}</p>
                                        </Link>
                                    )) : <p className="text-gray-400 text-center py-8">This user has no friends yet.</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
