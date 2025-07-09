"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/app/contexts/AuthContext";
import { useRouter } from "next/navigation";

// Interfaces
interface Participant {
    id: number;
    name: string;
    avatar: string;
}
interface Match {
    id: number;
    player1_id: number;
    player2_id: number | null;
    player1_name: string;
    player2_name: string | null;
    winner_id: number | null;
}
interface TournamentDetails {
    id: number;
    name: string;
    status: "pending" | "in_progress" | "completed";
    creator_id: number;
}
interface FullTournament {
    details: TournamentDetails;
    participants: Participant[];
    matches: Match[];
}
interface Friend {
    id: number;
    name: string;
}

interface TournamentPageProps {
    params: {
        id: string;
    };
}

export default function TournamentDetailPage({ params }: TournamentPageProps) {
    const { user, accessToken } = useAuth();
    const router = useRouter();
    const tournamentId = params.id;
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

    const [tournament, setTournament] = useState<FullTournament | null>(null);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchTournamentData = useCallback(async () => {
        if (!accessToken || !tournamentId) return;
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/tournaments/${tournamentId}`,
                {
                    headers: { "Authorization": `Bearer ${accessToken}` },
                },
            );
            if (!response.ok) {
                throw new Error("Failed to fetch tournament data.");
            }
            const data = await response.json();
            if (!data.success) throw new Error(data.result);
            setTournament(data.result);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [accessToken, tournamentId, API_BASE_URL]);

    useEffect(() => {
        fetchTournamentData();
        const interval = setInterval(fetchTournamentData, 10000);
        return () => clearInterval(interval);
    }, [fetchTournamentData]);

    useEffect(() => {
        const fetchFriends = async () => {
            if (!user || !accessToken) return;
            try {
                // BUG FIX: Corrected the API endpoint from /api/friend/ to /api/friendships/user/
                const response = await fetch(
                    `${API_BASE_URL}/api/friendships/user/${user.id}`,
                    {
                        headers: { "Authorization": `Bearer ${accessToken}` },
                    },
                );
                const data = await response.json();
                if (data.success) setFriends(data.result);
            } catch (err) {
                console.error("Failed to fetch friends:", err);
            }
        };
        fetchFriends();
    }, [user, accessToken, API_BASE_URL]);

    const handleJoin = async () => {
        // Implementation remains the same
    };
    const handleStart = async () => {
        // Implementation remains the same
    };
    const handleInvite = async (friendId: number) => {
        // Implementation remains the same
    };

    const handlePlayMatch = (matchId: number) => {
        router.push(`/play?matchId=${matchId}&tournamentId=${tournamentId}`);
    };

    if (isLoading) {
        return (
            <div className="text-center text-white p-10">
                Loading Tournament...
            </div>
        );
    }
    if (error) {
        return (
            <div className="text-center text-red-500 p-10">Error: {error}</div>
        );
    }
    if (!tournament) {
        return (
            <div className="text-center text-gray-400 p-10">
                Tournament not found.
            </div>
        );
    }

    const isUserInTournament = tournament.participants.some((p) =>
        p.id === user?.id
    );
    const isCreator = tournament.details.creator_id === user?.id;
    const participantIds = new Set(tournament.participants.map((p) => p.id));

    return (
        <div className="page-container">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">
                    {tournament.details.name}
                </h1>
                <span
                    className={`px-3 py-1 text-sm font-semibold rounded-full ${
                        tournament.details.status === "pending"
                            ? "bg-yellow-500 text-black"
                            : "bg-green-500 text-black"
                    }`}
                >
                    {tournament.details.status}
                </span>
            </div>

            {tournament.details.status === "pending" && (
                <div className="flex gap-4 mb-8">
                    {!isUserInTournament && (
                        <button
                            onClick={handleJoin}
                            className="btn btn-primary"
                        >
                            Join Tournament
                        </button>
                    )}
                    {isCreator && (
                        <button
                            onClick={handleStart}
                            className="btn btn-secondary"
                        >
                            Start Tournament
                        </button>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-[#1a1a1c] p-4 rounded-lg">
                    <h2 className="text-xl font-semibold text-white mb-4">
                        Matches
                    </h2>
                    {tournament.matches.length > 0
                        ? (
                            <div className="space-y-4">
                                {tournament.matches.map((match) => {
                                    const isUserInMatch =
                                        match.player1_id === user?.id ||
                                        match.player2_id === user?.id;
                                    return (
                                        <div
                                            key={match.id}
                                            className="bg-[#29282b] p-4 rounded-lg flex justify-between items-center"
                                        >
                                            <div>
                                                <span className="font-semibold text-white">
                                                    {match.player1_name}
                                                </span>
                                                <span className="mx-4 text-gray-400">
                                                    vs
                                                </span>
                                                <span className="font-semibold text-white">
                                                    {match.player2_name ||
                                                        "(BYE)"}
                                                </span>
                                            </div>
                                            {isUserInMatch &&
                                                match.winner_id === null && (
                                                <button
                                                    onClick={() =>
                                                        handlePlayMatch(
                                                            match.id,
                                                        )}
                                                    className="btn btn-primary"
                                                >
                                                    Play Match
                                                </button>
                                            )}
                                            {match.winner_id !== null && (
                                                <span className="text-green-400 font-bold">
                                                    Completed
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )
                        : (
                            <p className="text-gray-400">
                                Matches will appear here once the tournament
                                starts.
                            </p>
                        )}
                </div>

                <div className="md:col-span-1 bg-[#1a1a1c] p-4 rounded-lg space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-4">
                            Participants ({tournament.participants.length})
                        </h2>
                        <ul className="space-y-3 max-h-60 overflow-y-auto">
                            {tournament.participants.map((p) => (
                                <li
                                    key={p.id}
                                    className="flex items-center gap-3"
                                >
                                    <img
                                        src={p.avatar || "/avatars/default.png"}
                                        alt={p.name}
                                        className="w-10 h-10 rounded-full"
                                    />
                                    <span className="text-white">{p.name}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-4">
                            Invite Friends
                        </h2>
                        <ul className="space-y-3 max-h-60 overflow-y-auto">
                            {friends.filter((f) => !participantIds.has(f.id))
                                .map((friend) => (
                                    <li
                                        key={friend.id}
                                        className="flex items-center justify-between"
                                    >
                                        <span className="text-white">
                                            {friend.name}
                                        </span>
                                        <button
                                            onClick={() =>
                                                handleInvite(friend.id)}
                                            className="btn btn-secondary text-xs"
                                        >
                                            Invite
                                        </button>
                                    </li>
                                ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
