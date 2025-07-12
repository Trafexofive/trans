'use client';

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Loader2, Users, Trophy, Sword, Info, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

// Interfaces
interface Participant { id: number; name: string; avatar: string; }
interface Match { id: number; round_number: number; player1_id: number; player2_id: number | null; player1_name: string; player2_name: string | null; winner_id: number | null; status: string; }
interface TournamentDetails { id: number; name: string; status: "pending" | "in_progress" | "completed"; creator_id: number; }
interface FullTournament { details: TournamentDetails; participants: Participant[]; matches: Match[]; }
interface TournamentPageProps { params: { id: string } }

export default function TournamentDetailPage({ params }: TournamentPageProps) {
    const { user, accessToken } = useAuth();
    const router = useRouter();
    const tournamentId = params.id;
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

    const [tournament, setTournament] = useState<FullTournament | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [error, setError] = useState("");

    const fetchTournamentData = useCallback(async () => {
        if (!accessToken || !tournamentId) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}`, { headers: { "Authorization": `Bearer ${accessToken}` } });
            if (!response.ok) throw new Error("Failed to fetch tournament data.");
            const data = await response.json();
            if (!data.success) throw new Error(data.result);
            setTournament(data.result);
        } catch (err: any) { setError(err.message); } finally { setIsLoading(false); }
    }, [accessToken, tournamentId, API_BASE_URL]);

    useEffect(() => {
        fetchTournamentData();
        const interval = setInterval(fetchTournamentData, 5000);
        return () => clearInterval(interval);
    }, [fetchTournamentData]);

    const handleAction = async (action: 'join' | 'start') => {
        setIsActionLoading(true);
        setError("");
        try {
            const response = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}/${action}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}` },
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.result);
            await fetchTournamentData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsActionLoading(false);
        }
    };
    
    const getTournamentWinner = () => {
        if (tournament?.details.status !== 'completed' || !tournament.matches.length) return null;
        const finalRound = Math.max(...tournament.matches.map(m => m.round_number));
        const finalMatch = tournament.matches.find(m => m.round_number === finalRound);
        if (!finalMatch || !finalMatch.winner_id) return null;
        return tournament.participants.find(p => p.id === finalMatch.winner_id);
    };

    if (isLoading) return <div className="flex justify-center items-center h-full"><Loader2 className="h-10 w-10 animate-spin"/></div>;
    if (error && !tournament) return <div className="text-center text-destructive p-10">Error: {error}</div>;
    if (!tournament) return <div className="text-center text-muted-foreground p-10">Tournament not found.</div>;

    const isUserInTournament = tournament.participants.some((p) => p.id === user?.id);
    const isCreator = tournament.details.creator_id === user?.id;
    const winner = getTournamentWinner();

    const rounds = tournament.matches.reduce((acc, match) => {
        (acc[match.round_number] = acc[match.round_number] || []).push(match);
        return acc;
    }, {} as Record<number, Match[]>);

    return (
        <div className="container mx-auto max-w-7xl py-8 space-y-8">
            {winner && (
                <Card className="bg-yellow-500/10 border-yellow-500 text-center p-6 animate-in fade-in-50">
                    <Crown className="mx-auto h-12 w-12 text-yellow-400"/>
                    <h2 className="text-2xl font-bold mt-2">Tournament Complete!</h2>
                    <p className="text-xl text-muted-foreground">Winner: <span className="font-bold text-foreground">{winner.name}</span></p>
                </Card>
            )}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">{tournament.details.name}</h1>
                    <p className="text-muted-foreground">Status: <span className="font-semibold capitalize">{tournament.details.status.replace('_', ' ')}</span></p>
                </div>
                {tournament.details.status === 'pending' && (
                    <div className="flex gap-2">
                        {!isUserInTournament && <Button onClick={() => handleAction('join')} disabled={isActionLoading}>Join Tournament</Button>}
                        {isCreator && <Button variant="secondary" onClick={() => handleAction('start')} disabled={isActionLoading}>Start Tournament</Button>}
                    </div>
                )}
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3">
                    <h2 className="text-2xl font-semibold mb-4">Bracket</h2>
                    <div className="flex gap-8 overflow-x-auto pb-4">
                        {Object.entries(rounds).length > 0 ? Object.entries(rounds).map(([roundNumber, matches]) => (
                            <div key={roundNumber} className="flex flex-col gap-6 flex-shrink-0">
                                <h3 className="text-xl font-bold text-center text-muted-foreground">Round {roundNumber}</h3>
                                {matches.map((match) => (
                                    <Card key={match.id} className="w-64 bg-secondary/50">
                                        <CardContent className="p-4 space-y-2">
                                            <div className="flex justify-between items-center font-semibold">
                                                <span>{match.player1_name}</span>
                                                {match.winner_id === match.player1_id && <Trophy className="h-4 w-4 text-yellow-400"/>}
                                            </div>
                                            <div className="border-t border-border my-2"></div>
                                            <div className="flex justify-between items-center font-semibold">
                                                <span>{match.player2_name || '(BYE)'}</span>
                                                {match.winner_id === match.player2_id && <Trophy className="h-4 w-4 text-yellow-400"/>}
                                            </div>
                                            {match.status === 'pending' && (user?.id === match.player1_id || user?.id === match.player2_id) && match.player2_id !== null && (
                                                <Button size="sm" className="w-full mt-2" onClick={() => router.push(`/play?matchId=${match.id}&tournamentId=${tournamentId}`)}>
                                                    <Sword className="mr-2 h-4 w-4"/> Play Match
                                                </Button>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )) : (
                            <div className="w-full text-center text-muted-foreground py-10 border-2 border-dashed rounded-lg">
                                <Info className="mx-auto h-12 w-12" />
                                <h3 className="mt-2 text-sm font-semibold">Waiting for Tournament to Start</h3>
                                <p className="mt-1 text-sm">The bracket will be generated once the creator starts the tournament.</p>
                            </div>
                        )}
                    </div>
                </div>

                <Card className="lg:col-span-1 h-fit">
                    <CardHeader><CardTitle className="flex items-center gap-2"><Users/>Participants ({tournament.participants.length})</CardTitle></CardHeader>
                    <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                        {tournament.participants.map(p => (
                            <div key={p.id} className="flex items-center gap-3">
                                <img src={p.avatar ? `${API_BASE_URL}${p.avatar}` : '/avatars/default.png'} alt={p.name} className="w-8 h-8 rounded-full"/>
                                <span>{p.name}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
