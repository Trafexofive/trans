'use client';

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";

// Define the types for the props it will receive
interface LeaderboardUser {
    id: number;
    name: string;
    avatar: string;
    wins: number;
    loses: number;
}
interface LeaderboardClientProps {
    users: LeaderboardUser[];
}

// This is now a "dumb" component. It only knows how to render the data it's given.
export default function LeaderboardClient({ users }: LeaderboardClientProps) {
    const { user: loggedInUser, friendIds, requestStatuses, friendAction } = useAuth();
    const router = useRouter();

    // The entire rendering logic from the old page goes here.
    // It no longer fetches data; it just uses the `users` prop.
    return (
        <div className="border rounded-lg">
            <table className="w-full text-sm">
                <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors">
                        <th className="h-12 px-4 text-left">Rank</th>
                        <th className="h-12 px-4 text-left">Player</th>
                        <th className="h-12 px-4 text-left">Wins</th>
                        <th className="h-12 px-4 text-left">Losses</th>
                        <th className="h-12 px-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user, index) => {
                        if (!loggedInUser || loggedInUser.id === user.id) return null;
                        const isFriend = friendIds.has(user.id);
                        const sentRequest = requestStatuses.sent.find(req => req.receiver_id === user.id);
                        const receivedRequest = requestStatuses.received.find(req => req.sender_id === user.id);

                        return (
                            <tr key={user.id} className="border-b transition-colors">
                                <td className="p-4 font-medium">{index + 1}</td>
                                <td className="p-4 cursor-pointer" onClick={() => router.push(`/profile/${user.id}`)}>
                                    <div className="flex items-center gap-3">
                                        <img src={user.avatar || "/avatars/default.png"} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                                        <span>{user.name}</span>
                                    </div>
                                </td>
                                <td className="p-4">{user.wins}</td>
                                <td className="p-4">{user.loses}</td>
                                <td className="p-4 text-right">
                                    {isFriend ? (
                                        <Button variant="destructive" size="sm" onClick={() => friendAction(user.id, "remove")}>Remove</Button>
                                    ) : sentRequest ? (
                                        <Button variant="secondary" size="sm" onClick={() => friendAction(user.id, "cancel", sentRequest.id)}>Cancel</Button>
                                    ) : receivedRequest ? (
                                        <Button size="sm" onClick={() => friendAction(user.id, "accept", receivedRequest.id)}>Accept</Button>
                                    ) : (
                                        <Button variant="outline" size="sm" onClick={() => friendAction(user.id, "invite")}>Invite</Button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
