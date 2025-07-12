"use client";

import { useEffect, useState } from "react";
import { Friend, useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, UserX, MessageSquare, Sword, Shield, Ratio, Gamepad2 } from "lucide-react";

// --- Interfaces ---
interface UserProfile { id: number; name: string; avatar: string; wins: number; loses: number; }
interface MatchHistory { id: number; player1_name: string; player2_name: string | null; winner_id: number; created_at: string; }
interface ProfilePageProps { params: { id: string }; }

// --- Reusable Components ---
const StatCard = ({ title, value, icon }: { title: string; value: string | number, icon: React.ReactNode }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
);

const ActionButton = ({ targetUser, loggedInUser, friendIds, requestStatuses, friendAction }: any) => {
    const router = useRouter();

    if (!loggedInUser || loggedInUser.id === targetUser.id) {
        return <Button onClick={() => router.push('/settings')}>Edit Profile</Button>;
    }
    const isFriend = friendIds.has(targetUser.id);
    const sentRequest = requestStatuses.sent.find((req: any) => req.receiver_id === targetUser.id);
    const receivedRequest = requestStatuses.received.find((req: any) => req.sender_id === targetUser.id);

    return (
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/chat?with=${targetUser.id}`)}><MessageSquare className="mr-2 h-4 w-4" />Message</Button>
            {isFriend ? 
                <Button variant="destructive" onClick={() => friendAction(targetUser.id, "remove")}><UserX className="mr-2 h-4 w-4" />Remove Friend</Button> :
             sentRequest ? 
                <Button variant="secondary" onClick={() => friendAction(targetUser.id, "cancel", sentRequest.id)}>Cancel Request</Button> :
             receivedRequest ?
                <Button onClick={() => friendAction(targetUser.id, "accept", receivedRequest.id)}><UserPlus className="mr-2 h-4 w-4" />Accept Request</Button> :
                <Button onClick={() => friendAction(targetUser.id, "invite")}><UserPlus className="mr-2 h-4 w-4" />Add Friend</Button>
            }
        </div>
    );
};

// --- Main Profile Page Component ---
export default function ProfilePage({ params }: ProfilePageProps) {
    const { user: loggedInUser, accessToken, friendIds, requestStatuses, friendAction, logout } = useAuth();
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const router = useRouter();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [matchHistory, setMatchHistory] = useState<MatchHistory[]>([]);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const userId = params.id;

    useEffect(() => {
        const fetchProfileData = async () => {
            if (!userId || !accessToken) return;
            setIsLoading(true);
            setError(null);
            try {
                const [profileRes, historyRes, friendsRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/users/${userId}`, { headers: { "Authorization": `Bearer ${accessToken}` } }),
                    fetch(`${API_BASE_URL}/api/users/${userId}/matches`, { headers: { "Authorization": `Bearer ${accessToken}` } }),
                    fetch(`${API_BASE_URL}/api/friendships/user/${userId}`, { headers: { "Authorization": `Bearer ${accessToken}` } }),
                ]);

                if (profileRes.status === 401) { logout(); router.push("/login"); return; }
                
                const profileData = await profileRes.json();
                if (!profileData.success) throw new Error(profileData.result || "User not found.");

                const historyData = await historyRes.json();
                const friendsData = await friendsRes.json();
                
                setProfile(profileData.result);
                setMatchHistory(historyData.success ? historyData.result : []);
                setFriends(friendsData.success ? friendsData.result : []);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfileData();
    }, [userId, accessToken, API_BASE_URL, logout, router]);

    if (isLoading) return <div className="flex h-full items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-4 border-secondary border-t-primary" /></div>;
    if (error) return <div className="p-10 text-center text-destructive">Error: {error}</div>;
    if (!profile) return <div className="p-10 text-center text-muted-foreground">Profile not found.</div>;

    const totalGames = profile.wins + profile.loses;
    const winLossRatio = (profile.loses > 0 ? (profile.wins / profile.loses) : profile.wins).toFixed(2);

    return (
        <div className="container mx-auto max-w-7xl py-8 space-y-8">
            <Card className="p-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                    <img src={profile.avatar || "/avatars/default.png"} alt={`${profile.name}'s avatar`} className="w-24 h-24 rounded-full border-4 border-primary object-cover" />
                    <div className="flex-1 text-center sm:text-left">
                        <h2 className="text-3xl font-bold">{profile.name}</h2>
                        <p className="text-muted-foreground">Transcendence Player</p>
                    </div>
                    <div className="flex-shrink-0">
                        <ActionButton targetUser={profile} loggedInUser={loggedInUser} friendIds={friendIds} requestStatuses={requestStatuses} friendAction={friendAction} />
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Wins" value={profile.wins} icon={<Sword className="h-5 w-5 text-green-400"/>} />
                <StatCard title="Losses" value={profile.loses} icon={<Shield className="h-5 w-5 text-red-400"/>} />
                <StatCard title="Win/Loss Ratio" value={winLossRatio} icon={<Ratio className="h-5 w-5 text-yellow-400"/>} />
                <StatCard title="Total Games" value={totalGames} icon={<Gamepad2 className="h-5 w-5 text-blue-400"/>} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2">
                    <CardHeader><CardTitle>Match History</CardTitle></CardHeader>
                    <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                        {matchHistory.length > 0 ? matchHistory.map(match => {
                            const isWinner = match.winner_id === profile.id;
                            const opponentName = match.player1_name === profile.name ? match.player2_name : match.player1_name;
                            return (
                                <div key={match.id} className={`p-3 rounded-md flex justify-between items-center border-l-4 ${isWinner ? "border-green-500 bg-green-500/10" : "border-red-500 bg-red-500/10"}`}>
                                    <div>
                                        <span className={`font-bold ${isWinner ? "text-green-400" : "text-red-400"}`}>{isWinner ? "WIN" : "LOSS"}</span>
                                        <span className="text-muted-foreground mx-2">vs</span>
                                        <span className="font-semibold">{opponentName || "N/A"}</span>
                                    </div>
                                    <span className="text-sm text-muted-foreground">{new Date(match.created_at).toLocaleDateString()}</span>
                                </div>
                            );
                        }) : <p className="text-muted-foreground text-center py-8">No match history available.</p>}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Friends ({friends.length})</CardTitle></CardHeader>
                    <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                        {friends.length > 0 ? friends.map(friend => (
                            <Link href={`/profile/${friend.id}`} key={friend.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors">
                                <img src={friend.avatar || "/avatars/default.png"} alt={friend.name} className="w-10 h-10 rounded-full object-cover" />
                                <p className="font-semibold">{friend.name}</p>
                            </Link>
                        )) : <p className="text-muted-foreground text-center py-8">This user has no friends yet.</p>}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
