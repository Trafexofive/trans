'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface Friend { id: number; name: string; avatar: string; }
interface Match { id: number; opponent: { name: string; }; result: 'Win' | 'Loss'; score: string; }
interface Stats { totalMatches: number; winRate: string; wins: number; losses: number; }

const StatCard = ({ title, value, icon }: { title: string, value: string | number, icon: string }) => (
    <div className="bg-[#1a1a1c] p-6 rounded-lg flex items-center gap-4 border border-gray-800 hover:border-gray-700 transition-colors">
        <div className="text-4xl">{icon}</div>
        <div>
            <p className="text-gray-400 text-sm uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    </div>
);

export default function DashboardPage() {
    const { user, accessToken, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

    const [stats, setStats] = useState<Stats | null>(null);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isAuthLoading || !user || !accessToken) return;

        const totalMatches = user.wins + user.loses;
        const winRate = totalMatches > 0 ? `${Math.round((user.wins / totalMatches) * 100)}%` : 'N/A';
        setStats({ totalMatches, winRate, wins: user.wins, losses: user.loses });

        const fetchFriends = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/friendships`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.result || 'Failed to fetch friends.');
                setFriends(data.success ? data.result : []);
            } catch (err: any) {
                console.error("Error fetching friends:", err);
                setError("Could not load friends list.");
                setFriends([]);
            }
        };

        const fetchMatches = async () => {
            console.warn("Match history fetching is not implemented.");
            setMatches([]);
        };

        fetchFriends();
        fetchMatches();

    }, [user, accessToken, isAuthLoading, API_BASE_URL]);

    if (isAuthLoading || !user) return <div className="p-10 text-center text-white">Loading Dashboard...</div>;
    if (error) return <div className="p-10 text-center text-red-500">{error}</div>;

    return (
        <div className="page-container space-y-8">
            <div><h1 className="text-3xl font-bold text-white">Welcome, {user.name}!</h1><p className="text-gray-400">Here's a look at your journey in the world of Pong.</p></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Wins" value={stats?.wins ?? 0} icon="🏆" />
                <StatCard title="Losses" value={stats?.losses ?? 0} icon="💀" />
                <StatCard title="Total Matches" value={stats?.totalMatches ?? 0} icon="🎮" />
                <StatCard title="Win Rate" value={stats?.winRate ?? 'N/A'} icon="📈" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button onClick={() => router.push('/play')} className="btn btn-primary flex-1">Find a Match</button>
                            <button onClick={() => router.push('/tournaments')} className="btn btn-secondary flex-1">Browse Tournaments</button>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-4">Recent Matches</h2>
                        <div className="bg-[#1a1a1c] p-4 rounded-lg space-y-3 border border-gray-800">
                            {matches.length > 0 ? matches.map(match => (
                                <div key={match.id} className="flex justify-between items-center bg-[#29282b] p-3 rounded">
                                    <p className="text-gray-300">vs <span className="font-semibold text-white">{match.opponent.name}</span></p>
                                    <p className={`font-bold ${match.result === 'Win' ? 'text-green-400' : 'text-red-400'}`}>{match.result}</p>
                                    <p className="font-mono text-gray-400">{match.score}</p>
                                </div>
                            )) : <p className="text-gray-400 text-center py-4">No recent matches played.</p>}
                        </div>
                    </div>
                </div>
                <div className="bg-[#1a1a1c] p-4 rounded-lg space-y-4 border border-gray-800">
                    <div className="flex justify-between items-center"><h2 className="text-xl font-semibold text-white">Friends</h2><button onClick={() => router.push('/leaderboard')} className="text-sm text-blue-400 hover:underline">Manage</button></div>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {friends.length > 0 ? friends.map(friend => (
                            <div key={friend.id} onClick={() => router.push(`/profile/${friend.id}`)} className="flex items-center gap-3 p-2 rounded hover:bg-[#29282b] cursor-pointer transition-colors">
                                <img src={friend.avatar || '/avatars/default.png'} alt={friend.name} className="w-10 h-10 rounded-full object-cover"/>
                                <p className="font-semibold text-white">{friend.name}</p>
                            </div>
                        )) : (
                            <div className="text-center text-gray-400 py-8 px-4">
                                <p>You haven't added any friends yet.</p>
                                <button onClick={() => router.push('/leaderboard')} className="mt-2 text-sm text-blue-400 hover:underline">Find users on the Leaderboard!</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
